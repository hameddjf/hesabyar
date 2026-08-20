import { describe, it, expect, beforeAll } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'

describe('Clients CRUD', () => {
  let token
  beforeAll(async () => { ({ token } = await createTestCompany('clients')) })

  it('ساخت مشتری معتبر', async () => {
    const res = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری تست', type: 'company', phone: '09120000000' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('مشتری تست')
  })

  it('ساخت مشتری بدون نام باید با Zod رد بشه', async () => {
    const res = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ type: 'company' })
    expect(res.status).toBe(400)
  })

  it('لیست مشتریان', async () => {
    const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('ویرایش مشتری', async () => {
    const created = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'قابل ویرایش', type: 'person' })
    const res = await request(app).put(`/api/clients/${created.body.id}`).set('Authorization', `Bearer ${token}`)
      .send({ name: 'ویرایش‌شده' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('ویرایش‌شده')
  })

  it('حذف مشتری', async () => {
    const created = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'حذف‌شدنی', type: 'person' })
    const res = await request(app).delete(`/api/clients/${created.body.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  it('یک شرکت نباید بتونه مشتری شرکت دیگه رو ببینه (ایزوله‌سازی چندمستأجری)', async () => {
    const { token: otherToken } = await createTestCompany('other-clients')
    const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(0) // شرکت جدید نباید مشتری‌های شرکت اول رو ببینه
  })
})

describe('Products CRUD', () => {
  let token
  beforeAll(async () => { ({ token } = await createTestCompany('products')) })

  it('ساخت محصول معتبر', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'محصول تست', price: 50000, status: 'active' })
    expect(res.status).toBe(201)
  })

  it('ساخت محصول با قیمت منفی باید رد بشه', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'محصول بد', price: -100 })
    expect(res.status).toBe(400)
  })
})

describe('Invoices — شامل اقلام JSON', () => {
  let token, clientId

  beforeAll(async () => {
    ;({ token } = await createTestCompany('invoices'))
    const c = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری فاکتور', type: 'company' })
    clientId = c.body.id
  })

  it('ساخت فاکتور با اقلام و محاسبه‌ی درست', async () => {
    const items = [{ desc: 'قلم ۱', qty: 2, price: 50000, total: 100000 }]
    const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, issueDate: '2026-07-01', dueDate: '2026-07-30',
      totalAmount: 100000, discount: 0, taxAmount: 10000, grandTotal: 110000,
      status: 'pending', itemsJson: JSON.stringify(items),
    })
    expect(res.status).toBe(201)
    expect(res.body.grand_total).toBe(110000)
    expect(JSON.parse(res.body.items_json)).toEqual(items)
  })

  it('ساخت فاکتور با type نامعتبر باید رد بشه', async () => {
    const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'not-a-real-type', clientId, grandTotal: 1000,
    })
    expect(res.status).toBe(400)
  })

  it('ساخت فاکتور با grandTotal رشته‌ای (نه عدد) باید رد بشه', async () => {
    const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, grandTotal: 'صد هزار تومان',
    })
    expect(res.status).toBe(400)
  })

  it('حذف فاکتور', async () => {
    const created = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, grandTotal: 5000, status: 'draft',
    })
    const res = await request(app).delete(`/api/invoices/${created.body.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})

describe('Payments — دریافتی/پرداختی/هزینه + مانده‌ی فاکتور', () => {
  let token, clientId, invoiceId

  beforeAll(async () => {
    ;({ token } = await createTestCompany('payments'))
    const c = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری پرداخت', type: 'company' })
    clientId = c.body.id
    const inv = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({
      type: 'sale', clientId, grandTotal: 100000, status: 'pending',
    })
    invoiceId = inv.body.id
  })

  it('ثبت دریافتی معتبر', async () => {
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({
      date: '2026-07-05', amount: 40000, transactionType: 'receipt', method: 'cash',
      invoiceId, clientId, status: 'confirmed',
    })
    expect(res.status).toBe(201)
  })

  it('ثبت پرداختی با مبلغ منفی باید رد بشه', async () => {
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({
      amount: -5000, transactionType: 'payment',
    })
    expect(res.status).toBe(400)
  })

  it('محاسبه‌ی مانده‌ی فاکتور باید درست باشه (۱۰۰۰۰۰ - ۴۰۰۰۰ = ۶۰۰۰۰)', async () => {
    const res = await request(app).get(`/api/invoice-links/balance/${invoiceId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.paid).toBe(40000)
    expect(res.body.balance).toBe(60000)
  })

  it('ثبت هزینه با transactionType=expense', async () => {
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({
      date: '2026-07-06', amount: 15000, transactionType: 'expense', category: 'rent', status: 'done',
    })
    expect(res.status).toBe(201)
    expect(res.body.transaction_type).toBe('expense')
  })
})

describe('Employees & Partners & BankingAccounts — CRUD پایه', () => {
  let token
  beforeAll(async () => { ({ token } = await createTestCompany('misc')) })

  it('ساخت کارمند', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
      .send({ name: 'کارمند تست', position: 'حسابدار', salary: 20000000, status: 'active' })
    expect(res.status).toBe(201)
  })

  it('ساخت شریک', async () => {
    const res = await request(app).post('/api/partners').set('Authorization', `Bearer ${token}`)
      .send({ name: 'شریک تست', share: 50, accountsJson: '[]' })
    expect(res.status).toBe(201)
  })

  it('ساخت حساب بانکی', async () => {
    const res = await request(app).post('/api/banking-accounts').set('Authorization', `Bearer ${token}`)
      .send({ bank: 'ملت', label: 'حساب اصلی', balance: 1000000 })
    expect(res.status).toBe(201)
  })
})
