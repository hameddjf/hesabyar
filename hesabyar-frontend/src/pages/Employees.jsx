import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserCheck, Briefcase, DollarSign, PieChart, Plus, Download, Eye, Edit2, Trash2, CreditCard, WifiOff } from 'lucide-react'
import { Badge, StatCard, SearchInput, Pagination, Modal, FormField } from '@/components/ui'
import { useEmployees } from '@/hooks/useEmployees'
import { usePartners } from '@/hooks/usePartners'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const EMPLOYEE_STAT_WIDGETS = [
  { id: 'stat-total',   title: 'کارت کل پرسنل',        span: 1, defaultVisible: true },
  { id: 'stat-active',  title: 'کارت پرسنل فعال',      span: 1, defaultVisible: true },
  { id: 'stat-salary',  title: 'کارت حقوق ماهانه',     span: 1, defaultVisible: true },
  { id: 'stat-partner', title: 'کارت شریک در کارمندان', span: 1, defaultVisible: true },
]

const STATUS_META = { active:{ label:'فعال', type:'green' }, inactive:{ label:'غیرفعال', type:'gray' }, pending_sync:{ label:'در صف ارسال (آفلاین)', type:'amber' } }
const DEPTS = ['مدیریت','مالی','فروش','اداری','انبار','لجستیک','فناوری اطلاعات']

/* ── فرم کارمند ── */
function EmployeeForm({ open, onClose, emp, onSubmit }) {
  const inputStyle = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const [name, setName]         = useState(emp?.name || '')
  const [position, setPosition] = useState(emp?.position || '')
  const [dept, setDept]         = useState(emp?.dept || '')
  const [salary, setSalary]     = useState(emp?.salary ?? '')
  const [hireDate, setHireDate] = useState(emp?.hireDate || '')
  const [phone, setPhone]       = useState(emp?.phone || '')
  const [bank, setBank]         = useState(emp?.account?.bank || '')
  const [card, setCard]         = useState(emp?.account?.card || '')
  const [iban, setIban]         = useState(emp?.account?.iban || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit() {
    if (!name || !position || !dept || !salary || !hireDate || !phone) {
      setError('همه‌ی فیلدهای ستاره‌دار الزامی هستن')
      return
    }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ name, position, dept, salary: Number(salary), hireDate, phone, bank: bank || null, card: card || null, iban: iban || null, status: 'active' })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={emp ? 'ویرایش کارمند' : 'افزودن کارمند جدید'} width={560}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <FormField label="نام و نام‌خانوادگی" required>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="سمت / عنوان شغلی" required>
            <input value={position} onChange={e=>setPosition(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="بخش / دپارتمان" required>
            <select value={dept} onChange={e=>setDept(e.target.value)} style={inputStyle}>
              <option value="">انتخاب...</option>
              {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="حقوق ماهانه (تومان)" required>
            <input value={salary} onChange={e=>setSalary(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="تاریخ استخدام" required>
            <input value={hireDate} onChange={e=>setHireDate(e.target.value)} placeholder="۱۴۰۰-۰۱-۰۱" style={inputStyle} />
          </FormField>
          <FormField label="شماره موبایل" required>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="۰۹۱۲xxxxxxx" style={inputStyle} dir="ltr" />
          </FormField>
        </div>
        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <p style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',marginBottom:10 }}>حساب بانکی (برای واریز حقوق)</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <FormField label="بانک"><input value={bank} onChange={e=>setBank(e.target.value)} placeholder="نام بانک" style={inputStyle} /></FormField>
            <FormField label="شماره کارت"><input value={card} onChange={e=>setCard(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" style={inputStyle} dir="ltr" /></FormField>
            <FormField label="شماره شبا"><input value={iban} onChange={e=>setIban(e.target.value)} placeholder="IR..." style={inputStyle} dir="ltr" /></FormField>
          </div>
        </div>
        {error && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{error}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ثبت...' : (emp?'ذخیره':'افزودن')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── لیست کارمندان ── */
function EmployeeList({ search }) {
  const { employees, isMock, createEmployee, updateEmployee, removeEmployee } = useEmployees()
  const [showForm, setShowForm] = useState(false)
  const [editEmp,  setEditEmp]  = useState(null)
  const [page, setPage]         = useState(1)

  const filtered = employees.filter(e =>
    !search || e.name.includes(search) || e.position.includes(search) || e.dept.includes(search)
  )
  const totalSalary = employees.filter(e=>e.status==='active').reduce((s,e)=>s+e.salary,0)

  async function handleFormSubmit(payload) {
    if (editEmp) await updateEmployee(editEmp.id, payload)
    else await createEmployee(payload)
  }
  async function handleDelete(id) {
    if (!confirm('این کارمند حذف بشه؟')) return
    await removeEmployee(id)
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      {isMock && (
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:'#fef3c7',color:'#92400e',fontSize:12 }}>
          <WifiOff size={14} />
          اتصال به سرور برقرار نشد یا هنوز دیتای واقعی ثبت نشده — نمونه‌ی نمایشی نشون داده میشه.
        </div>
      )}
      <CustomizableGrid
        pageKey="employees"
        widgetDefs={EMPLOYEE_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          switch (id) {
            case 'stat-total':   return <StatCard icon={UserCheck}  label="کل پرسنل"        value={employees.length.toString()} />
            case 'stat-active':  return <StatCard icon={Briefcase}  label="پرسنل فعال"      value={employees.filter(e=>e.status==='active').length.toString()} />
            case 'stat-salary':  return <StatCard icon={DollarSign} label="حقوق ماهانه"     value={`${(totalSalary/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان" />
            case 'stat-partner': return <StatCard icon={PieChart}   label="شریک در کارمندان" value={employees.filter(e=>e.isPartner).length.toString()} sub="نفر شریک" />
            default: return null
          }
        }}
      />

      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>لیست پرسنل</h2>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>مدیریت کارمندان، کارگران و حقوق‌بگیران</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-secondary"><Download size={14} /> خروجی</button>
            <button className="btn-primary" onClick={()=>{setEditEmp(null);setShowForm(true)}}><Plus size={14} /> کارمند جدید</button>
          </div>
        </div>

        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--t-search-bg)' }}>
              {['نام','سمت','بخش','تاریخ استخدام','حقوق','حساب بانکی','وضعیت',''].map(h=>(
                <th key={h} style={{ padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp)=>{
              const sm = STATUS_META[emp.status]
              return (
                <tr key={emp.id} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'var(--t-accent)',flexShrink:0 }}>
                        {emp.name.slice(0,1)}
                      </div>
                      <div>
                        <p style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:0 }}>{emp.name}</p>
                        {emp.isPartner && <span style={{ fontSize:10,padding:'1px 5px',borderRadius:4,background:'#fdf4ff',color:'#7e22ce',fontWeight:500 }}>شریک</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt)' }}>{emp.position}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:11,padding:'2px 8px',borderRadius:99,background:'var(--t-accent-light)',color:'var(--t-accent)',fontWeight:500 }}>{emp.dept}</span>
                  </td>
                  <td style={{ padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)' }}>{emp.hireDate}</td>
                  <td style={{ padding:'11px 14px',fontSize:13,fontWeight:500,color:'var(--t-txt)',direction:'ltr',textAlign:'right' }}>{emp.salary.toLocaleString('fa-IR')}</td>
                  <td style={{ padding:'11px 14px' }}>
                    {emp.account ? (
                      <div style={{ fontSize:11,color:'var(--t-txt-muted)' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                          <CreditCard size={11} style={{ color:'var(--t-accent)' }} />
                          <span dir="ltr" style={{ fontSize:11 }}>{emp.account.card}</span>
                        </div>
                        <span>{emp.account.bank}</span>
                      </div>
                    ) : <span style={{ color:'var(--t-txt-muted)',fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ padding:'11px 14px' }}><Badge type={sm.type}>{sm.label}</Badge></td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex',gap:2 }}>
                      {[Eye,Edit2].map((Icon,i)=>(
                        <button key={i} className="icon-btn" style={{ width:28,height:28 }}
                          onClick={i===1?()=>{setEditEmp(emp);setShowForm(true)}:undefined}>
                          <Icon size={14}/>
                        </button>
                      ))}
                      <button className="icon-btn" aria-label="حذف" style={{ width:28,height:28 }} onClick={()=>handleDelete(emp.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding:'12px 20px' }}>
          <Pagination page={page} total={filtered.length} perPage={10} onChange={setPage} />
        </div>
      </div>
      <EmployeeForm open={showForm} onClose={()=>setShowForm(false)} emp={editEmp} onSubmit={handleFormSubmit} />
    </div>
  )
}

/* ── صفحه اصلی کارمندان ──
 * تب «شرکا» قبلاً همین‌جا یه نمای فقط-نمایشی داشت (بدون دفتر حساب، بدون امکان
 * ویرایش واقعی). حالا صفحه‌ی کامل و مستقل /partners با دفتر حساب شراکت،
 * تاریخچه‌ی تراکنش‌ها و ویزارد تقسیم سود جایگزینش شده — این‌جا فقط یه کارت
 * کوتاه لینک می‌ده بهش تا کاربر گم نشه. */
function PartnersLinkCard() {
  const { partners } = usePartners()
  return (
    <div className="card" style={{ display:'flex',alignItems:'center',gap:16 }}>
      <div style={{ width:44,height:44,borderRadius:12,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <PieChart size={20} style={{ color:'var(--t-accent)' }} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:'0 0 2px' }}>شرکا و سهام‌داران</p>
        <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>
          {partners.length} شریک ثبت‌شده — مدیریت دفتر حساب شراکت، آورده/برداشت و تقسیم سود
        </p>
      </div>
      <Link to="/partners" className="btn-primary" style={{ textDecoration:'none' }}>
        مشاهده‌ی صفحه‌ی شرکا
      </Link>
    </div>
  )
}

export default function Employees() {
  const [search, setSearch] = useState('')

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <h1 style={{ fontSize:16,fontWeight:600,color:'var(--t-txt)',margin:0 }}>کارمندان و پرسنل</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="جستجوی پرسنل..." />
      </div>
      <PartnersLinkCard />
      <EmployeeList search={search} />
    </div>
  )
}
