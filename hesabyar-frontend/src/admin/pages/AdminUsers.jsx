import { useState } from 'react'
import {
  Users, Search, Eye, Ban, CheckCircle2,
  ChevronDown, Mail, Building2, Shield,
  Clock, X, UserCheck, Key,
} from 'lucide-react'
import { useAdminUsers } from '../hooks/useAdminUsers'

const ROLE_META = {
  owner:    { label: 'مالک',   color: '#c4b5fd', bg: '#1e0a3d' },
  admin:    { label: 'مدیر',   color: '#93c5fd', bg: '#0c1a3d' },
  employee: { label: 'کارمند', color: '#6ee7b7', bg: '#052e16' },
}

const STATUS_META = {
  active:    { label: 'فعال',  cls: 'admin-badge-green' },
  suspended: { label: 'تعلیق', cls: 'admin-badge-red'   },
}

const PER_PAGE = 8

function fmtDate(iso) {
  if (!iso) return 'هرگز'
  try { return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('fa-IR', { dateStyle:'short', timeStyle:'short' }) }
  catch { return iso }
}

/* ── Modal جزئیات کاربر ── */
function UserDetailModal({ user, onClose, onSetStatus, onResetPassword }) {
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  if (!user) return null
  const rm = ROLE_META[user.role] || ROLE_META.employee
  const sm = STATUS_META[user.status] || STATUS_META.active

  const toggleStatus = async () => {
    setBusy(true)
    try { await onSetStatus(user.id, user.status === 'suspended' ? 'active' : 'suspended') }
    finally { setBusy(false) }
  }

  const doReset = async () => {
    setBusy(true)
    try { setResetResult(await onResetPassword(user.id)) }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)', borderRadius:14, width:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid var(--admin-border)' }}>
          <h2 style={{ fontSize:14, fontWeight:600, color:'var(--admin-txt)', margin:0 }}>جزئیات کاربر</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex', padding:4, borderRadius:6 }}><X size={16}/></button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(99,102,241,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'var(--admin-accent)', flexShrink:0 }}>
              {user.name.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <h3 style={{ fontSize:16, fontWeight:600, color:'var(--admin-txt)', margin:'0 0 6px' }}>{user.name}</h3>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99, background:rm.bg, color:rm.color }}>{rm.label}</span>
                <span className={`admin-badge ${sm.cls}`}>{sm.label}</span>
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              [Mail,      'ایمیل',       user.email,               true ],
              [Building2, 'شرکت',        user.company,             false],
              [Clock,     'آخرین ورود',  fmtDate(user.lastLogin),  false],
              [Key,       'عضو از',      fmtDate(user.createdAt),  false],
            ].map(([Icon, label, val, ltr]) => (
              <div key={label} style={{ background:'var(--admin-surface2)', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <Icon size={12} style={{ color:'var(--admin-muted)' }}/>
                  <span style={{ fontSize:10, color:'var(--admin-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--admin-txt)', margin:0, direction:ltr?'ltr':'rtl', textAlign:ltr?'left':'right' }}>{val}</p>
              </div>
            ))}
          </div>

          {resetResult && (
            <div style={{ background:'rgba(52,211,153,.1)', border:'0.5px solid rgba(52,211,153,.3)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--admin-txt)' }}>
              رمز موقت جدید: <b dir="ltr">{resetResult.tempPassword}</b><br/>
              <span style={{ color:'var(--admin-muted)' }}>{resetResult.note}</span>
            </div>
          )}

          {user.role !== 'owner' ? (
            <div style={{ display:'flex', gap:8, paddingTop:4 }}>
              {user.status !== 'suspended' ? (
                <button disabled={busy} onClick={toggleStatus} className="admin-btn admin-btn-danger" style={{ flex:1, justifyContent:'center' }}>
                  <Ban size={14}/> تعلیق کاربر
                </button>
              ) : (
                <button disabled={busy} onClick={toggleStatus} className="admin-btn admin-btn-success" style={{ flex:1, justifyContent:'center' }}>
                  <CheckCircle2 size={14}/> فعال‌سازی
                </button>
              )}
              <button disabled={busy} onClick={doReset} className="admin-btn admin-btn-ghost" style={{ flex:1, justifyContent:'center' }}>
                <Key size={14}/> ریست رمز عبور
              </button>
            </div>
          ) : (
            <p style={{ fontSize:11, color:'var(--admin-muted)', margin:0 }}>حساب مالک شرکت از این پنل قابل تعلیق نیست — به‌جاش می‌تونی کل شرکت رو از صفحه‌ی «شرکت‌ها» تعلیق کنی.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { users, loading, error, setStatus, resetPassword } = useAdminUsers()
  const [search,  setSearch]  = useState('')
  const [roleF,   setRoleF]   = useState('')
  const [statusF, setStatusF] = useState('')
  const [page,    setPage]    = useState(1)
  const [detailId, setDetailId] = useState(null)
  const detail = users.find(u => u.id === detailId) || null

  const filtered = users.filter(u => {
    if (roleF   && u.role   !== roleF)   return false
    if (statusF && u.status !== statusF) return false
    if (search  && !u.name.includes(search) && !u.email.includes(search) && !(u.company||'').includes(search)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const totalActive    = users.filter(u => u.status === 'active').length
  const totalSuspended = users.filter(u => u.status === 'suspended').length
  const totalAdmins    = users.filter(u => u.role === 'owner' || u.role === 'admin').length

  const selStyle = {
    appearance:'none', background:'var(--admin-surface)', border:'0.5px solid var(--admin-border)',
    borderRadius:8, padding:'7px 30px 7px 12px', fontSize:12, color:'var(--admin-txt)',
    fontFamily:'inherit', cursor:'pointer', outline:'none',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'adminFadeIn .3s ease-out' }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--admin-txt)', margin:'0 0 4px' }}>کاربران</h1>
        <p style={{ fontSize:13, color:'var(--admin-muted)', margin:0 }}>مدیریت تمام کاربران پلتفرم (همه‌ی شرکت‌ها)</p>
      </div>

      {error && (
        <div style={{ fontSize:12, color:'#f87171', background:'rgba(248,113,113,.1)', border:'0.5px solid rgba(248,113,113,.3)', borderRadius:8, padding:'10px 14px' }}>
          {error.message || 'خطا در دریافت لیست کاربران'}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          [Users,      'کل کاربران',    users.length,      '#818cf8'],
          [UserCheck,  'کاربران فعال',  totalActive,       '#34d399'],
          [Shield,     'مالک/مدیر',     totalAdmins,       '#fbbf24'],
          [Ban,        'تعلیق‌شده',     totalSuspended,    '#f87171'],
        ].map(([Icon, label, val, color]) => (
          <div key={label} className="admin-stat">
            <div style={{ width:36, height:36, borderRadius:9, background:color+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={17} style={{ color }}/>
            </div>
            <div>
              <p style={{ fontSize:24, fontWeight:700, color:'var(--admin-txt)', margin:'0 0 2px' }}>{val}</p>
              <p style={{ fontSize:12, color:'var(--admin-muted)', margin:0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'0.5px solid var(--admin-border)', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--admin-surface2)', border:'0.5px solid var(--admin-border)', borderRadius:8, padding:'7px 12px', flex:1, maxWidth:280 }}>
            <Search size={14} style={{ color:'var(--admin-muted)', flexShrink:0 }}/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="جستجوی نام، ایمیل، شرکت..."
              style={{ background:'none', border:'none', outline:'none', fontSize:12, color:'var(--admin-txt)', fontFamily:'inherit', flex:1 }}/>
          </div>

          <div style={{ position:'relative' }}>
            <select value={roleF} onChange={e => { setRoleF(e.target.value); setPage(1) }} style={selStyle}>
              <option value="">همه نقش‌ها</option>
              {Object.entries(ROLE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--admin-muted)', pointerEvents:'none' }}/>
          </div>

          <div style={{ position:'relative' }}>
            <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1) }} style={selStyle}>
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--admin-muted)', pointerEvents:'none' }}/>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize:12, color:'var(--admin-muted)', padding:20 }}>در حال بارگذاری...</p>
        ) : !paged.length ? (
          <p style={{ fontSize:12, color:'var(--admin-muted)', padding:20 }}>کاربری یافت نشد.</p>
        ) : (
        <table className="admin-table">
          <thead>
            <tr>
              {['کاربر','شرکت','نقش','آخرین ورود','عضو از','وضعیت',''].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {paged.map(u => {
              const rm = ROLE_META[u.role] || ROLE_META.employee
              const sm = STATUS_META[u.status] || STATUS_META.active
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(99,102,241,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--admin-accent)', flexShrink:0 }}>
                        {u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:500, color:'var(--admin-txt)', margin:0 }}>{u.name}</p>
                        <p style={{ fontSize:11, color:'var(--admin-muted)', margin:0, direction:'ltr' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize:12, color:'var(--admin-txt2)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <Building2 size={12} style={{ color:'var(--admin-muted)', flexShrink:0 }}/>
                      {u.company}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:99, background:rm.bg, color:rm.color }}>{rm.label}</span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--admin-muted)' }}>
                    <Clock size={11} style={{ display:'inline', verticalAlign:-1, marginLeft:4 }}/>{fmtDate(u.lastLogin)}
                  </td>
                  <td style={{ fontSize:12, color:'var(--admin-muted)' }}>{fmtDate(u.createdAt)}</td>
                  <td><span className={`admin-badge ${sm.cls}`}>{sm.label}</span></td>
                  <td>
                    <button
                      onClick={() => setDetailId(u.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex', padding:5, borderRadius:6, transition:'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--admin-surface2)'; e.currentTarget.style.color='var(--admin-txt)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--admin-muted)' }}
                    >
                      <Eye size={14}/>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        )}

        {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderTop:'0.5px solid var(--admin-border)' }}>
          <span style={{ fontSize:12, color:'var(--admin-muted)' }}>
            نمایش {filtered.length ? Math.min((page-1)*PER_PAGE+1, filtered.length) : 0}–{Math.min(page*PER_PAGE, filtered.length)} از {filtered.length}
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
        )}
      </div>

      <UserDetailModal user={detail} onClose={() => setDetailId(null)} onSetStatus={setStatus} onResetPassword={resetPassword} />
    </div>
  )
}
