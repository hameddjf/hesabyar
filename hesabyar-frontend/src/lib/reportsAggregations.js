import { isoToJalali, parseISOStrict, todayJalali, PERSIAN_MONTHS } from '@/lib/jalali'

/**
 * منطق خالص محاسباتی صفحه‌ی گزارشات — بدون هیچ وابستگی به React/fetch، فقط
 * ورودی می‌گیره و خروجی محاسبه‌شده برمی‌گردونه. useReportsData.js فقط دیتای
 * خام رو fetch می‌کنه و این توابع رو صدا می‌زنه؛ خود منطق این‌جاست تا بدون
 * نیاز به renderHook/mock کردن fetch، مستقیم تست بشه.
 */

export const toM = (n) => Math.round((Number(n) || 0) / 1_000_000 * 10) / 10 // میلیون تومان، یک رقم اعشار

/** ۶ کلید ماه شمسی اخیر به شکل "jy-jm"، به ترتیب زمانی */
function last6JalaliMonthKeys() {
  const { jy, jm } = todayJalali()
  const keys = []
  let y = jy, m = jm
  for (let i = 0; i < 6; i++) {
    keys.unshift(`${y}-${m}`)
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return keys
}

/**
 * فاکتورها/تراکنش‌ها رو بر اساس ماه شمسیِ تاریخ ISOشون بازه‌بندی می‌کنه.
 * فقط رکوردهایی که تاریخ ISO معتبر دارن حساب می‌شن (رکوردهای قدیمی با تاریخ آزاد نادیده گرفته می‌شن).
 * اگه هیچ رکورد قابل‌بازه‌بندی‌ای نبود، null برمی‌گردونه تا فراخوان به mock برگرده.
 */
export function buildMonthlyFromISO(incomeInvoices, expensePayments) {
  const monthKeys = last6JalaliMonthKeys()
  const buckets = Object.fromEntries(monthKeys.map(k => [k, { income: 0, expense: 0 }]))
  let matched = 0

  incomeInvoices.forEach(i => {
    const d = parseISOStrict(i.issueDate)
    if (!d) return
    const j = isoToJalali(i.issueDate)
    const key = `${j.jy}-${j.jm}`
    if (buckets[key]) { buckets[key].income += Number(i.grandTotal || i.totalAmount || 0); matched++ }
  })
  expensePayments.forEach(p => {
    const d = parseISOStrict(p.date)
    if (!d) return
    const j = isoToJalali(p.date)
    const key = `${j.jy}-${j.jm}`
    if (buckets[key]) { buckets[key].expense += Number(p.amount || 0); matched++ }
  })

  if (!matched) return null

  return monthKeys.map(key => {
    const [, jm] = key.split('-').map(Number)
    const b = buckets[key]
    return { month: PERSIAN_MONTHS[jm - 1], income: toM(b.income), expense: toM(b.expense), profit: toM(b.income - b.expense) }
  })
}

/** ۶ بازه‌ی هفتگی اخیر (بر اساس تاریخ میلادی، چون فقط برای گروه‌بندی نسبی لازمه) */
export function buildCashflowFromISO(receiptPayments, expensePayments) {
  const now = new Date()
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = new Date(now); end.setDate(end.getDate() - (5 - i) * 7)
    const start = new Date(end); start.setDate(start.getDate() - 6)
    return { start, end, in: 0, out: 0 }
  })
  let matched = 0

  receiptPayments.forEach(p => {
    const d = parseISOStrict(p.date)
    if (!d) return
    const w = weeks.find(w => d >= w.start && d <= w.end)
    if (w) { w.in += Number(p.amount || 0); matched++ }
  })
  expensePayments.forEach(p => {
    const d = parseISOStrict(p.date)
    if (!d) return
    const w = weeks.find(w => d >= w.start && d <= w.end)
    if (w) { w.out += Number(p.amount || 0); matched++ }
  })

  if (!matched) return null
  return weeks.map((w, i) => ({ week: `هفته ${i + 1}`, in: toM(w.in), out: toM(w.out) }))
}

export const EXPENSE_CATEGORY_META = {
  rent:      { label: 'اجاره',          color: '#1d4ed8' },
  salary:    { label: 'حقوق و دستمزد',  color: '#15803d' },
  utilities: { label: 'قبوض',            color: '#7e22ce' },
  transport: { label: 'حمل و نقل',       color: '#c2410c' },
  supplies:  { label: 'لوازم اداری',     color: '#0e7490' },
  marketing: { label: 'بازاریابی',       color: '#9a3412' },
  other:     { label: 'سایر',            color: '#6b7280' },
}

/**
 * محاسبه‌ی سرتاسری دیتای گزارشات از روی فاکتورها/تراکنش‌های خام (camelCase شده).
 * خروجی همون شکلیه که useReportsData قبلاً مستقیم می‌ساخت — این تابع فقط
 * جدا شده تا بدون React/fetch قابل تست باشه؛ رفتارش عوض نشده.
 */
export function aggregateReportsData({ invoices, payments, clientsById, partnersById }) {
  /* ── جمع کل درآمد/هزینه/سود ── */
  const incomeInvoices = invoices.filter(i => ['sale', 'presale'].includes(i.type) && i.status === 'paid')
  const incomeTotal = incomeInvoices.reduce((s, i) => s + Number(i.grandTotal || i.totalAmount || 0), 0)
  const expensePayments = payments.filter(p => p.transactionType === 'expense')
  const expenseTotal = expensePayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const profit = incomeTotal - expenseTotal
  const margin = incomeTotal ? Math.round((profit / incomeTotal) * 100) : 0

  /* ── ترکیب هزینه‌ها بر اساس دسته ── */
  const catSums = {}
  expensePayments.forEach(p => {
    const key = p.category || 'other'
    catSums[key] = (catSums[key] || 0) + Number(p.amount || 0)
  })
  const expenseCats = Object.entries(catSums)
    .map(([key, val]) => ({ name: EXPENSE_CATEGORY_META[key]?.label || key, value: toM(val), color: EXPENSE_CATEGORY_META[key]?.color || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  /* ── برترین مشتریان ── */
  const clientAgg = {}
  invoices.forEach(i => {
    if (!i.clientId) return
    const key = i.clientId
    if (!clientAgg[key]) clientAgg[key] = { name: clientsById[key] || '—', total: 0, invoices: 0, paid: 0 }
    const amt = Number(i.grandTotal || i.totalAmount || 0)
    clientAgg[key].total += amt
    clientAgg[key].invoices += 1
    if (i.status === 'paid') clientAgg[key].paid += amt
  })
  const topClients = Object.values(clientAgg)
    .map(c => ({ ...c, total: toM(c.total), paid: toM(c.paid) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  /* ── عملکرد شرکا ── */
  const partnerAgg = {}
  payments.forEach(p => {
    if (!p.partnerId) return
    const key = p.partnerId
    if (!partnerAgg[key]) partnerAgg[key] = { name: partnersById[key]?.name || '—', received: 0, paid: 0, share: partnersById[key]?.share || 0 }
    const amt = Number(p.amount || 0)
    if (p.transactionType === 'receipt') partnerAgg[key].received += amt
    if (p.transactionType === 'expense' || p.transactionType === 'payment') partnerAgg[key].paid += amt
  })
  const partnerPerf = Object.values(partnerAgg)
    .map(p => ({ ...p, received: toM(p.received), paid: toM(p.paid), balance: toM((p.received) - (p.paid)) }))
    .sort((a, b) => b.received - a.received)

  const receiptPayments = payments.filter(p => p.transactionType === 'receipt')
  const monthly = buildMonthlyFromISO(incomeInvoices, expensePayments)
  const cashflow = buildCashflowFromISO(receiptPayments, expensePayments)

  return {
    monthly, cashflow, expenseCats, topClients, partnerPerf,
    totals: { income: toM(incomeTotal), expense: toM(expenseTotal), profit: toM(profit), margin },
    monthlyIsReal: !!monthly,
    cashflowIsReal: !!cashflow,
  }
}
