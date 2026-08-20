import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import db from './db.js'

// ── شرکت و کاربر پیش‌فرض (برای تست پنل عادی) ──
const ownerEmail = 'owner@hesabyar.local'
const ownerPassword = '123456'

const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(ownerEmail)
if (existingUser) {
  console.log('کاربر پیش‌فرض از قبل وجود داره:', ownerEmail)
} else {
  const companyId = randomUUID()
  db.prepare(
    'INSERT INTO companies (id, name, owner_name, owner_email, plan, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(companyId, 'شرکت تستی حسابیار', 'مالک پیش‌فرض', ownerEmail, 'pro', 'active')

  const hash = bcrypt.hashSync(ownerPassword, 10)
  db.prepare('INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(companyId, 'مالک پیش‌فرض', ownerEmail, hash, 'owner')

  console.log('شرکت + کاربر پیش‌فرض ساخته شد:')
  console.log('  email:', ownerEmail)
  console.log('  password:', ownerPassword)
}

// ── سوپرادمین پیش‌فرض (برای تست پنل ادمین) ──
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'superadmin@hesabyar.local'
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'

const existingAdmin = db.prepare('SELECT id FROM super_admins WHERE email = ?').get(adminEmail)
if (existingAdmin) {
  console.log('سوپرادمین از قبل وجود داره:', adminEmail)
} else {
  const hash = bcrypt.hashSync(adminPassword, 10)
  db.prepare('INSERT INTO super_admins (name, email, password_hash) VALUES (?, ?, ?)')
    .run('مدیر ارشد سیستم', adminEmail, hash)
  console.log('سوپرادمین ساخته شد:')
  console.log('  email:', adminEmail)
  console.log('  password:', adminPassword)
  console.log('  ⚠️  حتما بعد از اولین ورود این رمز رو عوض کن و SEED_ADMIN_* رو از .env پاک کن.')
}
