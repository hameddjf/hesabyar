import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'
import { app, request } from './helpers.js'
import db from '../src/db.js'
import bcrypt from 'bcryptjs'
import * as mailer from '../src/lib/mailer.js'

const ADMIN_PREFIX = 'test-admin-secret' // باید با vitest.config.js هماهنگ باشه

async function createSuperAdmin(email, password = 'Admin123456!') {
  const hash = bcrypt.hashSync(password, 8)
  db.prepare('INSERT INTO super_admins (name, email, password_hash) VALUES (?, ?, ?)')
    .run('سوپرادمین تست', email, hash)
  return { email, password }
}

/** چون سرویس ایمیل وصل نیست، OTP روی دیتابیس (otp_code_hash) قابل‌خوندن نیست مستقیم،
 *  ولی می‌تونیم با یه هوک کوچیک OTP رو از طریق مقایسه‌ی مستقیم دیتابیس دور بزنیم:
 *  یه OTP دلخواه می‌سازیم، هش می‌کنیم، مستقیم توی دیتابیس می‌ذاریم، و verify رو باهاش تست می‌کنیم. */
function forceOtp(email, otp) {
  const hash = bcrypt.hashSync(otp, 8)
  const expires = new Date(Date.now() + 5 * 60000).toISOString()
  db.prepare('UPDATE super_admins SET otp_code_hash = ?, otp_expires = ? WHERE email = ?').run(hash, expires, email)
}

describe('Admin Auth — ورود دومرحله‌ای سوپرادمین', () => {
  let email, password

  beforeAll(async () => {
    ;({ email, password } = await createSuperAdmin(`admin-${Date.now()}@x.com`))
  })

  it('مرحله ۱ (ایمیل/رمز درست) باید step=2fa_required برگردونه، نه توکن مستقیم', async () => {
    const res = await request(app).post(`/api/${ADMIN_PREFIX}/auth/login`).send({ email, password })
    expect(res.status).toBe(200)
    expect(res.body.step).toBe('2fa_required')
    expect(res.body.token).toBeUndefined() // مهم: نباید بدون تایید OTP توکن بده
  })

  it('مرحله ۱ با رمز اشتباه باید 401 بده', async () => {
    const res = await request(app).post(`/api/${ADMIN_PREFIX}/auth/login`).send({ email, password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('مرحله ۲ (verify-2fa) با OTP درست باید توکن واقعی بده', async () => {
    forceOtp(email, '111111')
    const res = await request(app).post(`/api/${ADMIN_PREFIX}/auth/verify-2fa`).send({ email, otp: '111111' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('مرحله ۲ با OTP اشتباه باید 401 بده', async () => {
    forceOtp(email, '222222')
    const res = await request(app).post(`/api/${ADMIN_PREFIX}/auth/verify-2fa`).send({ email, otp: '999999' })
    expect(res.status).toBe(401)
  })

  it('مسیر عادی /api/auth نباید با توکن سوپرادمین کار کنه (جداسازی کامل دو سیستم auth)', async () => {
    forceOtp(email, '333333')
    const verify = await request(app).post(`/api/${ADMIN_PREFIX}/auth/verify-2fa`).send({ email, otp: '333333' })
    const adminToken = verify.body.token
    const res = await request(app).get('/api/company').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(401)
  })

  it('مرحله ۱ باید کد OTP رو واقعاً از طریق mailer.sendMail بفرسته (نه فقط لاگ کنسول)', async () => {
    const sendMailSpy = vi.spyOn(mailer, 'sendMail').mockResolvedValue({ sent: false, reason: 'smtp-not-configured' })

    await request(app).post(`/api/${ADMIN_PREFIX}/auth/login`).send({ email, password })

    expect(sendMailSpy).toHaveBeenCalledTimes(1)
    const [{ to, subject, text }] = sendMailSpy.mock.calls[0]
    expect(to).toBe(email)
    expect(subject).toMatch(/ورود|2FA|تایید/)
    expect(text).toMatch(/\d{6}/) // کد ۶رقمی باید توی متن ایمیل باشه

    sendMailSpy.mockRestore()
  })
})

describe('Admin Companies & Users — پنل سوپرادمین', () => {
  let adminToken

  beforeAll(async () => {
    const email = `admin2-${Date.now()}@x.com`
    const { password } = await createSuperAdmin(email)
    await request(app).post(`/api/${ADMIN_PREFIX}/auth/login`).send({ email, password })
    forceOtp(email, '555555')
    const verify = await request(app).post(`/api/${ADMIN_PREFIX}/auth/verify-2fa`).send({ email, otp: '555555' })
    adminToken = verify.body.token

    // یه شرکت واقعی هم بسازیم که سوپرادمین بتونه ببینتش
    await request(app).post('/api/auth/register').send({
      name: 'مالک شرکت دیده‌شده', email: `seen-${Date.now()}@x.com`, password: '123456', companyName: 'شرکت دیده‌شده',
    })
  })

  it('لیست شرکت‌ها باید حداقل یک مورد داشته باشه', async () => {
    const res = await request(app).get(`/api/${ADMIN_PREFIX}/companies`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('لیست کاربران cross-company', async () => {
    const res = await request(app).get(`/api/${ADMIN_PREFIX}/users`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('company_name')
  })

  it('تغییر وضعیت یک شرکت به suspended', async () => {
    const companies = await request(app).get(`/api/${ADMIN_PREFIX}/companies`).set('Authorization', `Bearer ${adminToken}`)
    const id = companies.body[0].id
    const res = await request(app).patch(`/api/${ADMIN_PREFIX}/companies/${id}/status`)
      .set('Authorization', `Bearer ${adminToken}`).send({ status: 'suspended' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('suspended')
  })

  it('مسیر مخفی ادمین با پیشوند اشتباه باید 404 بده (تست امنیتی مسیر مخفی)', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ email: 'x@x.com', password: 'x' })
    expect(res.status).toBe(404)
  })

  it('کاربر عادی شرکت نباید بتونه به مسیرهای سوپرادمین دسترسی داشته باشه', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'کاربر عادی', email: `normal-${Date.now()}@x.com`, password: '123456', companyName: 'شرکت عادی',
    })
    const res = await request(app).get(`/api/${ADMIN_PREFIX}/companies`).set('Authorization', `Bearer ${reg.body.token}`)
    expect(res.status).toBe(401)
  })
})
