import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { isoToJalali, parseISOStrict, todayJalali, PERSIAN_MONTHS } from '@/lib/jalali'

const toM = (n) => Math.round((Number(n) || 0) / 1_000_000 * 10) / 10

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

/** همون منطق بازه‌بندی ماهانه‌ی useReportsData.js، نسخه‌ی خلاصه برای صفحه‌ی اصلی */
function buildMonthlyFromISO(incomeInvoices, expensePayments) {
  const monthKeys = last6JalaliMonthKeys()
  const buckets = Object.fromEntries(monthKeys.map(k => [k, { revenue:0, expenses:0 }]))
  let matched = 0

  incomeInvoices.forEach(i => {
    if (!parseISOStrict(i.issueDate)) return
    const j = isoToJalali(i.issueDate)
    const key = `${j.jy}-${j.jm}`
    if (buckets[key]) { buckets[key].revenue += Number(i.grandTotal || i.totalAmount || 0); matched++ }
  })
  expensePayments.forEach(p => {
    if (!parseISOStrict(p.date)) return
    const j = isoToJalali(p.date)
    const key = `${j.jy}-${j.jm}`
    if (buckets[key]) { buckets[key].expenses += Number(p.amount || 0); matched++ }
  })

  if (!matched) return null
  return monthKeys.map(key => {
    const [, jm] = key.split('-').map(Number)
    const b = buckets[key]
    return { month: PERSIAN_MONTHS[jm-1], revenue: toM(b.revenue), expenses: toM(b.expenses) }
  })
}

/* ── دیتای نمونه (fallback وقتی هنوز هیچ فاکتور/مشتری‌ای ثبت نشده) ── */
export const MOCK_STATS = {
  revenue: 482_000, openInvoices: 34, overdueCount: 5,
  expenses: 128_500, activeClients: 127, newClientsCount: 8,
}
export const MOCK_MONTHLY = [
  { month: 'دی',    revenue: 38, expenses: 22 },
  { month: 'بهمن', revenue: 52, expenses: 28 },
  { month: 'اسفند',revenue: 31, expenses: 19 },
  { month: 'فرو',  revenue: 67, expenses: 35 },
  { month: 'اردی', revenue: 45, expenses: 26 },
  { month: 'خرد',  revenue: 82, expenses: 41 },
]
export const MOCK_RECENT_INVOICES = [
  { id: 'INV-0041', client: 'شرکت آریا تجارت',  date: '۱۴۰۴/۰۳/۱۵', amount: '۴۵،۰۰۰', status: 'paid' },
  { id: 'INV-0040', client: 'نوآوران پارسه',    date: '۱۴۰۴/۰۳/۱۲', amount: '۸۲،۵۰۰', status: 'pending' },
  { id: 'INV-0039', client: 'گروه صنعتی مهر',   date: '۱۴۰۴/۰۳/۰۸', amount: '۱۱۸،۰۰۰',status: 'overdue' },
  { id: 'INV-0038', client: 'کارآفرینان سبز',   date: '۱۴۰۴/۰۳/۰۱', amount: '۲۹،۰۰۰', status: 'paid' },
]

/**
 * دیتای واقعی صفحه‌ی اصلی، از روی فاکتورها/تراکنش‌ها/مشتریان واقعی.
 * نمودار ماهانه هنوز mock می‌مونه (همون محدودیت فرمت تاریخ آزاد که در Reports هست).
 * وقتی شرکت هنوز هیچ دیتایی نداره (کاربر تازه ثبت‌نام کرده)، به‌جای نمایش صفر همه‌جا،
 * دیتای نمونه نشون داده می‌شه تا صفحه خالی و گیج‌کننده به‌نظر نرسه — با isMock مشخص می‌شه.
 */
export function useDashboardData() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [isMock, setIsMock]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawInvoices, rawPayments, rawClients] = await Promise.all([
        api.get('/invoices'), api.get('/payments'), api.clients.list(),
      ])

      if (!rawInvoices.length && !rawClients.length) {
        setData({ stats: MOCK_STATS, monthly: MOCK_MONTHLY, recentInvoices: MOCK_RECENT_INVOICES })
        setIsMock(true)
        return
      }

      const invoices = rawInvoices.map(toCamel)
      const clientsById = Object.fromEntries(rawClients.map((c) => [c.id, c.name]))

      const revenue = invoices
        .filter(i => ['sale','presale'].includes(i.type) && i.status === 'paid')
        .reduce((s,i) => s + Number(i.grandTotal || i.totalAmount || 0), 0)

      const expensePayments = rawPayments.map(toCamel).filter(p => p.transactionType === 'expense')
      const expenses = expensePayments.reduce((s,p) => s + Number(p.amount || 0), 0)

      const openInvoices = invoices.filter(i => i.status === 'pending').length
      const overdueCount = invoices.filter(i => i.status === 'overdue').length

      const incomeInvoices = invoices.filter(i => ['sale','presale'].includes(i.type) && i.status === 'paid')
      const realMonthly = buildMonthlyFromISO(incomeInvoices, expensePayments)

      const recentInvoices = invoices
        .slice()
        .sort((a,b) => new Date(b.updatedAt||0) - new Date(a.updatedAt||0))
        .slice(0, 4)
        .map(i => ({
          id: i.invoiceNumber || i.id,
          client: clientsById[i.clientId] || '—',
          date: i.issueDate || '—',
          amount: Number(i.grandTotal || i.totalAmount || 0).toLocaleString('fa-IR'),
          status: i.status,
        }))

      setData({
        stats: {
          revenue, openInvoices, overdueCount, expenses,
          activeClients: rawClients.length, newClientsCount: null, // بدون تاریخ استاندارد، «مشتری جدید این ماه» قابل‌محاسبه نیست
        },
        monthly: realMonthly || MOCK_MONTHLY,
        monthlyIsReal: !!realMonthly,
        recentInvoices: recentInvoices.length ? recentInvoices : MOCK_RECENT_INVOICES,
      })
      setIsMock(false)
    } catch (err) {
      setError(err)
      setData({ stats: MOCK_STATS, monthly: MOCK_MONTHLY, recentInvoices: MOCK_RECENT_INVOICES })
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, isMock, reload: load }
}
