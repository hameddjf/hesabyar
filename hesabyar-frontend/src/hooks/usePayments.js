import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { fetchPartners } from './usePartners'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock ── */
const MOCK_PAYMENTS = [
  { id:'PAY-0081', partner:'علی محمدی',  partnerCard:'6104-3378-2222-3333', to:'شرکت آریا تجارت', date:'۱۴۰۴/۰۳/۱۵', ref:'۱۲۳۴۵۶۷',  amount:'۴۵،۰۰۰،۰۰۰', method:'transfer', status:'done'    },
  { id:'PAY-0080', partner:'رضا احمدی',  partnerCard:'6037-6971-4444-5555', to:'پارس تجهیز',      date:'۱۴۰۴/۰۳/۱۳', ref:'CHK-۰۰۱۲', amount:'۲۸،۵۰۰،۰۰۰', method:'check',    status:'pending'  },
  { id:'PAY-0079', partner:'علی محمدی',  partnerCard:'6104-3378-2222-3333', to:'حقوق پرسنل',      date:'۱۴۰۴/۰۳/۰۵', ref:'—',         amount:'۴۲،۵۰۰،۰۰۰', method:'transfer', status:'done'    },
]

export function usePayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMock, setIsMock] = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawPayments, rawClients, partnersList] = await Promise.all([api.payments.list(), api.clients.list(), fetchPartners()])
      const clientsById = Object.fromEntries(rawClients.map((c) => [c.id, c.name]))
      const partnersById = Object.fromEntries(partnersList.map((p) => [p.id, p]))

      if (!rawPayments.length) {
        setPayments(MOCK_PAYMENTS)
        setIsMock(true)
      } else {
        setPayments(
          rawPayments.map((row) => {
            const p = toCamel(row)
            const partner = partnersById[p.partnerId]
            return {
              ...p,
              partner: partner?.name || '—',
              partnerCard: p.partnerAccount || '—',
              to: clientsById[p.clientId] || p.description || '—',
              date: p.date,
              ref: p.reference || '—',
              amountRaw: Number(p.amount || 0),
              amount: Number(p.amount || 0).toLocaleString('fa-IR'),
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setPayments(MOCK_PAYMENTS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createPayment = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('payments', 'create', payload)
      setPayments((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.payments.create(payload)
      await load()
      return created
    } catch (err) {
      if (!err.status) {
        await saveOffline('payments', 'create', payload)
        setPayments((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  /** ویرایش یک پرداختی موجود */
  const updatePayment = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'payments', action: 'update', data: { id, ...payload },
      onlineFn: () => api.payments.update(id, payload),
    })
    if (offline) {
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload, _offline: true, pendingSync: true } : p)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  /** حذف یک پرداختی */
  const removePayment = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'payments', action: 'delete', data: { id },
      onlineFn: () => api.payments.remove(id),
    })
    if (offline) {
      setPayments((prev) => prev.filter((p) => p.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { payments, loading, error, isMock, reload: load, createPayment, updatePayment, removePayment }
}
