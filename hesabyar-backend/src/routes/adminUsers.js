import { Router } from 'express'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { requireSuperAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireSuperAdmin)

function logAction(adminId, companyId, action, detail) {
  db.prepare('INSERT INTO admin_activity_log (admin_id, company_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(adminId, companyId, action, detail || null)
}

/** لیست همه‌ی کاربران همه‌ی شرکت‌ها (برای دید کلی سوپرادمین) */
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.last_login_at, u.created_at,
           c.id as company_id, c.name as company_name
    FROM users u JOIN companies c ON c.id = u.company_id
    ORDER BY u.created_at DESC
  `).all()
  res.json(rows)
})

/** تعلیق / فعال‌سازی یک کاربر (اقدام سطح پلتفرم، جدا از سطح مالک شرکت) */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {}
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'وضعیت نامعتبر' })
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id)
  logAction(req.admin.id, target.company_id, status === 'suspended' ? 'suspend_user' : 'activate_user', target.email)
  res.json({ ...target, status, password_hash: undefined })
})

/**
 * ریست رمز عبور یک کاربر توسط سوپرادمین (مثلاً وقتی کاربر دسترسیش رو گم کرده).
 * رمز موقت مستقیم برگردونده می‌شه چون سرویس ایمیل هنوز وصل نیست.
 */
router.post('/:id/reset-password', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })

  const tempPassword = randomBytes(6).toString('base64url')
  const hash = bcrypt.hashSync(tempPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id)
  logAction(req.admin.id, target.company_id, 'reset_password', target.email)

  res.json({ tempPassword, note: 'این رمز موقت رو از طریق یک کانال امن به کاربر برسون (سرویس ایمیل هنوز وصل نیست).' })
})

export default router
