import { useState, useEffect, Fragment } from 'react'
import {
  Building2, User, Users, Shield, Bell, Palette,
  Save, Upload, Eye, EyeOff, Plus, Trash2, Edit2, Check, AlertTriangle,
} from 'lucide-react'
import { Tabs, FormField, Badge, ToggleSwitch } from '@/components/ui'
import { THEMES } from '@/theme/themes'
import { useTheme } from '@/theme/ThemeContext'
import { useAppStore } from '@/store/appStore'
import { useCompany } from '@/hooks/useCompany'
import { useProfile } from '@/hooks/useProfile'
import { useCompanyUsers, PERMISSION_MODULES, PERMISSION_PRESETS, emptyPermissions } from '@/hooks/useCompanyUsers'

const SIDEBAR_TABS = [
  { key:'company',  label:'اطلاعات شرکت', icon:Building2 },
  { key:'profile',  label:'پروفایل من',    icon:User },
  { key:'users',    label:'کاربران',        icon:Users },
  { key:'security', label:'امنیت',          icon:Shield },
  { key:'notif',    label:'اعلان‌ها',       icon:Bell },
  { key:'appear',   label:'ظاهر و زبان',   icon:Palette },
  { key:'access',   label:'دسترسی‌ها و نقش‌ها', icon:Shield },
]


const inp = {
  background:'var(--t-search-bg)', border:'0.5px solid var(--t-card-border)',
  borderRadius:7, padding:'8px 10px', fontSize:12,
  color:'var(--t-txt)', fontFamily:'inherit', outline:'none', width:'100%',
}

/* ── اطلاعات شرکت ── */
function CompanySettings() {
  const { company, loading, error, saving, updateCompany } = useCompany()
  const [form, setForm] = useState(null)
  const [msg, setMsg]   = useState(null)

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', nationalCode: company.nationalCode || '',
        phone: company.phone || '', email: company.email || '',
        website: company.website || '', industry: company.industry || '',
        address: company.address || '', currency: company.currency || 'IRR',
        defaultTaxRate: company.defaultTaxRate ?? 10,
        invoiceNumberFormat: company.invoiceNumberFormat || 'INV-{YEAR}-{NUM}',
      })
    }
  }, [company])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    setMsg(null)
    try {
      await updateCompany(form)
      setMsg({ type:'ok', text:'اطلاعات شرکت ذخیره شد' })
    } catch (err) {
      setMsg({ type:'err', text: err.message || 'خطا در ذخیره‌سازی' })
    }
  }

  if (loading || !form) return <Section title="اطلاعات اصلی شرکت"><p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>در حال بارگذاری...</p></Section>
  if (error) return <Section title="اطلاعات اصلی شرکت"><ErrorBanner text={error}/></Section>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Section title="اطلاعات اصلی شرکت">
        <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20 }}>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ width:72,height:72,borderRadius:16,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Building2 size={32} style={{ color:'var(--t-accent)' }}/>
            </div>
            <button className="btn-ghost" style={{ fontSize:11 }}><Upload size={12}/> آپلود لوگو</button>
          </div>
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="نام شرکت" required>
              <input value={form.name} onChange={set('name')} style={inp}/>
            </FormField>
            <FormField label="شناسه ملی / کد اقتصادی">
              <input value={form.nationalCode} onChange={set('nationalCode')} style={inp} dir="ltr"/>
            </FormField>
            <FormField label="تلفن">
              <input value={form.phone} onChange={set('phone')} style={inp} dir="ltr"/>
            </FormField>
            <FormField label="ایمیل">
              <input value={form.email} onChange={set('email')} type="email" style={inp} dir="ltr"/>
            </FormField>
            <FormField label="وب‌سایت">
              <input value={form.website} onChange={set('website')} style={inp} dir="ltr"/>
            </FormField>
            <FormField label="صنعت / حوزه فعالیت">
              <input value={form.industry} onChange={set('industry')} style={inp}/>
            </FormField>
          </div>
        </div>
        <FormField label="آدرس شرکت">
          <textarea value={form.address} onChange={set('address')} rows={2} style={{...inp,resize:'none'}}/>
        </FormField>
        {msg && <InlineMsg msg={msg}/>}
        <SaveBtn onClick={save} saving={saving}/>
      </Section>

      <Section title="تنظیمات مالی">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <FormField label="واحد پول پیش‌فرض">
            <select value={form.currency} onChange={set('currency')} style={inp}>
              <option value="IRR">تومان (IRR)</option>
              <option value="USD">دلار (USD)</option>
              <option value="EUR">یورو (EUR)</option>
            </select>
          </FormField>
          <FormField label="مالیات بر ارزش افزوده پیش‌فرض (%)">
            <input value={form.defaultTaxRate} onChange={set('defaultTaxRate')} style={inp}/>
          </FormField>
          <FormField label="شماره سند پیش‌فرض">
            <input value={form.invoiceNumberFormat} onChange={set('invoiceNumberFormat')} style={inp} dir="ltr"/>
          </FormField>
        </div>
        <SaveBtn onClick={save} saving={saving}/>
      </Section>
    </div>
  )
}

/* ── پروفایل ── */
const ROLE_LABEL_FA = { owner:'مالک', admin:'مدیر', employee:'کارمند' }

function ProfileSettings() {
  const { profile, loading, error, saving, updateProfile } = useProfile()
  const [form, setForm] = useState(null)
  const [msg, setMsg]   = useState(null)

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' })
  }, [profile])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    setMsg(null)
    try {
      await updateProfile({ name: form.name, phone: form.phone })
      setMsg({ type:'ok', text:'پروفایل ذخیره شد' })
    } catch (err) {
      setMsg({ type:'err', text: err.message || 'خطا در ذخیره‌سازی' })
    }
  }

  if (loading || !form) return <Section title="پروفایل من"><p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>در حال بارگذاری...</p></Section>
  if (error) return <Section title="پروفایل من"><ErrorBanner text={error}/></Section>

  const initials = (form.name || '؟').trim().split(' ').map(w=>w[0]).slice(0,2).join('')

  return (
    <Section title="پروفایل من">
      <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20 }}>
        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'var(--t-accent)' }}>
            {initials}
          </div>
          <button className="btn-ghost" style={{ fontSize:11 }}><Upload size={12}/> آپلود عکس</button>
        </div>
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="نام و نام‌خانوادگی" required><input value={form.name} onChange={set('name')} style={inp}/></FormField>
          <FormField label="ایمیل"><input value={profile.email} readOnly style={{...inp,background:'var(--t-accent-light)',color:'var(--t-txt-muted)'}} type="email" dir="ltr"/></FormField>
          <FormField label="شماره موبایل"><input value={form.phone} onChange={set('phone')} style={inp} dir="ltr"/></FormField>
          <FormField label="نقش"><input value={ROLE_LABEL_FA[profile.role] || profile.role} readOnly style={{...inp,background:'var(--t-accent-light)',color:'var(--t-accent)'}} /></FormField>
        </div>
      </div>
      {msg && <InlineMsg msg={msg}/>}
      <SaveBtn onClick={save} saving={saving}/>
    </Section>
  )
}

/** ماتریس دسترسی: چک‌باکس هر ماژول + یک سوییچ جدا برای اجازه‌ی حذف + دکمه‌های پریست سریع */
function PermissionEditor({ perms, onChange }) {
  const applyPreset = (key) => onChange({ ...PERMISSION_PRESETS[key].perms })
  const toggle = (key) => onChange({ ...perms, [key]: !perms[key] })

  return (
    <div style={{ background:'var(--t-search-bg)', borderRadius:8, padding:12, marginTop:4 }}>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {Object.entries(PERMISSION_PRESETS).map(([key, meta]) => (
          <button key={key} type="button" onClick={()=>applyPreset(key)}
            title={meta.hint}
            style={{ padding:'5px 10px', borderRadius:7, border:'0.5px solid var(--t-card-border)', background:'var(--t-card-bg)', color:'var(--t-txt)', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
            {meta.label}
          </button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 14px' }}>
        {PERMISSION_MODULES.map(m => (
          <label key={m.key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--t-txt)', cursor:'pointer' }}>
            <input type="checkbox" checked={!!perms[m.key]} onChange={()=>toggle(m.key)} />
            {m.label}
          </label>
        ))}
      </div>
      <div style={{ borderTop:'0.5px solid var(--t-card-border)', marginTop:10, paddingTop:10 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#dc2626', cursor:'pointer', fontWeight:500 }}>
          <input type="checkbox" checked={!!perms.canDelete} onChange={()=>toggle('canDelete')} />
          اجازه‌ی حذف رکورد (در هر ماژولی که دسترسی داره)
        </label>
      </div>
    </div>
  )
}

/* ── کاربران ── */
function UsersSettings() {
  const { users, loading, error, inviteUser, updateUser, removeUser, ROLE_META } = useCompanyUsers()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'employee' })
  const [invitePerms, setInvitePerms] = useState(PERMISSION_PRESETS.editor.perms)
  const [inviteResult, setInviteResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState(null)
  const [editingPermsFor, setEditingPermsFor] = useState(null) // user.id در حال ویرایش دسترسی
  const [editPerms, setEditPerms] = useState(emptyPermissions())
  const [savingPerms, setSavingPerms] = useState(false)

  const submitInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) { setMsg({type:'err',text:'نام و ایمیل الزامی هستن'}); return }
    setBusy(true); setMsg(null)
    try {
      const payload = { ...inviteForm, permissions: inviteForm.role === 'employee' ? invitePerms : undefined }
      const res = await inviteUser(payload)
      setInviteResult(res)
      setInviteForm({ name:'', email:'', role:'employee' })
      setInvitePerms(PERMISSION_PRESETS.editor.perms)
    } catch (err) {
      setMsg({ type:'err', text: err.message || 'خطا در دعوت کاربر' })
    } finally { setBusy(false) }
  }

  const toggleStatus = async (u) => {
    try { await updateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' }) }
    catch (err) { setMsg({ type:'err', text: err.message }) }
  }

  const doRemove = async (u) => {
    if (!confirm(`کاربر «${u.name}» حذف بشه؟`)) return
    try { await removeUser(u.id) }
    catch (err) { setMsg({ type:'err', text: err.message }) }
  }

  const openEditPerms = (u) => {
    setEditingPermsFor(u.id)
    setEditPerms({ ...emptyPermissions(), ...(u.permissions || {}) })
  }

  const savePerms = async (u) => {
    setSavingPerms(true)
    try {
      await updateUser(u.id, { permissions: editPerms })
      setEditingPermsFor(null)
    } catch (err) {
      setMsg({ type:'err', text: err.message })
    } finally { setSavingPerms(false) }
  }

  return (
    <Section title="مدیریت کاربران" action={
      <button className="btn-primary" onClick={()=>{setShowInvite(!showInvite); setInviteResult(null)}}><Plus size={14}/> دعوت کاربر</button>
    }>
      {error && <ErrorBanner text={error}/>}
      {msg && <InlineMsg msg={msg}/>}

      {showInvite && (
        <div style={{ background:'var(--t-search-bg)',borderRadius:10,padding:14,marginBottom:16 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'flex-end' }}>
            <FormField label="نام"><input value={inviteForm.name} onChange={e=>setInviteForm(f=>({...f,name:e.target.value}))} style={inp}/></FormField>
            <FormField label="ایمیل"><input value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} placeholder="email@company.ir" style={inp} dir="ltr"/></FormField>
            <FormField label="نقش">
              <select value={inviteForm.role} onChange={e=>setInviteForm(f=>({...f,role:e.target.value}))} style={inp}>
                <option value="admin">مدیر (دسترسی کامل)</option>
                <option value="employee">کارمند (دسترسی قابل‌تنظیم)</option>
              </select>
            </FormField>
            <button className="btn-primary" style={{ marginBottom:1 }} disabled={busy} onClick={submitInvite}><Plus size={14}/> ارسال دعوت</button>
          </div>

          {inviteForm.role === 'employee' && (
            <>
              <p style={{ fontSize:11, color:'var(--t-txt-muted)', margin:'12px 0 4px' }}>
                این کارمند فقط به بخش‌های تیک‌خورده‌ی زیر دسترسی خواهد داشت (هر وقت بخوای، از همین صفحه قابل تغییره):
              </p>
              <PermissionEditor perms={invitePerms} onChange={setInvitePerms} />
            </>
          )}

          {inviteResult && (
            <div style={{ marginTop:12, background:'var(--t-accent-light)', borderRadius:8, padding:10, fontSize:12, color:'var(--t-txt)' }}>
              کاربر «{inviteResult.user.name}» ساخته شد.
              {!inviteResult.emailSent && <> رمز موقت: <b dir="ltr">{inviteResult.tempPassword}</b><br/></>}
              <span style={{ color:'var(--t-txt-muted)' }}>{inviteResult.note}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>در حال بارگذاری...</p>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--t-search-bg)' }}>
              {['کاربر','ایمیل','نقش','وضعیت',''].map(h=>(
                <th key={h} style={{ padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u=>{
              const rm = ROLE_META[u.role] || { label:u.role, type:'gray' }
              return (
                <>
                <tr key={u.id} style={{ borderBottom: editingPermsFor===u.id ? 'none' : '0.5px solid var(--t-card-border)' }}>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'var(--t-accent)',flexShrink:0 }}>
                        {u.name.split(' ').map(w=>w[0]).join('')}
                      </div>
                      <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)',direction:'ltr' }}>{u.email}</td>
                  <td style={{ padding:'11px 14px' }}><Badge type={rm.type}>{rm.label}</Badge></td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={()=>u.role!=='owner' && toggleStatus(u)} disabled={u.role==='owner'} style={{ background:'none',border:'none',cursor:u.role==='owner'?'default':'pointer',padding:0 }}>
                      <Badge type={u.status==='active'?'green':'gray'}>{u.status==='active'?'فعال':'غیرفعال'}</Badge>
                    </button>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    {u.role !== 'owner' && (
                      <div style={{ display:'flex',gap:2 }}>
                        {u.role === 'employee' && (
                          <button className="icon-btn" style={{ width:28,height:28 }} title="ویرایش دسترسی"
                            onClick={()=> editingPermsFor===u.id ? setEditingPermsFor(null) : openEditPerms(u)}>
                            <Shield size={13}/>
                          </button>
                        )}
                        <button className="icon-btn" style={{ width:28,height:28 }} onClick={()=>doRemove(u)}><Trash2 size={13}/></button>
                      </div>
                    )}
                  </td>
                </tr>
                {editingPermsFor === u.id && (
                  <tr key={`${u.id}-perms`} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                    <td colSpan={5} style={{ padding:'0 14px 14px' }}>
                      <PermissionEditor perms={editPerms} onChange={setEditPerms} />
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                        <button onClick={()=>setEditingPermsFor(null)} style={{ padding:'7px 14px', borderRadius:8, border:'0.5px solid var(--t-card-border)', background:'transparent', color:'var(--t-txt-muted)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>انصراف</button>
                        <button className="btn-primary" disabled={savingPerms} onClick={()=>savePerms(u)}>
                          <Save size={13}/> {savingPerms ? 'در حال ذخیره...' : 'ذخیره‌ی دسترسی‌ها'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )
            })}
          </tbody>
        </table>
      )}
    </Section>
  )
}

/* ── امنیت ── */
function SecuritySettings() {
  const { saving, updateProfile } = useProfile()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ current:'', next:'', repeat:'' })
  const [msg, setMsg] = useState(null)

  const submit = async () => {
    setMsg(null)
    if (!form.current || !form.next) { setMsg({type:'err',text:'رمز فعلی و رمز جدید الزامی هستن'}); return }
    if (form.next.length < 6) { setMsg({type:'err',text:'رمز جدید باید حداقل ۶ کاراکتر باشه'}); return }
    if (form.next !== form.repeat) { setMsg({type:'err',text:'تکرار رمز جدید مطابقت ندارد'}); return }
    try {
      await updateProfile({ currentPassword: form.current, newPassword: form.next })
      setForm({ current:'', next:'', repeat:'' })
      setMsg({ type:'ok', text:'رمز عبور با موفقیت تغییر کرد' })
    } catch (err) {
      setMsg({ type:'err', text: err.message || 'خطا در تغییر رمز عبور' })
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="تغییر رمز عبور">
        <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:400 }}>
          <FormField label="رمز عبور فعلی" required>
            <div style={{ position:'relative' }}>
              <input type={showOld?'text':'password'} value={form.current} onChange={e=>setForm(f=>({...f,current:e.target.value}))} placeholder="••••••••" style={{...inp,paddingLeft:36}}/>
              <button onClick={()=>setShowOld(!showOld)} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--t-txt-muted)',display:'flex' }}>
                {showOld?<EyeOff size={14}/>:<Eye size={14}/>}
              </button>
            </div>
          </FormField>
          <FormField label="رمز عبور جدید" required>
            <div style={{ position:'relative' }}>
              <input type={showNew?'text':'password'} value={form.next} onChange={e=>setForm(f=>({...f,next:e.target.value}))} placeholder="••••••••" style={{...inp,paddingLeft:36}}/>
              <button onClick={()=>setShowNew(!showNew)} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--t-txt-muted)',display:'flex' }}>
                {showNew?<EyeOff size={14}/>:<Eye size={14}/>}
              </button>
            </div>
          </FormField>
          <FormField label="تکرار رمز عبور جدید" required>
            <input type="password" value={form.repeat} onChange={e=>setForm(f=>({...f,repeat:e.target.value}))} placeholder="••••••••" style={inp}/>
          </FormField>
          {msg && <InlineMsg msg={msg}/>}
          <SaveBtn label="تغییر رمز عبور" onClick={submit} saving={saving}/>
        </div>
      </Section>

      <Section title="احراز هویت دو مرحله‌ای">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:'0 0 3px' }}>احراز هویت دو مرحله‌ای (2FA)</p>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>هنوز برای کاربران عادی شرکت پیاده‌سازی نشده (فقط پنل سوپرادمین 2FA داره)</p>
          </div>
          <Badge type="gray">به‌زودی</Badge>
        </div>
      </Section>
    </div>
  )
}

/* ── اعلان‌ها ── */
function NotifSettings() {
  const [notifs, setNotifs] = useState({
    invoiceDue:   true,
    paymentRecv:  true,
    lowStock:     true,
    newClient:    false,
    reportReady:  true,
    systemUpdate: false,
  })
  const items = [
    { key:'invoiceDue',   label:'سررسید فاکتور',         sub:'اطلاع‌رسانی قبل از سررسید فاکتورها' },
    { key:'paymentRecv',  label:'دریافت پرداختی',         sub:'هنگام ثبت دریافتی جدید' },
    { key:'lowStock',     label:'موجودی کم',              sub:'وقتی موجودی محصول به حداقل رسید' },
    { key:'newClient',    label:'مشتری جدید',             sub:'ثبت مشتری جدید در سیستم' },
    { key:'reportReady',  label:'گزارش آماده شد',          sub:'آمادگی گزارش دوره‌ای' },
    { key:'systemUpdate', label:'به‌روزرسانی سیستم',       sub:'اطلاع از نسخه‌های جدید' },
  ]
  return (
    <Section title="تنظیمات اعلان‌ها" action={<Badge type="gray">فعلاً فقط محلی — بدون ذخیره سمت سرور</Badge>}>
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {items.map((item,i) => (
          <div key={item.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:i<items.length-1?'0.5px solid var(--t-card-border)':'none' }}>
            <div>
              <p style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:'0 0 2px' }}>{item.label}</p>
              <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>{item.sub}</p>
            </div>
            <ToggleSwitch checked={!!notifs[item.key]} onChange={(v)=>setNotifs(p=>({...p,[item.key]:v}))} label={item.label} />
          </div>
        ))}
      </div>
      <div style={{ marginTop:16 }}><SaveBtn/></div>
    </Section>
  )
}

/* ── ظاهر و زبان ── */
function AppearSettings() {
  const { themeId, changeTheme } = useTheme()
  const { language, setLanguage, fontScale, setFontScale } = useAppStore()

  const THEME_COLORS = {
    light:'#0f112e', dark:'#6366f1', navy:'#38bdf8', emerald:'#059669', violet:'#7c3aed',
  }

  const FONT_SCALES = [
    { v: 0.9,  label: 'کوچک' },
    { v: 1,    label: 'متوسط (پیش‌فرض)' },
    { v: 1.1,  label: 'بزرگ' },
    { v: 1.25, label: 'خیلی بزرگ' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="تم رنگی">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
          {Object.values(THEMES).map(t => {
            const active = t.id === themeId
            return (
              <button key={t.id} onClick={()=>changeTheme(t.id)}
                style={{ padding:'12px 8px',borderRadius:10,border:`2px solid ${active?'var(--t-accent)':'var(--t-card-border)'}`,background:active?'var(--t-accent-light)':'var(--t-search-bg)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:8,transition:'all .15s' }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:THEME_COLORS[t.id]||t.sidebar?.logoBg,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  {active && <Check size={14} color="#fff"/>}
                </div>
                <span style={{ fontSize:11,fontWeight:active?600:400,color:active?'var(--t-accent)':'var(--t-txt-muted)' }}>{t.nameFA}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="اندازه‌ی فونت و اجزا" sub="روی کل برنامه اعمال می‌شه — برای صفحه‌نمایش‌های بزرگ یا کوچک">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {FONT_SCALES.map(({v,label}) => {
            const active = fontScale === v
            return (
              <button key={v} onClick={()=>setFontScale(v)}
                style={{ padding:'10px 8px',borderRadius:10,border:`2px solid ${active?'var(--t-accent)':'var(--t-card-border)'}`,background:active?'var(--t-accent-light)':'var(--t-search-bg)',cursor:'pointer',fontSize:11,fontWeight:active?600:400,color:active?'var(--t-accent)':'var(--t-txt-muted)',fontFamily:'inherit' }}>
                {label}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="زبان رابط کاربری">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[{l:'fa',label:'فارسی',sub:'Persian (RTL)'},{l:'en',label:'English',sub:'انگلیسی (LTR)'}].map(({l,label,sub})=>(
            <button key={l} onClick={()=>setLanguage(l)}
              style={{ padding:'14px 16px',borderRadius:10,border:`2px solid ${language===l?'var(--t-accent)':'var(--t-card-border)'}`,background:language===l?'var(--t-accent-light)':'var(--t-search-bg)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .15s' }}>
              <span style={{ fontSize:22 }}>{l==='fa'?'🇮🇷':'🇬🇧'}</span>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:13,fontWeight:600,color:language===l?'var(--t-accent)':'var(--t-txt)',margin:0 }}>{label}</p>
                <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>{sub}</p>
              </div>
              {language===l&&<Check size={16} style={{ color:'var(--t-accent)',marginRight:'auto' }}/>}
            </button>
          ))}
        </div>
      </Section>

      <Section title="چیدمان باکس‌های صفحات">
        <p style={{ fontSize:12, color:'var(--t-txt-muted)', margin:0, lineHeight:1.8 }}>
          برای شخصی‌سازی محل قرارگیری و نمایش/عدم‌نمایش باکس‌های هر صفحه (مثلاً داشبورد)، وارد همون صفحه بشو و دکمه‌ی
          «<b style={{ color:'var(--t-txt)' }}>شخصی‌سازی چیدمان</b>» رو بالای صفحه بزن — می‌تونی باکس‌ها رو با موس جابجا کنی، مخفی/آشکار کنی، یا به حالت پیش‌فرض برگردونی.
        </p>
      </Section>
    </div>
  )
}


/* ── دسترسی‌ها و نقش‌ها (مخصوص مالک) ── */
const ROLE_PERMISSIONS = {
  MANAGER: { label:'مدیر', color:'#1d4ed8', bg:'#eff6ff', perms:{ invoices:true, payments:true, expenses:true, clients:true, reports:true, settings:false, oversight:false, deleteRecords:true } },
  EDITOR:  { label:'ویرایشگر', color:'#059669', bg:'#f0fdf4', perms:{ invoices:true, payments:true, expenses:true, clients:true, reports:true, settings:false, oversight:false, deleteRecords:false } },
  VIEWER:  { label:'بیننده', color:'#6b7280', bg:'var(--t-accent-light)', perms:{ invoices:false, payments:false, expenses:false, clients:false, reports:true, settings:false, oversight:false, deleteRecords:false } },
}

const PERM_LABELS = {
  invoices:'ثبت/ویرایش فاکتور', payments:'ثبت پرداختی', expenses:'ثبت هزینه',
  clients:'مدیریت مشتریان', reports:'مشاهده گزارشات', settings:'دسترسی تنظیمات',
  oversight:'مشاهده نظارت مالک', deleteRecords:'حذف رکوردها',
}

function AccessSettings() {
  const [activeRole, setActiveRole] = useState('MANAGER')
  const [perms, setPerms] = useState(ROLE_PERMISSIONS[activeRole].perms)

  const selectRole = (role) => { setActiveRole(role); setPerms(ROLE_PERMISSIONS[role].perms) }
  const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="سفارشی‌سازی سطح دسترسی نقش‌ها" action={<Badge type="gray">فعلاً فقط محلی — بدون ذخیره سمت سرور</Badge>}>
        <p style={{ fontSize:12, color:'var(--t-txt-muted)', margin:'0 0 16px', lineHeight:1.7 }}>
          مشخص کنید هر نقش به کدام بخش‌های پنل دسترسی داشته باشد. نقش مدیر کل (مالک) همیشه دسترسی کامل دارد.
          این بخش هنوز به بک‌اند وصل نیست (RBAC واقعی هنوز پیاده‌سازی نشده، فقط دو نقش admin/employee در بک‌اند وجود داره).
        </p>

        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          {Object.entries(ROLE_PERMISSIONS).map(([key,meta]) => (
            <button key={key} onClick={()=>selectRole(key)}
              style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer',
                background: activeRole===key ? meta.bg : 'var(--t-search-bg)',
                color: activeRole===key ? meta.color : 'var(--t-txt-muted)',
                fontSize:12, fontWeight:activeRole===key?600:400, fontFamily:'inherit',
                transition:'all .15s' }}>
              {meta.label}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column' }}>
          {Object.entries(PERM_LABELS).map(([key,label], i) => (
            <div key={key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:i<Object.keys(PERM_LABELS).length-1?'0.5px solid var(--t-card-border)':'none' }}>
              <span style={{ fontSize:13, color:'var(--t-txt)' }}>{label}</span>
              <ToggleSwitch checked={!!perms[key]} onChange={()=>togglePerm(key)} label={label} />
            </div>
          ))}
        </div>
        <SaveBtn label={`ذخیره دسترسی‌های ${ROLE_PERMISSIONS[activeRole].label}`} />
      </Section>

      <Section title="حالت نظارت">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:'0 0 3px' }}>ثبت لاگ تمام فعالیت‌ها</p>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>هر تغییری که زیرحساب‌ها انجام می‌دهند ثبت و قابل بازگردانی باشد</p>
          </div>
          <div style={{ width:40,height:22,borderRadius:99,background:'var(--t-accent)',position:'relative',flexShrink:0 }}>
            <div style={{ width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2,boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:'0 0 3px' }}>اعلان فعالیت‌های حساس</p>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>هنگام حذف رکورد یا تغییرات مهم به من اطلاع بده</p>
          </div>
          <div style={{ width:40,height:22,borderRadius:99,background:'var(--t-accent)',position:'relative',flexShrink:0 }}>
            <div style={{ width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2,boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ── helper components ── */
function Section({ title, children, action }) {
  return (
    <div className="card">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
        <h2 style={{ fontSize:13,fontWeight:600,color:'var(--t-txt)',margin:0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ label='ذخیره تغییرات', onClick, saving }) {
  return (
    <div style={{ display:'flex',justifyContent:'flex-end',marginTop:16 }}>
      <button className="btn-primary" onClick={onClick} disabled={saving}>
        <Save size={14}/> {saving ? 'در حال ذخیره...' : label}
      </button>
    </div>
  )
}

function InlineMsg({ msg }) {
  const ok = msg.type === 'ok'
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6, fontSize:12, marginTop:10,
      color: ok ? '#059669' : '#dc2626',
    }}>
      {ok ? <Check size={13}/> : <AlertTriangle size={13}/>} {msg.text}
    </div>
  )
}

function ErrorBanner({ text }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, fontSize:12,
      background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'10px 12px', marginBottom:14,
    }}>
      <AlertTriangle size={14}/> {text}
    </div>
  )
}

/* ── صفحه اصلی ── */
export default function Settings() {
  const [active, setActive] = useState('company')
  const CONTENT = {
    company:  <CompanySettings/>,
    profile:  <ProfileSettings/>,
    users:    <UsersSettings/>,
    security: <SecuritySettings/>,
    notif:    <NotifSettings/>,
    appear:   <AppearSettings/>,
    access:   <AccessSettings/>,
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, alignItems:'flex-start' }}>
      {/* Sidebar تنظیمات */}
      <div className="card" style={{ padding:'8px', position:'sticky', top:0 }}>
        {SIDEBAR_TABS.map(({key,label,icon:Icon})=>(
          <button key={key} onClick={()=>setActive(key)}
            style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',cursor:'pointer',textAlign:'right',fontSize:13,transition:'all .12s',
              background:active===key?'var(--t-accent)':'transparent',
              color:active===key?'var(--t-nav-active-txt)':'var(--t-txt-muted)',
              fontFamily:'inherit',
            }}
            onMouseEnter={e=>{if(active!==key)e.currentTarget.style.background='var(--t-search-bg)'}}
            onMouseLeave={e=>{if(active!==key)e.currentTarget.style.background='transparent'}}
          >
            <Icon size={15} style={{ flexShrink:0 }}/> {label}
          </button>
        ))}
      </div>

      {/* محتوا */}
      <div>{CONTENT[active]}</div>
    </div>
  )
}
