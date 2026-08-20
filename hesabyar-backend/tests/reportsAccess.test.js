import { describe, it, expect } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'

/**
 * پریست «بیننده» (viewer) فقط perms.reports=true داره (بدون invoices/payments/clients/partners).
 * صفحه‌ی گزارش‌ها (useReportsData.js در فرانت) مستقیماً از endpoint های
 * invoices/payments/clients/partners می‌خونه (تجمیع سمت بک‌اند نداریم) — پس بدون
 * readableForReports، بیننده با ۴۰۳ روی همه‌ی این fetch ها مواجه می‌شد و کل صفحه‌ی
 * گزارش‌ها خراب می‌شد. این فایل اون رگرسیون رو قفل می‌کنه.
 */
describe('دسترسی خواندنی «بیننده» به داده‌های زیرین گزارش‌ها', () => {
  async function makeViewer(prefix) {
    const { token: ownerToken } = await createTestCompany(prefix)
    const db = (await import('../src/db.js')).default
    const company = await request(app).get('/api/company').set('Authorization', `Bearer ${ownerToken}`)
    db.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(company.body.id)

    const email = `${prefix}-viewer-${Date.now()}@x.com`
    const invite = await request(app).post('/api/company-users').set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'کاربر بیننده', email, role: 'employee', permissions: { reports: true, canDelete: false } })
    expect(invite.status).toBe(201)
    const login = await request(app).post('/api/auth/login').send({ email, password: invite.body.tempPassword })
    expect(login.status).toBe(200)
    return { ownerToken, viewerToken: login.body.token }
  }

  it('بیننده باید بتونه لیست فاکتورها/پرداختی‌ها/مشتریان/شرکا رو بخونه (GET)', async () => {
    const { viewerToken } = await makeViewer('viewer-read')
    for (const path of ['/api/invoices', '/api/payments', '/api/clients', '/api/partners']) {
      const res = await request(app).get(path).set('Authorization', `Bearer ${viewerToken}`)
      expect(res.status, `${path} باید ۲۰۰ بده`).toBe(200)
    }
  })

  it('بیننده نباید بتونه فاکتور/پرداختی/مشتری/شریک بسازه (POST) — فقط خواندنه', async () => {
    const { viewerToken } = await makeViewer('viewer-write')
    const res = await request(app).post('/api/clients').set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'نباید ساخته بشه', type: 'person' })
    expect(res.status).toBe(403)
  })

  it('کارمند بدون هیچ perms ای (نه ماژول، نه reports) باید همچنان ۴۰۳ بگیره', async () => {
    const { token: ownerToken } = await createTestCompany('no-perms')
    const db = (await import('../src/db.js')).default
    const company = await request(app).get('/api/company').set('Authorization', `Bearer ${ownerToken}`)
    db.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(company.body.id)

    const email = `no-perms-${Date.now()}@x.com`
    const invite = await request(app).post('/api/company-users').set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'بدون دسترسی', email, role: 'employee', permissions: {} })
    expect(invite.status).toBe(201)
    const login = await request(app).post('/api/auth/login').send({ email, password: invite.body.tempPassword })
    expect(login.status).toBe(200)
    const res = await request(app).get('/api/invoices').set('Authorization', `Bearer ${login.body.token}`)
    expect(res.status).toBe(403)
  })
})
