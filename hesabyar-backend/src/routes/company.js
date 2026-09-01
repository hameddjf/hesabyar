import { Router } from 'express'
import { dbGet, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { verifyMailConfig } from '../lib/mailer.js'

const router = Router()
router.use(requireAuth)

const EDITABLE_FIELDS = [
  'name', 'national_code', 'phone', 'email', 'website', 'industry',
  'address', 'currency', 'default_tax_rate', 'invoice_number_format',
]

function toCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) }

router.get('/', async (req, res) => {
  const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.user.companyId])
  if (!company) return res.status(404).json({ error: 'شرکت یافت نشد' })
  res.json(company)
})

router.get('/mail-status', async (req, res) => {
  const result = await verifyMailConfig()
  res.json(result)
})

router.put('/', async (req, res) => {
  if (!['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'فقط مالک یا مدیر می‌تونه اطلاعات شرکت رو ویرایش کنه' })
  }
  const existing = await dbGet('SELECT * FROM companies WHERE id = ?', [req.user.companyId])
  if (!existing) return res.status(404).json({ error: 'شرکت یافت نشد' })

  const setClause = EDITABLE_FIELDS.map((c) => `${c} = ?`).join(', ') + ", updated_at = datetime('now')"
  const values = EDITABLE_FIELDS.map((c) => req.body[toCamel(c)] ?? existing[c])
  await dbRun(`UPDATE companies SET ${setClause} WHERE id = ?`, [...values, req.user.companyId])

  res.json(await dbGet('SELECT * FROM companies WHERE id = ?', [req.user.companyId]))
})

export default router
