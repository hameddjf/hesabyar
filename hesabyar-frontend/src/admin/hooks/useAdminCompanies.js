import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../lib/adminApiClient'

const PLAN_LABEL = { free: 'Free', basic: 'Basic', pro: 'Pro' }

export function useAdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await adminApi.companies.list()
      setCompanies(raw.map((c) => ({
        id: c.id,
        name: c.name,
        owner: c.owner_name || '—',
        email: c.owner_email,
        phone: c.owner_phone,
        plan: PLAN_LABEL[c.plan] || c.plan,
        planRaw: c.plan,
        users: c.userCount,
        invoices: c.invoiceCount,
        revenue: Math.round((c.revenue || 0) / 1_000_000),
        status: c.status,
        joined: c.created_at,
        lastActivity: c.updated_at,
      })))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = useCallback(async (id, status) => {
    await adminApi.companies.setStatus(id, status)
    await load()
  }, [load])

  const setPlan = useCallback(async (id, plan, maxUsers) => {
    await adminApi.companies.setPlan(id, plan, maxUsers)
    await load()
  }, [load])

  return { companies, loading, error, reload: load, setStatus, setPlan }
}
