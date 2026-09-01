import { Router } from 'express'
import { dbGet, dbAll, dbRun, isPostgres } from '../db.js'
import { requireSuperAdmin } from '../middleware/auth.js'
import { runBackup } from '../lib/backup.js'

const router = Router()
router.use(requireSuperAdmin)

async function logAction(adminId, companyId, action, detail) {
  await dbRun(
    'INSERT INTO admin_activity_log (admin_id, company_id, action, detail) VALUES (?, ?, ?, ?)',
    [adminId, companyId, action, detail || null]
  )
}

/** لیست همه‌ی شرکت‌ها + آمار پایه هرکدوم */
router.get('/', async (req, res) => {
  const companies = await dbAll('SELECT * FROM companies ORDER BY created_at DESC')
  const withStats = await Promise.all(companies.map(async (c) => {
    const users = (await dbGet('SELECT COUNT(*) as n FROM users WHERE company_id = ?', [c.id])).n
    const invoices = (await dbGet('SELECT COUNT(*) as n FROM invoices WHERE company_id = ?', [c.id])).n
    const revenue = (await dbGet("SELECT COALESCE(SUM(grand_total),0) as s FROM invoices WHERE company_id = ? AND status = 'paid'", [c.id])).s
    return { ...c, userCount: users, invoiceCount: invoices, revenue }
  }))
  res.json(withStats)
})

router.get('/:id', async (req, res) => {
  const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.params.id])
  if (!company) return res.status(404).json({ error: 'شرکت یافت نشد' })
  const users = await dbAll('SELECT id, name, email, role, status, created_at FROM users WHERE company_id = ?', [req.params.id])
  res.json({ ...company, users })
})

/** تغییر وضعیت شرکت (فعال / تعلیق) */
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {}
  if (!['trial', 'active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'وضعیت نامعتبر' })
  }
  const info = await dbRun("UPDATE companies SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.id])
  if (info.changes === 0) return res.status(404).json({ error: 'شرکت یافت نشد' })
  await logAction(req.admin.id, req.params.id, 'change_status', status)
  res.json(await dbGet('SELECT * FROM companies WHERE id = ?', [req.params.id]))
})

/** تغییر پلن اشتراک */
router.patch('/:id/plan', async (req, res) => {
  const { plan, maxUsers } = req.body || {}
  if (!['free', 'basic', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'پلن نامعتبر' })
  }
  await dbRun(
    "UPDATE companies SET plan = ?, max_users = COALESCE(?, max_users), updated_at = datetime('now') WHERE id = ?",
    [plan, maxUsers || null, req.params.id]
  )
  await logAction(req.admin.id, req.params.id, 'change_plan', plan)
  res.json(await dbGet('SELECT * FROM companies WHERE id = ?', [req.params.id]))
})

/** لاگ فعالیت‌های ادمین */
router.get('/logs/all', async (req, res) => {
  const rows = await dbAll('SELECT * FROM admin_activity_log ORDER BY created_at DESC LIMIT 200')
  res.json(rows)
})

/**
 * گرفتن بکاپ دستی فوری — فقط توی حالت SQLite معنی داره (کپی فایل دیسک).
 * روی Postgres/Neon، بکاپ‌گیری خودِ سرویس Neon (snapshot خودکار) انجامش
 * می‌ده، پس این دکمه اونجا فعلاً غیرفعاله تا گیج‌کننده نباشه.
 */
router.post('/backup/run', async (req, res) => {
  if (isPostgres) {
    return res.status(400).json({ error: 'روی Postgres/Neon نیازی به این دکمه نیست — Neon خودش بکاپ خودکار می‌گیره.' })
  }
  const path = await runBackup()
  if (!path) return res.status(500).json({ error: 'گرفتن بکاپ ناموفق بود — لاگ سرور رو چک کن' })
  res.json({ path, at: new Date().toISOString() })
})

export default router
