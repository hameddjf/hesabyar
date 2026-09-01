import { Router } from 'express'
import { dbAll } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { runInvoiceDueReminders } from '../lib/invoiceReminders.js'

const router = Router()
router.use(requireAuth)

router.get('/log', async (req, res) => {
  const rows = await dbAll(`
    SELECT l.id, l.company_id, l.invoice_id, l.threshold, l.email_sent, l.sent_at,
           i.invoice_number
    FROM invoice_reminder_log l
    LEFT JOIN invoices i ON i.id = l.invoice_id
    WHERE l.company_id = ?
    ORDER BY l.sent_at DESC
  `, [req.user.companyId])
  res.json(rows)
})

router.post('/run', async (req, res) => {
  const results = await runInvoiceDueReminders(new Date(), req.user.companyId)
  res.json({ results })
})

export default router
