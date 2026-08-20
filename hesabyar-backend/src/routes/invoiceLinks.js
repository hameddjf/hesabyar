import { Router } from 'express'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function computeInvoiceBalance(invoiceId, companyId) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(invoiceId, companyId)
  if (!invoice) return null

  const paid = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ? AND company_id = ?')
    .get(invoiceId, companyId).total

  const transferredOut = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoice_links WHERE from_invoice_id = ? AND company_id = ?')
    .get(invoiceId, companyId).total

  const transferredIn = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoice_links WHERE to_invoice_id = ? AND company_id = ?')
    .get(invoiceId, companyId).total

  const balance = invoice.grand_total - paid - transferredOut + transferredIn
  return { invoice, paid, transferredOut, transferredIn, balance }
}

router.get('/balance/:invoiceId', (req, res) => {
  const result = computeInvoiceBalance(req.params.invoiceId, req.user.companyId)
  if (!result) return res.status(404).json({ error: 'فاکتور یافت نشد' })
  res.json(result)
})

router.get('/for/:invoiceId', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM invoice_links WHERE (from_invoice_id = ? OR to_invoice_id = ?) AND company_id = ? ORDER BY created_at DESC')
    .all(req.params.invoiceId, req.params.invoiceId, req.user.companyId)
  res.json(rows)
})

router.post('/', (req, res) => {
  const { fromInvoiceId, toInvoiceId, amount, description } = req.body || {}
  if (!fromInvoiceId || !toInvoiceId || !amount) {
    return res.status(400).json({ error: 'fromInvoiceId, toInvoiceId, amount الزامی هستن' })
  }
  if (fromInvoiceId === toInvoiceId) {
    return res.status(400).json({ error: 'یک فاکتور نمی‌تونه به خودش منتقل بشه' })
  }

  const from = db.prepare('SELECT id FROM invoices WHERE id = ? AND company_id = ?').get(fromInvoiceId, req.user.companyId)
  const to = db.prepare('SELECT id FROM invoices WHERE id = ? AND company_id = ?').get(toInvoiceId, req.user.companyId)
  if (!from || !to) return res.status(404).json({ error: 'یکی از فاکتورها یافت نشد' })

  const fromBalance = computeInvoiceBalance(fromInvoiceId, req.user.companyId)
  let warning = null
  if (fromBalance.balance > -Number(amount) + 1e-6 && fromBalance.balance >= 0) {
    warning = 'فاکتور مبدا مانده‌ی بستانکاری کافی برای این مبلغ نداره؛ لینک با این حال ثبت شد، لطفا دستی چک کن.'
  }

  const id = randomUUID()
  db.prepare(
    'INSERT INTO invoice_links (id, company_id, from_invoice_id, to_invoice_id, amount, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.companyId, fromInvoiceId, toInvoiceId, amount, description || null)

  const link = db.prepare('SELECT * FROM invoice_links WHERE id = ? AND company_id = ?').get(id, req.user.companyId)
  res.status(201).json({
    link, warning,
    fromBalance: computeInvoiceBalance(fromInvoiceId, req.user.companyId),
    toBalance: computeInvoiceBalance(toInvoiceId, req.user.companyId),
  })
})

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM invoice_links WHERE id = ? AND company_id = ?').run(req.params.id, req.user.companyId)
  if (info.changes === 0) return res.status(404).json({ error: 'یافت نشد' })
  res.status(204).end()
})

export default router
export { computeInvoiceBalance }
