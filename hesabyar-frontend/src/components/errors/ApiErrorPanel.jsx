import { ShieldAlert, ServerCrash, WifiOff, AlertTriangle, RefreshCw, Clock } from 'lucide-react'

/**
 * پنل خطای درون‌صفحه‌ای — برخلاف صفحات errors/*.jsx (که کل صفحه رو می‌گیرن)،
 * این کامپوننت داخل یه صفحه‌ی موجود (مثلاً بالای جدول) نمایش داده می‌شه،
 * برای وقتی که فقط یه بخش از دیتا لود نشده، نه کل صفحه خراب شده.
 *
 * استفاده:
 *   {error && <ApiErrorPanel error={error} onRetry={reload} />}
 *
 * error می‌تونه یه Error معمولی با فیلد status باشه (همونی که apiClient پرت می‌کنه)
 * یا یه رشته‌ی ساده.
 */
export default function ApiErrorPanel({ error, onRetry }) {
  if (!error) return null
  const status = typeof error === 'object' ? error.status : null
  const message = typeof error === 'object' ? error.message : error
  const isTimeout = typeof error === 'object' && error.isTimeout

  const META = {
    401: { icon: ShieldAlert, bg: '#fef3c7', color: '#92400e', title: 'نشست شما منقضی شده', desc: 'لطفاً دوباره وارد شوید.' },
    403: { icon: ShieldAlert, bg: '#fef3c7', color: '#92400e', title: 'دسترسی ندارید', desc: 'نقش شما اجازه‌ی این عملیات رو نمی‌ده.' },
    404: { icon: AlertTriangle, bg: '#f3f4f6', color: '#4b5563', title: 'یافت نشد', desc: message || 'موردی که دنبالش بودید پیدا نشد.' },
    409: { icon: AlertTriangle, bg: '#fef3c7', color: '#92400e', title: 'تداخل داده', desc: message || 'این عملیات با وضعیت فعلی داده در تضاده.' },
    429: { icon: Clock, bg: '#fef3c7', color: '#92400e', title: 'درخواست‌های زیاد', desc: message || 'کمی صبر کنید و دوباره امتحان کنید.' },
    500: { icon: ServerCrash, bg: '#fee2e2', color: '#991b1b', title: 'خطای سرور', desc: 'مشکل موقتی از سمت سرور بود، دوباره امتحان کنید.' },
    502: { icon: ServerCrash, bg: '#fee2e2', color: '#991b1b', title: 'سرویس در دسترس نیست', desc: 'سرور موقتاً پاسخ نمی‌ده. کمی بعد دوباره امتحان کنید.' },
    503: { icon: ServerCrash, bg: '#fee2e2', color: '#991b1b', title: 'سرویس در دسترس نیست', desc: 'سرور موقتاً در دسترس نیست. کمی بعد دوباره امتحان کنید.' },
    504: { icon: Clock, bg: '#fee2e2', color: '#991b1b', title: 'پاسخ‌دهی کند سرور', desc: 'سرور به‌موقع پاسخ نداد. دوباره امتحان کنید.' },
    0:   { icon: WifiOff, bg: '#fee2e2', color: '#991b1b', title: isTimeout ? 'پاسخ‌دهی کند سرور' : 'اتصال برقرار نشد', desc: message || 'اینترنت یا اتصال به سرور رو بررسی کنید.' },
  }
  const meta = META[status] || { icon: AlertTriangle, bg: '#fee2e2', color: '#991b1b', title: 'خطایی رخ داد', desc: message || 'یک خطای غیرمنتظره رخ داد.' }
  const Icon = meta.icon

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: meta.bg, color: meta.color, fontSize: 12,
    }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{meta.title}</p>
        <p style={{ margin: '2px 0 0', opacity: 0.9 }}>{meta.desc}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: `1px solid ${meta.color}`,
            color: meta.color, borderRadius: 7, padding: '5px 10px',
            fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={12} /> تلاش دوباره
        </button>
      )}
    </div>
  )
}
