/* نشانگر وضعیت آنلاین/آفلاین در topbar */
import { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, X } from 'lucide-react'
import { useOffline } from './useOffline'

export default function OfflineBadge() {
  const { isOnline, isSyncing, pendingCount, lastSync, stats, triggerSync } = useOffline()
  const [showDetail, setShowDetail] = useState(false)

  const fmtTime = (d) => {
    if (!d) return '—'
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* دکمه اصلی */}
      <button
        onClick={() => setShowDetail(p => !p)}
        title={isOnline ? 'آنلاین' : 'آفلاین'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, border: 'none',
          cursor: 'pointer', fontSize: 11, fontWeight: 500,
          transition: 'all .15s',
          background: isOnline
            ? pendingCount > 0 ? '#fef3c7' : 'var(--t-accent-light)'
            : '#fee2e2',
          color: isOnline
            ? pendingCount > 0 ? '#92400e' : 'var(--t-accent)'
            : '#991b1b',
        }}
      >
        {isSyncing ? (
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
        ) : isOnline ? (
          <Wifi size={13} />
        ) : (
          <WifiOff size={13} />
        )}
        {isSyncing
          ? 'در حال همگام‌سازی...'
          : isOnline
          ? pendingCount > 0 ? `${pendingCount} در انتظار sync` : 'آنلاین'
          : 'آفلاین'}
      </button>

      {/* پنل جزئیات */}
      {showDetail && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0,
          background: 'var(--t-card-bg)', border: '0.5px solid var(--t-card-border)',
          borderRadius: 12, padding: 16, minWidth: 260, zIndex: 100,
          boxShadow: '0 4px 24px rgba(0,0,0,.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isOnline
                ? <Cloud size={16} style={{ color: 'var(--t-accent)' }} />
                : <CloudOff size={16} style={{ color: '#dc2626' }} />}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-txt)' }}>
                {isOnline ? 'متصل به سرور' : 'حالت آفلاین'}
              </span>
            </div>
            <button onClick={() => setShowDetail(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--t-txt-muted)',display:'flex' }}>
              <X size={14} />
            </button>
          </div>

          {/* وضعیت sync */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <Row label="وضعیت">
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                background: isOnline ? '#d1fae5' : '#fee2e2',
                color: isOnline ? '#065f46' : '#991b1b' }}>
                {isOnline ? '🟢 آنلاین' : '🔴 آفلاین'}
              </span>
            </Row>
            <Row label="آخرین همگام‌سازی">
              <span style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>{fmtTime(lastSync)}</span>
            </Row>
            <Row label="در صف ارسال">
              <span style={{ fontSize: 12, fontWeight: 500, color: pendingCount > 0 ? '#d97706' : 'var(--t-txt-muted)' }}>
                {pendingCount} رکورد
              </span>
            </Row>
          </div>

          {/* آمار آفلاین */}
          {stats && (
            <div style={{ borderTop: '0.5px solid var(--t-card-border)', paddingTop: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--t-txt-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                داده‌های ذخیره‌شده (آفلاین)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {Object.entries(stats.stores).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--t-txt-muted)' }}>{STORE_LABELS[k] || k}</span>
                    <span style={{ fontWeight: 500, color: 'var(--t-txt)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* دکمه sync */}
          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => { triggerSync(); setShowDetail(false) }}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                background: 'var(--t-accent)', color: 'var(--t-nav-active-txt)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={13} /> همگام‌سازی {pendingCount} رکورد
            </button>
          )}

          {!isOnline && (
            <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', textAlign: 'center', margin: 0 }}>
              تغییرات هنگام اتصال مجدد ارسال می‌شوند
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const STORE_LABELS = {
  invoices:  'فاکتورها',
  payments:  'پرداختی‌ها',
  receipts:  'دریافتی‌ها',
  expenses:  'هزینه‌ها',
  clients:   'مشتریان',
  products:  'محصولات',
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>{label}</span>
      {children}
    </div>
  )
}
