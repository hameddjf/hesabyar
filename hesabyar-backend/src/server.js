import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import './db.js'
import { scheduleBackups } from './lib/backup.js'
import { verifyMailConfig } from './lib/mailer.js'

import authRoutes from './routes/auth.js'
import companyRoutes from './routes/company.js'
import companyUsersRoutes from './routes/companyUsers.js'
import clientsRoutes from './routes/clients.js'
import productsRoutes from './routes/products.js'
import invoicesRoutes from './routes/invoices.js'
import paymentsRoutes from './routes/payments.js'
import checksRoutes from './routes/checks.js'
import holoRoutes from './routes/holo.js'
import invoiceLinksRoutes from './routes/invoiceLinks.js'
import employeesRoutes from './routes/employees.js'
import bankingAccountsRoutes from './routes/bankingAccounts.js'
import partnersRoutes from './routes/partners.js'
import partnerLedgerRoutes from './routes/partnerLedger.js'
import activityLogRoutes from './routes/activityLog.js'
import userLayoutsRoutes from './routes/userLayouts.js'
import notificationsRoutes from './routes/notifications.js'
import invoiceRemindersRoutes from './routes/invoiceReminders.js'
import { startInvoiceReminderScheduler } from './lib/invoiceReminders.js'
import adminAuthRoutes from './routes/adminAuth.js'
import adminCompaniesRoutes from './routes/adminCompanies.js'
import adminUsersRoutes from './routes/adminUsers.js'
import { authRateLimit, apiRateLimit } from './middleware/rateLimit.js'

dotenv.config()
const app = express()

// روی هاست‌هایی مثل Render که پشت یک reverse proxy هستن، بدون این تنظیم
// همه‌ی درخواست‌ها یک IP یکسان (IP خود proxy) دیده می‌شن و rate limiting بی‌معنی می‌شه
app.set('trust proxy', 1)

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim())
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }))
app.use(express.json({ limit: '5mb' }))
app.use(apiRateLimit)

// چند هدر امنیتی پایه (بدون نیاز به پکیج اضافه مثل helmet)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'hesabyar-backend', time: new Date().toISOString() }))

// ── مسیرهای کاربران عادی شرکت‌ها ──
app.use('/api/auth', authRateLimit, authRoutes)
app.use('/api/company', companyRoutes)
app.use('/api/company-users', companyUsersRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/invoices', invoicesRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/checks', checksRoutes)
app.use('/api/holo', holoRoutes)
app.use('/api/invoice-links', invoiceLinksRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/banking-accounts', bankingAccountsRoutes)
app.use('/api/partners', partnersRoutes)
app.use('/api/partner-ledger', partnerLedgerRoutes)
app.use('/api/activity-log', activityLogRoutes)
app.use('/api/user-layouts', userLayoutsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/invoice-reminders', invoiceRemindersRoutes)
/**
 * ── مسیر سوپرادمین — عمداً یک پیشوند غیرقابل‌حدس ──
 * به‌جای "/api/admin" (که هرکسی حدس می‌زنه)، از یک رشته‌ی تصادفی که فقط
 * در ENV (ADMIN_ROUTE_SECRET) تعریف می‌شه استفاده می‌کنیم. حتی اگه کسی
 * "/api/admin" رو تست کنه به 404 می‌خوره؛ بدون دونستن این پیشوند دقیق،
 * مسیرهای سوپرادمین اصلاً پیدا نمی‌شن.
 * این یک لایه‌ی امنیتی *اضافه*ست، نه جایگزین auth/2FA — حتما در .env عوضش کن.
 */
const ADMIN_PREFIX = process.env.ADMIN_ROUTE_SECRET || 'admin-CHANGE-THIS-IN-ENV'
app.use(`/api/${ADMIN_PREFIX}/auth`, authRateLimit, adminAuthRoutes)
app.use(`/api/${ADMIN_PREFIX}/companies`, adminCompaniesRoutes)
app.use(`/api/${ADMIN_PREFIX}/users`, adminUsersRoutes)

/**
 * ── سرو کردن فایل‌های استاتیک فرانت (اختیاری) ──
 * فقط برای «حالت هاست ترکیبی» (یک سرور، هم بک‌اند هم فرانت). اگه فرانت رو
 * جدا (مثلاً روی Cloudflare Pages) هاست می‌کنی، این بخش رو نادیده بگیر —
 * فقط وقتی SERVE_FRONTEND_DIST ست شده باشه فعال می‌شه، پیش‌فرض خاموشه.
 */
if (process.env.SERVE_FRONTEND_DIST) {
  const distDir = path.resolve(process.env.SERVE_FRONTEND_DIST)
  app.use(express.static(distDir))
  // مسیرهای غیر /api باید به index.html برگردن تا React Router کار کنه
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.use((req, res) => res.status(404).json({ error: 'مسیر یافت نشد' }))
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'خطای داخلی سرور', detail: err.message })
})

const PORT = process.env.PORT || 4000

// در محیط تست (vitest با supertest)، فقط app export می‌شه، سرور واقعی بالا نمیاد
// و بکاپ خودکار هم اجرا نمی‌شه (چون تست‌ها دیتابیس موقت خودشون رو دارن)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ Hesabyar backend running on port ${PORT}`)
    if (!process.env.ADMIN_ROUTE_SECRET) {
      console.warn('⚠️  ADMIN_ROUTE_SECRET در .env تنظیم نشده! از مقدار پیش‌فرض (ناامن) استفاده می‌شه.')
    }
    // بررسی SMTP: فقط لاگ می‌کنه، جلوی بالا اومدن سرور رو نمی‌گیره — چون نبود
    // ایمیل واقعی نباید کل برنامه رو غیرقابل‌استفاده کنه (مثلاً موقع توسعه‌ی محلی)
    verifyMailConfig().then((r) => {
      if (!r.configured) {
        console.warn('⚠️  SMTP تنظیم نشده — ایمیل‌های واقعی (بازنشانی رمز/دعوت کاربر) فقط توی کنسول لاگ می‌شن.')
      } else if (!r.ok) {
        console.warn(`⚠️  SMTP تنظیم شده ولی اتصال برقرار نشد: ${r.error}`)
      } else {
        console.log('✅ اتصال SMTP تأیید شد — ایمیل واقعی ارسال می‌شه.')
      }
    })
    if (process.env.DISABLE_AUTO_BACKUP !== 'true') {
      scheduleBackups()
    }
    // یادآوری خودکار سررسید فاکتور: یک‌بار زود بعد از بالا اومدن + هر ۶ ساعت
    startInvoiceReminderScheduler()
  })
}

export default app
