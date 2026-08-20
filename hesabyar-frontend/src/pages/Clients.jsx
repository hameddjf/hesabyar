import { useState } from 'react'
import { Users, Building2, User, TrendingUp, Plus, Download, Eye, Edit2, Trash2, Phone, Mail, MapPin, WifiOff } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Select, Pagination, EmptyState, Modal, FormField } from '@/components/ui'
import { useClients } from '@/hooks/useClients'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const CLIENT_STAT_WIDGETS = [
  { id: 'stat-total',   title: 'کارت کل مشتریان', span: 1, defaultVisible: true },
  { id: 'stat-company', title: 'کارت شرکت‌ها',     span: 1, defaultVisible: true },
  { id: 'stat-person',  title: 'کارت اشخاص',       span: 1, defaultVisible: true },
  { id: 'stat-revenue', title: 'کارت مجموع درآمد', span: 1, defaultVisible: true },
]

const STATUS_META = { active: { label: 'فعال', type: 'green' }, inactive: { label: 'غیرفعال', type: 'gray' }, pending_sync: { label: 'در صف ارسال (آفلاین)', type: 'amber' } }
const TYPE_META   = { company: { label: 'شرکت', icon: Building2 }, person: { label: 'حقیقی', icon: User } }

const TABS_BASE = [
  { key: 'all',     label: 'همه' },
  { key: 'company', label: 'شرکت‌ها' },
  { key: 'person',  label: 'اشخاص' },
]

function ClientForm({ open, onClose, client, onSubmit }) {
  const inputStyle = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const [type, setType]         = useState(client?.type || 'person')
  const [name, setName]         = useState(client?.name || '')
  const [contact, setContact]   = useState(client?.contact || '')
  const [phone, setPhone]       = useState(client?.phone || '')
  const [email, setEmail]       = useState(client?.email || '')
  const [city, setCity]         = useState(client?.city || '')
  const [nationalCode, setNationalCode] = useState(client?.nationalCode || '')
  const [address, setAddress]   = useState(client?.address || '')
  const [bankName, setBankName] = useState('')
  const [bankCard, setBankCard] = useState(client?.bankCard || '')
  const [bankIban, setBankIban] = useState(client?.bankIban || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  async function handleSubmit() {
    if (!name) {
      setSubmitError('نام الزامی است')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        name, type, contact: contact || null, phone: phone || null,
        email: email || null, city: city || null,
        nationalCode: type === 'company' ? (nationalCode || null) : null,
        address: address || null, bankCard: bankCard || null, bankIban: bankIban || null,
        status: 'active',
      })
      onClose()
    } catch (err) {
      setSubmitError(err.message || 'ثبت مشتری ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'ویرایش مشتری' : 'افزودن مشتری جدید'} width={560}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'flex',gap:6,marginBottom:4 }}>
          {[{k:'company',l:'شرکت / حقوقی'},{k:'person',l:'شخص / حقیقی'}].map(({k,l})=>(
            <button key={k} onClick={()=>setType(k)} style={{
              padding:'5px 14px',borderRadius:6,border:'none',fontSize:12,fontWeight:500,cursor:'pointer',
              background:type===k?'var(--t-accent)':'var(--t-search-bg)',
              color:type===k?'var(--t-nav-active-txt)':'var(--t-txt-muted)',transition:'all .15s',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <FormField label={type==='company'?'نام شرکت':'نام و نام‌خانوادگی'} required>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="نماینده / نام تماس">
            <input value={contact} onChange={e=>setContact(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="تلفن">
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="۰۲۱-xxxxxxxx" style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="ایمیل">
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="شهر">
            <input value={city} onChange={e=>setCity(e.target.value)} style={inputStyle} />
          </FormField>
          {type==='company' && (
            <FormField label="شناسه ملی / کد اقتصادی">
              <input value={nationalCode} onChange={e=>setNationalCode(e.target.value)} placeholder="۱۰ رقم" style={inputStyle} dir="ltr" />
            </FormField>
          )}
        </div>
        <FormField label="آدرس">
          <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} style={{ ...inputStyle,resize:'none' }} />
        </FormField>
        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <p style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',marginBottom:10 }}>حساب‌های بانکی مشتری</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <FormField label="بانک">
              <input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="نام بانک" style={inputStyle} />
            </FormField>
            <FormField label="شماره کارت">
              <input value={bankCard} onChange={e=>setBankCard(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" style={inputStyle} dir="ltr" />
            </FormField>
            <FormField label="شماره شبا (IBAN)" required={false}>
              <input value={bankIban} onChange={e=>setBankIban(e.target.value)} placeholder="IR..." style={inputStyle} dir="ltr" />
            </FormField>
          </div>
        </div>
        {submitError && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{submitError}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ثبت...' : (client?'ذخیره':'افزودن مشتری')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ClientDetailModal({ open, onClose, client }) {
  if (!client) return null
  const sm = STATUS_META[client.status]
  const tm = TYPE_META[client.type]
  const Icon = tm.icon
  return (
    <Modal open={open} onClose={onClose} title="پروفایل مشتری" width={500}>
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:52,height:52,borderRadius:14,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--t-accent)',flexShrink:0 }}>
            <Icon size={24} />
          </div>
          <div>
            <h3 style={{ fontSize:16,fontWeight:600,color:'var(--t-txt)',margin:'0 0 3px' }}>{client.name}</h3>
            <div style={{ display:'flex',gap:8 }}>
              <Badge type="blue">{tm.label}</Badge>
              <Badge type={sm.type}>{sm.label}</Badge>
            </div>
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {[
            [Phone,   'تلفن',     client.phone, true],
            [Mail,    'ایمیل',    client.email, true],
            [MapPin,  'شهر',      client.city,  false],
            [Users,   'نماینده',  client.contact,false],
          ].map(([Ic,label,val,ltr])=>(
            <div key={label} style={{ display:'flex',alignItems:'flex-start',gap:8 }}>
              <Ic size={14} style={{ color:'var(--t-accent)',marginTop:2,flexShrink:0 }} />
              <div>
                <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:'0 0 2px' }}>{label}</p>
                <p style={{ fontSize:13,color:'var(--t-txt)',margin:0 }} dir={ltr?'ltr':undefined}>{val}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,background:'var(--t-search-bg)',borderRadius:10,padding:14 }}>
          {[['فاکتورها',client.totalInvoices,''],['مبلغ کل',(client.totalAmount/1_000_000).toLocaleString('fa-IR')+'م','تومان'],['آخرین فعالیت',client.lastActivity,'']].map(([l,v,u])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <p style={{ fontSize:18,fontWeight:600,color:'var(--t-txt)',margin:'0 0 2px' }}>{v}<span style={{ fontSize:11,color:'var(--t-txt-muted)',marginRight:3 }}>{u}</span></p>
              <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button onClick={onClose} className="btn-secondary">بستن</button>
          <button className="btn-primary"><Edit2 size={14} /> ویرایش</button>
        </div>
      </div>
    </Modal>
  )
}

export default function Clients() {
  const { clients, loading, isMock, reload, createClient, updateClient, removeClient } = useClients()
  const [tab,       setTab]       = useState('all')
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [page,      setPage]      = useState(1)
  const [showForm,  setShowForm]  = useState(false)
  const [detail,    setDetail]    = useState(null)
  const [editClient,setEditClient]= useState(null)

  const filtered = clients.filter((c) => {
    if (tab !== 'all' && c.type !== tab) return false
    if (status && c.status !== status) return false
    if (search && !c.name.includes(search) && !c.contact?.includes(search)) return false
    return true
  })

  const totalRevenue = clients.reduce((s,c)=>s+(c.totalAmount||0),0)
  const companyCount = clients.filter(c=>c.type==='company').length
  const personCount  = clients.filter(c=>c.type==='person').length
  const TABS = TABS_BASE.map(t => ({
    ...t,
    count: t.key === 'all' ? clients.length : clients.filter(c => c.type === t.key).length,
  }))

  async function handleFormSubmit(payload) {
    if (editClient) await updateClient(editClient.id, payload)
    else await createClient(payload)
  }

  async function handleDelete(id) {
    if (!confirm('این مشتری حذف بشه؟')) return
    await removeClient(id)
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      {isMock && (
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:'#fef3c7',color:'#92400e',fontSize:12 }}>
          <WifiOff size={14} />
          اتصال به سرور برقرار نشد یا هنوز دیتای واقعی ثبت نشده — نمونه‌ی نمایشی نشون داده میشه.
        </div>
      )}
      <CustomizableGrid
        pageKey="clients"
        widgetDefs={CLIENT_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          switch (id) {
            case 'stat-total':   return <StatCard icon={Users}      label="کل مشتریان" value={clients.length.toString()} />
            case 'stat-company': return <StatCard icon={Building2}  label="شرکت‌ها"     value={companyCount.toString()}  sub="حقوقی" />
            case 'stat-person':  return <StatCard icon={User}       label="اشخاص"       value={personCount.toString()}  sub="حقیقی" />
            case 'stat-revenue': return <StatCard icon={TrendingUp} label="مجموع درآمد" value={`${(totalRevenue/1_000_000_000).toFixed(1)}م`} sub="میلیارد تومان" />
            default: return null
          }
        }}
      />

      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>مشتریان</h2>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>مدیریت مشتریان و طرف‌های حساب</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-secondary"><Download size={14} /> خروجی</button>
            <button className="btn-primary" onClick={()=>{setEditClient(null);setShowForm(true)}}><Plus size={14} /> مشتری جدید</button>
          </div>
        </div>

        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:'0.5px solid var(--t-card-border)',flexWrap:'wrap' }}>
          <Tabs tabs={TABS} active={tab} onChange={(t)=>{setTab(t);setPage(1)}} />
          <div style={{ flex:1 }} />
          <SearchInput value={search} onChange={setSearch} placeholder="جستجوی مشتری..." />
          <Select value={status} onChange={setStatus} options={[{value:'active',label:'فعال'},{value:'inactive',label:'غیرفعال'}]} placeholder="وضعیت" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="مشتری یافت نشد" />
        ) : (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-search-bg)' }}>
                {['مشتری','نماینده','تماس','شهر','فاکتورها','مجموع مبلغ','آخرین فعالیت','وضعیت',''].map(h=>(
                  <th key={h} style={{ padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c)=>{
                const sm = STATUS_META[c.status]
                const tm = TYPE_META[c.type]
                const Icon = tm.icon
                return (
                  <tr key={c.id} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s',cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <div style={{ width:30,height:30,borderRadius:8,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--t-accent)',flexShrink:0 }}>
                          <Icon size={14} />
                        </div>
                        <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt)' }}>{c.contact}</td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)',direction:'ltr' }}>{c.phone}</td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)' }}>{c.city}</td>
                    <td style={{ padding:'11px 14px',fontSize:13,fontWeight:500,color:'var(--t-txt)',textAlign:'center' }}>{c.totalInvoices}</td>
                    <td style={{ padding:'11px 14px',fontSize:13,fontWeight:500,color:'var(--t-txt)',direction:'ltr',textAlign:'right' }}>{(c.totalAmount/1_000_000).toLocaleString('fa-IR')}م</td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)' }}>{c.lastActivity}</td>
                    <td style={{ padding:'11px 14px' }}><Badge type={sm.type}>{sm.label}</Badge></td>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex',gap:2 }}>
                        <button className="icon-btn" aria-label="مشاهده جزئیات" style={{ width:28,height:28 }} onClick={()=>setDetail(c)}><Eye size={14}/></button>
                        <button className="icon-btn" aria-label="ویرایش" style={{ width:28,height:28 }} onClick={()=>{setEditClient(c);setShowForm(true)}}><Edit2 size={14}/></button>
                        <button className="icon-btn" aria-label="حذف" style={{ width:28,height:28 }} onClick={()=>handleDelete(c.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div style={{ padding:'12px 20px' }}>
          <Pagination page={page} total={filtered.length} perPage={10} onChange={setPage} />
        </div>
      </div>

      <ClientForm open={showForm} onClose={()=>setShowForm(false)} client={editClient} onSubmit={handleFormSubmit} />
      <ClientDetailModal open={!!detail} onClose={()=>setDetail(null)} client={detail} />
    </div>
  )
}
