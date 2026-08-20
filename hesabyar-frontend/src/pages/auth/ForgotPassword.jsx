import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, Loader2, MailCheck } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { api } from '@/lib/apiClient'

const inp = {
  width: '100%', padding: '11px 40px 11px 14px',
  background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
  borderRadius: 10, fontSize: 13, color: 'var(--t-txt)',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
  textAlign: 'right',
}

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) { setError('یک ایمیل معتبر وارد کنید'); return }
    setLoading(true)
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      // به‌عمد پیام سرور رو نشون می‌دیم؛ سرور خودش هیچ‌وقت افشا نمی‌کنه که
      // ایمیل وجود داره یا نه، پس این فقط خطاهای واقعی (مثل قطعی شبکه) رو نشون می‌ده
      setError(err.message || 'ارسال ایمیل با خطا مواجه شد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="ایمیل ارسال شد" subtitle="">
        <div style={{ textAlign: 'center', animation: 'authSlideIn .4s ease-out' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--t-accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', animation: 'authPulse 2s ease-in-out infinite',
          }}>
            <MailCheck size={32} style={{ color: 'var(--t-accent)' }} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--t-txt)', marginBottom: 8, fontWeight: 500 }}>
            لینک بازیابی به ایمیل شما ارسال شد
          </p>
          <p style={{ fontSize: 13, color: 'var(--t-txt-muted)', lineHeight: 1.8, marginBottom: 28 }}>
            به آدرس <span style={{ color: 'var(--t-accent)', fontWeight: 500, direction: 'ltr', display: 'inline-block' }}>{email}</span> یک ایمیل حاوی لینک بازیابی رمز عبور ارسال کردیم. اگر ایمیل را دریافت نکردید، پوشه اسپم را بررسی کنید.
          </p>
          <button onClick={() => setSent(false)}
            style={{ fontSize: 13, color: 'var(--t-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
            ارسال مجدد ایمیل
          </button>
          <div>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--t-txt-muted)', textDecoration: 'none' }}>
              <ArrowRight size={14} /> بازگشت به ورود
            </Link>
          </div>
        </div>
        <style>{`@keyframes authPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }`}</style>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="فراموشی رمز عبور" subtitle="ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background:'#fee2e2',color:'#991b1b',fontSize:12,padding:'10px 14px',borderRadius:8,animation:'authShake .4s ease' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)', display: 'block', marginBottom: 6 }}>ایمیل</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="name@company.ir" dir="ltr"
              style={{ ...inp, borderColor: focused ? 'var(--t-accent)' : 'var(--t-card-border)', boxShadow: focused ? '0 0 0 3px var(--t-accent-light)' : 'none' }}
            />
            <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-txt-muted)' }} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,border:'none',background:'var(--t-accent)',color:'var(--t-nav-active-txt)',fontSize:14,fontWeight:600,cursor:loading?'default':'pointer',fontFamily:'inherit',opacity:loading?0.85:1,marginTop:4 }}>
          {loading ? <><Loader2 size={16} style={{ animation:'spin .8s linear infinite' }}/> در حال ارسال...</> : <>ارسال لینک بازیابی <ArrowLeft size={15}/></>}
        </button>

        <Link to="/login" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:13,color:'var(--t-txt-muted)',textDecoration:'none',marginTop:8 }}>
          <ArrowRight size={14} /> بازگشت به صفحه ورود
        </Link>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes authShake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
      `}</style>
    </AuthLayout>
  )
}
