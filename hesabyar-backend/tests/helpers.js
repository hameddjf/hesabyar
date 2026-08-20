import request from 'supertest'
import app from '../src/server.js'

let counter = 0

/** یک شرکت جدید تستی می‌سازه و توکن معتبرش رو برمی‌گردونه */
export async function createTestCompany(prefix = 'test') {
  counter += 1
  const email = `${prefix}-${Date.now()}-${counter}@x.com`
  const res = await request(app).post('/api/auth/register').send({
    name: 'کاربر تست', email, password: '123456', companyName: `شرکت ${prefix}`,
  })
  if (res.status !== 200) throw new Error(`ساخت شرکت تستی شکست خورد: ${JSON.stringify(res.body)}`)
  return { token: res.body.token, user: res.body.user, company: res.body.company, email }
}

export { app, request }
