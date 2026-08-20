import { useState } from 'react'
import {
  ShieldCheck, Activity, Users, AlertTriangle,
  FileText, Receipt, CreditCard, Wallet, Package, UserCheck,
  Eye, X, Clock, Plus, Undo2, Loader2,
} from 'lucide-react'
import { StatCard, Badge, Tabs, SearchInput, Select, Modal, FormField } from '@/components/ui'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useCompanyUsers } from '@/hooks/useCompanyUsers'

/* ── نقش‌ها (مطابق مدل واقعی بک‌اند: owner/admin/employee) ── */
const ROLE_META = {
  owner:    { label: 'مالک',   color: '#7c3aed', bg: '#fdf4ff' },
  admin:    { label: 'مدیر',   color: '#1d4ed8', bg: '#eff6ff' },
  employee: { label: 'کارمند', color: '#6b7280', bg: 'var(--t-accent-light)' },
}

/* ── دسته‌بندی اکشن‌ها ── */
const ACTION_META = {
  create:  { label: 'ایجاد',  icon: FileText,  color: '#059669' },
  update:  { label: 'ویرایش', icon: Eye,        color: '#d97706' },
  delete:  { label: 'حذف',    icon: X,          color: '#dc2626' },
  login:    { label: 'ورود',      icon: ShieldCheck, color: '#1d4ed8' },
  rollback: { label: 'بازگردانی', icon: Undo2,       color: '#7c3aed' },
}

const ENTITY_ICONS = {
  invoice:  FileText,
  payment:  CreditCard,
  receipt:  Wallet,
  expense:  Receipt,
  client:   Users,
  product:  Package,
  employee: UserCheck,
}

const ENTITY_LABELS = {
  invoice:  'فاکتور',
  payment:  'پرداختی',
  receipt:  'دریافتی',
  expense:  'هزینه',
  client:   'مشتری',
  product:  'محصول',
  employee: 'کارمند',
}

const TABS = [
  { key:'overview',  label:'نمای کلی' },
  { key:'activity',  label:'لاگ فعالیت‌ها' },
  { key:'users',     label:'مدیریت دسترسی‌ها' },
]

/* ── modal دعوت کاربر جدید ── */
function InviteUserModal({ open, onClose, onInvite }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)
  const inp = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }

  const submit = async () => {
    if (!name || !email) { setErr('نام و ایمیل الزامی هستن'); return }
    setBusy(true); setErr(null)
    try {
      const res = await onInvite({ name, email, role })
      setResult(res)
      setName(''); setEmail('')
    } catch (e) {
      setErr(e.message || 'خطا در دعوت کاربر')
    } finally { setBusy(false) }
  }

  const close = () => { setResult(null); onClose() }

  return (
    <Modal open={open} onClose={close} title="افزودن زیرحساب کارمندی" width={460}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0,lineHeight:1.7 }}>
          برای کارمند یا حسابدار خود یک حساب با دسترسی محدود ایجاد کنید.
        </p>
        <FormField label="نام"><input value={name} onChange={e=>setName(e.target.value)} style={inp}/></FormField>
        <FormField label="ایمیل"><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@company.ir" style={inp} dir="ltr" /></FormField>
        <div>
          <label style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',display:'block',marginBottom:6 }}>سطح دسترسی</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(ROLE_META).filter(([k])=>k!=='owner').map(([key,meta]) => (
              <button key={key} type="button" onClick={()=>setRole(key)}
                style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,
                  border:`1.5px solid ${role===key?meta.color:'var(--t-card-border)'}`,
                  background:role===key?meta.bg:'transparent',cursor:'pointer',textAlign:'right',
                  transition:'all .15s',
                }}>
                <span style={{ width:16,height:16,borderRadius:'50%',border:`2px solid ${role===key?meta.color:'var(--t-card-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  {role===key && <span style={{ width:8,height:8,borderRadius:'50%',background:meta.color }} />}
                </span>
                <div>
                  <p style={{ fontSize:13,fontWeight:500,color:role===key?meta.color:'var(--t-txt)',margin:0 }}>{meta.label}</p>
                  <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>
                    {key==='admin'    && 'دسترسی کامل بجز تنظیمات حساس و نظارت'}
                    {key==='employee' && 'ثبت و ویرایش رکوردها'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        {err && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{err}</p>}
        {result && (
          <div style={{ background:'var(--t-accent-light)', borderRadius:8, padding:10, fontSize:12 }}>
            کاربر ساخته شد. رمز موقت: <b dir="ltr">{result.tempPassword}</b><br/>
            <span style={{ color:'var(--t-txt-muted)' }}>{result.note}</span>
          </div>
        )}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={close} className="btn-secondary">{result ? 'بستن' : 'انصراف'}</button>
          {!result && <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'در حال ارسال...' : 'ارسال دعوت'}</button>}
        </div>
      </div>
    </Modal>
  )
}

/* ── تب نمای کلی ── */
function Overview() {
  const { users } = useCompanyUsers()
  const { log } = useActivityLog()

  const todayStr = log[0]?.time?.slice(0, 10) // ساده: روز رکورد آخر به‌عنوان "امروز"
  const todayLog = todayStr ? log.filter(l => l.time?.startsWith(todayStr)) : []
  const activeUsers = users.filter(u => u.status === 'active')
  const deletesNoDetail = todayLog.filter(l => l.action === 'delete' && !l.detail).length

  const actionsByUser = {}
  todayLog.forEach(l => { actionsByUser[l.user] = (actionsByUser[l.user]||0) + 1 })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <StatCard icon={Users}    label="کاربران فعال"      value={activeUsers.length} sub={`از ${users.length} نفر`} />
        <StatCard icon={Activity} label="فعالیت امروز"       value={todayLog.length} sub="عملیات ثبت‌شده" />
        <StatCard icon={FileText} label="رکورد ایجادشده"     value={todayLog.filter(l=>l.action==='create').length} sub="امروز" subColor="#059669" />
        <StatCard icon={AlertTriangle} label="نیاز به بررسی" value={deletesNoDetail}  sub="حذف بدون توضیح" subColor="#dc2626" />
      </div>

      <div className="card">
        <h2 style={{ fontSize:13,fontWeight:600,color:'var(--t-txt)',margin:'0 0 16px' }}>کاربران زیرمجموعه</h2>
        {!users.length ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>هنوز کاربر دیگری به شرکت اضافه نشده.</p>
        ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {users.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.employee
            return (
              <div key={u.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'0.5px solid var(--t-card-border)' }}>
                <div style={{ position:'relative',flexShrink:0 }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'var(--t-accent)' }}>
                    {u.name.split(' ').map(w=>w[0]).join('')}
                  </div>
                  <span style={{ position:'absolute',bottom:0,left:0,width:9,height:9,borderRadius:'50%',background:u.status==='active'?'#059669':'#9ca3af',border:'2px solid var(--t-card-bg)' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{u.name}</span>
                    <span style={{ fontSize:10,fontWeight:500,padding:'1px 7px',borderRadius:99,background:rm.bg,color:rm.color }}>{rm.label}</span>
                  </div>
                  <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:'2px 0 0' }} dir="ltr">{u.email}</p>
                </div>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize:16,fontWeight:600,color:'var(--t-txt)',margin:0 }}>{actionsByUser[u.name] || 0}</p>
                  <p style={{ fontSize:10,color:'var(--t-txt-muted)',margin:0 }}>عملیات امروز</p>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}

/* ── تب لاگ فعالیت ── */
function ActivityLogTab() {
  const { log, loading, error, rollback, rollingBackId, rollbackError } = useActivityLog()
  const [search,  setSearch]  = useState('')
  const [userF,   setUserF]   = useState('')
  const [actionF, setActionF] = useState('')
  const [confirmItem, setConfirmItem] = useState(null)

  const handleConfirmRollback = async () => {
    if (!confirmItem) return
    const ok = await rollback(confirmItem.id)
    if (ok) setConfirmItem(null)
  }

  const filtered = log.filter(item => {
    if (userF && item.user !== userF) return false
    if (actionF && item.action !== actionF) return false
    if (search && !item.detail?.includes(search) && !item.user.includes(search)) return false
    return true
  })

  const userOpts   = [...new Set(log.map(i=>i.user))].map(u=>({value:u,label:u}))
  const actionOpts = Object.entries(ACTION_META).map(([k,v])=>({value:k,label:v.label}))

  if (error) return <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px' }}><AlertTriangle size={14}/> {error}</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="جستجو در فعالیت‌ها..." />
        <Select value={userF}   onChange={setUserF}   options={userOpts}   placeholder="همه کاربران" />
        <Select value={actionF} onChange={setActionF} options={actionOpts} placeholder="نوع عملیات" />
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)', padding:18 }}>در حال بارگذاری...</p>
        ) : !filtered.length ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)', padding:18 }}>فعالیتی یافت نشد.</p>
        ) : (
        <div style={{ display:'flex', flexDirection:'column' }}>
          {filtered.map((item, i) => {
            const am = ACTION_META[item.action] || ACTION_META.create
            const EntityIcon = item.entity ? (ENTITY_ICONS[item.entity] || FileText) : ShieldCheck
            const ActionIcon = am.icon
            return (
              <div key={item.id} style={{
                display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px',
                borderBottom: i < filtered.length-1 ? '0.5px solid var(--t-card-border)' : 'none',
              }}>
                <div style={{
                  width:34, height:34, borderRadius:9, flexShrink:0,
                  background: am.color+'18', display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <EntityIcon size={15} style={{ color: am.color }} />
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'var(--t-txt)' }}>{item.user}</span>
                    <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>
                      <ActionIcon size={10} style={{ display:'inline', verticalAlign:-1, marginLeft:2 }} />
                      {am.label} {item.entityLabel && ENTITY_LABELS[item.entity]}
                    </span>
                    {item.rolledBack && <Badge color="#7c3aed" bg="#f5f3ff" label="بازگردانی‌شده" />}
                  </div>
                  <p style={{ fontSize:12, color:'var(--t-txt-muted)', margin:'0 0 4px' }}>{item.detail}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'var(--t-txt-muted)', display:'flex', alignItems:'center', gap:4 }}>
                      <Clock size={11} /> {item.time}
                    </span>
                    {item.entityLabel && (
                      <span style={{ fontSize:11, color:'var(--t-accent)', fontWeight:500 }}>{item.entityLabel}</span>
                    )}
                  </div>
                </div>

                {item.canRollback && (
                  <button
                    onClick={() => setConfirmItem(item)}
                    disabled={rollingBackId === item.id}
                    style={{
                      display:'flex', alignItems:'center', gap:5, flexShrink:0,
                      fontSize:11, fontWeight:500, color:'#7c3aed', background:'#f5f3ff',
                      border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', height:'fit-content',
                    }}
                  >
                    {rollingBackId === item.id ? <Loader2 size={12} className="spin" /> : <Undo2 size={12} />}
                    بازگردانی
                  </button>
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>

      <Modal open={!!confirmItem} onClose={() => setConfirmItem(null)} title="بازگردانی فعالیت" width={420}>
        {confirmItem && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ fontSize:13, color:'var(--t-txt)', lineHeight:1.8 }}>
              مطمئنی می‌خوای این فعالیت رو برگردونی؟
              <br />
              <span style={{ color:'var(--t-txt-muted)', fontSize:12 }}>{confirmItem.detail}</span>
            </p>
            {confirmItem.action === 'create' && (
              <div style={{ fontSize:12, background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:2 }} />
                این رکورد کامل حذف می‌شه (چون از یه «ایجاد» بازمی‌گردیم).
              </div>
            )}
            {confirmItem.action === 'delete' && (
              <div style={{ fontSize:12, background:'#eff6ff', color:'#1d4ed8', borderRadius:8, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:2 }} />
                این رکورد دوباره ساخته می‌شه (چون از یه «حذف» بازمی‌گردیم).
              </div>
            )}
            {rollbackError && (
              <div style={{ fontSize:12, background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'10px 14px' }}>{rollbackError}</div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmItem(null)} style={{ fontSize:12, padding:'8px 16px', borderRadius:8, border:'0.5px solid var(--t-card-border)', background:'transparent', color:'var(--t-txt)', cursor:'pointer' }}>انصراف</button>
              <button
                onClick={handleConfirmRollback}
                disabled={rollingBackId === confirmItem.id}
                style={{ fontSize:12, padding:'8px 16px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
              >
                {rollingBackId === confirmItem.id && <Loader2 size={12} className="spin" />}
                تایید و بازگردانی
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ── تب مدیریت دسترسی‌ها ── */
function UsersTab() {
  const { users, loading, error, inviteUser, removeUser } = useCompanyUsers()
  const [showInvite, setShowInvite] = useState(false)

  const doRemove = async (u) => {
    if (!confirm(`کاربر «${u.name}» حذف بشه؟`)) return
    try { await removeUser(u.id) } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontSize:13, color:'var(--t-txt-muted)', margin:0 }}>
          مدیریت کاربران زیرمجموعه و سطح دسترسی هرکدام
        </p>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>
          <Plus size={14} /> افزودن زیرحساب
        </button>
      </div>

      {error && <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px' }}><AlertTriangle size={14}/> {error}</div>}

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)', padding:18 }}>در حال بارگذاری...</p>
        ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--t-search-bg)' }}>
              {['کاربر','ایمیل','سطح دسترسی','وضعیت',''].map(h=>(
                <th key={h} style={{ padding:'10px 16px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const rm = ROLE_META[u.role] || ROLE_META.employee
              return (
                <tr key={u.id} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:'var(--t-accent)' }}>
                        {u.name.split(' ').map(w=>w[0]).join('')}
                      </div>
                      <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px',fontSize:12,color:'var(--t-txt-muted)',direction:'ltr' }}>{u.email}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:99,background:rm.bg,color:rm.color }}>{rm.label}</span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Badge type={u.status==='active'?'green':'gray'}>{u.status==='active'?'فعال':'غیرفعال'}</Badge>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    {u.role !== 'owner' && (
                      <button className="btn-ghost" style={{ fontSize:11 }} onClick={()=>doRemove(u)}>حذف دسترسی</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        )}
      </div>

      <InviteUserModal open={showInvite} onClose={() => setShowInvite(false)} onInvite={inviteUser} />
    </div>
  )
}

/* ── صفحه اصلی ── */
export default function OwnerOversight() {
  const [tab, setTab] = useState('overview')
  const content = { overview: <Overview/>, activity: <ActivityLogTab/>, users: <UsersTab/> }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {content[tab]}
    </div>
  )
}
