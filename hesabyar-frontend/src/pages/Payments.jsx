import { useState, useEffect } from 'react'
import { CreditCard, ArrowUpRight, Hash, Landmark, Plus, Download, FileSpreadsheet, Eye, Edit2, Trash2, WifiOff } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Select, Pagination, EmptyState, Modal, FormField } from '@/components/ui'
import PartnerAccountSelect from '@/components/ui/PartnerAccountSelect'
import CheckFields from '@/components/ui/CheckFields'
import PersianDatePicker from '@/components/ui/PersianDatePicker'
import { usePayments } from '@/hooks/usePayments'
import { useClients } from '@/hooks/useClients'
import { todayISO, isoToFaDisplay } from '@/lib/jalali'
import { downloadCSV } from '@/lib/csv'
import { downloadXLSX } from '@/lib/xlsx'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const PAYMENT_STAT_WIDGETS = [
  { id: 'stat-total',     title: 'کارت کل پرداختی‌ها',    span: 1, defaultVisible: true },
  { id: 'stat-count',     title: 'کارت تعداد پرداختی‌ها', span: 1, defaultVisible: true },
  { id: 'stat-checks',    title: 'کارت در انتظار تسویه',  span: 1, defaultVisible: true },
  { id: 'stat-transfers', title: 'کارت انتقال بانکی',     span: 1, defaultVisible: true },
]

const METHOD_META = {
  transfer:{ label:'انتقال بانکی', bg:'#eff6ff', color:'#1d4ed8' },
  check:   { label:'چک',           bg:'#fdf4ff', color:'#7e22ce' },
  cash:    { label:'نقدی',         bg:'#f0fdf4', color:'#15803d' },
  card:    { label:'کارت',         bg:'#fff7ed', color:'#c2410c' },
}
const STATUS_META = {
  done:   { label:'انجام‌شده', type:'green' },
  pending:{ label:'در انتظار', type:'amber' },
  failed: { label:'ناموفق',   type:'red'   },
  pending_sync: { label:'در صف ارسال (آفلاین)', type:'amber' },
}
const TABS_BASE = [
  { key:'all', label:'همه' }, { key:'transfer', label:'انتقال بانکی' },
  { key:'check', label:'چک' }, { key:'cash', label:'نقدی' }, { key:'card', label:'کارت' },
]

function PaymentForm({ open, onClose, onCreated, createPayment, updatePayment, editPayment }) {
  const inp = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const isEdit = !!editPayment
  const [partnerId, setPartnerId]       = useState('')
  const [partnerAccId, setPartnerAccId] = useState('')
  const [clientId, setClientId]         = useState('')
  const [method, setMethod]             = useState('')
  const [amount, setAmount]             = useState('')
  const [date, setDate]                 = useState(todayISO())
  const [reference, setReference]       = useState('')
  const [invoiceId, setInvoiceId]       = useState('')
  const [description, setDescription]   = useState('')
  const [checkData, setCheckData]       = useState({})
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState(null)
  const { clients } = useClients()
  const methodOpts = Object.entries(METHOD_META).map(([v,m])=>({value:v,label:m.label}))
  const clientOpts = clients.map(c=>({value:c.id,label:c.name}))

  // موقع باز شدن مودال در حالت ویرایش (یا سوییچ به یه پرداختی دیگه)، فرم رو با دیتای همون پرداختی پر کن
  useEffect(() => {
    if (!open) return
    if (editPayment) {
      setPartnerId(editPayment.partnerId || '')
      setPartnerAccId(editPayment.partnerAccount || '')
      setClientId(editPayment.clientId || '')
      setMethod(editPayment.method || '')
      setAmount(String(editPayment.amountRaw ?? ''))
      setDate(editPayment.date || todayISO())
      setReference(editPayment.reference || '')
      setInvoiceId(editPayment.invoiceId || '')
      setDescription(editPayment.description || '')
      setCheckData({ number: editPayment.checkNumber || '', date: editPayment.checkDate || '', bank: editPayment.checkBank || '' })
    } else {
      setPartnerId(''); setPartnerAccId(''); setClientId(''); setMethod('')
      setAmount(''); setDate(todayISO()); setReference(''); setInvoiceId('')
      setDescription(''); setCheckData({})
    }
    setSubmitError(null)
    // همون منطق Expenses.jsx: عمداً فقط شناسه‌ی پرداختی هدف رو دیپندنسی می‌گیریم، نه کل
    // آبجکت editPayment، تا افکت با هر رندر (که ممکنه رفرنس جدید بگیره) دوباره اجرا نشه
    // و فرم در حال تایپ کاربر ریست نشه.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPayment?.id])

  async function handleSubmit() {
    if (!amount || !method || !date) {
      setSubmitError('مبلغ، روش پرداخت و تاریخ الزامی هستن')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const payload = {
      date,
      amount: Number(amount),
      transactionType: 'payment',
      method,
      reference: reference || null,
      description: description || null,
      invoiceId: invoiceId || null,
      partnerId: partnerId || null,
      partnerAccount: partnerAccId || null,
      clientId: clientId || null,
      checkNumber: checkData.number || null,
      checkDate: checkData.date || null,
      checkBank: checkData.bank || null,
    }
    try {
      if (isEdit) {
        await updatePayment(editPayment.id, payload)
      } else {
        await createPayment({ ...payload, status: 'done' })
      }
      onCreated?.()
      onClose()
    } catch (err) {
      setSubmitError(err.message || (isEdit ? 'ویرایش پرداختی ناموفق بود' : 'ثبت پرداختی ناموفق بود'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'ویرایش پرداختی' : 'ثبت پرداختی جدید'} width={540}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <PartnerAccountSelect mode="payment"
          partnerId={partnerId}       onPartnerChange={p=>{setPartnerId(p);setPartnerAccId('')}}
          partnerAccId={partnerAccId} onPartnerAccChange={setPartnerAccId}
          required />

        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <FormField label="دریافت‌کننده">
              <Select value={clientId} onChange={setClientId} options={clientOpts} placeholder="انتخاب کنید..." />
            </FormField>
            <FormField label="مبلغ (تومان)" required>
              <input placeholder="0" style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </FormField>
            <FormField label="روش پرداخت" required>
              <Select value={method} onChange={setMethod} options={methodOpts} placeholder="انتخاب کنید..." />
            </FormField>
            <FormField label="تاریخ پرداخت" required>
              <PersianDatePicker value={date} onChange={setDate} required />
            </FormField>
            {method !== 'check' && (
              <FormField label="شماره مرجع">
                <input placeholder="شماره سند..." style={inp} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
              </FormField>
            )}
            <FormField label="فاکتور مرتبط">
              <input placeholder="INV-XXXX" style={inp} dir="ltr" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
            </FormField>
          </div>
        </div>

        {method === 'check' && (
          <CheckFields data={checkData} onChange={setCheckData} />
        )}

        <FormField label="توضیحات">
          <textarea placeholder="توضیحات اختیاری..." rows={2} style={{...inp,resize:'none'}} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        {submitError && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{submitError}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ذخیره...' : (isEdit ? 'ذخیره تغییرات' : 'ثبت پرداختی')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** مودال read-only برای «مشاهده‌ی جزئیات» یک پرداختی — بدون فرم، فقط نمایش */
function PaymentDetailModal({ open, onClose, payment }) {
  if (!payment) return null
  const mm = METHOD_META[payment.method]
  const sm = STATUS_META[payment.status]
  const row = (label, value) => (
    <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--t-card-border)',fontSize:12 }}>
      <span style={{ color:'var(--t-txt-muted)' }}>{label}</span>
      <span style={{ color:'var(--t-txt)',fontWeight:500 }}>{value}</span>
    </div>
  )
  return (
    <Modal open={open} onClose={onClose} title="جزئیات پرداختی" width={440}>
      <div style={{ display:'flex',flexDirection:'column' }}>
        {row('شناسه', payment.id)}
        {row('شریک پرداخت‌کننده', payment.partner)}
        {row('کارت', payment.partnerCard)}
        {row('دریافت‌کننده', payment.to)}
        {row('تاریخ', isoToFaDisplay(payment.date))}
        {row('روش پرداخت', mm?.label || '—')}
        {row('شماره مرجع', payment.ref)}
        {row('مبلغ', `${payment.amount} تومان`)}
        {row('وضعیت', sm?.label || '—')}
      </div>
    </Modal>
  )
}

export default function Payments() {
  const { payments, loading, isMock, reload, createPayment, updatePayment, removePayment } = usePayments()
  const [tab,setTab]       = useState('all')
  const TABS = TABS_BASE.map(t => ({
    ...t,
    count: t.key === 'all' ? payments.length : payments.filter(p => p.method === t.key).length,
  }))
  const [search,setSearch] = useState('')
  const [page,setPage]     = useState(1)
  const [showForm,setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [viewingPayment, setViewingPayment] = useState(null)

  const openCreate = () => { setEditingPayment(null); setShowForm(true) }
  const openEdit   = (p) => { setEditingPayment(p); setShowForm(true) }
  const closeForm  = () => { setShowForm(false); setEditingPayment(null) }

  const handleDelete = async (p) => {
    if (!confirm(`پرداختی «${p.id}» حذف بشه؟ این عمل قابل بازگشت نیست.`)) return
    try {
      await removePayment(p.id)
    } catch (e) {
      alert(e.message || 'حذف پرداختی ناموفق بود')
    }
  }

  const filtered = payments.filter(p=>{
    if(tab!=='all'&&p.method!==tab) return false
    if(search&&!p.to.includes(search)&&!p.id.includes(search)&&!p.partner.includes(search)) return false
    return true
  })

  const PAYMENTS_HEADERS = ['شناسه', 'شریک پرداخت‌کننده', 'دریافت‌کننده', 'تاریخ', 'روش', 'مبلغ (تومان)', 'وضعیت']
  const paymentsExportRows = () => filtered.map((p) => [p.id, p.partner, p.to, p.date, METHOD_META[p.method]?.label || p.method, Number(p.amountRaw ?? p.amount) || 0, STATUS_META[p.status]?.label || p.status])

  const handleExportCSV = () => {
    downloadCSV(`payments-${todayISO()}.csv`, PAYMENTS_HEADERS, paymentsExportRows())
  }
  const handleExportXLSX = () => {
    downloadXLSX(`payments-${todayISO()}.xlsx`, [{ name: 'پرداخت‌ها', headers: PAYMENTS_HEADERS, rows: paymentsExportRows() }])
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
        pageKey="payments"
        widgetDefs={PAYMENT_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          const totalAmount   = payments.reduce((s,p) => s + (Number(String(p.amount).replace(/[^\d]/g,'')) || 0), 0)
          const checkPending  = payments.filter(p => p.method === 'check' && p.status !== 'done').length
          const transferCount = payments.filter(p => p.method === 'transfer').length
          switch (id) {
            case 'stat-total':     return <StatCard icon={CreditCard}   label="کل پرداختی‌ها"       value={totalAmount.toLocaleString('fa-IR')} sub="تومان" />
            case 'stat-count':     return <StatCard icon={ArrowUpRight} label="تعداد پرداختی‌ها"    value={payments.length.toLocaleString('fa-IR')} sub="مجموع" />
            case 'stat-checks':    return <StatCard icon={Hash}         label="در انتظار تسویه"     value={checkPending.toLocaleString('fa-IR')} sub="چک در جریان" />
            case 'stat-transfers': return <StatCard icon={Landmark}     label="انتقال بانکی"        value={transferCount.toLocaleString('fa-IR')} sub="مورد" />
            default: return null
          }
        }}
      />
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>پرداختی‌ها</h2>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>پرداخت شرکا به مشتریان و طرف‌های حساب</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-secondary" onClick={handleExportCSV}><Download size={14} /> CSV</button>
            <button className="btn-secondary" onClick={handleExportXLSX}><FileSpreadsheet size={14} /> Excel</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={14} /> پرداختی جدید</button>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:'0.5px solid var(--t-card-border)',flexWrap:'wrap' }}>
          <Tabs tabs={TABS} active={tab} onChange={t=>{setTab(t);setPage(1)}} />
          <div style={{ flex:1 }} />
          <SearchInput value={search} onChange={setSearch} placeholder="جستجو..." />
        </div>
        {filtered.length===0?<EmptyState icon={CreditCard} title="پرداختی یافت نشد" />:(
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-search-bg)' }}>
                {['شناسه','شریک پرداخت‌کننده','کارت','دریافت‌کننده','تاریخ','روش','مبلغ','وضعیت',''].map(h=>(
                  <th key={h} style={{ padding:'9px 12px',textAlign:'right',fontSize:10,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                const mm=METHOD_META[p.method]; const sm=STATUS_META[p.status]
                return (
                  <tr key={p.id} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)' }}>{p.id}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <div style={{ width:26,height:26,borderRadius:'50%',background:'#dc262622',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#dc2626',flexShrink:0 }}>
                          {p.partner.split(' ').map(w=>w[0]).join('')}
                        </div>
                        <span style={{ fontSize:12,fontWeight:500,color:'var(--t-txt)' }}>{p.partner}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px',fontSize:10,color:'var(--t-txt-muted)',direction:'ltr',whiteSpace:'nowrap' }}>{p.partnerCard}</td>
                    <td style={{ padding:'10px 12px',fontSize:12,color:'var(--t-txt)' }}>{p.to}</td>
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',whiteSpace:'nowrap' }}>{isoToFaDisplay(p.date)}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11,fontWeight:500,padding:'2px 7px',borderRadius:99,background:mm.bg,color:mm.color,whiteSpace:'nowrap' }}>{mm.label}</span></td>
                    <td style={{ padding:'10px 12px',fontSize:13,fontWeight:600,color:'#dc2626',direction:'ltr',textAlign:'right',whiteSpace:'nowrap' }}>- {p.amount}</td>
                    <td style={{ padding:'10px 12px' }}><Badge type={sm.type}>{sm.label}</Badge></td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',gap:2 }}>
                        <button className="icon-btn" aria-label="مشاهده جزئیات" style={{ width:26,height:26 }} onClick={()=>setViewingPayment(p)}><Eye size={13}/></button>
                        <button className="icon-btn" aria-label="ویرایش" style={{ width:26,height:26 }} onClick={()=>openEdit(p)}><Edit2 size={13}/></button>
                        <button className="icon-btn" aria-label="حذف" style={{ width:26,height:26 }} onClick={()=>handleDelete(p)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding:'12px 20px' }}><Pagination page={page} total={payments.length} perPage={10} onChange={setPage} /></div>
      </div>
      <PaymentForm
        open={showForm} onClose={closeForm} onCreated={reload}
        createPayment={createPayment} updatePayment={updatePayment} editPayment={editingPayment}
      />
      <PaymentDetailModal open={!!viewingPayment} onClose={()=>setViewingPayment(null)} payment={viewingPayment} />
    </div>
  )
}
