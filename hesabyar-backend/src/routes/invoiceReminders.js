import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { runInvoiceDueReminders } from '../lib/invoiceReminders.js'

const router = Router()
router.use(requireAuth)

/** تاریخچه‌ی یادآوری‌های فرستاده‌شده برای فاکتورهای همین شرکت (جدیدترین اول) */
router.get('/log', (req, res) => {
  const rows = db.prepare(`
    SELECT l.id, l.company_id, l.invoice_id, l.threshold, l.email_sent, l.sent_at,
           i.invoice_number
    FROM invoice_reminder_log l
    LEFT JOIN invoices i ON i.id = l.invoice_id
    WHERE l.company_id = ?
    ORDER BY l.sent_at DESC
  `).all(req.user.companyId)
  res.json(rows)
})

/**
 * اجرای دستی چرخه‌ی یادآوری (برای تست/دیباگ یا دکمه‌ی «الان بررسی کن» در تنظیمات).
 * چرخه‌ی خودکار در پس‌زمینه هم هست (startInvoiceReminderScheduler در server.js)،
 * این مسیر فقط اجرای فوری رو ممکن می‌کنه.
 */
router.post('/run', async (req, res) => {
  // فقط برای شرکت خود کاربر اجرا می‌شه — این مسیر توسط کاربر عادی هم قابل صداکردنه
  // و نباید بشه از طریقش برای شرکت‌های دیگه ایمیل فرستاد.
  const results = await runInvoiceDueReminders(new Date(), req.user.companyId)
  res.json({ results })
})

export default router
