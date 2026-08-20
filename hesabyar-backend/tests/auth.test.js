import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/server.js'
import { createTestCompany } from './helpers.js'

describe('Auth — ثبت‌نام و ورود شرکت‌ها', () => {
  const email = `auth-test-${Date.now()}@x.com`

  it('ثبت‌نام با دیتای معتبر باید موفق باشه و توکن برگردونه', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'کاربر تست', email, password: '123456', companyName: 'شرکت تست',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe(email)
  })

  it('ثبت‌نام با ایمیل تکراری باید رد بشه (409)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'کاربر دوم', email, password: '123456', companyName: 'شرکت دوم',
    })
    expect(res.status).toBe(409)
  })

  it('ثبت‌نام با ایمیل نامعتبر باید با Zod رد بشه', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'کاربر', email: 'not-an-email', password: '123456', companyName: 'شرکت',
    })
    expect(res.status).toBe(400)
  })

  it('ثبت‌نام با رمز کوتاه باید رد بشه', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'کاربر', email: `short-${Date.now()}@x.com`, password: '123', companyName: 'شرکت',
    })
    expect(res.status).toBe(400)
  })

  it('ثبت‌نام باید perms کامل (owner) رو هم توی user برگردونه', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'کاربر پرمز', email: `perms-register-${Date.now()}@x.com`, password: '123456', companyName: 'شرکت پرمز',
    })
    expect(res.status).toBe(200)
    expect(res.body.user.perms).toBeTruthy()
    expect(res.body.user.perms.invoices).toBe(true)
    expect(res.body.user.perms.canDelete).toBe(true)
  })

  it('ورود با رمز درست باید موفق باشه', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: '123456' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.perms).toBeTruthy()
    expect(res.body.user.perms.invoices).toBe(true)
  })

  it('ورود با رمز اشتباه باید 401 بده', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('بعد از ۵ تلاش ناموفق، حساب باید قفل بشه (423)', async () => {
    const lockEmail = `lock-test-${Date.now()}@x.com`
    await request(app).post('/api/auth/register').send({
      name: 'قفل تست', email: lockEmail, password: '123456', companyName: 'شرکت قفل',
    })
    let lastStatus
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({ email: lockEmail, password: 'wrong' })
      lastStatus = res.status
    }
    expect(lastStatus).toBe(423)

    // حتی با رمز درست هم دیگه نباید بشه وارد شد تا وقتی قفل باز بشه
    const res = await request(app).post('/api/auth/login').send({ email: lockEmail, password: '123456' })
    expect(res.status).toBe(423)
  })

  it('دسترسی به route محافظت‌شده بدون توکن باید 401 بده', async () => {
    const res = await request(app).get('/api/company')
    expect(res.status).toBe(401)
  })

  it('دسترسی با توکن جعلی باید 401 بده', async () => {
    const res = await request(app).get('/api/company').set('Authorization', 'Bearer fake.token.here')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me — باید دسترسی‌های واقعی کاربر (perms) رو هم برگردونه', () => {
  it('owner باید دسترسی کامل به همه‌ی ماژول‌ها داشته باشه', async () => {
    const { token } = await createTestCompany('me-owner')
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.perms).toBeTruthy()
    expect(res.body.perms.invoices).toBe(true)
    expect(res.body.perms.partners).toBe(true)
    expect(res.body.perms.canDelete).toBe(true)
  })

  it('کارمند با دسترسی محدود باید فقط همون ماژول‌های فعال رو در perms ببینه', async () => {
    const { token: ownerToken } = await createTestCompany('me-employee')
    const db = (await import('../src/db.js')).default
    const company = await request(app).get('/api/company').set('Authorization', `Bearer ${ownerToken}`)
    db.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(company.body.id)

    const email = `me-emp-${Date.now()}@x.com`
    const invite = await request(app).post('/api/company-users').set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'کارمند محدود', email, role: 'employee', permissions: { invoices: true, reports: true, canDelete: false } })
    expect(invite.status).toBe(201)

    const login = await request(app).post('/api/auth/login').send({ email, password: invite.body.tempPassword })
    expect(login.status).toBe(200)

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)
    expect(res.status).toBe(200)
    expect(res.body.perms.invoices).toBe(true)
    expect(res.body.perms.reports).toBe(true)
    expect(res.body.perms.partners).toBe(false)
    expect(res.body.perms.canDelete).toBe(false)
  })
})
