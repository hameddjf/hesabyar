import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock (تا وقتی دیتای واقعی کامل نشده) ── */
const MOCK_INVOICES = [
  { id: 'INV-0041', type: 'sale',    client: 'شرکت آریا تجارت',  issueDate: '۱۴۰۴/۰۳/۱۵', dueDate: '۱۴۰۴/۰۴/۱۵', amount: '۴۵،۰۰۰،۰۰۰', status: 'paid' },
  { id: 'INV-0040', type: 'buy',     client: 'نوآوران پارسه',    issueDate: '۱۴۰۴/۰۳/۱۲', dueDate: '۱۴۰۴/۰۴/۱۲', amount: '۸۲،۵۰۰،۰۰۰', status: 'pending' },
  { id: 'INV-0039', type: 'presale', client: 'گروه صنعتی مهر',   issueDate: '۱۴۰۴/۰۳/۰۸', dueDate: '۱۴۰۴/۰۳/۳۰', amount: '۱۱۸،۰۰۰،۰۰۰',status: 'overdue' },
  { id: 'INV-0038', type: 'prebuy',  client: 'کارآفرینان سبز',   issueDate: '۱۴۰۴/۰۳/۰۱', dueDate: '۱۴۰۴/۰۵/۰۱', amount: '۲۹،۰۰۰،۰۰۰', status: 'draft' },
  { id: 'INV-0037', type: 'sale',    client: 'تکنو پردازش',      issueDate: '۱۴۰۴/۰۲/۲۸', dueDate: '۱۴۰۴/۰۳/۲۸', amount: '۶۳،۴۰۰،۰۰۰', status: 'paid' },
]

/**
 * از بکند واقعی می‌خونه (invoices + clients رو join می‌کنه).
 * اگه API در دسترس نبود یا خطا داد یا خالی بود → mock نشون داده میشه
 * (isMock=true برمی‌گرده تا در UI در صورت نیاز به کاربر اطلاع بدیم).
 */
export function useInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMock, setIsMock] = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawInvoices, rawClients] = await Promise.all([api.invoices.list(), api.clients.list()])
      const clientsById = Object.fromEntries(rawClients.map((c) => [c.id, c.name]))

      if (!rawInvoices.length) {
        setInvoices(MOCK_INVOICES)
        setIsMock(true)
      } else {
        setInvoices(
          rawInvoices.map((row) => {
            const inv = toCamel(row)
            return {
              ...inv,
              client: clientsById[inv.clientId] || '—',
              amount: Number(inv.grandTotal || inv.totalAmount || 0).toLocaleString('fa-IR'),
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setInvoices(MOCK_INVOICES)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /**
   * اگه آنلاینیم، مستقیم به سرور می‌فرسته. اگه آفلاینیم (یا درخواست به‌خاطر
   * قطعی شبکه شکست خورد)، توی صف آفلاین (IndexedDB) ذخیره می‌شه و یک فاکتور
   * موقت با status «در صف ارسال» توی لیست محلی نشون داده می‌شه تا کاربر
   * حس نکنه کارش گم شده — با اتصال مجدد، خودکار sync می‌شه.
   */
  const createInvoice = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('invoices', 'create', payload)
      setInvoices((prev) => [{
        ...payload,
        id: `pending-${Date.now()}`,
        client: '—',
        amount: Number(payload.grandTotal || payload.totalAmount || 0).toLocaleString('fa-IR'),
        status: 'pending_sync',
        _offline: true,
      }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.invoices.create(payload)
      await load()
      return created
    } catch (err) {
      // شکست به‌خاطر قطعی ناگهانی شبکه (نه خطای اعتبارسنجی سرور) → صف آفلاین
      // fetch خام موقع قطعی شبکه هیچ err.status ای نمی‌ذاره (نه حتی صفر)
      if (!err.status) {
        await saveOffline('invoices', 'create', payload)
        setInvoices((prev) => [{
          ...payload,
          id: `pending-${Date.now()}`,
          client: '—',
          amount: Number(payload.grandTotal || payload.totalAmount || 0).toLocaleString('fa-IR'),
          status: 'pending_sync',
          _offline: true,
        }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  const linkInvoices = useCallback(async (fromInvoiceId, toInvoiceId, amount, description) => {
    const result = await api.invoices.link({ fromInvoiceId, toInvoiceId, amount, description })
    await load()
    return result
  }, [load])

  const removeInvoice = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'invoices', action: 'delete', data: { id },
      onlineFn: () => api.invoices.remove(id),
    })
    if (offline) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  const updateInvoice = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'invoices', action: 'update', data: { id, ...payload },
      onlineFn: () => api.invoices.update(id, payload),
    })
    if (offline) {
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...payload, _offline: true, pendingSync: true } : inv)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  return { invoices, loading, error, isMock, reload: load, createInvoice, linkInvoices, removeInvoice, updateInvoice }
}
