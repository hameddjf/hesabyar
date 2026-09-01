import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { dbGet, dbRun } from '../db.js'
import { sendMail } from '../lib/mailer.js'

const router = Router()
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15
const OTP_TTL_MINUTES = 5

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

/**
 * مرحله ۱: بررسی ایمیل/رمز عبور. اگه درست بود، یک کد یک‌بارمصرف (OTP)
 * تولید می‌شه و هش‌شده ذخیره می‌شه. توکن ورود صادر نمی‌شه تا مرحله ۲ (2FA) تایید نشه.
 *
 * کد از طریق mailer.sendMail واقعاً به ایمیل سوپرادمین فرستاده می‌شه. اگه SMTP
 * در .env تنظیم نشده باشه (محیط توسعه/تست)، خود mailer.js به‌جای ارسال واقعی،
 * محتوا رو توی کنسول سرور چاپ می‌کنه — پس این مسیر همیشه از همون یک لایه‌ی
 * مشترک (lib/mailer.js) رد می‌شه، نه یک console.log جدا و موازی.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const admin = await dbGet('SELECT * FROM super_admins WHERE email = ?', [email])

  if (!admin) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' })

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000)
    return res.status(423).json({ error: `حساب قفل است. ${mins} دقیقه دیگر تلاش کنید.` })
  }

  const valid = bcrypt.compareSync(password || '', admin.password_hash)
  if (!valid) {
    const attempts = admin.failed_attempts + 1
    const lockedUntil = attempts >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
      : null
    await dbRun('UPDATE super_admins SET failed_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, admin.id])
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' })
  }

  const otp = generateOtp()
  const otpHash = bcrypt.hashSync(otp, 8)
  const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString()
  await dbRun('UPDATE super_admins SET otp_code_hash = ?, otp_expires = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [otpHash, expires, admin.id])

  await sendMail({
    to: admin.email,
    subject: 'کد تایید ورود به پنل سوپرادمین حسابیار',
    text: `سلام ${admin.name}،\n\nکد ورود دومرحله‌ای شما: ${otp}\n\nاین کد تا ${OTP_TTL_MINUTES} دقیقه دیگر معتبر است. اگر این درخواست از طرف شما نبوده، این ایمیل را نادیده بگیرید و رمز عبور خود را تغییر دهید.`,
    html: `<p>سلام ${admin.name}،</p><p>کد ورود دومرحله‌ای شما:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${otp}</p><p>این کد تا ${OTP_TTL_MINUTES} دقیقه دیگر معتبر است. اگر این درخواست از طرف شما نبوده، این ایمیل را نادیده بگیرید و رمز عبور خود را تغییر دهید.</p>`,
  })

  res.json({ step: '2fa_required', pendingEmail: admin.email })
})

router.post('/verify-2fa', async (req, res) => {
  const { email, otp } = req.body || {}
  const admin = await dbGet('SELECT * FROM super_admins WHERE email = ?', [email])
  if (!admin || !admin.otp_code_hash || !admin.otp_expires) {
    return res.status(401).json({ error: 'ابتدا مرحله ورود با رمز عبور را انجام دهید' })
  }
  if (new Date(admin.otp_expires) < new Date()) {
    return res.status(401).json({ error: 'کد منقضی شده. دوباره تلاش کنید.' })
  }
  if (!bcrypt.compareSync(otp || '', admin.otp_code_hash)) {
    return res.status(401).json({ error: 'کد نادرست است' })
  }

  await dbRun("UPDATE super_admins SET otp_code_hash = NULL, otp_expires = NULL, last_login_at = datetime('now') WHERE id = ?", [admin.id])

  const token = jwt.sign(
    { id: admin.id, name: admin.name, email: admin.email, type: 'super_admin' },
    process.env.ADMIN_JWT_SECRET || 'dev-admin-secret',
    { expiresIn: '4h' } // نشست کوتاه‌تر از کاربران عادی، عمداً
  )
  res.json({ admin: { id: admin.id, name: admin.name, email: admin.email }, token })
})

export default router
