import { Router } from 'express'
import { randomUUID } from 'crypto'
import { dbGet, dbAll, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function computeInvoiceBalance(invoiceId, companyId) {
  const invoice = await dbGet('SELECT * FROM invoices WHERE id = ? AND company_id = ?', [invoiceId, companyId])
  if (!invoice) return null

  const paidRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ? AND company_id = ?', [invoiceId, companyId])
  const outRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM invoice_links WHERE from_invoice_id = ? AND company_id = ?', [invoiceId, companyId])
  const inRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM invoice_links WHERE to_invoice_id = ? AND company_id = ?', [invoiceId, companyId])

  const paid = Number(paidRow.total)
  const transferredOut = Number(outRow.total)
  const transferredIn = Number(inRow.total)
  const balance = invoice.grand_total - paid - transferredOut + transferredIn
  return { invoice, paid, transferredOut, transferredIn, balance }
}

router.get('/balance/:invoiceId', async (req, res) => {
  const result = await computeInvoiceBalance(req.params.invoiceId, req.user.companyId)
  if (!result) return res.status(404).json({ error: 'فاکتور یافت نشد' })
  res.json(result)
})

router.get('/for/:invoiceId', async (req, res) => {
  const rows = await dbAll(
    'SELECT * FROM invoice_links WHERE (from_invoice_id = ? OR to_invoice_id = ?) AND company_id = ? ORDER BY created_at DESC',
    [req.params.invoiceId, req.params.invoiceId, req.user.companyId]
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { fromInvoiceId, toInvoiceId, amount, description } = req.body || {}
  if (!fromInvoiceId || !toInvoiceId || !amount) {
    return res.status(400).json({ error: 'fromInvoiceId, toInvoiceId, amount الزامی هستن' })
  }
  if (fromInvoiceId === toInvoiceId) {
    return res.status(400).json({ error: 'یک فاکتور نمی‌تونه به خودش منتقل بشه' })
  }

  const from = await dbGet('SELECT id FROM invoices WHERE id = ? AND company_id = ?', [fromInvoiceId, req.user.companyId])
  const to = await dbGet('SELECT id FROM invoices WHERE id = ? AND company_id = ?', [toInvoiceId, req.user.companyId])
  if (!from || !to) return res.status(404).json({ error: 'یکی از فاکتورها یافت نشد' })

  const fromBalance = await computeInvoiceBalance(fromInvoiceId, req.user.companyId)
  let warning = null
  if (fromBalance.balance > -Number(amount) + 1e-6 && fromBalance.balance >= 0) {
    warning = 'فاکتور مبدا مانده‌ی بستانکاری کافی برای این مبلغ نداره؛ لینک با این حال ثبت شد، لطفا دستی چک کن.'
  }

  const id = randomUUID()
  await dbRun(
    'INSERT INTO invoice_links (id, company_id, from_invoice_id, to_invoice_id, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.companyId, fromInvoiceId, toInvoiceId, amount, description || null]
  )

  const link = await dbGet('SELECT * FROM invoice_links WHERE id = ? AND company_id = ?', [id, req.user.companyId])
  res.status(201).json({
    link, warning,
    fromBalance: await computeInvoiceBalance(fromInvoiceId, req.user.companyId),
    toBalance: await computeInvoiceBalance(toInvoiceId, req.user.companyId),
  })
})

router.delete('/:id', async (req, res) => {
  const info = await dbRun('DELETE FROM invoice_links WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (info.changes === 0) return res.status(404).json({ error: 'یافت نشد' })
  res.status(204).end()
})

export default router
export { computeInvoiceBalance }
