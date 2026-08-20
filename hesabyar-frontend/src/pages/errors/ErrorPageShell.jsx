import { useNavigate } from 'react-router-dom'

/**
 * پوسته‌ی مشترک صفحات ارور تمام‌صفحه (404 / 403 / 500).
 * عمداً خیلی سبک و بدون وابستگی به Sidebar/Topbar‌ـه، چون ممکنه دقیقاً
 * همون چیزی باشه که خراب شده — این صفحه باید حتی وقتی بقیه‌ی اپ کار
 * نمی‌کنه هم درست رندر بشه.
 */
export default function ErrorPageShell({ code, icon, title, description, primaryAction, secondaryAction, tone = 'neutral' }) {
  const navigate = useNavigate()
  const toneColor = {
    neutral: 'var(--t-accent)',
    danger:  '#dc2626',
    warning: '#d97706',
  }[tone] || 'var(--t-accent)'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--t-content-bg)', direction: 'rtl', padding: 20,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 22px',
          background: `color-mix(in srgb, ${toneColor} 14%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: toneColor,
        }}>
          {icon}
        </div>
        {code && (
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: toneColor, margin: '0 0 8px' }}>
            خطای {code}
          </p>
        )}
        <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--t-txt)', margin: '0 0 10px' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--t-txt-muted)', lineHeight: 1.9, margin: '0 0 28px' }}>{description}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {secondaryAction && (
            <button className="btn-secondary" onClick={secondaryAction.onClick || (() => navigate(-1))}>
              {secondaryAction.label}
            </button>
          )}
          <button className="btn-primary" onClick={primaryAction?.onClick || (() => navigate('/'))}>
            {primaryAction?.label || 'بازگشت به داشبورد'}
          </button>
        </div>
      </div>
    </div>
  )
}
