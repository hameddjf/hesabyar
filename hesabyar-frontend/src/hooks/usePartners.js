import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'

export const MOCK_PARTNERS = [
  { id:'pt1', name:'علی محمدی', role:'مدیرعامل', share:45, phone:'۰۹۱۲-۱۱۱-۲۲۳۳', joinDate:'۱۳۹۸/۰۱/۰۱', capital:450_000_000,
    accounts:[{ id:'pt1-a1', bank:'ملت', card:'6104-3378-2222-3333', iban:'IR44 0120 0000 0000 2222 3333 44', label:'کارت اصلی' }] },
  { id:'pt2', name:'رضا احمدی', role:'مدیر مالی', share:35, phone:'۰۹۳۵-۲۲۲-۳۳۴۴', joinDate:'۱۳۹۸/۰۱/۰۱', capital:350_000_000,
    accounts:[{ id:'pt2-a1', bank:'صادرات', card:'6037-6971-4444-5555', iban:'IR66 0190 0000 0000 4444 5555 66', label:'کارت اصلی' }] },
  { id:'pt3', name:'سارا کریمی', role:'سهام‌دار', share:20, phone:'۰۹۱۵-۳۳۳-۴۴۵۵', joinDate:'۱۳۹۹/۰۶/۰۱', capital:200_000_000,
    accounts:[{ id:'pt3-a1', bank:'ملی', card:'6037-9975-6666-7777', iban:'IR77 0170 0000 0000 6666 7777 88', label:'کارت اصلی' }] },
]

/** parse امن accounts_json از بکند؛ اگه خالی/خراب بود آرایه‌ی خالی برمی‌گردونه */
export function parseAccounts(json) {
  try { const a = JSON.parse(json || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}

/** نسخه‌ی مستقل از هوک (بدون state) برای استفاده داخل هوک‌های دیگه (usePayments/useExpenses/useReceipts) */
export async function fetchPartners() {
  try {
    const raw = await api.get('/partners')
    if (!raw.length) return MOCK_PARTNERS
    return raw.map((p) => ({
      id: p.id, name: p.name, role: p.role, share: Number(p.share || 0),
      phone: p.phone, joinDate: p.join_date, capital: Number(p.capital || 0),
      accounts: parseAccounts(p.accounts_json),
    }))
  } catch {
    return MOCK_PARTNERS
  }
}

export function usePartners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading]   = useState(true)
  const [isMock, setIsMock]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await api.get('/partners')
      if (!raw.length) { setPartners(MOCK_PARTNERS); setIsMock(true) }
      else {
        setPartners(raw.map((p) => ({
          id: p.id, name: p.name, role: p.role, share: Number(p.share || 0),
          phone: p.phone, joinDate: p.join_date, capital: Number(p.capital || 0),
          accounts: parseAccounts(p.accounts_json),
        })))
        setIsMock(false)
      }
    } catch {
      setPartners(MOCK_PARTNERS); setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createPartner = useCallback(async (payload) => {
    await api.post('/partners', { ...payload, accountsJson: JSON.stringify(payload.accounts || []) })
    await load()
  }, [load])
  const updatePartner = useCallback(async (id, payload) => {
    await api.put(`/partners/${id}`, { ...payload, accountsJson: JSON.stringify(payload.accounts || []) })
    await load()
  }, [load])
  const removePartner = useCallback(async (id) => {
    await api.del(`/partners/${id}`)
    await load()
  }, [load])

  return { partners, loading, isMock, reload: load, createPartner, updatePartner, removePartner }
}

/* ──────────────────────────────────────────
   دفتر حساب شراکت (equity ledger)
   جدا از هوک بالا نگه داشته شده چون partners CRUD (شناسنامه‌ی شریک) و
   partner-ledger (تراکنش‌های مالی روی حساب شریک) دو منبع دیتای متفاوتن —
   قاطی‌کردنشون توی یه هوک باعث می‌شد هر تغییر تراکنش کل لیست شرکا رو هم
   دوباره fetch کنه، بی‌دلیل.
   ────────────────────────────────────────── */
export function usePartnerLedger() {
  const [balances, setBalances]   = useState([])
  const [totalEquity, setTotalEquity] = useState(0)
  const [shareSum, setShareSum]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [isMock, setIsMock]       = useState(false)

  const loadBalances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/partner-ledger/balances')
      setBalances(res.partners || [])
      setTotalEquity(res.totalEquity || 0)
      setShareSum(res.shareSum || 0)
      setIsMock(false)
    } catch {
      setBalances([]); setTotalEquity(0); setShareSum(0); setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBalances() }, [loadBalances])

  const fetchTransactions = useCallback(async (partnerId) => {
    return api.get(`/partner-ledger/${partnerId}/transactions`)
  }, [])

  const addTransaction = useCallback(async (partnerId, payload) => {
    const res = await api.post(`/partner-ledger/${partnerId}/transactions`, payload)
    await loadBalances()
    return res
  }, [loadBalances])

  const removeTransaction = useCallback(async (partnerId, txId) => {
    await api.del(`/partner-ledger/${partnerId}/transactions/${txId}`)
    await loadBalances()
  }, [loadBalances])

  const distributeProfit = useCallback(async (payload) => {
    const res = await api.post('/partner-ledger/distribute-profit', payload)
    await loadBalances()
    return res
  }, [loadBalances])

  return {
    balances, totalEquity, shareSum, loading, isMock,
    reload: loadBalances, fetchTransactions, addTransaction, removeTransaction, distributeProfit,
  }
}
