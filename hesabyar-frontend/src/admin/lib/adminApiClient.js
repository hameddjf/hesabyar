/* ──────────────────────────────────────────
   ADMIN API CLIENT — کاملاً جدا از apiClient اصلی
   - توکن جدا (sessionStorage نه localStorage — با بستن تب پاک میشه)
   - base URL شامل پیشوند مسیر مخفی سوپرادمین
   ────────────────────────────────────────── */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const ADMIN_ROUTE_SECRET = import.meta.env.VITE_ADMIN_ROUTE_SECRET || 'admin-CHANGE-THIS-IN-ENV'
const ADMIN_BASE = `${API_BASE}/${ADMIN_ROUTE_SECRET}`
const TOKEN_KEY = 'hesabyar_admin_token'

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}
export function setAdminToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getAdminToken()
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let payload
    try { payload = await res.json() } catch { payload = {} }
    if (res.status === 401) setAdminToken(null)
    const err = new Error(payload.error || `درخواست ناموفق (${res.status})`)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export const adminApi = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    verify2fa: (email, otp) => request('/auth/verify-2fa', { method: 'POST', body: { email, otp } }),
  },
  companies: {
    list: () => request('/companies'),
    get: (id) => request(`/companies/${id}`),
    setStatus: (id, status) => request(`/companies/${id}/status`, { method: 'PATCH', body: { status } }),
    setPlan: (id, plan, maxUsers) => request(`/companies/${id}/plan`, { method: 'PATCH', body: { plan, maxUsers } }),
    logs: () => request('/companies/logs/all'),
    backup: () => request('/companies/backup/run', { method: 'POST' }),
  },
  users: {
    list: () => request('/users'),
    setStatus: (id, status) => request(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
    resetPassword: (id) => request(`/users/${id}/reset-password`, { method: 'POST' }),
  },
}
