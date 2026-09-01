import { Router } from 'express'
import { randomUUID } from 'crypto'
import { dbGet, dbAll, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireModuleAccess } from '../lib/permissions.js'
import { partnerTransactionSchema } from '../lib/schemas.js'

const router = Router()
router.use(requireAuth)
router.use(requireModuleAccess('partners'))

const SIGN = { capital_in: 1, capital_out: -1, profit_share: 1, adjustment: 1 }

async function getPartnerOrThrow(companyId, partnerId) {
  const partner = await dbGet('SELECT * FROM partners WHERE id = ? AND company_id = ?', [partnerId, companyId])
  if (!partner) {
    const err = new Error('شریک یافت نشد')
    err.status = 404
    throw err
  }
  return partner
}

async function computeBalance(companyId, partnerId, openingCapital) {
  const rows = await dbAll('SELECT type, amount FROM partner_transactions WHERE company_id = ? AND partner_id = ?', [companyId, partnerId])
  const ledgerTotal = rows.reduce((sum, r) => sum + SIGN[r.type] * r.amount, 0)
  return Math.round((openingCapital + ledgerTotal) * 100) / 100
}

async function logActivity(req, action, entityId, label, detail, before, after, tableName = 'partner_transactions') {
  await dbRun(
    'INSERT INTO activity_log (company_id, user_id, user_name, action, entity, entity_id, entity_label, detail, table_name, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.companyId, req.user.id, req.user.name, action, 'partner_transaction', entityId, label || null, detail || null,
      tableName, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
  )
}

router.get('/balances', async (req, res) => {
  const partners = await dbAll('SELECT * FROM partners WHERE company_id = ?', [req.user.companyId])
  const summary = []
  for (const p of partners) {
    summary.push({
      partnerId: p.id,
      name: p.name,
      share: p.share,
      openingCapital: p.capital,
      balance: await computeBalance(req.user.companyId, p.id, p.capital || 0),
    })
  }
  const shareSum = Math.round(partners.reduce((s, p) => s + (p.share || 0), 0) * 100) / 100
  res.json({ partners: summary, totalEquity: summary.reduce((s, p) => s + p.balance, 0), shareSum })
})

router.get('/:partnerId/transactions', async (req, res) => {
  try {
    const partner = await getPartnerOrThrow(req.user.companyId, req.params.partnerId)
    const rows = await dbAll(
      'SELECT * FROM partner_transactions WHERE company_id = ? AND partner_id = ? ORDER BY date DESC, created_at DESC',
      [req.user.companyId, partner.id]
    )
    res.json({ balance: await computeBalance(req.user.companyId, partner.id, partner.capital || 0), transactions: rows })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/:partnerId/transactions', async (req, res) => {
  try {
    const partner = await getPartnerOrThrow(req.user.companyId, req.params.partnerId)
    const parsed = partnerTransactionSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'اطلاعات ورودی نامعتبر است', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) })
    }
    if (parsed.data.type === 'profit_share') {
      return res.status(400).json({ error: 'سهم سود فقط از طریق ویزارد «تقسیم سود» ثبت می‌شود، نه به‌صورت دستی' })
    }
    if (parsed.data.type === 'capital_out' && (await computeBalance(req.user.companyId, partner.id, partner.capital || 0)) < parsed.data.amount) {
      return res.status(400).json({ error: 'مبلغ برداشت از موجودی فعلی شریک بیشتر است' })
    }

    const id = randomUUID()
    await dbRun(
      'INSERT INTO partner_transactions (id, company_id, partner_id, type, amount, date, description, payment_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.companyId, partner.id, parsed.data.type, parsed.data.amount, parsed.data.date, parsed.data.description || null, parsed.data.paymentId || null, req.user.id]
    )

    const row = await dbGet('SELECT * FROM partner_transactions WHERE id = ?', [id])
    await logActivity(req, 'create', id, `${partner.name} — ${parsed.data.type}`, parsed.data.description, null, row)
    res.status(201).json({ transaction: row, balance: await computeBalance(req.user.companyId, partner.id, partner.capital || 0) })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.delete('/:partnerId/transactions/:txId', async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'فقط مالک شرکت می‌تواند ردیف‌های دفتر شراکت را حذف کند' })
  }
  const tx = await dbGet('SELECT * FROM partner_transactions WHERE id = ? AND company_id = ? AND partner_id = ?',
    [req.params.txId, req.user.companyId, req.params.partnerId])
  if (!tx) return res.status(404).json({ error: 'یافت نشد' })
  if (tx.distribution_batch) {
    return res.status(400).json({ error: 'این ردیف بخشی از یک تقسیم سود گروهی است — کل دسته را از طریق تاریخچه‌ی تقسیم سود لغو کنید' })
  }
  await dbRun('DELETE FROM partner_transactions WHERE id = ?', [tx.id])
  await logActivity(req, 'delete', tx.id, null, 'حذف ردیف دفتر شراکت', tx, null)
  res.status(204).end()
})

/**
 * ویزارد تقسیم سود.
 * ⚠️ توی نسخه‌ی SQLite قبلی، همه‌ی ردیف‌ها با db.transaction() (اتمیک، همه یا هیچ)
 * درج می‌شدن — آن API مخصوص better-sqlite3 است و معادل مستقیمی توی لایه‌ی
 * dbRun فعلی (که روی Pool کار می‌کنه، نه یک کانکشن ثابت) نداره. فعلاً به یک
 * حلقه‌ی ترتیبی ساده تبدیل شده — برای تعداد کم شرکا (حالت معمول) عملاً هیچ
 * فرقی حس نمی‌شه، ولی تئوریک اگه وسط کار خطای شبکه بیفته، ممکنه بعضی
 * شرکا ردیف بگیرن و بعضی نه. اگه لازم شد کاملاً اتمیک بشه، باید از یک
 * کلاینت اختصاصی pg با BEGIN/COMMIT دستی استفاده کرد.
 */
router.post('/distribute-profit', async (req, res) => {
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

  const partners = await dbAll('SELECT * FROM partners WHERE company_id = ?', [req.user.companyId])
  const activePartners = partners.filter((p) => (p.share || 0) > 0)
  if (!activePartners.length) {
    return res.status(400).json({ error: 'هیچ شریکی با درصد سهم مشخص‌شده یافت نشد' })
  }
  const shareSum = activePartners.reduce((s, p) => s + p.share, 0)
  if (Math.abs(shareSum - 100) > 0.5) {
    return res.status(400).json({ error: `مجموع سهم شرکا باید ۱۰۰٪ باشد (الان ${shareSum}٪ است) — قبل از تقسیم سود، درصدها را در تنظیمات شرکا اصلاح کنید` })
  }

  const batchId = randomUUID()
  const rows = activePartners.map((p) => {
    const amount = Math.round((totalAmount * p.share / 100) * 100) / 100
    return [randomUUID(), req.user.companyId, p.id, 'profit_share', amount, date, description || 'تقسیم سود', batchId, req.user.id]
  })
  for (const r of rows) {
    await dbRun(
      'INSERT INTO partner_transactions (id, company_id, partner_id, type, amount, date, description, distribution_batch, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      r
    )
  }
  await logActivity(req, 'create', batchId, 'تقسیم سود', `تقسیم ${totalAmount} تومان بین ${activePartners.length} شریک`, null, null, null)

  res.status(201).json({
    batchId,
    distributed: rows.map(([id, , partnerId, , amount]) => ({ id, partnerId, amount })),
  })
})

export default router
