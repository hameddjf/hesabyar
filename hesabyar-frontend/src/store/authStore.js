import { create } from 'zustand'
import { api, getToken, setToken, onUnauthorized } from '@/lib/apiClient'

const USER_KEY = 'hesabyar_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create((set) => ({
  user: loadStoredUser(),
  token: getToken(),
  loading: false,
  error: null,

  isAuthenticated: () => !!getToken(),

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { user, token } = await api.auth.login(email, password)
      setToken(token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, token, loading: false })
      return user
    } catch (err) {
      set({ loading: false, error: err.message || 'ورود ناموفق بود' })
      throw err
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null })
    try {
      const { user, token } = await api.auth.register(payload)
      setToken(token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, token, loading: false })
      return user
    } catch (err) {
      set({ loading: false, error: err.message || 'ثبت‌نام ناموفق بود' })
      throw err
    }
  },

  logout: () => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    set({ user: null, token: null })
  },
}))

/* باگ قبلی: وقتی apiClient روی خطای ۴۰۱ توکن رو از localStorage پاک می‌کرد،
   state این store به‌روز نمی‌شد چون token فقط یه‌بار موقع ساخت store خونده
   می‌شد — یعنی RequireAuth متوجه نمی‌شد و کاربر با نشست منقضی‌شده روی همون
   صفحه می‌موند. الان با این subscription، هر ۴۰۱ باعث آپدیت واقعی state
   می‌شه و RequireAuth بلافاصله ری‌دایرکت به /login رو نشون می‌ده. */
onUnauthorized(() => {
  localStorage.removeItem(USER_KEY)
  useAuthStore.setState({ user: null, token: null })
})
