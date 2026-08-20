import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, Building2, Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { useAuthStore } from '@/store/authStore'

const inp = {
  width: '100%', padding: '11px 40px 11px 14px',
  background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
  borderRadius: 10, fontSize: 13, color: 'var(--t-txt)',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
  textAlign: 'right',
}

function Field({ label, icon: Icon, focused, name, setFocused, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          onFocus={() => setFocused(name)}
          onBlur={() => setFocused('')}
          style={{
            ...inp,
            borderColor: focused === name ? 'var(--t-accent)' : 'var(--t-card-border)',
            boxShadow: focused === name ? '0 0 0 3px var(--t-accent-light)' : 'none',
          }}
        />
        <Icon size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-txt-muted)' }} />
      </div>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ companyName:'', name:'', email:'', password:'', confirmPassword:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [focused,  setFocused]  = useState('')
  const set = (k,v) => setForm(p => ({ ...p, [k]: v }))

  const stepOneValid = form.companyName && form.name
  const stepTwoValid = form.email && form.password && form.password === form.confirmPassword && form.password.length >= 8

  const goNext = () => {
    setError('')
    if (!stepOneValid) { setError('همه فیلدها را تکمیل کنید'); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    if (form.password !== form.confirmPassword) { setError('رمزهای عبور مطابقت ندارند'); return }
    setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password, companyName: form.companyName })
      navigate('/')
    } catch (err) {
      setError(err.message || 'ثبت‌نام ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="ساخت حساب جدید" subtitle="چند قدم تا راه‌اندازی پنل حسابداری شما">

      {/* نشانگر مراحل */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {[1,2].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: s === 1 ? 'none' : 1 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              background: step >= s ? 'var(--t-accent)' : 'var(--t-search-bg)',
              color: step >= s ? 'var(--t-nav-active-txt)' : 'var(--t-txt-muted)',
              transition: 'background .3s',
            }}>
              {step > s ? <Check size={13} /> : s}
            </div>
            {s === 1 && (
              <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--t-accent)' : 'var(--t-card-border)', borderRadius: 2, transition: 'background .3s' }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background:'#fee2e2',color:'#991b1b',fontSize:12,padding:'10px 14px',borderRadius:8,marginBottom:16,animation:'authShake .4s ease' }}>
          {error}
        </div>
      )}

      {/* مرحله ۱: اطلاعات شرکت */}
      {step === 1 && (
        <div style={{ display:'flex',flexDirection:'column',gap:16,animation:'authSlideIn .35s ease-out' }}>
          <Field label="نام شرکت یا کسب‌وکار" icon={Building2} name="company" focused={focused} setFocused={setFocused}
            value={form.companyName} onChange={e=>set('companyName',e.target.value)} placeholder="مثلاً: حسابیار تک" />
          <Field label="نام و نام‌خانوادگی شما" icon={User} name="name" focused={focused} setFocused={setFocused}
            value={form.name} onChange={e=>set('name',e.target.value)} placeholder="نام کامل" />

          <button onClick={goNext} type="button"
            style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,border:'none',background:'var(--t-accent)',color:'var(--t-nav-active-txt)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4 }}>
            ادامه <ArrowLeft size={15} />
          </button>
        </div>
      )}

      {/* مرحله ۲: ایمیل و رمز */}
      {step === 2 && (
        <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:16,animation:'authSlideIn .35s ease-out' }}>
          <Field label="ایمیل" icon={Mail} name="email" focused={focused} setFocused={setFocused}
            type="email" dir="ltr" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="name@company.ir" />

          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',display:'block',marginBottom:6 }}>رمز عبور</label>
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)}
                onFocus={()=>setFocused('pw')} onBlur={()=>setFocused('')} placeholder="حداقل ۸ کاراکتر"
                style={{ ...inp, paddingLeft:40, borderColor:focused==='pw'?'var(--t-accent)':'var(--t-card-border)', boxShadow:focused==='pw'?'0 0 0 3px var(--t-accent-light)':'none' }} />
              <Lock size={16} style={{ position:'absolute',left:38,top:'50%',transform:'translateY(-50%)',color:'var(--t-txt-muted)' }}/>
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--t-txt-muted)',display:'flex' }}>
                {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </div>

          <Field label="تکرار رمز عبور" icon={Lock} name="cpw" focused={focused} setFocused={setFocused}
            type="password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)} placeholder="••••••••" />

          <div style={{ display:'flex',gap:8,marginTop:4 }}>
            <button onClick={()=>setStep(1)} type="button"
              style={{ flex:'0 0 auto',display:'flex',alignItems:'center',gap:6,padding:'12px 16px',borderRadius:10,border:'0.5px solid var(--t-card-border)',background:'var(--t-search-bg)',color:'var(--t-txt)',fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>
              <ArrowRight size={15} /> بازگشت
            </button>
            <button type="submit" disabled={loading}
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,border:'none',background:'var(--t-accent)',color:'var(--t-nav-active-txt)',fontSize:14,fontWeight:600,cursor:loading?'default':'pointer',fontFamily:'inherit',opacity:loading?0.85:1 }}>
              {loading ? <><Loader2 size={16} style={{ animation:'spin .8s linear infinite' }}/> در حال ساخت...</> : <>ساخت حساب <ArrowLeft size={15}/></>}
            </button>
          </div>
        </form>
      )}

      <p style={{ textAlign:'center',fontSize:13,color:'var(--t-txt-muted)',marginTop:20 }}>
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <Link to="/login" style={{ color:'var(--t-accent)',fontWeight:500,textDecoration:'none' }}>وارد شوید</Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes authShake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
      `}</style>
    </AuthLayout>
  )
}
