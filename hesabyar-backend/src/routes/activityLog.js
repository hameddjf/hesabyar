import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM activity_log WHERE company_id = ? ORDER BY created_at DESC LIMIT 200').all(req.user.companyId)
  res.json(rows)
})

/* جدول‌هایی که واقعاً از crudFactory میان و اسنپ‌شات معتبر دارن — لیست سفید امنیتی
   تا هیچ‌وقت روی جدول‌های حساس (companies, users, ...) اجرا نشه. */
const ROLLBACKABLE_TABLES = new Set([
  'clients', 'products', 'invoices', 'payments', 'employees', 'partners', 'banking_accounts',
  'partner_transactions',
])

/**
 * بازگردانی یک آیتم لاگ فعالیت:
 * - create  → رکورد ساخته‌شده حذف می‌شه
 * - update  → رکورد به مقدار before_json برمی‌گرده
 * - delete  → رکورد حذف‌شده دوباره درج می‌شه (از روی before_json)
 * فقط مالک شرکت (owner) اجازه‌ی این کار رو داره، و هر لاگ فقط یک‌بار قابل بازگردانیه.
 */
router.post('/:id/rollback', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'فقط مالک شرکت می‌تواند فعالیت‌ها را بازگردانی کند' })
  }

  const entry = db.prepare('SELECT * FROM activity_log WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!entry) return res.status(404).json({ error: 'یافت نشد' })
  if (entry.rolled_back) return res.status(400).json({ error: 'این فعالیت قبلاً بازگردانی شده است' })
  if (!entry.table_name || !ROLLBACKABLE_TABLES.has(entry.table_name)) {
    return res.status(400).json({ error: 'این نوع فعالیت قابل بازگردانی نیست' })
  }

  const table = entry.table_name
  const before = entry.before_json ? JSON.parse(entry.before_json) : null

  try {
    if (entry.action === 'create') {
      db.prepare(`DELETE FROM ${table} WHERE id = ? AND company_id = ?`).run(entry.entity_id, req.user.companyId)
    } else if (entry.action === 'update') {
      if (!before) return res.status(400).json({ error: 'اطلاعات قبلی این رکورد ثبت نشده است' })
      const cols = Object.keys(before).filter((c) => c !== 'id' && c !== 'company_id')
      const setClause = cols.map((c) => `${c} = ?`).join(', ')
      const values = cols.map((c) => before[c])
      const info = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ? AND company_id = ?`).run(...values, entry.entity_id, req.user.companyId)
      if (info.changes === 0) return res.status(404).json({ error: 'رکورد اصلی دیگر وجود ندارد (شاید بعداً حذف شده)' })
    } else if (entry.action === 'delete') {
      if (!before) return res.status(400).json({ error: 'اطلاعات این رکورد برای بازگردانی ثبت نشده است' })
      const existsAgain = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND company_id = ?`).get(entry.entity_id, req.user.companyId)
      if (existsAgain) return res.status(409).json({ error: 'رکوردی با همین شناسه از قبل وجود دارد' })
      const cols = Object.keys(before)
      const placeholders = cols.map(() => '?').join(', ')
      const values = cols.map((c) => before[c])
      db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values)
    } else {
      return res.status(400).json({ error: 'نوع عملیات پشتیبانی نمی‌شود' })
    }
  } catch (err) {
    return res.status(500).json({ error: 'بازگردانی با خطا مواجه شد', detail: err.message })
  }

  db.prepare('UPDATE activity_log SET rolled_back = 1 WHERE id = ?').run(entry.id)
  db.prepare(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.companyId, req.user.id, req.user.name, 'rollback', entry.entity, entry.entity_id, entry.entity_label, `بازگردانی فعالیت #${entry.id}`)

  res.json({ ok: true })
})

export default router
