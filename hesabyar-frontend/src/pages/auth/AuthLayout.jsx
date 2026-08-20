import { PieChart } from 'lucide-react'

/* Layout مشترک برای صفحات احراز هویت - با پس‌زمینه متحرک */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--t-content-bg)',
      direction: 'rtl', position: 'relative', overflow: 'hidden',
    }}>
      {/* پس‌زمینه متحرک سمت چپ (دسکتاپ) */}
      <div style={{
        flex: '1 1 45%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--t-sidebar-bg) 0%, var(--t-content-bg) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0,
      }} className="auth-visual-panel">

        {/* اشکال متحرک */}
        <FloatingShapes />

        {/* محتوای برندینگ */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 40px', maxWidth: 420 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'var(--t-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'authFloat 4s ease-in-out infinite',
            boxShadow: '0 20px 60px -10px var(--t-accent)',
          }}>
            <PieChart size={30} color="var(--t-nav-active-txt)" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--t-txt)', margin: '0 0 10px' }}>
            حسابیار
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t-txt-muted)', lineHeight: 1.8, margin: 0 }}>
            پنل حسابداری B2B هوشمند برای مدیریت کامل مالی کسب‌وکار شما — فاکتور، هزینه، گزارش و همه چیز در یک‌جا.
          </p>

          {/* mock dashboard preview کوچک */}
          <div style={{
            marginTop: 40, padding: 16, borderRadius: 16,
            background: 'var(--t-card-bg)', border: '0.5px solid var(--t-card-border)',
            animation: 'authFloat 4s ease-in-out infinite 0.5s',
            textAlign: 'right',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 36, borderRadius: 8, background: 'var(--t-search-bg)' }} />
              ))}
            </div>
            <div style={{ height: 60, borderRadius: 8, background: 'var(--t-search-bg)', display: 'flex', alignItems: 'flex-end', gap: 4, padding: 8 }}>
              {[40,65,35,80,55,90,70].map((h,i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: 'var(--t-accent)', opacity: 0.7 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* فرم سمت راست */}
      <div style={{
        flex: '1 1 55%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', minWidth: 0,
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'authSlideIn .5s ease-out' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t-txt)', margin: '0 0 8px' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--t-txt-muted)', margin: 0 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes authFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes authSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authBlob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,-30px) scale(1.05); }
          66% { transform: translate(-15px,15px) scale(0.97); }
        }
        @media (max-width: 860px) {
          .auth-visual-panel { display: none; }
        }
      `}</style>
    </div>
  )
}

function FloatingShapes() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'var(--t-accent)', opacity: 0.08, top: '10%', right: '-10%',
        animation: 'authBlob 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        background: 'var(--t-accent)', opacity: 0.06, bottom: '5%', left: '-5%',
        animation: 'authBlob 10s ease-in-out infinite 1s',
      }} />
      <div style={{
        position: 'absolute', width: 140, height: 140, borderRadius: '50%',
        background: 'var(--t-accent)', opacity: 0.05, top: '50%', left: '20%',
        animation: 'authBlob 7s ease-in-out infinite 2s',
      }} />
    </div>
  )
}
