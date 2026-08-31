import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { dbGet, dbRun } from '../db.js'
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

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات ورودی نامعتبر است' })
  }
  const { name, email, password, companyName } = parsed.data
  const exists = await dbGet('SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ error: 'این ایمیل قبلا ثبت شده' })

  const companyId = randomUUID()
  await dbRun(
    'INSERT INTO companies (id, name, owner_name, owner_email, plan, status) VALUES (?, ?, ?, ?, ?, ?)',
    [companyId, companyName || `${name} - شرکت`, name, email, 'free', 'trial']
  )

  const hash = bcrypt.hashSync(password, 10)
  const info = await dbRun(
    'INSERT INTO users (company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [companyId, name, email, hash, 'owner']
  )

  const user = { id: info.lastInsertRowid, name, email, role: 'owner', companyId }
  const token = signUserToken(user)
  res.json({ user: { ...user, perms: getEffectivePermissions(user) }, company: { id: companyId, name: companyName || `${name} - شرکت`, plan: 'free', status: 'trial' }, token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const row = await dbGet('SELECT * FROM users WHERE email = ?', [email])
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
    await dbRun('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, row.id])
    if (lockedUntil) {
      return res.status(423).json({ error: `به‌خاطر ${MAX_ATTEMPTS} تلاش ناموفق، حساب برای ${LOCK_MINUTES} دقیقه قفل شد.` })
    }
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' })
  }

  if (row.status === 'suspended') {
    return res.status(403).json({ error: 'حساب شما غیرفعال شده. با پشتیبانی تماس بگیرید.' })
  }
  const company = await dbGet('SELECT * FROM companies WHERE id = ?', [row.company_id])
  if (!company || company.status === 'suspended') {
    return res.status(403).json({ error: 'حساب شرکت شما غیرفعال شده. با پشتیبانی تماس بگیرید.' })
  }

  await dbRun("UPDATE users SET last_login_at = datetime('now'), failed_attempts = 0, locked_until = NULL WHERE id = ?", [row.id])
  await dbRun(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_label) VALUES (?, ?, ?, ?, ?, ?)',
    [row.company_id, row.id, row.name, 'login', null, null]
  )

  const user = { id: row.id, name: row.name, email: row.email, role: row.role, companyId: row.company_id }
  const token = signUserToken(user)
  res.json({ user: { ...user, perms: getEffectivePermissions(user) }, company: { id: company.id, name: company.name, plan: company.plan, status: company.status }, token })
})

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'ایمیل نامعتبر است' })
  }
  const { email } = parsed.data
  const genericResponse = { message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز برایش ارسال می‌شود.' }

  const user = await dbGet('SELECT id, name, email FROM users WHERE email = ?', [email])
  if (!user) {
    return res.json(genericResponse)
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(rawToken)
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60000).toISOString()
  await dbRun('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?', [tokenHash, expires, user.id])

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

router.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات نامعتبر است' })
  }
  const { token, password } = parsed.data
  const tokenHash = hashResetToken(token)

  const user = await dbGet('SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ?', [tokenHash])

  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'لینک بازنشانی نامعتبر یا منقضی شده است. دوباره درخواست بدهید.' })
  }

  const hash = bcrypt.hashSync(password, 10)
  await dbRun(
    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [hash, user.id]
  )

  res.json({ message: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.' })
})

router.get('/me', requireAuth, async (req, res) => {
  const row = await dbGet('SELECT id, name, email, role, phone FROM users WHERE id = ?', [req.user.id])
  if (!row) return res.status(404).json({ error: 'کاربر یافت نشد' })
  res.json({ ...row, perms: getEffectivePermissions(req.user) })
})

router.patch('/me', requireAuth, async (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body || {}
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' })

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' })
    }
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.user.id])
  }

  if (name || phone) {
    await dbRun('UPDATE users SET name = COALESCE(?, name) WHERE id = ?', [name || null, req.user.id])
  }

  const updated = await dbGet('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id])
  res.json(updated)
})

export default router
