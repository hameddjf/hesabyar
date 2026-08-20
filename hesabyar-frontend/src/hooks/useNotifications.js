import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'

export function useNotifications() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try { setAlerts(await api.notifications.list()) }
    catch { setAlerts([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000) // هر ۵ دقیقه رفرش
    return () => clearInterval(interval)
  }, [load])

  return { alerts, loading, overdueCount: alerts.filter(a => a.overdue).length, reload: load }
}
