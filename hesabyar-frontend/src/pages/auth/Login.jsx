import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { useAuthStore } from '@/store/authStore'

const inp = {
  width: '100%', padding: '11px 40px 11px 14px',
  background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
  borderRadius: 10, fontSize: 13, color: 'var(--t-txt)',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
}

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [focused,  setFocused]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('ایمیل و رمز عبور را وارد کنید')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'ایمیل یا رمز عبور اشتباه است')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="ورود به حساب" subtitle="خوش آمدید! اطلاعات خود را وارد کنید">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', fontSize: 12,
            padding: '10px 14px', borderRadius: 8,
            animation: 'authShake .4s ease',
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)', display: 'block', marginBottom: 6 }}>
            ایمیل
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              placeholder="name@company.ir"
              dir="ltr"
              style={{
                ...inp,
                textAlign: 'right',
                borderColor: focused === 'email' ? 'var(--t-accent)' : 'var(--t-card-border)',
                boxShadow: focused === 'email' ? '0 0 0 3px var(--t-accent-light)' : 'none',
              }}
            />
            <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-txt-muted)' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)' }}>رمز عبور</label>
            <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--t-accent)', textDecoration: 'none' }}>
              فراموشی رمز؟
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused('')}
              placeholder="••••••••"
              style={{
                ...inp, paddingLeft: 40,
                borderColor: focused === 'pass' ? 'var(--t-accent)' : 'var(--t-card-border)',
                boxShadow: focused === 'pass' ? '0 0 0 3px var(--t-accent-light)' : 'none',
              }}
            />
            <Lock size={16} style={{ position: 'absolute', left: 38, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-txt-muted)' }} />
            <button type="button" onClick={() => setShowPass(p => !p)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-txt-muted)', display: 'flex' }}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--t-txt-muted)' }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: 'var(--t-accent)', cursor: 'pointer' }} />
          مرا به خاطر بسپار
        </label>

        <button type="submit" disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--t-accent)', color: 'var(--t-nav-active-txt)',
            fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'transform .1s, opacity .15s',
            opacity: loading ? 0.85 : 1, marginTop: 4,
          }}
          onMouseDown={e => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {loading ? (
            <><Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> در حال ورود...</>
          ) : (
            <>ورود <ArrowLeft size={15} /></>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t-txt-muted)', marginTop: 8 }}>
          حساب کاربری ندارید؟{' '}
          <Link to="/register" style={{ color: 'var(--t-accent)', fontWeight: 500, textDecoration: 'none' }}>
            ثبت‌نام کنید
          </Link>
        </p>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes authShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </AuthLayout>
  )
}
