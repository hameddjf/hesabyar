import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { dbGet, dbAll, dbRun } from '../db.js'
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

router.get('/', async (req, res) => {
  const rows = await dbAll('SELECT * FROM users WHERE company_id = ? ORDER BY created_at', [req.user.companyId])
  res.json(rows.map(serializeUser))
})

router.get('/permission-presets', (req, res) => {
  res.json(PRESETS)
})

router.post('/', requireOwnerOrAdmin, async (req, res) => {
  const { name, email, role, permissions } = req.body || {}
  if (!name || !email) return res.status(400).json({ error: 'نام و ایمیل الزامی هستن' })
  if (!['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'نقش نامعتبر' })

  const exists = await dbGet('SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ error: 'این ایمیل قبلا استفاده شده' })

  const company = await dbGet('SELECT max_users, name FROM companies WHERE id = ?', [req.user.companyId])
  const countRow = await dbGet('SELECT COUNT(*) as n FROM users WHERE company_id = ?', [req.user.companyId])
  const currentCount = Number(countRow.n)
  if (company && currentCount >= company.max_users) {
    return res.status(403).json({ error: `پلن فعلی شما حداکثر ${company.max_users} کاربر رو پشتیبانی می‌کنه. برای افزایش، پلن رو ارتقا بده.` })
  }

  const permissionsJson = role === 'employee' ? JSON.stringify(sanitizePermissionsInput(permissions)) : null

  const tempPassword = Math.random().toString(36).slice(-10)
  const hash = bcrypt.hashSync(tempPassword, 10)
  const info = await dbRun(
    'INSERT INTO users (company_id, name, email, password_hash, role, permissions_json) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    [req.user.companyId, name, email, hash, role, permissionsJson]
  )

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

router.patch('/:id', requireOwnerOrAdmin, async (req, res) => {
  const { role, status, permissions } = req.body || {}
  const target = await dbGet('SELECT * FROM users WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })
  if (target.role === 'owner') return res.status(403).json({ error: 'نقش مالک قابل تغییر نیست' })
  if (role && !['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'نقش نامعتبر' })

  const effectiveRole = role || target.role
  let permissionsJson = target.permissions_json
  if (effectiveRole === 'employee' && permissions !== undefined) {
    permissionsJson = JSON.stringify(sanitizePermissionsInput(permissions))
  } else if (effectiveRole === 'admin') {
    permissionsJson = null
  }

  await dbRun('UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status), permissions_json = ? WHERE id = ?',
    [role || null, status || null, permissionsJson, req.params.id])
  res.json(serializeUser(await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id])))
})

router.delete('/:id', requireOwnerOrAdmin, async (req, res) => {
  const target = await dbGet('SELECT * FROM users WHERE id = ? AND company_id = ?', [req.params.id, req.user.companyId])
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' })
  if (target.role === 'owner') return res.status(403).json({ error: 'حساب مالک قابل حذف نیست' })

  await dbRun('DELETE FROM users WHERE id = ?', [req.params.id])
  res.status(204).end()
})

export default router
