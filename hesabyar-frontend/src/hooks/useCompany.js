import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

/**
 * اطلاعات شرکت جاری (تک‌ردیفی، نه لیست) — بدون mock fallback چون
 * این دیتای واقعی و حساس شرکته، نه یک لیست نمایشی.
 */
export function useCompany() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.company.get()
      setCompany(toCamel(raw))
    } catch (err) {
      setError(err.message || 'خطا در دریافت اطلاعات شرکت')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateCompany = useCallback(async (payload) => {
    setSaving(true)
    try {
      const raw = await api.company.update(payload)
      setCompany(toCamel(raw))
      return toCamel(raw)
    } finally {
      setSaving(false)
    }
  }, [])

  return { company, loading, error, saving, reload: load, updateCompany }
}
