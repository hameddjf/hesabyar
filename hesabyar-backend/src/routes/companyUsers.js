import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { sendMail } from '../lib/mailer.js'
import { permissionsForResponse, sanitizePermissionsInput, PRESETS } from '../lib/permissions.js'

const router = Router()
router.use(requireAuth)

function requireOwnerOrAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'فقط مالک یا مدیر می‌تونه کاربران رو مدیریت کنه' })
  }
  next()
}

function serializeUser(row) {
  return {
    id: row.id, name: row.name, email: row.email, role: row.role, status: row.status,
    created_at: row.created_at,
    permissions: permissionsForResponse(row),
  }
}

/** لیست کاربران شرکت جاری (بدون هش رمز عبور)، همراه با دسترسی‌های مؤثر هرکدوم */
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users WHERE company_id = ? ORDER BY created_at').all(req.user.companyId)
  res.json(rows.map(serializeUser))
})

/** پریست‌های آماده‌ی دسترسی، برای پرکردن سریع فرم دعوت توی فرانت */
router.get('/permission-presets', (req, res) => {
  res.json(PRESETS)
})

/**
 * دعوت کاربر جدید. یک رمز موقت تولید می‌شه و هم توی پاسخ API برمی‌گرده
 * (برای دسترسی سریع مدیر توی همون لحظه)، هم — اگه SMTP تنظیم شده باشه —
 * ایمیل واقعی براش می‌ره. اگه role === 'employee' باشه، permissions هم
 * قابل تنظیمه؛ برای admin همیشه دسترسی کامله و permissions نادیده گرفته می‌شه.
 */
router.post('/', requireOwnerOrAdmin, async (req, res) => {
  const { name, email, role, permissions } = req.body || {}
  if (!name || !email) return res.status(400).json({ error: 'نام و ایمیل الزامی هستن' })
  if (!['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'نقش نامعتبر' })

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'این ایمیل قبلا استفاده شده' })

  const company = db.prepare('SELECT max_users, name FROM companies WHERE id = ?').get(req.user.companyId)
  const currentCount = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(req.user.companyId).n
  if (company && currentCount >= company.max_users) {
    return res.status(403).json({ error: `پلن فعلی شما حداکثر ${company.max_users} کاربر رو پشتیبانی می‌کنه. برای افزایش، پلن رو ارتقا بده.` })
  }

  const permissionsJson = role === 'employee' ? JSON.stringify(sanitizePermissionsInput(permissions)) : null

  const tempPassword = Math.random().toString(36).slice(-10)
  const hash = bcrypt.hashSync(tempPassword, 10)
  const info = db.prepare(
    'INSERT INTO users (company_id, name, email, password_hash, role, permissions_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.companyId, name, email, hash, role, permissionsJson)

  const mailResult = await sendMail({
    to: email,
    subject: `دعوت به حسابیار — ${company?.name || ''}`,
    text: `سلام ${name}،\n\nحساب شما در حسابیار (شرکت ${company?.name || ''}) ساخته شد.\n\nایمیل ورود: ${email}\nرمز عبور موقت: ${tempPassword}\n\nپیشنهاد می‌کنیم بعد از اولین ورود، از بخش تنظیمات رمز عبور خود را عوض کنید.`,
    html: `<p>سلام ${name}،</p><p>حساب شما در حسابیار (شرکت ${company?.name || ''}) ساخته شد.</p><p>ایمیل ورود: <b>${email}</b><br/>رمز عبور موقت: <b dir="ltr">${tempPassword}</b></p><p>پیشنهاد می‌کنیم بعد از اولین ورود، از بخش تنظیمات رمز عبور خود را عوض کنید.</p>`,
  })

  res.status(201).json({
    user: serializeUser({ id: info.lastInsertRowid, name, email, role, status: 'active', permissions_json: permissionsJson }),
    tempPassword,
    emailSent: mailResult.sent,
    note: mailResult.sent
      ? 'ایمیل حاوی رمز موقت برای کاربر ارسال شد.'
      : 'ایمیل ارسال نشد (SMTP تنظیم نشده) — این رمز موقت رو دستی به کاربر بده.',
  })
})

router.patch('/:id', requireOwnerOrAdmin, (req, res) => {
  const { role, status, permissions } = req.body || {}
  const target = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })
  if (target.role === 'owner') return res.status(403).json({ error: 'نقش مالک قابل تغییر نیست' })
  if (role && !['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'نقش نامعتبر' })

  const effectiveRole = role || target.role
  let permissionsJson = target.permissions_json
  if (effectiveRole === 'employee' && permissions !== undefined) {
    permissionsJson = JSON.stringify(sanitizePermissionsInput(permissions))
  } else if (effectiveRole === 'admin') {
    permissionsJson = null // ادمین همیشه دسترسی کامل داره، نیازی به ذخیره‌ی permissions نیست
  }

  db.prepare('UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status), permissions_json = ? WHERE id = ?')
    .run(role || null, status || null, permissionsJson, req.params.id)
  res.json(serializeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', requireOwnerOrAdmin, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ?').get(req.params.id, req.user.companyId)
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })
  if (target.role === 'owner') return res.status(403).json({ error: 'حساب مالک قابل حذف نیست' })

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
