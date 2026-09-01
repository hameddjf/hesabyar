import { Router } from 'express'
import { randomUUID } from 'crypto'
import { dbGet, dbAll, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireModuleAccess } from '../lib/permissions.js'
import { checkSchema, checkStatusChangeSchema } from '../lib/schemas.js'

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

async function logActivity(req, action, entityId, label, detail, before, after) {
  await dbRun(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail, table_name, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.companyId, req.user.id, req.user.name, action, 'check', entityId, label || null, detail || null,
      'checks', before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
  )
}

router.get('/summary', async (req, res) => {
  const rows = await dbAll('SELECT direction, status, amount FROM checks WHERE company_id = ?', [req.user.companyId])

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

router.get('/upcoming', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90)
  const now = new Date()
  const windowEnd = new Date(now.getTime() + days * 86400000)
  const rows = await dbAll(
    `SELECT * FROM checks WHERE company_id = ? AND status IN ('in_hand','deposited','passed_on') ORDER BY due_date ASC`,
    [req.user.companyId]
  )
  const upcoming = rows.filter((r) => {
    if (!r.due_date || !/^\d{4}-\d{2}-\d{2}/.test(r.due_date)) return false
    const d = new Date(r.due_date)
    return !Number.isNaN(d.getTime()) && d <= windowEnd
  })
  res.json(upcoming)
})

router.get('/', async (req, res) => {
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
  res.json(await dbAll(sql, params))
})

router.get('/:id', async (req, res) => {
  const row = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!row) return res.status(404).json({ error: 'چک یافت نشد' })
  res.json(row)
})

router.get('/:id/history', async (req, res) => {
  const check = await dbGet('SELECT id FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!check) return res.status(404).json({ error: 'چک یافت نشد' })
  const rows = await dbAll(
    'SELECT * FROM check_status_log WHERE check_id = ? AND company_id = ? ORDER BY created_at ASC',
    [req.params.id, req.user.companyId]
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
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
  await dbRun(`INSERT INTO checks (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values)
  const row = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [id, req.user.companyId])

  await dbRun(
    'INSERT INTO check_status_log (check_id, company_id, from_status, to_status, note, user_id, user_name) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    [id, req.user.companyId, row.status, 'ثبت اولیه‌ی چک', req.user.id, req.user.name]
  )

  await logActivity(req, 'create', id, row.check_number || row.id, null, null, row)
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const parsed = checkSchema.partial().safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
  }
  const existing = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!existing) return res.status(404).json({ error: 'چک یافت نشد' })

  const EDITABLE = COLUMNS.filter((c) => c !== 'status')
  const setClause = EDITABLE.map((c) => `${c} = ?`).join(', ') + ", updated_at = datetime('now')"
  const values = EDITABLE.map((c) => req.body[toCamel(c)] ?? existing[c])
  await dbRun(`UPDATE checks SET ${setClause} WHERE id = ? AND company_id = ?`, [...values, req.params.id, req.user.companyId])

  const row = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  await logActivity(req, 'update', req.params.id, row.check_number || row.id, null, existing, row)
  res.json(row)
})

router.post('/:id/status', async (req, res) => {
  const parsed = checkStatusChangeSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'وضعیت نامعتبر است' })
  }
  const { status: newStatus, note } = parsed.data

  const existing = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!existing) return res.status(404).json({ error: 'چک یافت نشد' })

  const allowed = ALLOWED_TRANSITIONS[existing.status] || []
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({
      error: `تغییر وضعیت از «${STATUS_LABELS[existing.status]}» به «${STATUS_LABELS[newStatus]}» مجاز نیست.`,
      allowedNextStatuses: allowed,
    })
  }

  await dbRun("UPDATE checks SET status = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?", [newStatus, req.params.id, req.user.companyId])
  await dbRun(
    'INSERT INTO check_status_log (check_id, company_id, from_status, to_status, note, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, req.user.companyId, existing.status, newStatus, note || null, req.user.id, req.user.name]
  )

  const row = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  await logActivity(req, 'status_change', req.params.id, row.check_number || row.id,
    `${STATUS_LABELS[existing.status]} ← ${STATUS_LABELS[newStatus]}`, existing, row)
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  const existing = await dbGet('SELECT * FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  const info = await dbRun('DELETE FROM checks WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (info.changes === 0) return res.status(404).json({ error: 'چک یافت نشد' })
  await dbRun('DELETE FROM check_status_log WHERE check_id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  await logActivity(req, 'delete', req.params.id, existing?.check_number || existing?.id, null, existing, null)
  res.status(204).end()
})

export default router
