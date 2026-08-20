import { createContext, useContext, useState, useCallback } from 'react'
import { adminApi, getAdminToken, setAdminToken } from './lib/adminApiClient'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const s = sessionStorage.getItem('admin_session')
      return s && getAdminToken() ? JSON.parse(s) : null
    } catch { return null }
  })
  const [step,    setStep]    = useState(admin ? 'authenticated' : 'login')
  const [pending, setPending] = useState('')

  const loginStep1 = useCallback(async (email, password) => {
    try {
      const res = await adminApi.auth.login(email, password)
      if (res.step === '2fa_required') {
        setPending(res.pendingEmail || email)
        setStep('2fa')
        return { ok: true }
      }
      return { ok: false, error: 'پاسخ غیرمنتظره از سرور' }
    } catch (err) {
      return { ok: false, error: err.message || 'ورود ناموفق بود' }
    }
  }, [])

  const loginStep2 = useCallback(async (otp) => {
    try {
      const { admin: adminData, token } = await adminApi.auth.verify2fa(pending, otp)
      setAdminToken(token)
      const data = { ...adminData, loginAt: new Date().toISOString() }
      sessionStorage.setItem('admin_session', JSON.stringify(data))
      setAdmin(data)
      setStep('authenticated')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'کد نادرست یا منقضی‌شده است.' }
    }
  }, [pending])

  const logout = useCallback(() => {
    setAdminToken(null)
    sessionStorage.removeItem('admin_session')
    setAdmin(null); setStep('login'); setPending('')
  }, [])

  return (
    <AdminAuthContext.Provider value={{ admin, step, pendingEmail: pending, loginStep1, loginStep2, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider')
  return ctx
}
