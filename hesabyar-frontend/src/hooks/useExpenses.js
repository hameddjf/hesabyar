import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { fetchPartners } from './usePartners'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock ── */
const MOCK_EXPENSES = [
  { id:'EXP-0041', category:'rent',      desc:'اجاره دفتر ماه خرداد',     date:'۱۴۰۴/۰۳/۰۱', amount:'۱۸،۰۰۰،۰۰۰', receipt:true,  partner:'علی محمدی',  partnerCard:'6104-3378-2222-3333' },
  { id:'EXP-0040', category:'salary',    desc:'حقوق پرسنل اردیبهشت',      date:'۱۴۰۴/۰۳/۰۵', amount:'۴۲،۵۰۰،۰۰۰', receipt:false, partner:'رضا احمدی',  partnerCard:'6037-6971-4444-5555' },
  { id:'EXP-0039', category:'utilities', desc:'قبض برق و اینترنت',         date:'۱۴۰۴/۰۳/۱۰', amount:'۱،۸۰۰،۰۰۰',  receipt:true,  partner:'علی محمدی',  partnerCard:'6104-3378-1111-9999' },
]

/** هزینه‌ها = ردیف‌های payments با transaction_type='expense' */
export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [isMock, setIsMock]     = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawAll, partnersList] = await Promise.all([api.payments.list(), fetchPartners()])
      const partnersById = Object.fromEntries(partnersList.map((p) => [p.id, p]))
      const raw = rawAll.filter((row) => row.transaction_type === 'expense')

      if (!raw.length) {
        setExpenses(MOCK_EXPENSES)
        setIsMock(true)
      } else {
        setExpenses(
          raw.map((row) => {
            const ex = toCamel(row)
            const partner = partnersById[ex.partnerId]
            return {
              ...ex,
              desc: ex.description,
              partner: partner?.name || '—',
              partnerCard: ex.partnerAccount || '—',
              receipt: !!ex.hasReceipt,
              amountRaw: Number(ex.amount || 0),
              amount: Number(ex.amount || 0).toLocaleString('fa-IR'),
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setExpenses(MOCK_EXPENSES)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createExpense = useCallback(async (payload) => {
    const full = { ...payload, transactionType: 'expense' }
    if (!isOnline) {
      await saveOffline('expenses', 'create', full)
      setExpenses((prev) => [{ ...full, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.payments.create(full)
      await load()
      return created
    } catch (err) {
      if (!err.status) {
        await saveOffline('expenses', 'create', full)
        setExpenses((prev) => [{ ...full, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  /** ویرایش یک هزینه‌ی موجود — قبلاً فقط آنلاین کار می‌کرد؛ حالا موقع قطعی
   *  شبکه هم توی صف queue می‌شه و state محلی optimistic آپدیت می‌شه. */
  const updateExpense = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'expenses', action: 'update', data: { id, ...payload },
      onlineFn: () => api.payments.update(id, payload),
    })
    if (offline) {
      setExpenses((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...payload, _offline: true, pendingSync: true } : ex)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  /** حذف یک هزینه؛ بعد از حذف موفق، لیست دوباره از سرور خونده می‌شه */
  const removeExpense = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'expenses', action: 'delete', data: { id },
      onlineFn: () => api.payments.remove(id),
    })
    if (offline) {
      setExpenses((prev) => prev.filter((ex) => ex.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { expenses, loading, error, isMock, reload: load, createExpense, updateExpense, removeExpense }
}
