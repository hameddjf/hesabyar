import { describe, it, expect, beforeAll } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'

describe('Notifications — اعلان سررسید فاکتور', () => {
  let token, clientId

  beforeAll(async () => {
    ;({ token } = await createTestCompany('notif'))
    const c = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری اعلان', type: 'company' })
    clientId = c.body.id
  })

  it('بدون فاکتور نزدیک‌سررسید، لیست اعلان باید خالی باشه', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('فاکتور با سررسید ۲ روز دیگه باید توی اعلان‌ها ظاهر بشه', async () => {
    const in2days = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, dueDate: in2days, grandTotal: 100000, status: 'pending',
    })
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].type).toBe('invoice')
    expect(res.body[0].overdue).toBe(false)
  })

  it('فاکتور با سررسید گذشته باید overdue=true داشته باشه', async () => {
    await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, dueDate: '2020-01-01', grandTotal: 50000, status: 'overdue',
    })
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`)
    const overdueAlert = res.body.find(a => a.overdue)
    expect(overdueAlert).toBeTruthy()
  })

  it('فاکتور با سررسید دور (۳۰ روز دیگه) نباید در لیست باشه', async () => {
    const { token: freshToken } = await createTestCompany('notif-far')
    const c = await request(app).post('/api/clients').set('Authorization', `Bearer ${freshToken}`).send({ name: 'مشتری دور', type: 'company' })
    const far = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    await request(app).post('/api/invoices').set('Authorization', `Bearer ${freshToken}`).send({
      type: 'sale', clientId: c.body.id, dueDate: far, grandTotal: 10000, status: 'pending',
    })
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${freshToken}`)
    expect(res.body).toEqual([])
  })
})

describe('User Layouts — ذخیره‌ی چیدمان شخصی‌سازی', () => {
  let token
  beforeAll(async () => { ({ token } = await createTestCompany('layout')) })

  it('چیدمان ذخیره‌نشده باید null برگردونه', async () => {
    const res = await request(app).get('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.layout).toBeNull()
  })

  it('ذخیره‌ی چیدمان و خوندن مجدد باید مطابقت داشته باشه', async () => {
    const layout = [{ id: 'stat-revenue', visible: true, order: 0 }, { id: 'stat-clients', visible: false, order: 1 }]
    const save = await request(app).put('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`).send({ layout })
    expect(save.status).toBe(200)
    const read = await request(app).get('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
    expect(read.body.layout).toEqual(layout)
  })

  it('ساختار نامعتبر چیدمان باید رد بشه', async () => {
    const res = await request(app).put('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
      .send({ layout: [{ id: 'x' }] }) // فیلدهای visible/order غایبن
    expect(res.status).toBe(400)
  })

  it('حذف چیدمان (reset) باید به حالت null برگرده', async () => {
    await request(app).delete('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
    const res = await request(app).get('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
    expect(res.body.layout).toBeNull()
  })

  it('چیدمان یک صفحه نباید روی صفحه‌ی دیگه اثر بذاره', async () => {
    await request(app).put('/api/user-layouts/dashboard').set('Authorization', `Bearer ${token}`)
      .send({ layout: [{ id: 'a', visible: true, order: 0 }] })
    const invoicesLayout = await request(app).get('/api/user-layouts/invoices').set('Authorization', `Bearer ${token}`)
    expect(invoicesLayout.body.layout).toBeNull()
  })
})

describe('Company Profile & Company Users', () => {
  let token
  beforeAll(async () => { ({ token } = await createTestCompany('company-profile')) })

  it('دریافت پروفایل شرکت', async () => {
    const res = await request(app).get('/api/company').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBeTruthy()
  })

  it('ویرایش پروفایل شرکت', async () => {
    const res = await request(app).put('/api/company').set('Authorization', `Bearer ${token}`)
      .send({ name: 'نام جدید شرکت', phone: '02100000000' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('نام جدید شرکت')
  })

  it('دعوت کاربر جدید وقتی سقف پلن رایگان (۱ کاربر) پره، باید 403 بده', async () => {
    const res = await request(app).post('/api/company-users').set('Authorization', `Bearer ${token}`)
      .send({ name: 'کارمند دعوت‌شده', email: `invited-${Date.now()}@x.com`, role: 'employee' })
    expect(res.status).toBe(403) // پلن رایگان پیش‌فرض max_users=1 داره و owner همون ۱ نفره
  })

  it('بعد از افزایش سقف پلن، دعوت باید موفق باشه و رمز موقت برگردونه', async () => {
    const db = (await import('../src/db.js')).default
    // شبیه‌سازی ارتقای پلن توسط سوپرادمین (مستقیم روی دیتابیس، چون این تست روی مسیر company-users تمرکز داره نه adminCompanies)
    const company = await request(app).get('/api/company').set('Authorization', `Bearer ${token}`)
    db.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(company.body.id)

    const res = await request(app).post('/api/company-users').set('Authorization', `Bearer ${token}`)
      .send({ name: 'کارمند دعوت‌شده', email: `invited-${Date.now()}@x.com`, role: 'employee' })
    expect(res.status).toBe(201)
    expect(res.body.tempPassword).toBeTruthy() // رمز موقت باید برگرده چون سرویس ایمیل وصل نیست
  })

  it('لیست کاربران شرکت باید شامل owner + کاربر دعوت‌شده باشه', async () => {
    const res = await request(app).get('/api/company-users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
    expect(res.body.some(u => u.role === 'owner')).toBe(true)
  })

  it('نباید بشه owner رو حذف کرد', async () => {
    const users = await request(app).get('/api/company-users').set('Authorization', `Bearer ${token}`)
    const owner = users.body.find(u => u.role === 'owner')
    const res = await request(app).delete(`/api/company-users/${owner.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe('Activity Log — ثبت خودکار رویدادها', () => {
  it('ساخت یک مشتری باید یک ردیف در activity_log با action=create ثبت کنه', async () => {
    const { token } = await createTestCompany('activity')
    await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`).send({ name: 'مشتری لاگ', type: 'company' })
    const res = await request(app).get('/api/activity-log').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    const clientLog = res.body.find(l => l.entity === 'client' && l.action === 'create')
    expect(clientLog).toBeTruthy()
  })

  it('ورود موفق باید یک ردیف با action=login ثبت کنه', async () => {
    const { token, email } = await createTestCompany('activity-login')
    await request(app).post('/api/auth/login').send({ email, password: '123456' })
    const res = await request(app).get('/api/activity-log').set('Authorization', `Bearer ${token}`)
    const loginLog = res.body.find(l => l.action === 'login')
    expect(loginLog).toBeTruthy()
  })
})
