import { Router } from 'express'
import { dbAll } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const WINDOW_DAYS = 7

function parseISOStrict(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}/.test(str)) return null
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

router.get('/', async (req, res) => {
  const companyId = req.user.companyId
  const now = new Date()
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 86400000)

  const invoices = await dbAll(`
    SELECT id, invoice_number, due_date, grand_total, client_id, status
    FROM invoices WHERE company_id = ? AND status IN ('pending','overdue')
  `, [companyId])

  const clientRows = await dbAll('SELECT id, name FROM clients WHERE company_id = ?', [companyId])
  const clientsById = Object.fromEntries(clientRows.map(c => [c.id, c.name]))

  const invoiceAlerts = invoices.map(inv => {
    const d = parseISOStrict(inv.due_date)
    if (!d) return null
    if (d > windowEnd) return null
    return {
      type: 'invoice',
      id: inv.id,
      label: inv.invoice_number || inv.id,
      detail: clientsById[inv.client_id] || '—',
      amount: inv.grand_total,
      dueDate: inv.due_date,
      overdue: d < now,
    }
  }).filter(Boolean)

  const checks = await dbAll(`
    SELECT id, check_number, due_date, amount, description, status, direction
    FROM checks
    WHERE company_id = ? AND status IN ('in_hand','deposited','passed_on')
  `, [companyId])

  const newCheckAlerts = checks.map(c => {
    const d = parseISOStrict(c.due_date)
    if (!d) return null
    if (d > windowEnd) return null
    return {
      type: 'check',
      id: c.id,
      label: `چک ${c.direction === 'received' ? 'دریافتنی' : 'پرداختنی'} ${c.check_number || ''}`.trim(),
      detail: c.description || '—',
      amount: c.amount,
      dueDate: c.due_date,
      overdue: d < now,
    }
  }).filter(Boolean)

  const legacyChecks = await dbAll(`
    SELECT id, check_number, check_date, amount, description, status
    FROM payments
    WHERE company_id = ? AND check_number IS NOT NULL AND check_number != '' AND status != 'done'
  `, [companyId])

  const checkAlerts = legacyChecks.map(p => {
    const d = parseISOStrict(p.check_date)
    if (!d) return null
    if (d > windowEnd) return null
    return {
      type: 'check',
      id: p.id,
      label: `چک ${p.check_number}`,
      detail: p.description || '—',
      amount: p.amount,
      dueDate: p.check_date,
      overdue: d < now,
    }
  }).filter(Boolean)

  const alerts = [...invoiceAlerts, ...newCheckAlerts, ...checkAlerts].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  res.json(alerts)
})

export default router
