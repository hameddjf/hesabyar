import { describe, it, expect, beforeAll, vi } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'
import db from '../src/db.js'
import * as mailer from '../src/lib/mailer.js'
import { runInvoiceDueReminders, findInvoicesNeedingReminder } from '../src/lib/invoiceReminders.js'

function isoDaysFromNow(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function makeClient(token, overrides = {}) {
  const res = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
    .send({ name: 'مشتری تست', email: 'client@test.com', ...overrides })
  expect(res.status).toBe(201)
  return res.body
}

async function makeInvoice(token, clientId, overrides = {}) {
  const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`)
    .send({ clientId, status: 'pending', grandTotal: 100000, ...overrides })
  expect(res.status).toBe(201)
  return res.body
}

describe('یادآوری خودکار سررسید فاکتور', () => {
  let token, companyId

  beforeAll(async () => {
    ;({ token, company: { id: companyId } } = await createTestCompany('reminders'))
  })

  it('فاکتور pending با سررسید ۲ روز دیگه باید در آستانه‌ی upcoming قرار بگیره', async () => {
    const client = await makeClient(token)
    await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(2) })
    const due = findInvoicesNeedingReminder(new Date())
    const found = due.find(d => d.company_id === companyId)
    expect(found).toBeTruthy()
    expect(found.threshold).toBe('upcoming')
  })

  it('فاکتور pending با سررسید گذشته باید در آستانه‌ی overdue قرار بگیره', async () => {
    const client = await makeClient(token)
    await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(-5) })
    const due = findInvoicesNeedingReminder(new Date())
    const found = due.find(d => d.company_id === companyId && d.threshold === 'overdue')
    expect(found).toBeTruthy()
  })

  it('فاکتور pending با سررسید ۱۰ روز دیگه نباید یادآوری بشه', async () => {
    const client = await makeClient(token)
    const inv = await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(10) })
    const due = findInvoicesNeedingReminder(new Date())
    expect(due.find(d => d.id === inv.id)).toBeUndefined()
  })

  it('فاکتور paid حتی با سررسید نزدیک نباید یادآوری بشه', async () => {
    const client = await makeClient(token)
    const inv = await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(1), status: 'paid' })
    const due = findInvoicesNeedingReminder(new Date())
    expect(due.find(d => d.id === inv.id)).toBeUndefined()
  })

  it('اجرای runInvoiceDueReminders باید placeholder ایمیل بفرسته و در جدول لاگ ثبت کنه', async () => {
    const sendMailSpy = vi.spyOn(mailer, 'sendMail').mockResolvedValue({ sent: false, reason: 'smtp-not-configured' })
    const client = await makeClient(token, { email: 'reminder-target@test.com' })
    const inv = await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(1) })

    const results = await runInvoiceDueReminders(new Date())
    expect(results.find(r => r.invoiceId === inv.id)).toBeTruthy()
    expect(sendMailSpy).toHaveBeenCalled()

    const logRow = db.prepare('SELECT * FROM invoice_reminder_log WHERE invoice_id = ?').get(inv.id)
    expect(logRow).toBeTruthy()
    expect(logRow.threshold).toBe('upcoming')
    expect(logRow.email_sent).toBe(1)

    sendMailSpy.mockRestore()
  })

  it('اجرای دوباره‌ی runInvoiceDueReminders نباید برای همون فاکتور و همون آستانه دوباره یادآوری بفرسته', async () => {
    const sendMailSpy = vi.spyOn(mailer, 'sendMail').mockResolvedValue({ sent: false, reason: 'smtp-not-configured' })
    const client = await makeClient(token)
    const inv = await makeInvoice(token, client.id, { dueDate: isoDaysFromNow(0) })

    const first = await runInvoiceDueReminders(new Date())
    expect(first.find(r => r.invoiceId === inv.id)).toBeTruthy()
    const callsAfterFirst = sendMailSpy.mock.calls.length

    const second = await runInvoiceDueReminders(new Date())
    expect(second.find(r => r.invoiceId === inv.id)).toBeUndefined()
    expect(sendMailSpy.mock.calls.length).toBe(callsAfterFirst) // یعنی دوباره صدا زده نشده

    const rows = db.prepare('SELECT * FROM invoice_reminder_log WHERE invoice_id = ?').all(inv.id)
    expect(rows.length).toBe(1)

    sendMailSpy.mockRestore()
  })

  it('GET /api/invoice-reminders/log باید فقط لاگ‌های شرکت خودی رو برگردونه', async () => {
    const res = await request(app).get('/api/invoice-reminders/log').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    for (const row of res.body) expect(row.company_id).toBe(companyId)
  })

  it('POST /api/invoice-reminders/run باید دستی اجرا بشه و آرایه برگردونه', async () => {
    const res = await request(app).post('/api/invoice-reminders/run').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.results)).toBe(true)
  })
})
