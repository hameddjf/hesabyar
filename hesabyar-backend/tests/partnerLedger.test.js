import { describe, it, expect, beforeAll } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'

async function makePartner(token, overrides = {}) {
  const res = await request(app).post('/api/partners').set('Authorization', `Bearer ${token}`)
    .send({ name: 'شریک تست', role: 'partner', share: 50, capital: 0, ...overrides })
  expect(res.status).toBe(201)
  return res.body
}

describe('دفتر حساب شراکت (Partner Equity Ledger)', () => {
  let token

  beforeAll(async () => {
    ;({ token } = await createTestCompany('ledger'))
  })

  it('شریک تازه‌ساخته‌شده بدون تراکنش باید موجودی برابر سرمایه‌ی اولیه داشته باشه', async () => {
    const p = await makePartner(token, { capital: 1000000 })
    const res = await request(app).get(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.balance).toBe(1000000)
    expect(res.body.transactions).toEqual([])
  })

  it('ثبت آورده‌ی نقدی (capital_in) باید موجودی رو افزایش بده', async () => {
    const p = await makePartner(token, { capital: 0 })
    const tx = await request(app).post(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
      .send({ type: 'capital_in', amount: 500000, date: '2026-01-15', description: 'آورده‌ی اولیه' })
    expect(tx.status).toBe(201)
    expect(tx.body.balance).toBe(500000)
  })

  it('برداشت (capital_out) بیشتر از موجودی باید رد بشه', async () => {
    const p = await makePartner(token, { capital: 100000 })
    const tx = await request(app).post(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
      .send({ type: 'capital_out', amount: 200000, date: '2026-01-15' })
    expect(tx.status).toBe(400)
  })

  it('برداشت معتبر باید موجودی رو کم کنه', async () => {
    const p = await makePartner(token, { capital: 300000 })
    const tx = await request(app).post(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
      .send({ type: 'capital_out', amount: 100000, date: '2026-01-15' })
    expect(tx.status).toBe(201)
    expect(tx.body.balance).toBe(200000)
  })

  it('ثبت دستی profit_share باید رد بشه (فقط از طریق ویزارد مجازه)', async () => {
    const p = await makePartner(token, { capital: 0 })
    const tx = await request(app).post(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
      .send({ type: 'profit_share', amount: 100000, date: '2026-01-15' })
    expect(tx.status).toBe(400)
  })

  it('تاریخ غیر ISO باید رد بشه', async () => {
    const p = await makePartner(token, { capital: 0 })
    const tx = await request(app).post(`/api/partner-ledger/${p.id}/transactions`).set('Authorization', `Bearer ${token}`)
      .send({ type: 'capital_in', amount: 1000, date: '۱۴۰۴/۰۱/۰۱' })
    expect(tx.status).toBe(400)
  })

  it('ویزارد تقسیم سود باید مجموع سهم ۱۰۰٪ رو الزامی کنه', async () => {
    const { token: t2 } = await createTestCompany('ledger-partial')
    await makePartner(t2, { share: 40 })
    const res = await request(app).post('/api/partner-ledger/distribute-profit').set('Authorization', `Bearer ${t2}`)
      .send({ totalAmount: 1000000, date: '2026-02-01' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/۱۰۰/)
  })

  it('ویزارد تقسیم سود با سهم کامل باید متناسب با share% بین شرکا تقسیم کنه', async () => {
    const { token: t3 } = await createTestCompany('ledger-full')
    const p1 = await makePartner(t3, { name: 'شریک ۱', share: 60, capital: 0 })
    const p2 = await makePartner(t3, { name: 'شریک ۲', share: 40, capital: 0 })

    const res = await request(app).post('/api/partner-ledger/distribute-profit').set('Authorization', `Bearer ${t3}`)
      .send({ totalAmount: 1000000, date: '2026-02-01', description: 'سود بهمن' })
    expect(res.status).toBe(201)
    expect(res.body.distributed.length).toBe(2)

    const bal1 = await request(app).get(`/api/partner-ledger/${p1.id}/transactions`).set('Authorization', `Bearer ${t3}`)
    const bal2 = await request(app).get(`/api/partner-ledger/${p2.id}/transactions`).set('Authorization', `Bearer ${t3}`)
    expect(bal1.body.balance).toBe(600000)
    expect(bal2.body.balance).toBe(400000)
  })

  it('غیر owner نباید بتونه سود تقسیم کنه', async () => {
    const { token: t4, company } = await createTestCompany('ledger-role')
    const dbMod = await import('../src/db.js')
    dbMod.default.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(company.id)
    await makePartner(t4, { share: 100 })
    // یه کارمند بساز و باهاش تست کن
    const invite = await request(app).post('/api/company-users').set('Authorization', `Bearer ${t4}`)
      .send({ name: 'کارمند', email: `ledger-emp-${Date.now()}@x.com`, role: 'employee' })
    const login = await request(app).post('/api/auth/login').send({ email: invite.body.user.email, password: invite.body.tempPassword })
    const res = await request(app).post('/api/partner-ledger/distribute-profit').set('Authorization', `Bearer ${login.body.token}`)
      .send({ totalAmount: 100000, date: '2026-02-01' })
    expect(res.status).toBe(403)
    expect(company).toBeTruthy()
  })

  it('/balances باید خلاصه‌ی همه‌ی شرکا رو با موجودی محاسبه‌شده برگردونه', async () => {
    const { token: t5 } = await createTestCompany('ledger-summary')
    await makePartner(t5, { name: 'الف', share: 70, capital: 200000 })
    await makePartner(t5, { name: 'ب', share: 30, capital: 100000 })
    const res = await request(app).get('/api/partner-ledger/balances').set('Authorization', `Bearer ${t5}`)
    expect(res.status).toBe(200)
    expect(res.body.partners.length).toBe(2)
    expect(res.body.totalEquity).toBe(300000)
    expect(res.body.shareSum).toBe(100)
  })
})
