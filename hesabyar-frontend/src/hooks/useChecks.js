import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

export const CHECK_STATUS_META = {
  in_hand:   { label: 'نزد ما',                 color: 'gray'   },
  deposited: { label: 'نزد بانک (در جریان وصول)', color: 'blue'   },
  cleared:   { label: 'وصول‌شده',                color: 'green'  },
  bounced:   { label: 'برگشت‌خورده',             color: 'red'    },
  passed_on: { label: 'خرج‌شده / جابه‌جا شده',    color: 'purple' },
  cancelled: { label: 'باطل‌شده',                color: 'gray'   },
}

export const CHECK_NEXT_STATUSES = {
  in_hand:   ['deposited', 'passed_on', 'cancelled'],
  deposited: ['cleared', 'bounced'],
  bounced:   ['in_hand', 'cancelled'],
  passed_on: ['cleared', 'bounced'],
  cleared:   [],
  cancelled: [],
}

/**
 * برخلاف بعضی هوک‌های دیگه‌ی پروژه، این هوک عمداً هیچ داده‌ی mock ای برنمی‌گردونه
 * وقتی API خطا می‌ده — خطای واقعی رو نشون می‌ده تا مشکل واقعی بک‌اند پنهان نشه.
 */
export function useChecks(initialParams = {}) {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async (params = initialParams) => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.checks.list(params)
      setChecks(raw.map(toCamel))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const createCheck = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('checks', 'create', payload)
      setChecks((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    const created = await api.checks.create(payload)
    await load()
    return created
  }, [load, isOnline, saveOffline])

  const updateCheck = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'checks', action: 'update', data: { id, ...payload },
      onlineFn: () => api.checks.update(id, payload),
    })
    if (offline) {
      setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload, _offline: true, pendingSync: true } : c)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  const removeCheck = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'checks', action: 'delete', data: { id },
      onlineFn: () => api.checks.remove(id),
    })
    if (offline) {
      setChecks((prev) => prev.filter((c) => c.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  const changeStatus = useCallback(async (id, status, note) => {
    const updated = await api.checks.changeStatus(id, status, note)
    await load()
    return updated
  }, [load])

  return { checks, loading, error, reload: load, createCheck, updateCheck, removeCheck, changeStatus }
}

export function useCheckSummary() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await api.checks.summary()
      setSummary(raw)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { summary, loading, reload: load }
}
