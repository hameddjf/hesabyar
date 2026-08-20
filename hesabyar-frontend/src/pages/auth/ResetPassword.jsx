import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { api } from '@/lib/apiClient'

const inp = {
  width: '100%', padding: '11px 40px 11px 14px',
  background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
  borderRadius: 10, fontSize: 13, color: 'var(--t-txt)',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
}

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const labels = ['ضعیف', 'متوسط', 'خوب', 'قوی']
  const colors = ['#dc2626', '#d97706', '#65a30d', '#059669']

  if (!password) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score-1] : 'var(--t-card-border)',
            transition: 'background .3s',
          }} />
        ))}
      </div>
      {score > 0 && <span style={{ fontSize: 11, color: colors[score-1] }}>{labels[score-1]}</span>}
    </div>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password,  setPassword]  = useState('')
  const [confirm,    setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')
  const [focused,   setFocused]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('لینک بازنشانی نامعتبر است. دوباره از ایمیل خود اقدام کنید.'); return }
    if (password.length < 8) { setError('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    if (password !== confirm) { setError('رمزهای عبور مطابقت ندارند'); return }
    setLoading(true)
    try {
      await api.auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'لینک بازنشانی نامعتبر یا منقضی شده است. دوباره درخواست بدهید.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="رمز عبور تغییر کرد" subtitle="">
        <div style={{ textAlign: 'center', animation: 'authSlideIn .4s ease-out' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#d1fae5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', animation: 'authPop .4s ease-out',
          }}>
            <CheckCircle2 size={32} style={{ color: '#059669' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t-txt)', marginBottom: 24 }}>
            رمز عبور شما با موفقیت تغییر کرد
          </p>
          <button onClick={() => navigate('/login')}
            style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'11px 24px',borderRadius:10,border:'none',background:'var(--t-accent)',color:'var(--t-nav-active-txt)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>
            ورود به حساب <ArrowLeft size={15} />
          </button>
        </div>
        <style>{`@keyframes authPop { from { transform: scale(0.6); opacity:0 } to { transform: scale(1); opacity:1 } }`}</style>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="تنظیم رمز عبور جدید" subtitle="رمز عبور جدید خود را وارد کنید">
      <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
        {error && (
          <div style={{ background:'#fee2e2',color:'#991b1b',fontSize:12,padding:'10px 14px',borderRadius:8,animation:'authShake .4s ease' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',display:'block',marginBottom:6 }}>رمز عبور جدید</label>
          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
              onFocus={()=>setFocused('p1')} onBlur={()=>setFocused('')} placeholder="حداقل ۸ کاراکتر"
              style={{ ...inp,paddingLeft:40,borderColor:focused==='p1'?'var(--t-accent)':'var(--t-card-border)',boxShadow:focused==='p1'?'0 0 0 3px var(--t-accent-light)':'none' }} />
            <Lock size={16} style={{ position:'absolute',left:38,top:'50%',transform:'translateY(-50%)',color:'var(--t-txt-muted)' }}/>
            <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--t-txt-muted)',display:'flex' }}>
              {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div>
          <label style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',display:'block',marginBottom:6 }}>تکرار رمز عبور</label>
          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)}
              onFocus={()=>setFocused('p2')} onBlur={()=>setFocused('')} placeholder="••••••••"
              style={{ ...inp,paddingLeft:40,borderColor:focused==='p2'?'var(--t-accent)':'var(--t-card-border)',boxShadow:focused==='p2'?'0 0 0 3px var(--t-accent-light)':'none' }} />
            <Lock size={16} style={{ position:'absolute',left:38,top:'50%',transform:'translateY(-50%)',color:'var(--t-txt-muted)' }}/>
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,border:'none',background:'var(--t-accent)',color:'var(--t-nav-active-txt)',fontSize:14,fontWeight:600,cursor:loading?'default':'pointer',fontFamily:'inherit',opacity:loading?0.85:1,marginTop:4 }}>
          {loading ? <><Loader2 size={16} style={{ animation:'spin .8s linear infinite' }}/> در حال ذخیره...</> : 'تغییر رمز عبور'}
        </button>

        <Link to="/login" style={{ textAlign:'center',fontSize:13,color:'var(--t-txt-muted)',textDecoration:'none' }}>
          بازگشت به ورود
        </Link>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes authShake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
      `}</style>
    </AuthLayout>
  )
}
