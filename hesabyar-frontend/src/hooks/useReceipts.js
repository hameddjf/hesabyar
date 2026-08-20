import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { fetchPartners } from './usePartners'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock ── */
const MOCK_RECEIPTS = [
  { id:'REC-0061', partner:'علی محمدی',  partnerCard:'6104-3378-2222-3333', from:'شرکت آریا تجارت', date:'۱۴۰۴/۰۳/۱۵', amount:'۴۵،۰۰۰،۰۰۰', method:'transfer', status:'confirmed' },
  { id:'REC-0060', partner:'رضا احمدی',  partnerCard:'6037-6971-4444-5555', from:'تکنو پردازش',     date:'۱۴۰۴/۰۳/۱۳', amount:'۶۳،۴۰۰،۰۰۰', method:'check',    status:'pending'   },
  { id:'REC-0059', partner:'علی محمدی',  partnerCard:'6104-3378-1111-9999', from:'مهندسی ارتباط',   date:'۱۴۰۴/۰۳/۱۱', amount:'۳۷،۲۰۰،۰۰۰', method:'transfer', status:'confirmed' },
]

/** دریافتی‌ها = ردیف‌های payments با transaction_type='receipt' */
export function useReceipts() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [isMock, setIsMock]     = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawAll, rawClients, partnersList] = await Promise.all([api.payments.list(), api.clients.list(), fetchPartners()])
      const clientsById = Object.fromEntries(rawClients.map((c) => [c.id, c.name]))
      const partnersById = Object.fromEntries(partnersList.map((p) => [p.id, p]))
      const raw = rawAll.filter((row) => row.transaction_type === 'receipt')

      if (!raw.length) {
        setReceipts(MOCK_RECEIPTS)
        setIsMock(true)
      } else {
        setReceipts(
          raw.map((row) => {
            const r = toCamel(row)
            const partner = partnersById[r.partnerId]
            return {
              ...r,
              partner: partner?.name || '—',
              partnerCard: r.partnerAccount || '—',
              from: clientsById[r.clientId] || r.description || '—',
              amount: Number(r.amount || 0).toLocaleString('fa-IR'),
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setReceipts(MOCK_RECEIPTS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createReceipt = useCallback(async (payload) => {
    const full = { ...payload, transactionType: 'receipt' }
    if (!isOnline) {
      await saveOffline('receipts', 'create', full)
      setReceipts((prev) => [{ ...full, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.payments.create(full)
      await load()
      return created
    } catch (err) {
      if (!err.status) {
        await saveOffline('receipts', 'create', full)
        setReceipts((prev) => [{ ...full, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  /** ویرایش یک دریافتی موجود؛ همون الگوی offline-safe usePayments/useExpenses */
  const updateReceipt = useCallback(async (id, payload) => {
    const full = { ...payload, transactionType: 'receipt' }
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'receipts', action: 'update', data: { id, ...full },
      onlineFn: () => api.payments.update(id, full),
    })
    if (offline) {
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...full, _offline: true, pendingSync: true } : r)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  /** حذف یک دریافتی */
  const removeReceipt = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'receipts', action: 'delete', data: { id },
      onlineFn: () => api.payments.remove(id),
    })
    if (offline) {
      setReceipts((prev) => prev.filter((r) => r.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { receipts, loading, error, isMock, reload: load, createReceipt, updateReceipt, removeReceipt }
}
