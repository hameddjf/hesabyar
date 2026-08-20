import { Router } from 'express'
import db from '../db.js'
import { requireSuperAdmin } from '../middleware/auth.js'
import { runBackup } from '../lib/backup.js'

const router = Router()
router.use(requireSuperAdmin)

function logAction(adminId, companyId, action, detail) {
  db.prepare('INSERT INTO admin_activity_log (admin_id, company_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(adminId, companyId, action, detail || null)
}

/** لیست همه‌ی شرکت‌ها + آمار پایه هرکدوم */
router.get('/', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all()
  const withStats = companies.map((c) => {
    const users = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(c.id).n
    const invoices = db.prepare('SELECT COUNT(*) as n FROM invoices WHERE company_id = ?').get(c.id).n
    const revenue = db.prepare("SELECT COALESCE(SUM(grand_total),0) as s FROM invoices WHERE company_id = ? AND status = 'paid'").get(c.id).s
    return { ...c, userCount: users, invoiceCount: invoices, revenue }
  })
  res.json(withStats)
})

router.get('/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id)
  if (!company) return res.status(404).json({ error: 'شرکت یافت نشد' })
  const users = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE company_id = ?').all(req.params.id)
  res.json({ ...company, users })
})

/** تغییر وضعیت شرکت (فعال / تعلیق) */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {}
  if (!['trial', 'active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'وضعیت نامعتبر' })
  }
  const info = db.prepare("UPDATE companies SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'شرکت یافت نشد' })
  logAction(req.admin.id, req.params.id, 'change_status', status)
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id))
})

/** تغییر پلن اشتراک */
router.patch('/:id/plan', (req, res) => {
  const { plan, maxUsers } = req.body || {}
  if (!['free', 'basic', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'پلن نامعتبر' })
  }
  db.prepare("UPDATE companies SET plan = ?, max_users = COALESCE(?, max_users), updated_at = datetime('now') WHERE id = ?")
    .run(plan, maxUsers || null, req.params.id)
  logAction(req.admin.id, req.params.id, 'change_plan', plan)
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id))
})

/** لاگ فعالیت‌های ادمین */
router.get('/logs/all', (req, res) => {
  const rows = db.prepare('SELECT * FROM admin_activity_log ORDER BY created_at DESC LIMIT 200').all()
  res.json(rows)
})

/** گرفتن بکاپ دستی فوری از دیتابیس (علاوه بر بکاپ خودکار روزانه) */
router.post('/backup/run', async (req, res) => {
  const path = await runBackup()
  if (!path) return res.status(500).json({ error: 'گرفتن بکاپ ناموفق بود — لاگ سرور رو چک کن' })
  res.json({ path, at: new Date().toISOString() })
})

export default router
