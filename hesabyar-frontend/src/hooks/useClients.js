import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock ── */
const MOCK_CLIENTS = [
  { id:'cl1', name:'شرکت آریا تجارت',  type:'company', contact:'مهران رضایی',  phone:'۰۲۱-۴۴۱۲-۳۴۵۶', email:'info@ariatrade.ir',  city:'تهران',  totalInvoices:12, totalAmount:580_000_000, lastActivity:'۱۴۰۴/۰۳/۱۵', status:'active' },
  { id:'cl2', name:'نوآوران پارسه',    type:'company', contact:'سینا کریمی',   phone:'۰۲۱-۸۸۱۲-۹۹۰۰', email:'info@novapars.ir',  city:'تهران',  totalInvoices:8,  totalAmount:340_000_000, lastActivity:'۱۴۰۴/۰۳/۱۲', status:'active' },
  { id:'cl3', name:'گروه صنعتی مهر',   type:'company', contact:'رضا مرادی',    phone:'۰۳۱-۳۶۱۲-۴۴۵۵', email:'info@mehrind.ir',   city:'اصفهان', totalInvoices:5,  totalAmount:190_000_000, lastActivity:'۱۴۰۴/۰۳/۰۸', status:'inactive' },
]

/**
 * از بکند واقعی می‌خونه؛ آمار فاکتور هر مشتری (تعداد و مجموع مبلغ) رو
 * با join سمت کلاینت روی invoices محاسبه می‌کنه.
 */
export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [isMock, setIsMock]   = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawClients, rawInvoices] = await Promise.all([api.clients.list(), api.invoices.list()])

      if (!rawClients.length) {
        setClients(MOCK_CLIENTS)
        setIsMock(true)
      } else {
        setClients(
          rawClients.map((row) => {
            const c = toCamel(row)
            const clientInvoices = rawInvoices.filter((inv) => inv.client_id === c.id)
            const totalAmount = clientInvoices.reduce((s, inv) => s + Number(inv.grand_total || inv.total_amount || 0), 0)
            return {
              ...c,
              totalInvoices: clientInvoices.length,
              totalAmount,
              lastActivity: c.updatedAt,
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setClients(MOCK_CLIENTS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createClient = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('clients', 'create', payload)
      setClients((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.clients.create(payload)
      await load()
      return created
    } catch (err) {
      if (!err.status) {
        await saveOffline('clients', 'create', payload)
        setClients((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  /**
   * قبلاً فقط create آفلاین صف می‌شد؛ update/delete مستقیم به سرور می‌رفتن و
   * موقع قطعی شبکه با خطا شکست می‌خوردن. حالا با withOfflineWrite همون
   * الگوی create هم برای این دو اعمال می‌شه: اگه آفلاینیم (یا قطعی ناگهانی
   * شبکه)، به‌جای throw کردن، توی صف queue می‌شه و state محلی optimistic
   * آپدیت می‌شه تا کاربر حس نکنه تغییرش گم شده.
   */
  const updateClient = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'clients', action: 'update', data: { id, ...payload },
      onlineFn: () => api.clients.update(id, payload),
    })
    if (offline) {
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload, _offline: true, pendingSync: true } : c)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  const removeClient = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'clients', action: 'delete', data: { id },
      onlineFn: () => api.clients.remove(id),
    })
    if (offline) {
      // برخلاف update، حذف رو همین‌جا هم از لیست محلی برمی‌داریم — چون از دید
      // کاربر «حذف شد»، حتی اگه واقعی‌شدنش روی سرور منتظر اتصال دوباره باشه.
      setClients((prev) => prev.filter((c) => c.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { clients, loading, error, isMock, reload: load, createClient, updateClient, removeClient }
}
