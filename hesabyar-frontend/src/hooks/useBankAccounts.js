import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

const MOCK_ACCOUNTS = [
  { id: 'ca1', bank: 'ملت',    label: 'حساب جاری ملت', iban: 'IR12 0120 0000 0000 1234 5678 90', card: '6104-3378-1234-5678', balance: 284_000_000 },
  { id: 'ca2', bank: 'صادرات', label: 'حساب صادرات',   iban: 'IR34 0190 0000 0000 9876 5432 10', card: '6037-6971-9876-5432', balance: 95_500_000 },
  { id: 'ca3', bank: 'ملی',    label: 'صندوق نقد',     iban: null, card: null, balance: 12_000_000 },
]

export function useBankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [isMock, setIsMock]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await api.get('/banking-accounts')
      if (!raw.length) { setAccounts(MOCK_ACCOUNTS); setIsMock(true) }
      else { setAccounts(raw.map(toCamel)); setIsMock(false) }
    } catch {
      setAccounts(MOCK_ACCOUNTS); setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createAccount = useCallback(async (payload) => { await api.post('/banking-accounts', payload); await load() }, [load])
  const updateAccount = useCallback(async (id, payload) => { await api.put(`/banking-accounts/${id}`, payload); await load() }, [load])
  const removeAccount = useCallback(async (id) => { await api.del(`/banking-accounts/${id}`); await load() }, [load])

  return { accounts, loading, isMock, reload: load, createAccount, updateAccount, removeAccount }
}
