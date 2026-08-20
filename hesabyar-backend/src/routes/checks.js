import { Router } from 'express'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireModuleAccess } from '../lib/permissions.js'
import { checkSchema, checkStatusChangeSchema } from '../lib/schemas.js'

/*
 * مدیریت دسته چک — چک‌های دریافتنی (از مشتری) و پرداختنی (به تأمین‌کننده).
 *
 * چرا این جدا از crudFactory معمولیه؟
 * چون یک چک برخلاف بقیه‌ی رکوردها فقط create/update/delete نداره؛ یک
 * گردش‌کار وضعیت مشخص داره (نزد ما → بانک → وصول‌شده/برگشتی) که هر تغییرش
 * باید توی تاریخچه ثبت بشه، نه با overwrite ساده‌ی PUT گم بشه.
 *
 * گردش‌کار مجاز وضعیت‌ها:
 *   in_hand   (نزد ما)      -> deposited, passed_on, cancelled
 *   deposited (نزد بانک)    -> cleared, bounced
 *   bounced   (برگشت خورده) -> in_hand, cancelled
 *   passed_on (خرج شده/جابه‌جا) -> cleared, bounced
 *   cleared   (وصول‌شده)    -> (نهایی، تغییر نمی‌کنه)
 *   cancelled (باطل‌شده)    -> (نهایی، تغییر نمی‌کنه)
 */

const ALLOWED_TRANSITIONS = {
  in_hand: ['deposited', 'passed_on', 'cancelled'],
  deposited: ['cleared', 'bounced'],
  bounced: ['in_hand', 'cancelled'],
  passed_on: ['cleared', 'bounced'],
  cleared: [],
  cancelled: [],
}

const STATUS_LABELS = {
  in_hand: 'نزد ما',
  deposited: 'نزد بانک (در جریان وصول)',
  cleared: 'وصول‌شده',
  bounced: 'برگشت‌خورده',
  passed_on: 'خرج‌شده / جابه‌جا شده',
  cancelled: 'باطل‌شده',
}

const COLUMNS = [
  'direction', 'check_number', 'sayad_id', 'bank_name', 'branch', 'amount',
  'issue_date', 'due_date', 'party_name', 'client_id', 'invoice_id',
  'status', 'description',
]

const router = Router()
router.use(requireAuth)
router.use(requireModuleAccess('checks'))

function toCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) }

function logActivity(req, action, entityId, label, detail, before, after) {
  db.prepare(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail, table_name, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.user.companyId, req.user.id, req.user.name, action, 'check', entityId, label || null, detail || null,
    'checks', before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null
  )
}

/** خلاصه‌ی وضعیت دسته چک — برای کارت‌های آماری داشبورد/صفحه‌ی چک‌ها.
 *  باید قبل از GET /:id بیاد وگرنه اکسپرس «summary» رو به‌عنوان :id تفسیر می‌کنه. */
router.get('/summary', (req, res) => {
  const rows = db.prepare(
    'SELECT direction, status, amount FROM checks WHERE company_id = ?'
  ).all(req.user.companyId)

  const summary = {
    received: { in_hand: 0, deposited: 0, cleared: 0, bounced: 0, passed_on: 0, cancelled: 0, totalOpenAmount: 0 },
    issued: { in_hand: 0, deposited: 0, cleared: 0, bounced: 0, passed_on: 0, cancelled: 0, totalOpenAmount: 0 },
  }
  const OPEN_STATUSES = new Set(['in_hand', 'deposited', 'passed_on'])
  for (const r of rows) {
    if (!summary[r.direction]) continue
    summary[r.direction][r.status] = (summary[r.direction][r.status] || 0) + 1
    if (OPEN_STATUSES.has(r.status)) summary[r.direction].totalOpenAmount += r.amount
  }
  res.json(summary)
})

/** چک‌های نزدیک به سررسید (برای بخش اعلان‌ها/داشبورد) */
router.get('/upcoming', (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90)
  const now = new Date()
  const windowEnd = new Date(now.getTime() + days * 86400000)
  const rows = db.prepare(
    `SELECT * FROM checks WHERE company_id = ? AND status IN ('in_hand','deposited','passed_on') ORDER BY due_date ASC`
  ).all(req.user.companyId)
  const upcoming = rows.filter((r) => {
    if (!r.due_date || !/^\d{4}-\d{2}-\d{2}/.test(r.due_date)) return false
    const d = new Date(r.due_date)
    return !Number.isNaN(d.getTime()) && d <= windowEnd
  })
  res.json(upcoming)
})

router.get('/', (req, res) => {
  const { direction, status } = req.query
  let sql = 'SELECT * FROM checks WHERE company_id = ?'
  const params = [req.user.companyId]
  if (direction && ['received', 'issued'].includes(direction)) {
    sql += ' AND direction = ?'
    params.push(direction)
  }
  if (status && STATUS_LABELS[status]) {
    sql += ' AND status = ?'
    params.push(status)
  }
  sql += ' ORDER BY due_date ASC, updated_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!row) return res.status(404).json({ error: 'چک یافت نشد' })
  res.json(row)
})

router.get('/:id/history', (req, res) => {
  const check = db.prepare('SELECT id FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!check) return res.status(404).json({ error: 'چک یافت نشد' })
  const rows = db.prepare(
    'SELECT * FROM check_status_log WHERE check_id = ? AND company_id = ? ORDER BY created_at ASC'
  ).all(req.params.id, req.user.companyId)
  res.json(rows)
})

router.post('/', (req, res) => {
  const parsed = checkSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
  }
  const id = randomUUID()
  const cols = ['id', 'company_id', ...COLUMNS]
  const values = cols.map((c) => {
    if (c === 'id') return id
    if (c === 'company_id') return req.user.companyId
    return req.body[toCamel(c)] ?? (c === 'status' ? 'in_hand' : null)
  })
  db.prepare(`INSERT INTO checks (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...values)
  const row = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(id, req.user.companyId)

  db.prepare(
    'INSERT INTO check_status_log (check_id, company_id, from_status, to_status, note, user_id, user_name) VALUES (?, ?, NULL, ?, ?, ?, ?)'
  ).run(id, req.user.companyId, row.status, 'ثبت اولیه‌ی چک', req.user.id, req.user.name)

  logActivity(req, 'create', id, row.check_number || row.id, null, null, row)
  res.status(201).json(row)
})

router.put('/:id', (req, res) => {
  const parsed = checkSchema.partial().safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
  }
  const existing = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!existing) return res.status(404).json({ error: 'چک یافت نشد' })

  // تغییر وضعیت از این مسیر مجاز نیست — باید از POST /:id/status بیاد تا تاریخچه ثبت بشه
  const EDITABLE = COLUMNS.filter((c) => c !== 'status')
  const setClause = EDITABLE.map((c) => `${c} = ?`).join(', ') + ", updated_at = datetime('now')"
  const values = EDITABLE.map((c) => req.body[toCamel(c)] ?? existing[c])
  db.prepare(`UPDATE checks SET ${setClause} WHERE id = ? AND company_id = ?`).run(...values, req.params.id, req.user.companyId)

  const row = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  logActivity(req, 'update', req.params.id, row.check_number || row.id, null, existing, row)
  res.json(row)
})

/** تغییر وضعیت چک — تنها راه مجاز برای عوض‌کردن status، چون تاریخچه ثبت می‌کنه */
router.post('/:id/status', (req, res) => {
  const parsed = checkStatusChangeSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'وضعیت نامعتبر است' })
  }
  const { status: newStatus, note } = parsed.data

  const existing = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!existing) return res.status(404).json({ error: 'چک یافت نشد' })

  const allowed = ALLOWED_TRANSITIONS[existing.status] || []
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({
      error: `تغییر وضعیت از «${STATUS_LABELS[existing.status]}» به «${STATUS_LABELS[newStatus]}» مجاز نیست.`,
      allowedNextStatuses: allowed,
    })
  }

  db.prepare("UPDATE checks SET status = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?")
    .run(newStatus, req.params.id, req.user.companyId)
  db.prepare(
    'INSERT INTO check_status_log (check_id, company_id, from_status, to_status, note, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, req.user.companyId, existing.status, newStatus, note || null, req.user.id, req.user.name)

  const row = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  logActivity(req, 'status_change', req.params.id, row.check_number || row.id,
    `${STATUS_LABELS[existing.status]} ← ${STATUS_LABELS[newStatus]}`, existing, row)
  res.json(row)
})

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM checks WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  const info = db.prepare('DELETE FROM checks WHERE id = ? AND company_id = ?').run(req.params.id, req.user.companyId)
  if (info.changes === 0) return res.status(404).json({ error: 'چک یافت نشد' })
  db.prepare('DELETE FROM check_status_log WHERE check_id = ? AND company_id = ?').run(req.params.id, req.user.companyId)
  logActivity(req, 'delete', req.params.id, existing?.check_number || existing?.id, null, existing, null)
  res.status(204).end()
})

export default router
