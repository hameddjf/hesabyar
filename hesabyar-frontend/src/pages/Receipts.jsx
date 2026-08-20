import { useState, useEffect } from 'react'
import { Wallet, ArrowDownRight, TrendingUp, Clock, Plus, Download, FileSpreadsheet, Eye, Edit2, Trash2, WifiOff } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Select, Pagination, EmptyState, Modal, FormField } from '@/components/ui'
import PartnerAccountSelect from '@/components/ui/PartnerAccountSelect'
import CheckFields from '@/components/ui/CheckFields'
import { useReceipts } from '@/hooks/useReceipts'
import { useClients } from '@/hooks/useClients'
import PersianDatePicker from '@/components/ui/PersianDatePicker'
import { todayISO, isoToFaDisplay } from '@/lib/jalali'
import { downloadCSV } from '@/lib/csv'
import { downloadXLSX } from '@/lib/xlsx'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const RECEIPT_STAT_WIDGETS = [
  { id: 'stat-total',     title: 'کارت دریافتی‌های ثبت‌شده', span: 1, defaultVisible: true },
  { id: 'stat-count',     title: 'کارت تعداد دریافتی‌ها',    span: 1, defaultVisible: true },
  { id: 'stat-pending',   title: 'کارت در انتظار وصول',      span: 1, defaultVisible: true },
  { id: 'stat-confirmed', title: 'کارت تأیید شده',           span: 1, defaultVisible: true },
]

const METHOD_META = {
  transfer:{ label:'انتقال بانکی', bg:'#eff6ff', color:'#1d4ed8' },
  check:   { label:'چک',           bg:'#fdf4ff', color:'#7e22ce' },
  cash:    { label:'نقدی',         bg:'#f0fdf4', color:'#15803d' },
  card:    { label:'کارت',         bg:'#fff7ed', color:'#c2410c' },
  pos:     { label:'دستگاه POS',   bg:'#ecfeff', color:'#0e7490' },
}
const STATUS_META = {
  confirmed:{ label:'تأیید شده', type:'green' },
  pending:  { label:'در انتظار', type:'amber' },
  returned: { label:'برگشتی',    type:'red'   },
  pending_sync: { label:'در صف ارسال (آفلاین)', type:'amber' },
}
const TABS = [
  { key:'all',label:'همه'},{key:'transfer',label:'انتقال بانکی'},
  { key:'check',label:'چک'},{key:'cash',label:'نقدی'},{key:'pos',label:'POS'},
]

function ReceiptForm({ open, onClose, onCreated, createReceipt, updateReceipt, editReceipt }) {
  const inp = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const isEdit = !!editReceipt
  const [partnerId,setPartnerId]       = useState('')
  const [partnerAccId,setPartnerAccId] = useState('')
  const [clientId,setClientId]         = useState('')
  const [method,setMethod]             = useState('')
  const [amount,setAmount]             = useState('')
  const [date,setDate]                 = useState(todayISO())
  const [reference,setReference]       = useState('')
  const [invoiceId,setInvoiceId]       = useState('')
  const [description,setDescription]   = useState('')
  const [checkData,setCheckData]       = useState({})
  const [submitting,setSubmitting]     = useState(false)
  const [submitError,setSubmitError]   = useState(null)
  const { clients } = useClients()
  const methodOpts = Object.entries(METHOD_META).map(([v,m])=>({value:v,label:m.label}))
  const clientOpts = clients.map(c=>({value:c.id,label:c.name}))

  // موقع باز شدن مودال در حالت ویرایش، فرم رو با دیتای همون دریافتی پر کن —
  // دقیقاً همون الگوی PaymentForm در Payments.jsx
  useEffect(() => {
    if (!open) return
    if (editReceipt) {
      setPartnerId(editReceipt.partnerId || '')
      setPartnerAccId(editReceipt.partnerAccount || '')
      setClientId(editReceipt.clientId || '')
      setMethod(editReceipt.method || '')
      setAmount(String(editReceipt.amountRaw ?? ''))
      setDate(editReceipt.date || todayISO())
      setReference(editReceipt.reference || '')
      setInvoiceId(editReceipt.invoiceId || '')
      setDescription(editReceipt.description || '')
      setCheckData({ number: editReceipt.checkNumber || '', date: editReceipt.checkDate || '', bank: editReceipt.checkBank || '' })
    } else {
      setPartnerId(''); setPartnerAccId(''); setClientId(''); setMethod('')
      setAmount(''); setDate(todayISO()); setReference(''); setInvoiceId('')
      setDescription(''); setCheckData({})
    }
    setSubmitError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editReceipt?.id])

  async function handleSubmit(){
    if(!amount || !date){
      setSubmitError('مبلغ و تاریخ الزامی هستن')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const payload = {
      date, amount: Number(amount), method: method || 'transfer',
      reference: reference || null, description: description || null,
      invoiceId: invoiceId || null, partnerId: partnerId || null,
      partnerAccount: partnerAccId || null, clientId: clientId || null,
      checkNumber: checkData.number || null, checkDate: checkData.date || null, checkBank: checkData.bank || null,
    }
    try{
      if (isEdit) {
        await updateReceipt(editReceipt.id, payload)
      } else {
        await createReceipt({ ...payload, status: 'confirmed' })
      }
      onCreated?.()
      onClose()
    }catch(err){
      setSubmitError(err.message || (isEdit ? 'ویرایش دریافتی ناموفق بود' : 'ثبت دریافتی ناموفق بود'))
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'ویرایش دریافتی' : 'ثبت دریافتی جدید'} width={540}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <PartnerAccountSelect mode="receipt"
          partnerId={partnerId}       onPartnerChange={p=>{setPartnerId(p);setPartnerAccId('')}}
          partnerAccId={partnerAccId} onPartnerAccChange={setPartnerAccId}
          required />

        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <FormField label="پرداخت‌کننده">
              <Select value={clientId} onChange={setClientId} options={clientOpts} placeholder="انتخاب کنید..." />
            </FormField>
            <FormField label="مبلغ (تومان)" required>
              <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inp} dir="ltr" />
            </FormField>
            <FormField label="روش دریافت">
              <Select value={method} onChange={setMethod} options={methodOpts} placeholder="انتخاب کنید..." />
            </FormField>
            <FormField label="تاریخ دریافت" required>
              <PersianDatePicker value={date} onChange={setDate} required />
            </FormField>
            {method !== 'check' && (
              <FormField label="شماره مرجع">
                <input value={reference} onChange={e=>setReference(e.target.value)} placeholder="شماره تراکنش..." style={inp} dir="ltr" />
              </FormField>
            )}
            <FormField label="فاکتور مرتبط">
              <input value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} placeholder="INV-XXXX" style={inp} dir="ltr" />
            </FormField>
          </div>
        </div>

        {method === 'check' && (
          <CheckFields data={checkData} onChange={setCheckData} />
        )}

        <FormField label="توضیحات">
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="توضیحات اختیاری..." rows={2} style={{...inp,resize:'none'}} />
        </FormField>
        {submitError && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{submitError}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ذخیره...' : (isEdit ? 'ذخیره تغییرات' : 'ثبت دریافتی')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** مودال read-only برای «مشاهده‌ی جزئیات» یک دریافتی — بدون فرم، فقط نمایش */
function ReceiptDetailModal({ open, onClose, receipt }) {
  if (!receipt) return null
  const mm = METHOD_META[receipt.method]
  const sm = STATUS_META[receipt.status]
  const row = (label, value) => (
    <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--t-card-border)',fontSize:12 }}>
      <span style={{ color:'var(--t-txt-muted)' }}>{label}</span>
      <span style={{ color:'var(--t-txt)',fontWeight:500 }}>{value}</span>
    </div>
  )
  return (
    <Modal open={open} onClose={onClose} title="جزئیات دریافتی" width={440}>
      <div style={{ display:'flex',flexDirection:'column' }}>
        {row('شناسه', receipt.id)}
        {row('شریک دریافت‌کننده', receipt.partner)}
        {row('کارت', receipt.partnerCard)}
        {row('پرداخت‌کننده', receipt.from)}
        {row('تاریخ', isoToFaDisplay(receipt.date))}
        {row('روش دریافت', mm?.label || '—')}
        {row('شماره مرجع', receipt.reference || receipt.ref || '—')}
        {row('مبلغ', `${receipt.amount} تومان`)}
        {row('وضعیت', sm?.label || '—')}
      </div>
    </Modal>
  )
}

export default function Receipts() {
  const { receipts, loading, isMock, reload, createReceipt, updateReceipt, removeReceipt } = useReceipts()
  const [tab,setTab]       = useState('all')
  const [search,setSearch] = useState('')
  const [page,setPage]     = useState(1)
  const [showForm,setShowForm] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState(null)
  const [viewingReceipt, setViewingReceipt] = useState(null)

  const openCreate = () => { setEditingReceipt(null); setShowForm(true) }
  const openEdit   = (r) => { setEditingReceipt(r); setShowForm(true) }
  const closeForm  = () => { setShowForm(false); setEditingReceipt(null) }

  const handleDelete = async (r) => {
    if (!confirm(`دریافتی «${r.id}» حذف بشه؟ این عمل قابل بازگشت نیست.`)) return
    try {
      await removeReceipt(r.id)
    } catch (e) {
      alert(e.message || 'حذف دریافتی ناموفق بود')
    }
  }

  const filtered = receipts.filter(r=>{
    if(tab!=='all'&&r.method!==tab) return false
    if(search&&!r.from.includes(search)&&!r.id.includes(search)&&!r.partner.includes(search)) return false
    return true
  })
  const totalAmount = receipts.reduce((s,r)=>s+(Number(String(r.amount).replace(/[^\d]/g,''))||0),0)

  const RECEIPTS_HEADERS = ['شناسه', 'شریک دریافت‌کننده', 'پرداخت‌کننده', 'تاریخ', 'روش', 'مبلغ (تومان)', 'وضعیت']
  const receiptsExportRows = () => filtered.map((r) => [r.id, r.partner, r.from, r.date, METHOD_META[r.method]?.label || r.method, Number(r.amountRaw ?? r.amount) || 0, STATUS_META[r.status]?.label || r.status])

  const handleExportCSV = () => {
    downloadCSV(`receipts-${todayISO()}.csv`, RECEIPTS_HEADERS, receiptsExportRows())
  }
  const handleExportXLSX = () => {
    downloadXLSX(`receipts-${todayISO()}.xlsx`, [{ name: 'دریافتی‌ها', headers: RECEIPTS_HEADERS, rows: receiptsExportRows() }])
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      {isMock && (
        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fffbeb',color:'#92400e',borderRadius:8,padding:'10px 14px' }}>
          <WifiOff size={14} />
          هنوز دریافتی واقعی ثبت نشده — این‌ها فقط نمونه‌ن.
        </div>
      )}
      <CustomizableGrid
        pageKey="receipts"
        widgetDefs={RECEIPT_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          switch (id) {
            case 'stat-total':     return <StatCard icon={Wallet}         label="دریافتی‌های ثبت‌شده" value={totalAmount.toLocaleString('fa-IR')} sub="تومان" />
            case 'stat-count':     return <StatCard icon={ArrowDownRight} label="تعداد دریافتی‌ها"    value={receipts.length.toLocaleString('fa-IR')} sub="مجموع" />
            case 'stat-pending':   return <StatCard icon={Clock}          label="در انتظار وصول"      value={receipts.filter(r=>r.status==='pending').length.toLocaleString('fa-IR')} sub="چک/دریافتی" />
            case 'stat-confirmed': return <StatCard icon={TrendingUp}     label="تأیید شده"           value={receipts.filter(r=>r.status==='confirmed').length.toLocaleString('fa-IR')} sub="دریافتی" subColor="#059669" />
            default: return null
          }
        }}
      />
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>دریافتی‌ها</h2>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>مبالغ دریافت‌شده توسط شرکا از مشتریان</p>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn-secondary" onClick={handleExportCSV}><Download size={14} /> CSV</button>
            <button className="btn-secondary" onClick={handleExportXLSX}><FileSpreadsheet size={14} /> Excel</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={14} /> دریافتی جدید</button>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:'0.5px solid var(--t-card-border)',flexWrap:'wrap' }}>
          <Tabs tabs={TABS} active={tab} onChange={t=>{setTab(t);setPage(1)}} />
          <div style={{ flex:1 }} />
          <SearchInput value={search} onChange={setSearch} placeholder="جستجو..." />
        </div>
        {loading ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)',padding:20 }}>در حال بارگذاری...</p>
        ) : filtered.length===0?<EmptyState icon={Wallet} title="دریافتی یافت نشد" />:(
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--t-search-bg)' }}>
                {['شناسه','شریک دریافت‌کننده','کارت','پرداخت‌کننده','تاریخ','روش','مبلغ','وضعیت',''].map(h=>(
                  <th key={h} style={{ padding:'9px 12px',textAlign:'right',fontSize:10,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r=>{
                const mm=METHOD_META[r.method]; const sm=STATUS_META[r.status]
                return (
                  <tr key={r.id} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)' }}>{r.id}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <div style={{ width:26,height:26,borderRadius:'50%',background:'#05966922',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#059669',flexShrink:0 }}>
                          {r.partner.split(' ').map(w=>w[0]).join('')}
                        </div>
                        <span style={{ fontSize:12,fontWeight:500,color:'var(--t-txt)' }}>{r.partner}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px',fontSize:10,color:'var(--t-txt-muted)',direction:'ltr',whiteSpace:'nowrap' }}>{r.partnerCard}</td>
                    <td style={{ padding:'10px 12px',fontSize:12,color:'var(--t-txt)' }}>{r.from}</td>
                    <td style={{ padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',whiteSpace:'nowrap' }}>{isoToFaDisplay(r.date)}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11,fontWeight:500,padding:'2px 7px',borderRadius:99,background:mm.bg,color:mm.color,whiteSpace:'nowrap' }}>{mm.label}</span></td>
                    <td style={{ padding:'10px 12px',fontSize:13,fontWeight:600,color:'#059669',direction:'ltr',textAlign:'right',whiteSpace:'nowrap' }}>+ {r.amount}</td>
                    <td style={{ padding:'10px 12px' }}><Badge type={sm.type}>{sm.label}</Badge></td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex',gap:2 }}>
                        <button className="icon-btn" aria-label="مشاهده جزئیات" style={{ width:26,height:26 }} onClick={()=>setViewingReceipt(r)}><Eye size={13}/></button>
                        <button className="icon-btn" aria-label="ویرایش" style={{ width:26,height:26 }} onClick={()=>openEdit(r)}><Edit2 size={13}/></button>
                        <button className="icon-btn" aria-label="حذف" style={{ width:26,height:26 }} onClick={()=>handleDelete(r)}><Trash2 size={13}/></button>
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
      <ReceiptForm
        open={showForm} onClose={closeForm} onCreated={reload}
        createReceipt={createReceipt} updateReceipt={updateReceipt} editReceipt={editingReceipt}
      />
      <ReceiptDetailModal open={!!viewingReceipt} onClose={()=>setViewingReceipt(null)} receipt={viewingReceipt} />
    </div>
  )
}
