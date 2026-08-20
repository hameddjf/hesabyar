import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { fetchPartners } from './usePartners'
import { aggregateReportsData, EXPENSE_CATEGORY_META } from '@/lib/reportsAggregations'

export { EXPENSE_CATEGORY_META }

/* ── دیتای نمونه (fallback وقتی هنوز فاکتور/تراکنش واقعی ثبت نشده) ── */
export const MOCK_MONTHLY = [
  { month:'فروردین', income:62,  expense:38, profit:24 },
  { month:'اردیبهشت',income:75, expense:42, profit:33 },
  { month:'خرداد',  income:91,  expense:48, profit:43 },
  { month:'تیر',    income:58,  expense:35, profit:23 },
  { month:'مرداد',  income:84,  expense:51, profit:33 },
  { month:'شهریور', income:102, expense:59, profit:43 },
]
export const MOCK_EXPENSE_CATS = [
  { name:'حقوق و دستمزد', value:42.5, color:'#6366f1' },
  { name:'اجاره',          value:18,   color:'#38bdf8' },
  { name:'بازاریابی',      value:8,    color:'#f97316' },
  { name:'حمل و نقل',     value:5.2,  color:'#059669' },
  { name:'قبوض',          value:3.8,  color:'#e11d48' },
  { name:'سایر',           value:4.5,  color:'#94a3b8' },
]
export const MOCK_PARTNER_PERF = [
  { name:'علی محمدی',  received:124, paid:87, balance:37, share:45 },
  { name:'رضا احمدی',  received:96,  paid:61, balance:35, share:35 },
  { name:'سارا کریمی', received:55,  paid:37, balance:18, share:20 },
]
export const MOCK_TOP_CLIENTS = [
  { name:'شرکت آریا تجارت',  total:580, invoices:12, paid:540 },
  { name:'گروه صنعتی مهر',   total:445, invoices:5,  paid:410 },
  { name:'نوآوران پارسه',    total:312, invoices:8,  paid:280 },
  { name:'تکنو پردازش',      total:221, invoices:6,  paid:221 },
  { name:'مهندسی ارتباط',    total:167, invoices:4,  paid:130 },
]
export const MOCK_CASHFLOW = [
  { week:'هفته ۱', in:28, out:18 },
  { week:'هفته ۲', in:35, out:22 },
  { week:'هفته ۳', in:19, out:14 },
  { week:'هفته ۴', in:41, out:28 },
  { week:'هفته ۵', in:33, out:19 },
  { week:'هفته ۶', in:52, out:31 },
]
const MOCK_DATA = {
  monthly: MOCK_MONTHLY, expenseCats: MOCK_EXPENSE_CATS,
  partnerPerf: MOCK_PARTNER_PERF, topClients: MOCK_TOP_CLIENTS, cashflow: MOCK_CASHFLOW,
  totals: { income:472, expense:273, profit:199, margin:42 },
}

/**
 * دیتای واقعی گزارشات، از روی فاکتورها و تراکنش‌های ثبت‌شده.
 * فقط مسئول fetch دیتای خام و مدیریت state/loading/error هست؛ خود محاسبات
 * (جمع کل، ترکیب هزینه‌ها، برترین مشتریان، عملکرد شرکا، روند ماهانه، جریان نقدی)
 * توی lib/reportsAggregations.js هست — تابعی خالص و بدون وابستگی به React،
 * تا مستقیم (بدون renderHook/mock کردن fetch) قابل تست باشه.
 * سابقه‌ی مالیاتی همچنان کاملاً mock می‌مونه چون موتور محاسبه‌ی مالیات اصلاً وجود نداره (فیچر جدا).
 */
export function useReportsData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMock, setIsMock] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawInvoices, rawPayments, rawClients, partners] = await Promise.all([
        api.get('/invoices'), api.get('/payments'), api.clients.list(), fetchPartners(),
      ])

      if (!rawInvoices.length && !rawPayments.length) {
        setData(MOCK_DATA)
        setIsMock(true)
        return
      }

      const invoices = rawInvoices.map(toCamel)
      const payments = rawPayments.map(toCamel)
      const clientsById = Object.fromEntries(rawClients.map((c) => [c.id, c.name]))
      const partnersById = Object.fromEntries(partners.map((p) => [p.id, p]))

      const agg = aggregateReportsData({ invoices, payments, clientsById, partnersById })

      setData({
        monthly: agg.monthly || MOCK_MONTHLY,     // فقط اگه رکورد با تاریخ ISO معتبر پیدا بشه واقعیه، وگرنه نمونه
        cashflow: agg.cashflow || MOCK_CASHFLOW,
        expenseCats: agg.expenseCats.length ? agg.expenseCats : MOCK_EXPENSE_CATS,
        topClients: agg.topClients.length ? agg.topClients : MOCK_TOP_CLIENTS,
        partnerPerf: agg.partnerPerf.length ? agg.partnerPerf : MOCK_PARTNER_PERF,
        totals: agg.totals,
        monthlyIsReal: agg.monthlyIsReal,
        cashflowIsReal: agg.cashflowIsReal,
      })
      setIsMock(false)
    } catch (err) {
      setError(err)
      setData(MOCK_DATA)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, isMock, reload: load }
}
