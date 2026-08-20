import { useState } from 'react'
import {
  CreditCard, TrendingUp, Package, AlertCircle,
  Check, X, ChevronDown, Eye, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAdminCompanies } from '../hooks/useAdminCompanies'

/* ── تعریف ثابت پلن‌ها (تنظیمات کسب‌وکاری، نه دیتای دیتابیس — فعلاً ثابته) ── */
const PLANS = [
  {
    id: 'free', name: 'Free', nameFA: 'رایگان',
    price: 0, color: '#94a3b8', bg: '#1a1a26',
    features: ['۱ کاربر', 'فاکتور نامحدود', 'گزارش پایه', 'پشتیبانی ایمیل'],
    limits:    ['بدون آفلاین مود', 'بدون export هلو', 'بدون زیرحساب'],
  },
  {
    id: 'basic', name: 'Basic', nameFA: 'پایه',
    price: 290_000, color: '#93c5fd', bg: '#0c1a3d',
    features: ['۳ کاربر', 'فاکتور نامحدود', 'گزارش کامل', 'آفلاین مود', 'پشتیبانی تلفنی'],
    limits:    ['بدون export هلو', 'بدون API access'],
  },
  {
    id: 'pro', name: 'Pro', nameFA: 'حرفه‌ای',
    price: 690_000, color: '#c4b5fd', bg: '#1e0a3d',
    features: ['کاربر نامحدود', 'همه امکانات', 'آفلاین مود', 'export/import هلو', 'API access', 'پشتیبانی ۲۴/۷'],
    limits:    [],
    popular: true,
  },
]

const PLAN_CLR = { pro:'#c4b5fd', basic:'#93c5fd', free:'#94a3b8' }
const PLAN_BG  = { pro:'#1e0a3d', basic:'#0c1a3d', free:'#1a1a26' }
const PLAN_LABEL = { pro:'Pro', basic:'Basic', free:'Free' }

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'var(--admin-muted)', marginBottom:4 }}>{label}</p>
      <p style={{ color:'var(--admin-accent)', margin:0 }}>{payload[0].value}</p>
    </div>
  )
}

/* ── Modal ویرایش پلن — فعلاً فقط نمایشی، چون سیستم مدیریت پویای پلن‌ها هنوز ساخته نشده ── */
function EditPlanModal({ plan, onClose }) {
  if (!plan) return null
  const inp = { background:'var(--admin-surface2)', border:'0.5px solid var(--admin-border)', borderRadius:8, padding:'8px 10px', fontSize:12, color:'var(--admin-txt)', fontFamily:'inherit', outline:'none', width:'100%' }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:14, width:440, boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid var(--admin-border)' }}>
          <h2 style={{ fontSize:14, fontWeight:600, color:'var(--admin-txt)', margin:0 }}>مشخصات پلن {plan.nameFA}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex' }}><X size={16}/></button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, background:'rgba(251,191,36,.1)', color:'#fbbf24', borderRadius:8, padding:'10px 12px' }}>
            <AlertTriangle size={14}/> ویرایش پویای پلن‌ها هنوز پیاده‌سازی نشده — این فرم فقط نمایشیه. برای تغییر واقعی، فعلاً باید در کد (`AdminBilling.jsx`) دستی ویرایش بشه.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--admin-muted)', display:'block', marginBottom:5 }}>نام پلن</label>
              <input defaultValue={plan.nameFA} style={inp} disabled/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--admin-muted)', display:'block', marginBottom:5 }}>قیمت ماهانه (تومان)</label>
              <input defaultValue={plan.price} style={inp} disabled/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={onClose} className="admin-btn admin-btn-ghost">بستن</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBilling() {
  const { companies, loading, error, setPlan } = useAdminCompanies()
  const [tab, setTab] = useState('overview')
  const [editPlan, setEditPlan] = useState(null)
  const [planF, setPlanF] = useState('')

  const byPlan = { free:0, basic:0, pro:0 }
  companies.forEach(c => { byPlan[c.planRaw] = (byPlan[c.planRaw]||0) + 1 })

  const totalRevenue = companies.reduce((s,c) => s + (c.revenue || 0), 0) // میلیون تومان، تجمعی (نه ماهانه — چون تاریخ استاندارد نداریم)
  const paidPlanCompanies = companies.filter(c => c.planRaw !== 'free').length
  const trialCompanies = companies.filter(c => c.status === 'trial').length
  const suspendedCompanies = companies.filter(c => c.status === 'suspended').length

  const filteredCompanies = companies
    .filter(c => !planF || c.planRaw === planF)
    .slice()
    .sort((a,b) => b.revenue - a.revenue)

  const selStyle = { appearance:'none', background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:8, padding:'7px 28px 7px 10px', fontSize:12, color:'var(--admin-txt)', fontFamily:'inherit', cursor:'pointer', outline:'none' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'adminFadeIn .3s ease-out' }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--admin-txt)', margin:'0 0 4px' }}>صورتحساب‌ها</h1>
        <p style={{ fontSize:13, color:'var(--admin-muted)', margin:0 }}>پلن‌های اشتراکی و درآمد پلتفرم</p>
      </div>

      {error && (
        <div style={{ fontSize:12, color:'#f87171', background:'rgba(248,113,113,.1)', border:'0.5px solid rgba(248,113,113,.3)', borderRadius:8, padding:'10px 14px' }}>
          {error.message || 'خطا در دریافت لیست شرکت‌ها'}
        </div>
      )}

      <div style={{ display:'flex', gap:4, background:'var(--admin-surface2)', borderRadius:10, padding:4, alignSelf:'flex-start' }}>
        {[['overview','نمای کلی'],['plans','پلن‌ها'],['invoices','درآمد شرکت‌ها']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:'6px 18px', borderRadius:7, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
              background: tab===k ? 'var(--admin-accent)' : 'transparent',
              color:      tab===k ? '#fff' : 'var(--admin-muted)',
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ تب نمای کلی ═══ */}
      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              [CreditCard, 'درآمد تجمعی (م ت)',   totalRevenue,  '#fbbf24'],
              [TrendingUp, 'اشتراک‌های پولی',      paidPlanCompanies,  '#34d399'],
              [Package,    'در دوره آزمایشی',      trialCompanies,  '#c4b5fd'],
              [AlertCircle,'شرکت تعلیق‌شده',        suspendedCompanies,   '#f87171'],
            ].map(([Icon,label,val,color])=>(
              <div key={label} className="admin-stat">
                <div style={{ width:36,height:36,borderRadius:9,background:color+'22',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Icon size={17} style={{ color }}/>
                </div>
                <div>
                  <p style={{ fontSize:24,fontWeight:700,color:'var(--admin-txt)',margin:'0 0 2px' }}>{val}</p>
                  <p style={{ fontSize:12,color:'var(--admin-muted)',margin:0 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, background:'rgba(251,191,36,.1)', color:'#fbbf24', borderRadius:8, padding:'10px 14px' }}>
            <AlertTriangle size={14}/> درآمد بالا «تجمعی از ابتدا» است، نه ماهانه — چون هنوز سیستم فاکتورگیری اشتراکی و بازه‌بندی تاریخ استاندارد وجود نداره.
          </div>

          <div className="admin-card">
            <div style={{ marginBottom:16 }}>
              <h2 style={{ fontSize:13,fontWeight:600,color:'var(--admin-txt)',margin:0 }}>تعداد شرکت‌ها به تفکیک پلن</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{name:'Free',count:byPlan.free},{name:'Basic',count:byPlan.basic},{name:'Pro',count:byPlan.pro}]} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:11,fill:'var(--admin-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<CT/>} cursor={{ fill:'rgba(99,102,241,.05)' }}/>
                <Bar dataKey="count" fill="var(--admin-accent)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ═══ تب پلن‌ها ═══ */}
      {tab === 'plans' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background:'var(--admin-surface)',
              border: plan.popular ? '1.5px solid var(--admin-accent)' : '0.5px solid var(--admin-border)',
              borderRadius:14, overflow:'hidden', position:'relative',
              boxShadow: plan.popular ? '0 0 30px var(--admin-accent-glow)' : 'none',
            }}>
              {plan.popular && (
                <div style={{ background:'var(--admin-accent)', color:'#fff', fontSize:10, fontWeight:600, textAlign:'center', padding:'4px 0', letterSpacing:'.06em' }}>
                  محبوب‌ترین
                </div>
              )}
              <div style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <span style={{ fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:99,background:plan.bg,color:plan.color,display:'inline-block',marginBottom:6 }}>{plan.name}</span>
                    <p style={{ fontSize:22,fontWeight:700,color:'var(--admin-txt)',margin:0 }}>
                      {plan.price===0 ? 'رایگان' : plan.price.toLocaleString('fa-IR')+' ت'}
                    </p>
                    {plan.price>0 && <p style={{ fontSize:11,color:'var(--admin-muted)',margin:0 }}>در ماه</p>}
                  </div>
                  <div style={{ textAlign:'left' }}>
                    <p style={{ fontSize:24,fontWeight:700,color:plan.color,margin:0 }}>{byPlan[plan.id] || 0}</p>
                    <p style={{ fontSize:10,color:'var(--admin-muted)',margin:0 }}>شرکت فعال</p>
                  </div>
                </div>

                <div className="admin-divider"/>

                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                  {plan.features.map(f=>(
                    <div key={f} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--admin-txt2)' }}>
                      <Check size={13} style={{ color:'var(--admin-success)',flexShrink:0 }}/> {f}
                    </div>
                  ))}
                  {plan.limits.map(l=>(
                    <div key={l} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--admin-muted)' }}>
                      <X size={13} style={{ color:'var(--admin-danger)',flexShrink:0 }}/> {l}
                    </div>
                  ))}
                </div>

                <button onClick={()=>setEditPlan(plan)} className="admin-btn admin-btn-ghost" style={{ width:'100%',justifyContent:'center' }}>
                  مشاهده مشخصات
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ تب درآمد شرکت‌ها (واقعی) ═══ */}
      {tab === 'invoices' && (
        <div className="admin-card" style={{ padding:0,overflow:'hidden' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'0.5px solid var(--admin-border)' }}>
            <h2 style={{ fontSize:13,fontWeight:600,color:'var(--admin-txt)',margin:0 }}>درآمد به تفکیک شرکت (بر اساس فاکتورهای پرداخت‌شده)</h2>
            <div style={{ position:'relative' }}>
              <select value={planF} onChange={e=>setPlanF(e.target.value)} style={selStyle}>
                <option value="">همه پلن‌ها</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
              <ChevronDown size={12} style={{ position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--admin-muted)',pointerEvents:'none' }}/>
            </div>
          </div>

          {loading ? (
            <p style={{ fontSize:12, color:'var(--admin-muted)', padding:20 }}>در حال بارگذاری...</p>
          ) : !filteredCompanies.length ? (
            <p style={{ fontSize:12, color:'var(--admin-muted)', padding:20 }}>شرکتی یافت نشد.</p>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>{['شرکت','پلن','تعداد فاکتور','درآمد (م ت)','وضعیت',''].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredCompanies.map(c=>{
                const pm = { color:PLAN_CLR[c.planRaw], bg:PLAN_BG[c.planRaw] }
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight:500,color:'var(--admin-txt)' }}>{c.name}</td>
                    <td><span style={{ fontSize:11,fontWeight:500,padding:'2px 7px',borderRadius:99,background:pm.bg,color:pm.color }}>{PLAN_LABEL[c.planRaw]}</span></td>
                    <td style={{ fontSize:12,color:'var(--admin-muted)' }}>{c.invoices}</td>
                    <td style={{ fontWeight:500,color:'var(--admin-txt)',direction:'ltr' }}>{c.revenue.toLocaleString('fa-IR')}</td>
                    <td><span className={`admin-badge ${c.status==='active'?'admin-badge-green':c.status==='trial'?'admin-badge-amber':'admin-badge-red'}`}>{c.status==='active'?'فعال':c.status==='trial'?'آزمایشی':'تعلیق'}</span></td>
                    <td>
                      <button
                        onClick={() => setPlan(c.id, c.planRaw === 'pro' ? 'basic' : c.planRaw === 'basic' ? 'pro' : 'basic')}
                        className="admin-btn admin-btn-ghost admin-btn-sm">
                        تغییر پلن
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
        </div>
      )}

      <EditPlanModal plan={editPlan} onClose={()=>setEditPlan(null)}/>
    </div>
  )
}
