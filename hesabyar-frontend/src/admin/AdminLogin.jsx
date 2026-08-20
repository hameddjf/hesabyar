import { useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, AlertTriangle, KeyRound, Clock } from 'lucide-react'
import { useAdminAuth } from './AdminAuthContext'

export default function AdminLogin() {
  const { step, loginStep1, loginStep2, pendingEmail, admin } = useAdminAuth()
  if (admin) return <Navigate to="/" replace />
  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--admin-bg)',direction:'rtl',position:'relative',overflow:'hidden' }}>
      <Background/>
      <div style={{ position:'relative',zIndex:1,width:'100%',maxWidth:400,padding:'0 20px',animation:'adminFadeIn .5s ease-out' }}>

        {/* هدر */}
        <div style={{ textAlign:'center',marginBottom:28 }}>
          <div style={{ width:54,height:54,borderRadius:16,background:'linear-gradient(135deg,#6366f1,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 40px rgba(99,102,241,.35)',animation:'adminGlow 3s ease-in-out infinite' }}>
            <ShieldCheck size={28} color="#fff"/>
          </div>
          <h1 style={{ fontSize:18,fontWeight:700,color:'var(--admin-txt)',margin:'0 0 5px' }}>پنل مدیریت سیستم</h1>
          <p style={{ fontSize:12,color:'var(--admin-muted)',margin:0 }}>Hesabyar Admin · دسترسی محدود</p>
        </div>

        {/* هشدار امنیتی */}
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,marginBottom:20,background:'rgba(245,158,11,.06)',border:'0.5px solid rgba(245,158,11,.25)' }}>
          <AlertTriangle size={13} style={{ color:'var(--admin-warning)',flexShrink:0 }}/>
          <p style={{ fontSize:11,color:'var(--admin-warning)',margin:0,lineHeight:1.6 }}>این صفحه محدود است. ورود غیرمجاز پیگرد قانونی دارد.</p>
        </div>

        {/* نشانگر مراحل */}
        <StepIndicator step={step}/>

        {/* فرم */}
        <div className="admin-card" style={{ marginTop:16 }}>
          {step === 'login' && <LoginForm onSubmit={loginStep1}/>}
          {step === '2fa'   && <TwoFAForm onSubmit={loginStep2} email={pendingEmail}/>}
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ step }) {
  const steps = [{ key:'login',label:'ورود' },{ key:'2fa',label:'تأیید هویت' }]
  const activeIdx = step === '2fa' ? 1 : 0
  return (
    <div style={{ display:'flex',alignItems:'center' }}>
      {steps.map((s,i) => (
        <div key={s.key} style={{ display:'flex',alignItems:'center',flex:i<steps.length-1?1:'none' }}>
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
            <div style={{ width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,background:i<=activeIdx?'var(--admin-accent)':'var(--admin-surface2)',color:i<=activeIdx?'#fff':'var(--admin-muted)',border:`1.5px solid ${i<=activeIdx?'var(--admin-accent)':'var(--admin-border)'}`,transition:'all .3s',boxShadow:i===activeIdx?'0 0 12px var(--admin-accent-glow)':'none' }}>{i+1}</div>
            <span style={{ fontSize:10,color:i<=activeIdx?'var(--admin-accent2)':'var(--admin-muted)',whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
          {i < steps.length-1 && <div style={{ flex:1,height:1.5,margin:'0 8px',background:activeIdx>i?'var(--admin-accent)':'var(--admin-border)',marginBottom:16,borderRadius:99,transition:'background .3s' }}/>}
        </div>
      ))}
    </div>
  )
}

function LoginForm({ onSubmit }) {
  const [st, setSt] = useState({ email:'',password:'',showPass:false,loading:false,error:'',shake:false })
  const set = (k,v) => setSt(p=>({...p,[k]:v}))
  const [focused, setFocused] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    if (!st.email||!st.password) { triggerError('ایمیل و رمز عبور را وارد کنید'); return }
    set('loading',true); set('error','')
    const res = await onSubmit(st.email, st.password)
    set('loading',false)
    if (!res.ok) triggerError(res.error||'اطلاعات ورود نادرست است')
  }

  const triggerError = (msg) => {
    set('error',msg); set('shake',true)
    setTimeout(()=>set('shake',false), 400)
  }

  return (
    <form onSubmit={handle} style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {st.error && <ErrorBox shake={st.shake}>{st.error}</ErrorBox>}

      <Field label="ایمیل مدیر سیستم">
        <div style={{ position:'relative' }}>
          <input type="email" value={st.email} onChange={e=>set('email',e.target.value)}
            onFocus={()=>setFocused('e')} onBlur={()=>setFocused('')}
            placeholder="admin@hesabyar.ir" dir="ltr" required className="admin-input"
            style={{ paddingLeft:38,textAlign:'right',borderColor:focused==='e'?'var(--admin-accent)':undefined,boxShadow:focused==='e'?'0 0 0 3px var(--admin-accent-glow)':undefined }}/>
          <Mail size={15} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--admin-muted)' }}/>
        </div>
      </Field>

      <Field label="رمز عبور">
        <div style={{ position:'relative' }}>
          <input type={st.showPass?'text':'password'} value={st.password} onChange={e=>set('password',e.target.value)}
            onFocus={()=>setFocused('p')} onBlur={()=>setFocused('')}
            placeholder="••••••••" required className="admin-input"
            style={{ paddingLeft:68,borderColor:focused==='p'?'var(--admin-accent)':undefined,boxShadow:focused==='p'?'0 0 0 3px var(--admin-accent-glow)':undefined }}/>
          <Lock size={15} style={{ position:'absolute',left:42,top:'50%',transform:'translateY(-50%)',color:'var(--admin-muted)' }}/>
          <button type="button" onClick={()=>set('showPass',!st.showPass)}
            style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--admin-muted)',display:'flex',padding:2 }}>
            {st.showPass?<EyeOff size={15}/>:<Eye size={15}/>}
          </button>
        </div>
      </Field>

      <button type="submit" disabled={st.loading} className="admin-btn admin-btn-primary"
        style={{ width:'100%',justifyContent:'center',padding:'11px',marginTop:4,opacity:st.loading?.8:1 }}>
        {st.loading ? <><Loader2 size={15} style={{ animation:'spin .8s linear infinite' }}/> در حال بررسی...</> : 'ادامه →'}
      </button>

      <p style={{ textAlign:'center',fontSize:11,color:'var(--admin-muted)',lineHeight:1.7 }}>
        دسترسی فقط با IP مجاز + احراز هویت دو مرحله‌ای
      </p>
    </form>
  )
}

function TwoFAForm({ onSubmit, email }) {
  const [digits,  setDigits]  = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [shake,   setShake]   = useState(false)
  const [timer,   setTimer]   = useState(30)
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()]

  useState(() => {
    const iv = setInterval(()=>setTimer(t=>t>0?t-1:30),1000)
    return ()=>clearInterval(iv)
  })

  const handleDigit = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next=[...digits]; next[i]=val.slice(-1); setDigits(next)
    if (val && i<5) refs[i+1].current?.focus()
  }
  const handleKey = (i,e) => {
    if (e.key==='Backspace'&&!digits[i]&&i>0) refs[i-1].current?.focus()
  }
  const handlePaste = (e) => {
    const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (p.length===6) { setDigits(p.split('')); refs[5].current?.focus() }
    e.preventDefault()
  }

  const handle = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length<6) { triggerError('کد ۶ رقمی را کامل وارد کنید'); return }
    setLoading(true); setError('')
    const res = await onSubmit(otp)
    setLoading(false)
    if (!res.ok) { triggerError(res.error||'کد نادرست'); setDigits(['','','','','','']); refs[0].current?.focus() }
  }

  const triggerError = (msg) => {
    setError(msg); setShake(true)
    setTimeout(()=>setShake(false),400)
  }

  const timerColor = timer<=10?'var(--admin-danger)':timer<=20?'var(--admin-warning)':'var(--admin-success)'
  const otpFilled  = digits.join('').length === 6

  return (
    <form onSubmit={handle} style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--admin-surface2)',border:'0.5px solid var(--admin-border)' }}>
        <KeyRound size={16} style={{ color:'var(--admin-accent)',flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12,fontWeight:500,color:'var(--admin-txt)',margin:'0 0 2px' }}>احراز هویت دو مرحله‌ای</p>
          <p style={{ fontSize:11,color:'var(--admin-muted)',margin:0,direction:'ltr' }}>{email}</p>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
          <Clock size={12} style={{ color:timerColor }}/>
          <span style={{ fontSize:12,fontWeight:600,color:timerColor,fontVariantNumeric:'tabular-nums' }}>{String(timer).padStart(2,'0')}s</span>
        </div>
      </div>

      {error && <ErrorBox shake={shake}>{error}</ErrorBox>}

      <p style={{ fontSize:12,color:'var(--admin-muted)',textAlign:'center' }}>
        کد ۶ رقمی Google Authenticator را وارد کنید
      </p>

      <div style={{ display:'flex',gap:8,justifyContent:'center',direction:'ltr' }} onPaste={handlePaste}>
        {digits.map((d,i)=>(
          <input key={i} ref={refs[i]} type="text" inputMode="numeric" value={d}
            onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} maxLength={1}
            style={{ width:44,height:52,textAlign:'center',fontSize:22,fontWeight:700,background:d?'rgba(99,102,241,.08)':'var(--admin-surface2)',border:`1.5px solid ${d?'var(--admin-accent)':'var(--admin-border)'}`,borderRadius:10,color:'var(--admin-txt)',fontFamily:'monospace',outline:'none',transition:'all .15s',boxShadow:d?'0 0 8px var(--admin-accent-glow)':'none',cursor:'text' }}
            onFocus={e=>e.target.style.borderColor='var(--admin-accent2)'}
            onBlur={e=>e.target.style.borderColor=d?'var(--admin-accent)':'var(--admin-border)'}
          />
        ))}
      </div>

      <button type="submit" disabled={loading||!otpFilled} className="admin-btn admin-btn-primary"
        style={{ width:'100%',justifyContent:'center',padding:'11px',opacity:(loading||!otpFilled)?.7:1,transition:'opacity .15s' }}>
        {loading ? <><Loader2 size={15} style={{ animation:'spin .8s linear infinite' }}/> در حال تأیید...</> : <><ShieldCheck size={15}/> ورود به پنل مدیریت</>}
      </button>

      <p style={{ textAlign:'center',fontSize:11,color:'var(--admin-muted)' }}>
        کد تست (dev): <span style={{ fontFamily:'monospace',color:'var(--admin-accent2)',letterSpacing:2 }}>123456</span>
      </p>
    </form>
  )
}

const Field = ({label,children}) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--admin-muted)',display:'block',marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

const ErrorBox = ({children,shake}) => (
  <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'rgba(239,68,68,.08)',border:'0.5px solid rgba(239,68,68,.4)',fontSize:12,color:'#f87171',animation:shake?'adminShake .4s ease':'none' }}>
    <AlertTriangle size={14} style={{ flexShrink:0 }}/> {children}
  </div>
)

function Background() {
  return (
    <div style={{ position:'absolute',inset:0,overflow:'hidden',zIndex:0 }}>
      <div style={{ position:'absolute',width:500,height:500,borderRadius:'50%',background:'#6366f1',opacity:.04,top:'-15%',right:'-15%',animation:'adminFloat 9s ease-in-out infinite' }}/>
      <div style={{ position:'absolute',width:350,height:350,borderRadius:'50%',background:'#818cf8',opacity:.04,bottom:'-10%',left:'-10%',animation:'adminFloat 11s ease-in-out infinite 1.5s' }}/>
      <div style={{ position:'absolute',width:200,height:200,borderRadius:'50%',background:'#38bdf8',opacity:.03,top:'40%',left:'30%',animation:'adminFloat 7s ease-in-out infinite 3s' }}/>
      <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 1.5px 1.5px,#2a2a3a 1px,transparent 0)',backgroundSize:'36px 36px',opacity:.5 }}/>
    </div>
  )
}
