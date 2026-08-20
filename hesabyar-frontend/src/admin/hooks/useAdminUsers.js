import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../lib/adminApiClient'

const ROLE_LABEL = { owner:'مالک', admin:'مدیر', employee:'کارمند' }

export function useAdminUsers() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await adminApi.users.list()
      setUsers(raw.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company_name,
        companyId: u.company_id,
        role: u.role,
        roleLabel: ROLE_LABEL[u.role] || u.role,
        status: u.status,
        lastLogin: u.last_login_at,
        createdAt: u.created_at,
      })))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = useCallback(async (id, status) => {
    await adminApi.users.setStatus(id, status)
    await load()
  }, [load])

  const resetPassword = useCallback(async (id) => {
    return adminApi.users.resetPassword(id)
  }, [])

  return { users, loading, error, reload: load, setStatus, resetPassword }
}
