import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

/** پروفایل کاربر لاگین‌شده (نام/ایمیل/نقش/تلفن) + تغییر رمز عبور */
export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.auth.me()
      setProfile(toCamel(raw))
    } catch (err) {
      setError(err.message || 'خطا در دریافت پروفایل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** payload: { name, phone, currentPassword?, newPassword? } */
  const updateProfile = useCallback(async (payload) => {
    setSaving(true)
    try {
      const raw = await api.auth.updateMe(payload)
      setProfile(toCamel(raw))
      return toCamel(raw)
    } finally {
      setSaving(false)
    }
  }, [])

  return { profile, loading, error, saving, reload: load, updateProfile }
}
