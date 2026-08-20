import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onTransientError } from '@/lib/apiClient'
import { WifiOff, Clock, ServerCrash, X } from 'lucide-react'

const ErrorToastContext = createContext(null)

/**
 * تست: توست‌های این کامپوننت فقط برای خطاهای «گذرا»ست (429/502/503/504/۰/timeout) —
 * چیزهایی که معمولاً خودشون به‌زودی برطرف می‌شن و نیازی به کنار گذاشتن کل صفحه نیست.
 * برای خطاهای غیرگذرا (401/403/404) به‌جاش از ApiErrorPanel یا صفحات errors/*
 * استفاده می‌شه، چون اون‌ها معمولاً بدون اقدام کاربر (لاگین دوباره، گرفتن دسترسی) حل نمی‌شن.
 */
export function ErrorToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onTransientError((err) => {
      clearTimeout(timerRef.current)
      setToast(buildToastFromError(err))
      // خطاهای غیر-429 خودشون بعد از چند ثانیه محو می‌شن؛ برای 429 با شمارش‌معکوس retryAfter می‌مونه
      if (err.status !== 429) {
        timerRef.current = setTimeout(() => setToast(null), 6000)
      }
    })
    return () => { unsubscribe(); clearTimeout(timerRef.current) }
  }, [])

  return (
    <ErrorToastContext.Provider value={{ toast, dismiss: () => setToast(null) }}>
      {children}
      <ErrorToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </ErrorToastContext.Provider>
  )
}

export function useErrorToast() {
  return useContext(ErrorToastContext)
}

function formatCountdown(seconds) {
  if (seconds < 60) return `${seconds} ثانیه`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} دقیقه و ${s} ثانیه` : `${m} دقیقه`
}

function buildToastFromError(err) {
  if (err.status === 429) {
    return { kind: 'rate_limit', message: err.message, retryAfter: err.retryAfter || 30 }
  }
  if (err.isTimeout) {
    return { kind: 'timeout', message: err.message }
  }
  if (err.status === 0) {
    return { kind: 'offline', message: err.message }
  }
  if ([502, 503, 504].includes(err.status)) {
    return { kind: 'unavailable', message: 'سرویس موقتاً در دسترس نیست. کمی بعد دوباره امتحان کنید.' }
  }
  return { kind: 'generic', message: err.message }
}

const META = {
  rate_limit:  { icon: Clock,       bg: '#fef3c7', color: '#92400e', title: 'درخواست‌های زیاد' },
  timeout:     { icon: Clock,       bg: '#fee2e2', color: '#991b1b', title: 'پاسخ‌دهی کند سرور' },
  offline:     { icon: WifiOff,     bg: '#fee2e2', color: '#991b1b', title: 'اتصال قطع است' },
  unavailable: { icon: ServerCrash, bg: '#fee2e2', color: '#991b1b', title: 'سرویس در دسترس نیست' },
  generic:     { icon: ServerCrash, bg: '#fee2e2', color: '#991b1b', title: 'خطا' },
}

function ErrorToastBanner({ toast, onDismiss }) {
  const [secondsLeft, setSecondsLeft] = useState(toast?.retryAfter || 0)
  const SHOW_LIVE_COUNTDOWN_UNDER = 60 // برای انتظارهای طولانی (مثلاً ۱۵ دقیقه)، به‌جای پین‌کردن توست تا آخر، فقط پیام رو نشون می‌دیم و خودش محو می‌شه

  useEffect(() => {
    if (!toast || toast.kind !== 'rate_limit') return
    const initial = toast.retryAfter || 30
    setSecondsLeft(initial)
    if (initial > SHOW_LIVE_COUNTDOWN_UNDER) {
      const t = setTimeout(onDismiss, 8000)
      return () => clearTimeout(t)
    }
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); onDismiss(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast])

  if (!toast) return null
  const meta = META[toast.kind] || META.generic
  const Icon = meta.icon

  return (
    <div style={{
      position: 'fixed', bottom: 20, insetInlineEnd: 20, zIndex: 500,
      maxWidth: 340, background: 'var(--t-card-bg)',
      border: `1px solid ${meta.color}33`, borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
      direction: 'rtl', animation: 'toastSlideIn .2s ease-out',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: meta.bg, color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>{meta.title}</p>
        <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: '3px 0 0', lineHeight: 1.6 }}>{toast.message}</p>
        {toast.kind === 'rate_limit' && secondsLeft > 0 && (
          <p style={{ fontSize: 11, color: meta.color, fontWeight: 500, margin: '4px 0 0' }}>
            {formatCountdown(secondsLeft)} دیگه دوباره امتحان کن
          </p>
        )}
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-txt-muted)', display: 'flex', flexShrink: 0 }}>
        <X size={13} />
      </button>
      <style>{`@keyframes toastSlideIn { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}
