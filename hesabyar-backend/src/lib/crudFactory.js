import { Router } from 'express'
import { randomUUID } from 'crypto'
import { dbGet, dbAll, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireModuleAccess } from './permissions.js'

/**
 * factory CRUD روی یک جدول (SQLite لوکال یا Postgres پروداکشن) با
 * ایزوله‌سازی خودکار بر اساس company_id. هر کاربر فقط دیتای همون شرکتی که
 * بهش تعلق داره رو می‌بینه/می‌نویسه — company_id همیشه از توکن JWT
 * (req.user.companyId) میاد، هرگز از body (تا کسی نتونه با دستکاری body
 * دیتای شرکت دیگه رو بخونه/بنویسه).
 *
 * اگه options.permissionModule پر بشه، علاوه بر لاگین‌بودن، دسترسی
 * ریزدانه‌ی کاربر به این ماژول هم چک می‌شه (owner/admin همیشه دسترسی کامل
 * دارن؛ employee فقط اگه صریحاً براش فعال شده باشه — بخش lib/permissions.js).
 */
export function makeCrudRouter(table, columns, options = {}) {
  const router = Router()
  router.use(requireAuth)
  if (options.permissionModule) {
    router.use(requireModuleAccess(options.permissionModule, { readableForReports: !!options.readableForReports }))
  }
  const logEntity = options.logEntity || null
  const labelField = options.labelField || columns[0]
  const schema = options.schema || null

  function validateBody(req, res, partial) {
    if (!schema) return true
    const s = partial ? schema.partial() : schema
    const result = s.safeParse(req.body || {})
    if (!result.success) {
      res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
      return false
    }
    return true
  }

  async function log(req, action, entityId, label, detail, before, after) {
    if (!logEntity) return
    await dbRun(
      'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail, table_name, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.companyId, req.user.id, req.user.name, action, logEntity, entityId, label || null, detail || null,
        table, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
    )
  }

  router.get('/', async (req, res) => {
    const rows = await dbAll(`SELECT * FROM ${table} WHERE company_id = ? ORDER BY updated_at DESC`, [req.user.companyId])
    res.json(rows)
  })

  router.get('/:id', async (req, res) => {
    const row = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [req.params.id, req.user.companyId])
    if (!row) return res.status(404).json({ error: 'یافت نشد' })
    res.json(row)
  })

  router.post('/', async (req, res) => {
    if (!validateBody(req, res, false)) return
    const id = req.body.id || randomUUID()
    const cols = ['id', 'company_id', ...columns]
    const values = cols.map((c) => {
      if (c === 'id') return id
      if (c === 'company_id') return req.user.companyId
      return req.body[toCamel(c)] ?? null
    })
    const placeholders = cols.map(() => '?').join(', ')
    await dbRun(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values)
    const row = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [id, req.user.companyId])
    await log(req, 'create', id, row?.[labelField], null, null, row)
    res.status(201).json(row)
  })

  router.put('/:id', async (req, res) => {
    if (!validateBody(req, res, true)) return
    const existing = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [req.params.id, req.user.companyId])
    if (!existing) return res.status(404).json({ error: 'یافت نشد' })
    const setClause = columns.map((c) => `${c} = ?`).join(', ') + ", updated_at = datetime('now')"
    const values = columns.map((c) => req.body[toCamel(c)] ?? existing[c])
    await dbRun(`UPDATE ${table} SET ${setClause} WHERE id = ? AND company_id = ?`, [...values, req.params.id, req.user.companyId])
    const row = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [req.params.id, req.user.companyId])
    await log(req, 'update', req.params.id, row?.[labelField], null, existing, row)
    res.json(row)
  })

  router.delete('/:id', async (req, res) => {
    const existing = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [req.params.id, req.user.companyId])
    const info = await dbRun(`DELETE FROM ${table} WHERE id = ? AND company_id = ?`, [req.params.id, req.user.companyId])
    if (info.changes === 0) return res.status(404).json({ error: 'یافت نشد' })
    await log(req, 'delete', req.params.id, existing?.[labelField], null, existing, null)
    res.status(204).end()
  })

  return router
}

function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
