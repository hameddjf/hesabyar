import { useState, useEffect } from 'react'
import { Receipt, TrendingDown, Tag, Calendar, Plus, Download, FileSpreadsheet, Eye, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Pagination, EmptyState, Modal, FormField } from '@/components/ui'
import PartnerAccountSelect from '@/components/ui/PartnerAccountSelect'
import PersianDatePicker from '@/components/ui/PersianDatePicker'
import { useExpenses } from '@/hooks/useExpenses'
import { todayISO, isoToFaDisplay } from '@/lib/jalali'
import { downloadCSV } from '@/lib/csv'
import { downloadXLSX } from '@/lib/xlsx'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const EXPENSE_STAT_WIDGETS = [
  { id: 'stat-total',   title: 'کارت کل هزینه‌ها',     span: 1, defaultVisible: true },
  { id: 'stat-count',   title: 'کارت تعداد هزینه‌ها',  span: 1, defaultVisible: true },
  { id: 'stat-topcat',  title: 'کارت بیشترین دسته',    span: 1, defaultVisible: true },
  { id: 'stat-average', title: 'کارت میانگین هر هزینه', span: 1, defaultVisible: true },
]

const CATEGORIES = [
  { value:'rent',      label:'اجاره',         color:'#1d4ed8', bg:'#eff6ff' },
  { value:'salary',    label:'حقوق و دستمزد', color:'#15803d', bg:'#f0fdf4' },
  { value:'utilities', label:'قبوض',           color:'#7e22ce', bg:'#fdf4ff' },
  { value:'transport', label:'حمل و نقل',      color:'#c2410c', bg:'#fff7ed' },
  { value:'supplies',  label:'لوازم اداری',    color:'#0e7490', bg:'#ecfeff' },
  { value:'marketing', label:'بازاریابی',      color:'#9a3412', bg:'#ffedd5' },
  { value:'other',     label:'سایر',           color:'#6b7280', bg:'var(--t-accent-light)' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.value,c]))

const TABS = [
  { key:'all',       label:'همه' },
  { key:'rent',      label:'اجاره' },
  { key:'salary',    label:'حقوق' },
  { key:'utilities', label:'قبوض' },
  { key:'transport', label:'حمل و نقل' },
  { key:'supplies',  label:'لوازم' },
  { key:'marketing', label:'بازاریابی' },
]

function ExpenseForm({ open, onClose, onCreated, createExpense, updateExpense, editExpense }) {
  const inputStyle = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const isEdit = !!editExpense
  const [form, setForm]           = useState({ desc:'', category:'', amount:'', date: todayISO(), note:'' })
  const [partnerId, setPartnerId] = useState('')
  const [partnerAccId, setPartnerAccId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  // موقع باز شدن مودال در حالت ویرایش (یا سوییچ به یه هزینه‌ی دیگه)، فرم رو با دیتای همون هزینه پر کن
  useEffect(() => {
    if (!open) return
    if (editExpense) {
      setForm({
        desc: editExpense.desc || '', category: editExpense.category || '',
        amount: String(editExpense.amountRaw ?? ''), date: editExpense.date || todayISO(), note: '',
      })
      setPartnerId(editExpense.partnerId || '')
      setPartnerAccId(editExpense.partnerAccount || '')
    } else {
      setForm({ desc:'', category:'', amount:'', date: todayISO(), note:'' })
      setPartnerId(''); setPartnerAccId('')
    }
    setErr(null)
    // این افکت عمداً فقط editExpense?.id رو دیپندنسی می‌گیره: باید فقط وقتی مودال باز
    // می‌شه یا هزینه‌ی هدف عوض می‌شه اجرا بشه، نه هر بار که آبجکت editExpense (که ممکنه
    // هر رندر رفرنس جدید بگیره) عوض می‌شه — وگرنه با تایپ کاربر توی فرم، افکت دوباره
    // اجرا و مقادیر تایپ‌شده پاک می‌شن.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editExpense?.id])

  const submit = async () => {
    if (!form.desc || !form.category || !form.amount || !form.date) {
      setErr('شرح، دسته‌بندی، مبلغ و تاریخ الزامی هستن'); return
    }
    setSubmitting(true); setErr(null)
    try {
      if (isEdit) {
        await updateExpense(editExpense.id, {
          description: form.desc, category: form.category, amount: Number(form.amount), date: form.date,
          partnerId: partnerId || null, partnerAccount: partnerAccId || null,
        })
      } else {
        await createExpense({
          description: form.desc, category: form.category, amount: Number(form.amount), date: form.date,
          partnerId: partnerId || null, partnerAccount: partnerAccId || null,
          status: 'done', hasReceipt: 0,
        })
      }
      onCreated?.()
      onClose()
    } catch (e) {
      setErr(e.message || (isEdit ? 'ویرایش هزینه ناموفق بود' : 'ثبت هزینه ناموفق بود'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'ویرایش هزینه' : 'ثبت هزینه جدید'} width={520}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ background:'var(--t-accent-light)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--t-txt-muted)',borderRight:'3px solid #d97706' }}>
          <strong style={{ color:'var(--t-txt)' }}>هزینه:</strong> مشخص کنید کدام شریک این هزینه را پرداخت کرده است.
        </div>

        {/* شریک پرداخت‌کننده */}
        <PartnerAccountSelect
          mode="expense"
          partnerId={partnerId}       onPartnerChange={p=>{setPartnerId(p);setPartnerAccId('')}}
          partnerAccId={partnerAccId} onPartnerAccChange={setPartnerAccId}
          required
        />

        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <p style={{ fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'.04em' }}>جزئیات هزینه</p>
          <FormField label="شرح هزینه" required>
            <input value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="توضیح هزینه..." style={inputStyle} />
          </FormField>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12 }}>
            <FormField label="دسته‌بندی" required>
              <select value={form.category} onChange={e=>set('category',e.target.value)} style={inputStyle}>
                <option value="">انتخاب...</option>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
            <FormField label="مبلغ (تومان)" required>
              <input value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
            </FormField>
            <FormField label="تاریخ" required>
              <PersianDatePicker value={form.date} onChange={v=>set('date',v)} required />
            </FormField>
          </div>
        </div>

        <FormField label="یادداشت">
          <textarea value={form.note} onChange={e=>set('note',e.target.value)} placeholder="توضیحات اضافی..." rows={2} style={{...inputStyle,resize:'none'}} />
        </FormField>

        {err && (
          <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px' }}>
            <AlertTriangle size={14}/> {err}
          </div>
        )}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button onClick={submit} className="btn-primary" disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ذخیره...' : (isEdit ? 'ذخیره تغییرات' : 'ثبت هزینه')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** مودال read-only برای «مشاهده‌ی جزئیات» یک هزینه — بدون فرم، فقط نمایش */
function ExpenseDetailModal({ open, onClose, expense }) {
  if (!expense) return null
  const cat = CAT_MAP[expense.category]
  const row = (label, value) => (
    <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--t-card-border)',fontSize:12 }}>
      <span style={{ color:'var(--t-txt-muted)' }}>{label}</span>
      <span style={{ color:'var(--t-txt)',fontWeight:500 }}>{value}</span>
    </div>
  )
  return (
    <Modal open={open} onClose={onClose} title="جزئیات هزینه" width={440}>
      <div style={{ display:'flex',flexDirection:'column' }}>
        {row('شناسه', expense.id)}
        {row('شرح', expense.desc)}
        {row('دسته‌بندی', cat?.label || '—')}
        {row('تاریخ', isoToFaDisplay(expense.date))}
        {row('شریک پرداخت‌کننده', expense.partner)}
        {row('کارت', expense.partnerCard)}
        {row('مبلغ', `${expense.amount} تومان`)}
        {row('رسید', expense.receipt ? 'دارد' : 'ندارد')}
      </div>
    </Modal>
  )
}

export default function Expenses() {
  const { expenses, loading, isMock, reload, createExpense, updateExpense, removeExpense } = useExpenses()
  const [tab, setTab]       = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [showForm, setShowForm]         = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [viewingExpense, setViewingExpense] = useState(null)

  const openCreate = () => { setEditingExpense(null); setShowForm(true) }
  const openEdit   = (ex) => { setEditingExpense(ex); setShowForm(true) }
  const closeForm  = () => { setShowForm(false); setEditingExpense(null) }

  const handleDelete = async (ex) => {
    if (!confirm(`هزینه‌ی «${ex.desc}» حذف بشه؟ این عمل قابل بازگشت نیست.`)) return
    try {
      await removeExpense(ex.id)
    } catch (e) {
      alert(e.message || 'حذف هزینه ناموفق بود')
    }
  }

  const EXPENSES_HEADERS = ['شناسه', 'شرح', 'دسته‌بندی', 'تاریخ', 'شریک پرداخت‌کننده', 'مبلغ (تومان)', 'رسید']
  const expensesExportRows = () => filtered.map((ex) => [ex.id, ex.desc, CAT_MAP[ex.category]?.label || ex.category, ex.date, ex.partner, Number(ex.amountRaw ?? ex.amount) || 0, ex.receipt ? 'دارد' : 'ندارد'])

  const handleExportCSV = () => {
    downloadCSV(`expenses-${todayISO()}.csv`, EXPENSES_HEADERS, expensesExportRows())
  }
  const handleExportXLSX = () => {
    downloadXLSX(`expenses-${todayISO()}.xlsx`, [{ name: 'هزینه‌ها', headers: EXPENSES_HEADERS, rows: expensesExportRows() }])
  }

  const filtered = expenses.filter(ex => {
    if (tab !== 'all' && ex.category !== tab) return false
    if (search && !ex.desc.includes(search) && !ex.partner.includes(search)) return false
    return true
  })

  const totalAmount = expenses.reduce((s,ex)=>s+(Number(String(ex.amount).replace(/[^\d]/g,''))||0),0)
  const byCategory = {}
  expenses.forEach(ex => { byCategory[ex.category] = (byCategory[ex.category]||0) + (Number(String(ex.amount).replace(/[^\d]/g,''))||0) })
  const topCategory = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      {isMock && (
        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fffbeb',color:'#92400e',borderRadius:8,padding:'10px 14px' }}>
          هنوز هزینه‌ی واقعی ثبت نشده — این‌ها فقط نمونه‌ن.
        </div>
      )}
      <CustomizableGrid
        pageKey="expenses"
        widgetDefs={EXPENSE_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          switch (id) {
            case 'stat-total':   return <StatCard icon={TrendingDown} label="کل هزینه‌های ثبت‌شده" value={totalAmount.toLocaleString('fa-IR')} sub="تومان" />
            case 'stat-count':   return <StatCard icon={Receipt}      label="تعداد هزینه‌ها"        value={expenses.length.toLocaleString('fa-IR')}  sub="مجموع" />
            case 'stat-topcat':  return <StatCard icon={Tag}          label="بیشترین دسته"          value={topCategory ? CAT_MAP[topCategory[0]]?.label : '—'} sub={topCategory ? `${Math.round(topCategory[1]/1_000_000)}م تومان` : ''} />
            case 'stat-average': return <StatCard icon={Calendar}     label="میانگین هر هزینه"       value={expenses.length ? Math.round(totalAmount/expenses.length).toLocaleString('fa-IR') : '۰'} sub="تومان" />
            default: return null
          }
        }}
      />

      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>هزینه‌ها</h2>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>ثبت هزینه‌ها به همراه شریک پرداخت‌کننده</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-secondary" onClick={handleExportCSV}><Download size={14} /> CSV</button>
            <button className="btn-secondary" onClick={handleExportXLSX}><FileSpreadsheet size={14} /> Excel</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={14} /> هزینه جدید</button>
          </div>
        </div>

        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:'0.5px solid var(--t-card-border)',flexWrap:'wrap' }}>
          <Tabs tabs={TABS} active={tab} onChange={t=>{setTab(t);setPage(1)}} />
          <div style={{ flex:1 }} />
          <SearchInput value={search} onChange={setSearch} placeholder="جستجوی هزینه یا شریک..." />
        </div>

        {loading ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)',padding:20 }}>در حال بارگذاری...</p>
        ) : filtered.length === 0 ? <EmptyState icon={Receipt} title="هزینه‌ای یافت نشد" /> : (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-search-bg)' }}>
                {['شناسه','شرح','دسته‌بندی','تاریخ','شریک پرداخت‌کننده','کارت','مبلغ','رسید',''].map(h=>(
                  <th key={h} style={{ padding:'9px 12px',textAlign:'right',fontSize:10,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex=>{
                const cat = CAT_MAP[ex.category]
                return (
                  <tr key={ex.id} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)' }}>{ex.id}</td>
                    <td style={{ padding:'10px 12px',fontSize:12,color:'var(--t-txt)',maxWidth:160 }}>{ex.desc}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:99,background:cat.bg,color:cat.color,whiteSpace:'nowrap' }}>{cat.label}</span></td>
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',whiteSpace:'nowrap' }}>{isoToFaDisplay(ex.date)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <div style={{ width:24,height:24,borderRadius:'50%',background:'#d9770622',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'#d97706',flexShrink:0 }}>
                          {ex.partner.split(' ').map(w=>w[0]).join('')}
                        </div>
                        <span style={{ fontSize:12,color:'var(--t-txt)' }}>{ex.partner}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px',fontSize:10,color:'var(--t-txt-muted)',direction:'ltr',whiteSpace:'nowrap' }}>{ex.partnerCard}</td>
                    <td style={{ padding:'10px 12px',fontSize:13,fontWeight:600,color:'#dc2626',direction:'ltr',textAlign:'right',whiteSpace:'nowrap' }}>- {ex.amount}</td>
                    <td style={{ padding:'10px 12px' }}>{ex.receipt?<Badge type="green">دارد</Badge>:<Badge type="gray">ندارد</Badge>}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',gap:2 }}>
                        <button className="icon-btn" aria-label="مشاهده جزئیات" style={{ width:26,height:26 }} onClick={()=>setViewingExpense(ex)}><Eye size={13}/></button>
                        <button className="icon-btn" aria-label="ویرایش" style={{ width:26,height:26 }} onClick={()=>openEdit(ex)}><Edit2 size={13}/></button>
                        <button className="icon-btn" aria-label="حذف" style={{ width:26,height:26 }} onClick={()=>handleDelete(ex)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding:'12px 20px' }}><Pagination page={page} total={filtered.length} perPage={10} onChange={setPage} /></div>
      </div>
      <ExpenseForm
        open={showForm} onClose={closeForm} onCreated={reload}
        createExpense={createExpense} updateExpense={updateExpense} editExpense={editingExpense}
      />
      <ExpenseDetailModal open={!!viewingExpense} onClose={()=>setViewingExpense(null)} expense={viewingExpense} />
    </div>
  )
}
