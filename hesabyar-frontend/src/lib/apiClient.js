/* ──────────────────────────────────────────
   API CLIENT
   یک لایه‌ی نازک روی fetch که:
   - آدرس بکند رو از VITE_API_URL می‌خونه
   - توکن JWT رو از localStorage می‌خونه و هدر می‌فرسته
   - خطاها رو یکدست می‌کنه
   ────────────────────────────────────────── */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const TOKEN_KEY = 'hesabyar_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/* لیسنر مخصوص 401 — جدا از transientError چون این یکی نیازمند واکنش خاصه:
   پاک کردن state ورود کاربر (نه فقط نمایش toast). authStore.js بهش وصل می‌شه. */
const unauthorizedListeners = new Set()
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/* لیسنرهای سراسری خطا — برای نمایش toast خطاهای گذرا (429/502/503/timeout/قطعی شبکه)
   بدون اینکه apiClient.js وابسته به React باشه. GlobalErrorToast توی App.jsx یه
   لیسنر ثبت می‌کنه و request() هر بار با این نوع خطاها مواجه بشه صداش می‌زنه. */
const transientErrorListeners = new Set()
export function onTransientError(listener) {
  transientErrorListeners.add(listener)
  return () => transientErrorListeners.delete(listener)
}
function emitTransientError(err) {
  transientErrorListeners.forEach((fn) => fn(err))
}

const REQUEST_TIMEOUT_MS = 20000
const TRANSIENT_STATUSES = new Set([0, 408, 429, 502, 503, 504])

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (networkErr) {
    clearTimeout(timeoutId)
    const err = new Error(
      networkErr.name === 'AbortError'
        ? 'زمان انتظار برای پاسخ سرور تمام شد. اتصال اینترنت یا وضعیت سرور را بررسی کنید.'
        : 'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.'
    )
    err.status = 0
    err.isNetworkError = true
    err.isTimeout = networkErr.name === 'AbortError'
    emitTransientError(err)
    throw err
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    let payload
    try { payload = await res.json() } catch { payload = {} }
    if (res.status === 401) { setToken(null); unauthorizedListeners.forEach((fn) => fn()) }

    const err = new Error(payload.error || `درخواست ناموفق (${res.status})`)
    err.status = res.status
    err.detail = payload.detail

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After') || res.headers.get('RateLimit-Reset')
      err.retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null
    }
    if (TRANSIENT_STATUSES.has(res.status)) emitTransientError(err)

    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),

  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
    updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: payload }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  },
  company: {
    get: () => request('/company'),
    update: (payload) => request('/company', { method: 'PUT', body: payload }),
  },
  companyUsers: {
    list: () => request('/company-users'),
    invite: (payload) => request('/company-users', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/company-users/${id}`, { method: 'PATCH', body: payload }),
    remove: (id) => request(`/company-users/${id}`, { method: 'DELETE' }),
  },

  clients: {
    list: () => request('/clients'),
    create: (payload) => request('/clients', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/clients/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: () => request('/products'),
    create: (payload) => request('/products', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: () => request('/invoices'),
    create: (payload) => request('/invoices', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/invoices/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
    balance: (id) => request(`/invoice-links/balance/${id}`),
    links: (id) => request(`/invoice-links/for/${id}`),
    link: (payload) => request('/invoice-links', { method: 'POST', body: payload }),
  },
  payments: {
    list: () => request('/payments'),
    create: (payload) => request('/payments', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/payments/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
  },
  checks: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString()
      return request(`/checks${qs ? `?${qs}` : ''}`)
    },
    get: (id) => request(`/checks/${id}`),
    create: (payload) => request('/checks', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/checks/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/checks/${id}`, { method: 'DELETE' }),
    changeStatus: (id, status, note) => request(`/checks/${id}/status`, { method: 'POST', body: { status, note } }),
    history: (id) => request(`/checks/${id}/history`),
    summary: () => request('/checks/summary'),
    upcoming: (days) => request(`/checks/upcoming${days ? `?days=${days}` : ''}`),
  },
  holo: {
    tables: () => request('/holo/tables'),
    log: () => request('/holo/log'),
    testConnection: (conn) => request('/holo/test-connection', { method: 'POST', body: conn }),
    import: (conn) => request('/holo/import', { method: 'POST', body: conn }),
    export: (conn) => request('/holo/export', { method: 'POST', body: conn }),
    localRestorePrereqs: () => request('/holo/local-restore/prereqs'),
    // نصب LocalDB (دانلود + msiexec) ممکنه چند دقیقه طول بکشه — timeout معمول ۲۰ ثانیه کافی نیست
    installLocalDb: async () => {
      const token = getToken()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6 * 60 * 1000)
      let res
      try {
        res = await fetch(`${BASE_URL}/holo/local-restore/install-localdb`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        })
      } catch (networkErr) {
        clearTimeout(timeoutId)
        const err = new Error(
          networkErr.name === 'AbortError' ? 'نصب بیش از حد طول کشید.' : 'ارتباط با سرور برقرار نشد.'
        )
        throw err
      }
      clearTimeout(timeoutId)
      let payload
      try { payload = await res.json() } catch { payload = {} }
      if (!res.ok) {
        const err = new Error(payload.error || `درخواست ناموفق (${res.status})`)
        err.detail = payload.detail
        throw err
      }
      return payload
    },
    // آپلود فایل .bak: multipart/form-data هست، نه JSON — از fetch خام
    // استفاده می‌کنیم (نه تابع request() که همیشه JSON.stringify می‌کنه)،
    // و timeout رو خیلی بیشتر می‌ذاریم چون Restore یه دیتابیس واقعی روی
    // دیسک ممکنه چند دقیقه طول بکشه (نه ۲۰ ثانیه‌ی معمول درخواست‌های دیگه).
    localRestoreImport: async (file, tables, onProgress) => {
      const token = getToken()
      const form = new FormData()
      form.append('backup', file)
      if (tables) form.append('tables', JSON.stringify(tables))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000) // ۱۵ دقیقه
      let res
      try {
        res = await fetch(`${BASE_URL}/holo/local-restore/import`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
          signal: controller.signal,
        })
      } catch (networkErr) {
        clearTimeout(timeoutId)
        const err = new Error(
          networkErr.name === 'AbortError'
            ? 'Restore/خوندن بکاپ بیش از حد طول کشید.'
            : 'ارتباط با سرور برقرار نشد.'
        )
        err.isNetworkError = true
        throw err
      }
      clearTimeout(timeoutId)
      let payload
      try { payload = await res.json() } catch { payload = {} }
      if (!res.ok) {
        const err = new Error(payload.error || `درخواست ناموفق (${res.status})`)
        err.status = res.status
        err.detail = payload.detail
        err.hint = payload.hint
        throw err
      }
      return payload
    },
  },
  userLayouts: {
    get: (pageKey) => request(`/user-layouts/${pageKey}`),
    save: (pageKey, layout) => request(`/user-layouts/${pageKey}`, { method: 'PUT', body: { layout } }),
    reset: (pageKey) => request(`/user-layouts/${pageKey}`, { method: 'DELETE' }),
  },
  notifications: {
    list: () => request('/notifications'),
  },
}
