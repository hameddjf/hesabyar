import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { sendMail } from '../lib/mailer.js'
import { getEffectivePermissions } from '../lib/permissions.js'

const registerSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد').max(100),
  email: z.string().email('ایمیل نامعتبر است').max(200),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد').max(200),
  companyName: z.string().max(200).optional().nullable(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است').max(200),
})

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'توکن نامعتبر است'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد').max(200),
})

const RESET_TOKEN_TTL_MINUTES = 30

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const router = Router()
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  )
}

/**
 * ثبت‌نام = ساخت یک «شرکت» جدید (چندمستأجری) + کاربر owner همون شرکت.
 * هر شرکت کاملاً ایزوله‌ست؛ این owner فقط دیتای همین company_id رو می‌بینه.
 */
router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات ورودی نامعتبر است' })
  }
  const { name, email, password, companyName } = parsed.data
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'این ایمیل قبلا ثبت شده' })

  const companyId = randomUUID()
  db.prepare(
    'INSERT INTO companies (id, name, owner_name, owner_email, plan, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(companyId, companyName || `${name} - شرکت`, name, email, 'free', 'trial')

  const hash = bcrypt.hashSync(password, 10)
  const info = db
    .prepare('INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(companyId, name, email, hash, 'owner')

  const user = { id: info.lastInsertRowid, name, email, role: 'owner', companyId }
  const token = signUserToken(user)
  // perms توی پاسخ ثبت‌نام/ورود هم برگردونده می‌شه (نه فقط /me) تا authStore فرانت از همون
  // اول یه round-trip اضافه نیاز نداشته باشه برای فیلترکردن منو/route ها
  res.json({ user: { ...user, perms: getEffectivePermissions(user) }, company: { id: companyId, name: companyName || `${name} - شرکت`, plan: 'free', status: 'trial' }, token })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!row) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' })

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(row.locked_until) - new Date()) / 60000)
    return res.status(423).json({ error: `حساب به‌خاطر تلاش‌های ناموفق مکرر قفل شده. ${mins} دقیقه دیگر تلاش کنید.` })
  }

  if (!bcrypt.compareSync(password || '', row.password_hash)) {
    const attempts = (row.failed_attempts || 0) + 1
    const lockedUntil = attempts >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
      : null
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, row.id)
    if (lockedUntil) {
      return res.status(423).json({ error: `به‌خاطر ${MAX_ATTEMPTS} تلاش ناموفق، حساب برای ${LOCK_MINUTES} دقیقه قفل شد.` })
    }
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' })
  }

  if (row.status === 'suspended') {
    return res.status(403).json({ error: 'حساب شما غیرفعال شده. با پشتیبانی تماس بگیرید.' })
  }
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(row.company_id)
  if (!company || company.status === 'suspended') {
    return res.status(403).json({ error: 'حساب شرکت شما غیرفعال شده. با پشتیبانی تماس بگیرید.' })
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now'), failed_attempts = 0, locked_until = NULL WHERE id = ?").run(row.id)
  db.prepare('INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_label) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.company_id, row.id, row.name, 'login', null, null)

  const user = { id: row.id, name: row.name, email: row.email, role: row.role, companyId: row.company_id }
  const token = signUserToken(user)
  res.json({ user: { ...user, perms: getEffectivePermissions(user) }, company: { id: company.id, name: company.name, plan: company.plan, status: company.status }, token })
})

/**
 * فراموشی رمز عبور — همیشه یک پیام یکسان برمی‌گردونه چه ایمیل وجود داشته
 * باشه چه نه (تا کسی نتونه با این endpoint حدس بزنه چه ایمیل‌هایی توی
 * سیستم ثبت‌نامن). توکن reset فقط ۳۰ دقیقه اعتبار داره و هش‌شده (sha256)
 * توی دیتابیس ذخیره می‌شه، نه خود توکن.
 */
router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'ایمیل نامعتبر است' })
  }
  const { email } = parsed.data
  const genericResponse = { message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز برایش ارسال می‌شود.' }

  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email)
  if (!user) {
    // عمداً همون پیام موفقیت رو برمی‌گردونیم — بدون افشای اینکه ایمیل وجود نداره
    return res.json(genericResponse)
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(rawToken)
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60000).toISOString()
  db.prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?')
    .run(tokenHash, expires, user.id)

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`

  await sendMail({
    to: user.email,
    subject: 'بازنشانی رمز عبور حسابیار',
    text: `سلام ${user.name}،\n\nبرای بازنشانی رمز عبور خود روی لینک زیر بزنید (تا ${RESET_TOKEN_TTL_MINUTES} دقیقه معتبر است):\n${resetLink}\n\nاگر این درخواست از طرف شما نبوده، این ایمیل را نادیده بگیرید.`,
    html: `<p>سلام ${user.name}،</p><p>برای بازنشانی رمز عبور خود روی لینک زیر بزنید (تا ${RESET_TOKEN_TTL_MINUTES} دقیقه معتبر است):</p><p><a href="${resetLink}">${resetLink}</a></p><p>اگر این درخواست از طرف شما نبوده، این ایمیل را نادیده بگیرید.</p>`,
  })

  res.json(genericResponse)
})

/** بازنشانی رمز عبور با توکن دریافتی از ایمیل */
router.post('/reset-password', (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات نامعتبر است' })
  }
  const { token, password } = parsed.data
  const tokenHash = hashResetToken(token)

  const user = db.prepare(
    'SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ?'
  ).get(tokenHash)

  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'لینک بازنشانی نامعتبر یا منقضی شده است. دوباره درخواست بدهید.' })
  }

  const hash = bcrypt.hashSync(password, 10)
  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ?'
  ).run(hash, user.id)

  res.json({ message: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.' })
})

/** پروفایل خود کاربر (نام/ایمیل/تلفن/رمز عبور) */
router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(req.user.id)
  if (!row) return res.status(404).json({ error: 'کاربر یافت نشد' })
  // perms اضافه شد تا فرانت بتونه منو/route ها رو بر اساس دسترسی واقعی کاربر فیلتر کنه
  // (قبلاً فقط بک‌اند با requireModuleAccess مسدود می‌کرد، فرانت هیچ‌جا این اطلاعات رو نداشت)
  res.json({ ...row, perms: getEffectivePermissions(req.user) })
})

router.patch('/me', requireAuth, (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' })

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' })
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id)
  }

  if (name || phone) {
    db.prepare('UPDATE users SET name = COALESCE(?, name) WHERE id = ?').run(name || null, req.user.id)
  }

  const updated = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id)
  res.json(updated)
})

export default router
