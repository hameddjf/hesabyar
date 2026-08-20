import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

const MOCK_EMPLOYEES = [
  { id:'em1', name:'علی محمدی', position:'مدیرعامل', dept:'مدیریت', salary:28_000_000, hireDate:'۱۳۹۸/۰۱/۰۱', status:'active', phone:'۰۹۱۲-۱۱۱-۲۲۳۳', isPartner:true, partnerId:'pt1', account:{bank:'ملت',card:'6104-3378-2222-3333',iban:'IR44 0120 0000 0000 2222 3333 44'} },
  { id:'em2', name:'رضا احمدی', position:'مدیر مالی', dept:'مالی', salary:22_000_000, hireDate:'۱۳۹۸/۰۳/۱۵', status:'active', phone:'۰۹۳۵-۲۲۲-۳۳۴۴', isPartner:true, partnerId:'pt2', account:{bank:'صادرات',card:'6037-6971-4444-5555',iban:'IR66 0190 0000 0000 4444 5555 66'} },
  { id:'em4', name:'مریم نوری', position:'کارشناس فروش', dept:'فروش', salary:14_000_000, hireDate:'۱۴۰۱/۰۲/۱۰', status:'active', phone:'۰۹۹۱-۴۴۴-۵۵۶۶', isPartner:false, account:null },
]

export function useEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [isMock, setIsMock]       = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await api.get('/employees')
      if (!raw.length) { setEmployees(MOCK_EMPLOYEES); setIsMock(true) }
      else {
        setEmployees(raw.map((row) => {
          const e = toCamel(row)
          return {
            ...e,
            account: e.bank || e.card || e.iban ? { bank: e.bank, card: e.card, iban: e.iban } : null,
          }
        }))
        setIsMock(false)
      }
    } catch {
      setEmployees(MOCK_EMPLOYEES); setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createEmployee = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('employees', 'create', payload)
      setEmployees((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      await api.post('/employees', payload)
      await load()
    } catch (err) {
      if (!err.status) {
        await saveOffline('employees', 'create', payload)
        setEmployees((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])
  const updateEmployee = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'employees', action: 'update', data: { id, ...payload },
      onlineFn: () => api.put(`/employees/${id}`, payload),
    })
    if (offline) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...payload, _offline: true, pendingSync: true } : e)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  const removeEmployee = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'employees', action: 'delete', data: { id },
      onlineFn: () => api.del(`/employees/${id}`),
    })
    if (offline) {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { employees, loading, isMock, reload: load, createEmployee, updateEmployee, removeEmployee }
}
