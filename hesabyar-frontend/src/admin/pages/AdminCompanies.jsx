import { useState } from 'react'
import {
  Building2, Search, Plus, Eye, Settings,
  Ban, CheckCircle2, X, Users, FileText,
  CreditCard, ChevronDown, Clock, Mail, Phone,
} from 'lucide-react'
import { useAdminCompanies } from '../hooks/useAdminCompanies'

const PLAN_META   = { Pro:{color:'#c4b5fd',bg:'#1e0a3d'}, Basic:{color:'#93c5fd',bg:'#0c1a3d'}, Free:{color:'#64748b',bg:'#1a1a26'} }
const STATUS_META = {
  active:    { label:'فعال',    cls:'admin-badge-green' },
  trial:     { label:'آزمایشی', cls:'admin-badge-amber' },
  suspended: { label:'تعلیق',   cls:'admin-badge-red'   },
}

/* ── Modal جزئیات شرکت ── */
function CompanyDetailModal({ company, onClose, onSuspend, onActivate }) {
  if (!company) return null
  const pm = PLAN_META[company.plan]
  const sm = STATUS_META[company.status]

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:16, width:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 48px rgba(0,0,0,.5)', animation:'adminFadeIn .25s ease-out' }}>

        {/* هدر */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid var(--admin-border)' }}>
          <h2 style={{ fontSize:14, fontWeight:600, color:'var(--admin-txt)', margin:0 }}>جزئیات شرکت</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex', padding:4, borderRadius:6, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--admin-surface2)'; e.currentTarget.style.color='var(--admin-txt)' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--admin-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>

          {/* هدر شرکت */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(99,102,241,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Building2 size={24} style={{ color:'var(--admin-accent)' }} />
            </div>
            <div style={{ flex:1 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'var(--admin-txt)', margin:'0 0 6px' }}>{company.name}</h3>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99, background:pm.bg, color:pm.color }}>{company.plan}</span>
                <span className={`admin-badge ${sm.cls}`}>{sm.label}</span>
              </div>
            </div>
          </div>

          {/* اطلاعات تماس */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              [Users,   'مالک/مدیر',         company.owner,        false],
              [Mail,    'ایمیل',              company.email,        true ],
              [Phone,   'تلفن',               company.phone,        true ],
              [Clock,   'تاریخ ثبت‌نام',      company.joined,       false],
              [Clock,   'آخرین فعالیت',       company.lastActivity, false],
            ].map(([Icon, label, val, ltr]) => (
              <div key={label} style={{ background:'var(--admin-surface2)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:8 }}>
                <Icon size={14} style={{ color:'var(--admin-accent)', marginTop:2, flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:10, color:'var(--admin-muted)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</p>
                  <p style={{ fontSize:12, color:'var(--admin-txt)', margin:0, direction:ltr?'ltr':undefined }}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* آمار */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              [Users,   'کاربران',   company.users,    '#818cf8'],
              [FileText,'فاکتورها',  company.invoices, '#34d399'],
              [CreditCard,'درآمد(م)',company.revenue,  '#fbbf24'],
            ].map(([Icon, label, val, color]) => (
              <div key={label} style={{ background:'var(--admin-surface2)', borderRadius:8, padding:'12px', textAlign:'center' }}>
                <Icon size={18} style={{ color, margin:'0 auto 6px', display:'block' }} />
                <p style={{ fontSize:20, fontWeight:700, color:'var(--admin-txt)', margin:'0 0 2px' }}>{val}</p>
                <p style={{ fontSize:11, color:'var(--admin-muted)', margin:0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* دکمه‌های اکشن */}
          <div style={{ display:'flex', gap:8, paddingTop:4 }}>
            {company.status !== 'suspended' ? (
              <button className="admin-btn admin-btn-danger" style={{ flex:1, justifyContent:'center' }} onClick={()=>onSuspend(company.id)}>
                <Ban size={14} /> تعلیق شرکت
              </button>
            ) : (
              <button className="admin-btn admin-btn-success" style={{ flex:1, justifyContent:'center' }} onClick={()=>onActivate(company.id)}>
                <CheckCircle2 size={14} /> فعال‌سازی مجدد
              </button>
            )}
            <button className="admin-btn admin-btn-ghost" style={{ flex:1, justifyContent:'center' }}>
              <Settings size={14} /> تنظیمات شرکت
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── صفحه اصلی ── */
export default function AdminCompanies() {
  const { companies, loading, setStatus } = useAdminCompanies()
  const [search,  setSearch]  = useState('')
  const [planF,   setPlanF]   = useState('')
  const [statusF, setStatusF] = useState('')
  const [detail,  setDetail]  = useState(null)
  const [page,    setPage]    = useState(1)
  const PER_PAGE = 6

  const filtered = companies.filter(c => {
    if (planF   && c.plan   !== planF)   return false
    if (statusF && c.status !== statusF) return false
    if (search  && !c.name.includes(search) && !(c.owner||'').includes(search)) return false
    return true
  })

  async function handleSuspend(id) {
    if (!confirm('این شرکت تعلیق بشه؟ کاربرانش دیگه نمی‌تونن وارد بشن.')) return
    await setStatus(id, 'suspended')
    setDetail(null)
  }
  async function handleActivate(id) {
    await setStatus(id, 'active')
    setDetail(null)
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const selStyle = {
    appearance:'none', background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)',
    borderRadius:8, padding:'7px 28px 7px 12px', fontSize:12, color:'var(--admin-txt)',
    fontFamily:'inherit', cursor:'pointer', outline:'none',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'adminFadeIn .3s ease-out' }}>

      {/* عنوان */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--admin-txt)', margin:'0 0 4px' }}>شرکت‌ها</h1>
          <p style={{ fontSize:13, color:'var(--admin-muted)', margin:0 }}>مدیریت تمام شرکت‌های ثبت‌شده در پلتفرم</p>
        </div>
        <button className="admin-btn admin-btn-primary">
          <Plus size={14} /> شرکت جدید
        </button>
      </div>

      {/* آمار سریع */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'کل شرکت‌ها',    value:companies.length,                                        color:'#818cf8' },
          { label:'پلن Pro',        value:companies.filter(c=>c.plan==='Pro').length,              color:'#c4b5fd' },
          { label:'پلن Basic',      value:companies.filter(c=>c.plan==='Basic').length,            color:'#93c5fd' },
          { label:'تعلیق‌شده',      value:companies.filter(c=>c.status==='suspended').length,     color:'#f87171' },
        ].map(({ label, value, color }) => (
          <div key={label} className="admin-card-sm" style={{ textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:700, color, margin:'0 0 3px' }}>{value}</p>
            <p style={{ fontSize:11, color:'var(--admin-muted)', margin:0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* فیلترها */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:8, padding:'7px 12px', flex:1, maxWidth:300 }}>
          <Search size={14} style={{ color:'var(--admin-muted)', flexShrink:0 }} />
          <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}
            placeholder="جستجوی شرکت یا مالک..."
            style={{ background:'none', border:'none', outline:'none', fontSize:12, color:'var(--admin-txt)', fontFamily:'inherit', flex:1 }} />
        </div>

        {/* پلن */}
        <div style={{ position:'relative' }}>
          <select value={planF} onChange={e=>{ setPlanF(e.target.value); setPage(1) }} style={selStyle}>
            <option value="">همه پلن‌ها</option>
            <option value="Pro">Pro</option>
            <option value="Basic">Basic</option>
            <option value="Free">Free</option>
          </select>
          <ChevronDown size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--admin-muted)', pointerEvents:'none' }} />
        </div>

        {/* وضعیت */}
        <div style={{ position:'relative' }}>
          <select value={statusF} onChange={e=>{ setStatusF(e.target.value); setPage(1) }} style={selStyle}>
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="trial">آزمایشی</option>
            <option value="suspended">تعلیق</option>
          </select>
          <ChevronDown size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--admin-muted)', pointerEvents:'none' }} />
        </div>

        <span style={{ fontSize:12, color:'var(--admin-muted)', marginRight:'auto' }}>
          {filtered.length} شرکت یافت شد
        </span>
      </div>

      {/* جدول */}
      <div className="admin-card" style={{ padding:0, overflow:'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['شرکت','مالک','پلن','کاربران','فاکتورها','درآمد(م)','وضعیت','آخرین فعالیت',''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c => {
              const pm = PLAN_META[c.plan]
              const sm = STATUS_META[c.status]
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:'rgba(99,102,241,.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Building2 size={13} style={{ color:'var(--admin-accent)' }} />
                      </div>
                      <span style={{ fontWeight:500, color:'var(--admin-txt)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color:'var(--admin-muted)', fontSize:12 }}>{c.owner}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99, background:pm.bg, color:pm.color }}>
                      {c.plan}
                    </span>
                  </td>
                  <td style={{ color:'var(--admin-txt2)', textAlign:'center' }}>{c.users}</td>
                  <td style={{ color:'var(--admin-txt2)', textAlign:'center' }}>{c.invoices}</td>
                  <td style={{ color:'var(--admin-txt)', fontWeight:500, textAlign:'right', direction:'ltr' }}>{c.revenue}</td>
                  <td><span className={`admin-badge ${sm.cls}`}>{sm.label}</span></td>
                  <td style={{ color:'var(--admin-muted)', fontSize:11, whiteSpace:'nowrap' }}>
                    <Clock size={11} style={{ display:'inline', verticalAlign:-1, marginLeft:3 }} />
                    {c.lastActivity}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => setDetail(c)}
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        style={{ padding:'4px 8px' }}>
                        <Eye size={13} />
                      </button>
                      <button className="admin-btn admin-btn-ghost admin-btn-sm" style={{ padding:'4px 8px' }}>
                        <Settings size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {paged.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'var(--admin-muted)' }}>
                  شرکتی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderTop:'0.5px solid var(--admin-border)' }}>
          <span style={{ fontSize:12, color:'var(--admin-muted)' }}>
            نمایش {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} از {filtered.length}
          </span>
          <div style={{ display:'flex', gap:4 }}>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width:30, height:30, borderRadius:6, border:'none', fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', background: p===page ? 'var(--admin-accent)' : 'var(--admin-surface2)', color: p===page ? '#fff' : 'var(--admin-muted)', fontWeight: p===page ? 600 : 400 }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CompanyDetailModal company={detail} onClose={() => setDetail(null)} onSuspend={handleSuspend} onActivate={handleActivate} />
    </div>
  )
}
