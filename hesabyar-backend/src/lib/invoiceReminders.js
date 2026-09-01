import { dbAll, dbRun } from '../db.js'
import { sendMail } from './mailer.js'

/** چند روز مونده به سررسید، آستانه‌ی «نزدیکه» فعال بشه */
const UPCOMING_DAYS = 3

function parseISOStrict(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}/.test(str)) return null
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

/** فاصله‌ی روز بین دو تاریخ (b منهای a)، مثبت یعنی b جلوتره */
function daysBetween(a, b) {
  const MS_PER_DAY = 86400000
  // هر دو رو به نیمه‌شب UTC گرد می‌کنیم تا ساعت داخل روز باعث خطای گرد‌کردن نشه
  const aMid = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const bMid = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((bMid - aMid) / MS_PER_DAY)
}

/**
 * لیست فاکتورهایی که الان (نسبت به `now`) نیاز به یادآوری دارن و هنوز
 * یادآوری‌شون در همون آستانه فرستاده نشده (چک با invoice_reminder_log).
 * فقط فاکتورهای pending/overdue با due_date معتبر ISO در نظر گرفته می‌شن.
 */
export async function findInvoicesNeedingReminder(now = new Date(), companyId = null) {
  const invoices = companyId
    ? await dbAll(`
        SELECT i.id, i.company_id, i.invoice_number, i.due_date, i.grand_total, i.client_id,
               c.name AS client_name, c.email AS client_email
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.status IN ('pending', 'overdue') AND i.company_id = ?
      `, [companyId])
    : await dbAll(`
        SELECT i.id, i.company_id, i.invoice_number, i.due_date, i.grand_total, i.client_id,
               c.name AS client_name, c.email AS client_email
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.status IN ('pending', 'overdue')
      `)

  const alreadySentRows = await dbAll("SELECT invoice_id || ':' || threshold AS k FROM invoice_reminder_log")
  const alreadySent = new Set(alreadySentRows.map(r => r.k))

  const due = []
  for (const inv of invoices) {
    const dueDate = parseISOStrict(inv.due_date)
    if (!dueDate) continue

    const diff = daysBetween(now, dueDate) // منفی یعنی گذشته
    let threshold = null
    if (diff < 0) threshold = 'overdue'
    else if (diff <= UPCOMING_DAYS) threshold = 'upcoming'
    if (!threshold) continue

    if (alreadySent.has(`${inv.id}:${threshold}`)) continue
    due.push({ ...inv, threshold })
  }
  return due
}

function buildReminderText(inv) {
  if (inv.threshold === 'overdue') {
    return `فاکتور ${inv.invoice_number || inv.id} به مبلغ ${Number(inv.grand_total || 0).toLocaleString('fa-IR')} تومان سررسیدش گذشته و هنوز پرداخت نشده.`
  }
  return `سررسید فاکتور ${inv.invoice_number || inv.id} به مبلغ ${Number(inv.grand_total || 0).toLocaleString('fa-IR')} تومان نزدیکه (تا ${UPCOMING_DAYS} روز دیگه).`
}

/**
 * فاکتورهای نیازمند یادآوری رو پیدا می‌کنه، برای هرکدوم (اگه مشتری ایمیل داشته
 * باشه) با mailer.sendMail یه ایمیل می‌فرسته (در محیط dev بدون SMTP، فقط توی
 * کنسول چاپ می‌شه — دقیقاً همون الگوی کد تایید ۲مرحله‌ای)، و در جدول
 * invoice_reminder_log ثبت می‌کنه تا دوباره برای همون آستانه تکرار نشه.
 * نتیجه رو برمی‌گردونه تا مسیر HTTP یا تست بتونه ببینه چند مورد پردازش شد.
 */
export async function runInvoiceDueReminders(now = new Date(), companyId = null) {
  const due = await findInvoicesNeedingReminder(now, companyId)
  const results = []

  for (const inv of due) {
    let emailSent = false
    if (inv.client_email) {
      await sendMail({
        to: inv.client_email,
        subject: inv.threshold === 'overdue'
          ? `یادآوری: فاکتور ${inv.invoice_number || inv.id} سررسیدش گذشته`
          : `یادآوری سررسید فاکتور ${inv.invoice_number || inv.id}`,
        text: buildReminderText(inv),
      })
      emailSent = true // یعنی تلاش برای ارسال انجام شد (چه واقعی چه placeholder کنسولی)
    }

    // UNIQUE(invoice_id, threshold) دومین محافظ در برابر ارسال تکراری هم هست
    // (مثلاً اگه دو تا اجرای موازی هم‌زمان به این نقطه برسن).
    try {
      await dbRun(
        'INSERT INTO invoice_reminder_log (company_id, invoice_id, threshold, email_sent) VALUES (?, ?, ?, ?)',
        [inv.company_id, inv.id, inv.threshold, emailSent ? 1 : 0]
      )
    } catch {
      continue // از قبل ثبت شده بود، این مورد رو نادیده بگیر
    }

    results.push({ invoiceId: inv.id, companyId: inv.company_id, threshold: inv.threshold, emailSent })
  }

  return results
}

let schedulerHandle = null

/**
 * اجرای دوره‌ای runInvoiceDueReminders در پس‌زمینه‌ی سرور. یک‌بار زود بعد از
 * بالا اومدن اجرا می‌شه، بعد هر intervalMs. در محیط تست فراخوانی نمی‌شه
 * (server.js این تابع رو فقط بیرون از NODE_ENV=test صدا می‌زنه) چون setInterval
 * باز باعث می‌شه پروسه‌ی vitest بسته نشه.
 */
export function startInvoiceReminderScheduler(intervalMs = 6 * 60 * 60 * 1000) {
  if (schedulerHandle) return schedulerHandle
  runInvoiceDueReminders().catch(err => console.error('خطا در اجرای یادآوری سررسید فاکتور:', err.message))
  schedulerHandle = setInterval(() => {
    runInvoiceDueReminders().catch(err => console.error('خطا در اجرای یادآوری سررسید فاکتور:', err.message))
  }, intervalMs)
  if (schedulerHandle.unref) schedulerHandle.unref()
  return schedulerHandle
}

export function stopInvoiceReminderScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
  }
}
