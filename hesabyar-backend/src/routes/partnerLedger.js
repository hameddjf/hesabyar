import { Router } from 'express'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireModuleAccess } from '../lib/permissions.js'
import { partnerTransactionSchema } from '../lib/schemas.js'

/*
 * دفتر حساب شراکت (equity ledger).
 *
 * چرا این جدا از crudFactory معمولیه؟
 * چون این route نیاز به دو چیز داره که crudFactory عمومی پشتیبانی نمی‌کنه:
 *   ۱) محاسبه‌ی موجودی تجمعی هر شریک (capital اولیه + مجموع ردیف‌های دفتر، با جهت‌گیری بر اساس type)
 *   ۲) ویزارد «تقسیم سود» که یک عملیات اتمیک روی چند شریک هم‌زمان انجام می‌ده (نه یک رکورد تنها)
 *
 * قانون طلایی: موجودی هیچ‌وقت در دیتابیس ذخیره نمی‌شه، همیشه از روی ردیف‌های دفتر محاسبه می‌شه —
 * دقیقاً همون الگویی که در بقیه‌ی پروژه برای «کارت‌های آماری واقعی» دنبال کردیم (نه عدد کش‌شده که
 * می‌تونه با بقیه‌ی دیتا ناهماهنگ بشه).
 */

const router = Router()
router.use(requireAuth)
router.use(requireModuleAccess('partners'))

const SIGN = { capital_in: 1, capital_out: -1, profit_share: 1, adjustment: 1 }
// adjustment می‌تونه هم مثبت هم منفی باشه؛ جهتش رو خود amount (که همیشه مثبته) با یه فیلد جدا مشخص نمی‌کنیم —
// به‌جاش کاربر مبلغ رو با توضیح ثبت می‌کنه و اگه قرار بود کسر باشه از capital_out استفاده می‌کنه.
// adjustment صرفاً برای اصلاحیه‌های مثبت (مثلاً سرمایه‌ی کشف‌نشده در حسابرسی) استفاده می‌شه.

function getPartnerOrThrow(companyId, partnerId) {
  const partner = db.prepare('SELECT * FROM partners WHERE id = ? AND company_id = ?').get(partnerId, companyId)
  if (!partner) {
    const err = new Error('شریک یافت نشد')
    err.status = 404
    throw err
  }
  return partner
}

function computeBalance(companyId, partnerId, openingCapital) {
  const rows = db.prepare(
    'SELECT type, amount FROM partner_transactions WHERE company_id = ? AND partner_id = ?'
  ).all(companyId, partnerId)
  const ledgerTotal = rows.reduce((sum, r) => sum + SIGN[r.type] * r.amount, 0)
  return Math.round((openingCapital + ledgerTotal) * 100) / 100
}

function logActivity(req, action, entityId, label, detail, before, after, tableName = 'partner_transactions') {
  db.prepare(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail, table_name, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.user.companyId, req.user.id, req.user.name, action, 'partner_transaction', entityId, label || null, detail || null,
    tableName, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null
  )
}

/** خلاصه‌ی موجودی همه‌ی شرکا — برای کارت‌های آماری صفحه‌ی شرکا و داشبورد */
router.get('/balances', (req, res) => {
  const partners = db.prepare('SELECT * FROM partners WHERE company_id = ?').all(req.user.companyId)
  const summary = partners.map((p) => ({
    partnerId: p.id,
    name: p.name,
    share: p.share,
    openingCapital: p.capital,
    balance: computeBalance(req.user.companyId, p.id, p.capital || 0),
  }))
  const shareSum = Math.round(partners.reduce((s, p) => s + (p.share || 0), 0) * 100) / 100
  res.json({ partners: summary, totalEquity: summary.reduce((s, p) => s + p.balance, 0), shareSum })
})

/** تاریخچه‌ی دفتر یک شریک مشخص */
router.get('/:partnerId/transactions', (req, res) => {
  try {
    const partner = getPartnerOrThrow(req.user.companyId, req.params.partnerId)
    const rows = db.prepare(
      'SELECT * FROM partner_transactions WHERE company_id = ? AND partner_id = ? ORDER BY date DESC, created_at DESC'
    ).all(req.user.companyId, partner.id)
    res.json({ balance: computeBalance(req.user.companyId, partner.id, partner.capital || 0), transactions: rows })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/** ثبت یک رویداد دستی (آورده/برداشت/اصلاحیه) روی حساب یک شریک */
router.post('/:partnerId/transactions', (req, res) => {
  try {
    const partner = getPartnerOrThrow(req.user.companyId, req.params.partnerId)
    const parsed = partnerTransactionSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
    }
    if (parsed.data.type === 'profit_share') {
      return res.status(400).json({ error: 'سهم سود فقط از طریق ویزارد «تقسیم سود» ثبت می‌شود، نه به‌صورت دستی' })
    }
    if (parsed.data.type === 'capital_out' && computeBalance(req.user.companyId, partner.id, partner.capital || 0) < parsed.data.amount) {
      return res.status(400).json({ error: 'مبلغ برداشت از موجودی فعلی شریک بیشتر است' })
    }

    const id = randomUUID()
    db.prepare(
      'INSERT INTO partner_transactions (id, company_id, partner_id, type, amount, date, description, payment_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, req.user.companyId, partner.id, parsed.data.type, parsed.data.amount, parsed.data.date, parsed.data.description || null, parsed.data.paymentId || null, req.user.id)

    const row = db.prepare('SELECT * FROM partner_transactions WHERE id = ?').get(id)
    logActivity(req, 'create', id, `${partner.name} — ${parsed.data.type}`, parsed.data.description, null, row)
    res.status(201).json({ transaction: row, balance: computeBalance(req.user.companyId, partner.id, partner.capital || 0) })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/** حذف یک ردیف دفتر (فقط owner — چون مستقیم سرمایه‌ی ثبت‌شده رو تغییر می‌ده) */
router.delete('/:partnerId/transactions/:txId', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'فقط مالک شرکت می‌تواند ردیف‌های دفتر شراکت را حذف کند' })
  }
  const tx = db.prepare('SELECT * FROM partner_transactions WHERE id = ? AND company_id = ? AND partner_id = ?')
    .get(req.params.txId, req.user.companyId, req.params.partnerId)
  if (!tx) return res.status(404).json({ error: 'یافت نشد' })
  if (tx.distribution_batch) {
    return res.status(400).json({ error: 'این ردیف بخشی از یک تقسیم سود گروهی است — کل دسته را از طریق تاریخچه‌ی تقسیم سود لغو کنید' })
  }
  db.prepare('DELETE FROM partner_transactions WHERE id = ?').run(tx.id)
  logActivity(req, 'delete', tx.id, null, 'حذف ردیف دفتر شراکت', tx, null)
  res.status(204).end()
})

/**
 * ویزارد تقسیم سود: یک مبلغ کل سود رو بین همه‌ی شرکا به‌نسبت share%شون تقسیم می‌کنه
 * و برای هرکدوم یک ردیف profit_share با distribution_batch مشترک می‌سازه (اتمیک، توی یک تراکنش).
 */
router.post('/distribute-profit', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'فقط مالک شرکت می‌تواند سود را تقسیم کند' })
  }
  const { totalAmount, date, description } = req.body || {}
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ کل سود باید عدد مثبت باشد' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'تاریخ باید به‌فرمت ISO (YYYY-MM-DD) باشد' })
  }

  const partners = db.prepare('SELECT * FROM partners WHERE company_id = ?').all(req.user.companyId)
  const activePartners = partners.filter((p) => (p.share || 0) > 0)
  if (!activePartners.length) {
    return res.status(400).json({ error: 'هیچ شریکی با درصد سهم مشخص‌شده یافت نشد' })
  }
  const shareSum = activePartners.reduce((s, p) => s + p.share, 0)
  if (Math.abs(shareSum - 100) > 0.5) {
    return res.status(400).json({ error: `مجموع سهم شرکا باید ۱۰۰٪ باشد (الان ${shareSum}٪ است) — قبل از تقسیم سود، درصدها را در تنظیمات شرکا اصلاح کنید` })
  }

  const batchId = randomUUID()
  const insert = db.prepare(
    'INSERT INTO partner_transactions (id, company_id, partner_id, type, amount, date, description, distribution_batch, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const runBatch = db.transaction((rows) => {
    rows.forEach((r) => insert.run(...r))
  })

  const rows = activePartners.map((p) => {
    const amount = Math.round((totalAmount * p.share / 100) * 100) / 100
    return [randomUUID(), req.user.companyId, p.id, 'profit_share', amount, date, description || 'تقسیم سود', batchId, req.user.id]
  })
  runBatch(rows)
  // table_name عمداً null می‌مونه: این یه دسته‌ی چندردیفیه، نه یک رکورد تنها، پس با منطق عمومی
  // rollback (که یک ردیف رو با entity_id پیدا می‌کنه) سازگار نیست. اگه اینجا 'partner_transactions'
  // بذاریم، rollback با entity_id=batchId هیچ ردیفی پیدا نمی‌کنه، بی‌صدا "موفق" برمی‌گرده ولی
  // در واقع کاری نمی‌کنه — یه باگ ساکت. به‌جاش صادقانه به‌عنوان «غیرقابل بازگردانی» علامت می‌خوره
  // تا کاربر مجبور بشه هر ردیف رو جدا از تاریخچه‌ی شخص همون شریک حذف کنه.
  logActivity(req, 'create', batchId, 'تقسیم سود', `تقسیم ${totalAmount} تومان بین ${activePartners.length} شریک`, null, null, null)

  res.status(201).json({
    batchId,
    distributed: rows.map(([id, , partnerId, , amount]) => ({ id, partnerId, amount })),
  })
})

export default router
