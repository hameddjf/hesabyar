import { describe, it, expect, beforeAll } from 'vitest'
import { app, request, createTestCompany } from './helpers.js'
import db from '../src/db.js'

/** آخرین ردیف activity_log مربوط به یک entity_id مشخص رو برمی‌گردونه */
async function findLog(token, entityId, action) {
  const res = await request(app).get('/api/activity-log').set('Authorization', `Bearer ${token}`)
  return res.body.find((l) => l.entity_id === entityId && l.action === action)
}

describe('Rollback فعالیت‌ها', () => {
  let token, employeeToken

  beforeAll(async () => {
    const setup = await createTestCompany('rollback')
    token = setup.token
    db.prepare('UPDATE companies SET max_users = 5 WHERE id = ?').run(setup.company.id)
    // یک کارمند برای تست محدودیت نقش (فقط owner)
    const invite = await request(app).post('/api/company-users').set('Authorization', `Bearer ${token}`)
      .send({ name: 'کارمند تست', email: `rb-emp-${Date.now()}@x.com`, role: 'employee' })
    expect(invite.status).toBe(201)
    const login = await request(app).post('/api/auth/login')
      .send({ email: invite.body.user.email, password: invite.body.tempPassword })
    employeeToken = login.body.token
  })

  it('rollback یک create باید رکورد ساخته‌شده رو حذف کنه', async () => {
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری رول‌بک ۱', type: 'company' })
    expect(create.status).toBe(201)
    const clientId = create.body.id

    const log = await findLog(token, clientId, 'create')
    expect(log).toBeTruthy()

    const rb = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${token}`)
    expect(rb.status).toBe(200)

    const check = await request(app).get(`/api/clients/${clientId}`).set('Authorization', `Bearer ${token}`)
    expect(check.status).toBe(404)
  })

  it('rollback یک update باید مقدار قبلی رو برگردونه', async () => {
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'نام اولیه', type: 'company' })
    const clientId = create.body.id

    const update = await request(app).put(`/api/clients/${clientId}`).set('Authorization', `Bearer ${token}`)
      .send({ name: 'نام تغییریافته' })
    expect(update.status).toBe(200)
    expect(update.body.name).toBe('نام تغییریافته')

    const log = await findLog(token, clientId, 'update')
    const rb = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${token}`)
    expect(rb.status).toBe(200)

    const check = await request(app).get(`/api/clients/${clientId}`).set('Authorization', `Bearer ${token}`)
    expect(check.body.name).toBe('نام اولیه')
  })

  it('rollback یک delete باید رکورد حذف‌شده رو دوباره بسازه', async () => {
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری حذف‌شدنی', type: 'company' })
    const clientId = create.body.id

    const del = await request(app).delete(`/api/clients/${clientId}`).set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const log = await findLog(token, clientId, 'delete')
    const rb = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${token}`)
    expect(rb.status).toBe(200)

    const check = await request(app).get(`/api/clients/${clientId}`).set('Authorization', `Bearer ${token}`)
    expect(check.status).toBe(200)
    expect(check.body.name).toBe('مشتری حذف‌شدنی')
  })

  it('یک لاگ نباید دوبار قابل بازگردانی باشه', async () => {
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری دوبار رول‌بک', type: 'company' })
    const clientId = create.body.id
    const log = await findLog(token, clientId, 'create')

    const first = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${token}`)
    expect(first.status).toBe(200)

    const second = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${token}`)
    expect(second.status).toBe(400)
  })

  it('کارمند (غیر از owner) نباید بتونه rollback کنه', async () => {
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری تست نقش', type: 'company' })
    const clientId = create.body.id
    const log = await findLog(token, clientId, 'create')

    const rb = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${employeeToken}`)
    expect(rb.status).toBe(403)
  })

  it('یک شرکت نباید بتونه لاگ فعالیت شرکت دیگه رو rollback کنه', async () => {
    const { token: otherToken } = await createTestCompany('rollback-other')
    const create = await request(app).post('/api/clients').set('Authorization', `Bearer ${token}`)
      .send({ name: 'مشتری ایزوله', type: 'company' })
    const clientId = create.body.id
    const log = await findLog(token, clientId, 'create')

    const rb = await request(app).post(`/api/activity-log/${log.id}/rollback`).set('Authorization', `Bearer ${otherToken}`)
    expect(rb.status).toBe(404)
  })
})
