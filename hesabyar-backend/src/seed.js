import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { dbGet, dbRun } from './db.js'

/**
 * ساخت کاربر/سوپرادمین پیش‌فرض — امن به اجرای مکرره (idempotent، هر بار
 * چک می‌کنه از قبل هست یا نه). هم از خط فرمان قابل اجراست (node src/seed.js)
 * هم از server.js موقع بالا اومدن صدا زده می‌شه — چون توی پلن رایگان Render
 * دسترسی Shell نیست، این تنها راهیه که بدون Shell کاربر اولیه ساخته بشه.
 */
export async function runSeed() {
  const ownerEmail = 'owner@hesabyar.local'
  const ownerPassword = '123456'

  const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [ownerEmail])
  if (existingUser) {
    console.log('کاربر پیش‌فرض از قبل وجود داره:', ownerEmail)
  } else {
    const companyId = randomUUID()
    await dbRun(
      'INSERT INTO companies (id, name, owner_name, owner_email, plan, status) VALUES (?, ?, ?, ?, ?, ?)',
      [companyId, 'شرکت تستی حسابیار', 'مالک پیش‌فرض', ownerEmail, 'pro', 'active']
    )

    const hash = bcrypt.hashSync(ownerPassword, 10)
    await dbRun(
      'INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [companyId, 'مالک پیش‌فرض', ownerEmail, hash, 'owner']
    )

    console.log('شرکت + کاربر پیش‌فرض ساخته شد:')
    console.log('  email:', ownerEmail)
    console.log('  password:', ownerPassword)
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'superadmin@hesabyar.local'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'

  const existingAdmin = await dbGet('SELECT id FROM super_admins WHERE email = ?', [adminEmail])
  if (existingAdmin) {
    console.log('سوپرادمین از قبل وجود داره:', adminEmail)
  } else {
    const hash = bcrypt.hashSync(adminPassword, 10)
    await dbRun('INSERT INTO super_admins (name, email, password_hash) VALUES (?, ?, ?)', ['مدیر ارشد سیستم', adminEmail, hash])
    console.log('سوپرادمین ساخته شد:')
    console.log('  email:', adminEmail)
    console.log('  password:', adminPassword)
    console.log('  ⚠️  حتما بعد از اولین ورود این رمز رو عوض کن و SEED_ADMIN_* رو از .env پاک کن.')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runSeed()
  process.exit(0)
}
