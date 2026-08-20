import { useState, useEffect, useCallback } from 'react'
import {
  Users, PieChart, DollarSign, TrendingUp, Plus, Edit2, Trash2,
  ArrowDownCircle, ArrowUpCircle, Sparkles, WifiOff, CreditCard, ChevronLeft,
  FileDown, Printer,
} from 'lucide-react'
import { StatCard, Modal, FormField, Badge, EmptyState } from '@/components/ui'
import PersianDatePicker from '@/components/ui/PersianDatePicker'
import { usePartners, usePartnerLedger } from '@/hooks/usePartners'
import { useCompany } from '@/hooks/useCompany'
import { formatToman } from '@/lib/format'
import { isoToFaDisplay, todayISO } from '@/lib/jalali'
import { downloadPartnerLedgerPDF, printPartnerLedger } from '@/lib/partnerLedgerPdf'

const inputStyle = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
const COLORS = ['var(--t-accent)','#059669','#7c3aed','#d97706','#0891b2']

const TX_META = {
  capital_in:    { label: 'آورده‌ی نقدی',  type: 'green',  sign: '+' },
  capital_out:   { label: 'برداشت',         type: 'red',    sign: '−' },
  profit_share:  { label: 'سهم سود',        type: 'blue',   sign: '+' },
  adjustment:    { label: 'اصلاحیه',        type: 'amber',  sign: '+' },
}

/* ── فرم افزودن/ویرایش شریک (شناسنامه) ── */
function PartnerForm({ open, onClose, partner, onSubmit }) {
  const [name, setName]         = useState('')
  const [role, setRole]         = useState('')
  const [share, setShare]       = useState('')
  const [phone, setPhone]       = useState('')
  const [joinDate, setJoinDate] = useState(todayISO())
  const [capital, setCapital]   = useState('')
  const [bank, setBank]         = useState('')
  const [card, setCard]         = useState('')
  const [iban, setIban]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!open) return
    setName(partner?.name || '')
    setRole(partner?.role || '')
    setShare(partner?.share ?? '')
    setPhone(partner?.phone || '')
    setJoinDate(partner?.joinDate || todayISO())
    setCapital(partner?.capital ?? '')
    setBank(partner?.accounts?.[0]?.bank || '')
    setCard(partner?.accounts?.[0]?.card || '')
    setIban(partner?.accounts?.[0]?.iban || '')
    setError(null)
  }, [open, partner])

  async function handleSubmit() {
    if (!name || !role || share === '' || !phone || !joinDate) {
      setError('همه‌ی فیلدهای ستاره‌دار الزامی هستن')
      return
    }
    if (Number(share) < 0 || Number(share) > 100) {
      setError('درصد سهم باید بین ۰ تا ۱۰۰ باشد')
      return
    }
    setSubmitting(true); setError(null)
    try {
      const accounts = (bank || card || iban) ? [{ id: partner?.accounts?.[0]?.id || 'acc1', bank, card, iban, label: 'کارت اصلی' }] : []
      await onSubmit({ name, role, share: Number(share), phone, join_date: joinDate, capital: Number(capital) || 0, accounts })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={partner ? 'ویرایش شریک' : 'افزودن شریک جدید'} width={560}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <FormField label="نام و نام‌خانوادگی" required>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="سمت (مدیرعامل، سهام‌دار و ...)" required>
            <input value={role} onChange={e=>setRole(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="درصد سهم مالکیت" required>
            <input value={share} onChange={e=>setShare(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="شماره موبایل" required>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="۰۹۱۲xxxxxxx" style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="تاریخ ورود به شراکت" required>
            <PersianDatePicker value={joinDate} onChange={setJoinDate} required />
          </FormField>
          <FormField label="سرمایه‌ی اولیه (تومان)">
            <input value={capital} onChange={e=>setCapital(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
          </FormField>
        </div>
        <p style={{ fontSize:11, color:'var(--t-txt-muted)', margin:0 }}>
          سرمایه‌ی اولیه فقط هنگام ساخت شریک قابل تنظیمه؛ آورده/برداشت‌های بعدی از طریق دفتر حساب شریک ثبت می‌شن.
        </p>
        <div style={{ borderTop:'0.5px solid var(--t-card-border)',paddingTop:14 }}>
          <p style={{ fontSize:12,fontWeight:500,color:'var(--t-txt-muted)',marginBottom:10 }}>حساب بانکی (برای واریز سود)</p>
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
            <Plus size={14} /> {submitting ? 'در حال ثبت...' : (partner ? 'ذخیره' : 'افزودن')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── فرم ثبت رویداد دستی دفتر (آورده/برداشت/اصلاحیه) ── */
function TransactionForm({ open, onClose, partner, defaultType, onSubmit }) {
  const [type, setType]   = useState('capital_in')
  const [amount, setAmount] = useState('')
  const [date, setDate]   = useState(todayISO())
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setType(defaultType || 'capital_in'); setAmount(''); setDate(todayISO()); setDescription(''); setError(null)
  }, [open, defaultType])

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0 || !date) {
      setError('مبلغ و تاریخ الزامی هستن')
      return
    }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ type, amount: Number(amount), date, description: description || null })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`ثبت رویداد جدید — ${partner?.name || ''}`} width={480}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <FormField label="نوع رویداد" required>
          <select value={type} onChange={e=>setType(e.target.value)} style={inputStyle}>
            <option value="capital_in">آورده‌ی نقدی (افزایش سرمایه)</option>
            <option value="capital_out">برداشت</option>
            <option value="adjustment">اصلاحیه (مثلاً سرمایه‌ی کشف‌نشده در حسابرسی)</option>
          </select>
        </FormField>
        <FormField label="مبلغ (تومان)" required>
          <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
        </FormField>
        <FormField label="تاریخ" required>
          <PersianDatePicker value={date} onChange={setDate} required />
        </FormField>
        <FormField label="توضیحات">
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="اختیاری" style={inputStyle} />
        </FormField>
        {error && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{error}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'در حال ثبت...' : 'ثبت رویداد'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── ویزارد تقسیم سود بین همه‌ی شرکا ── */
function DistributeProfitWizard({ open, onClose, partners, shareSum, onSubmit }) {
  const [totalAmount, setTotalAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setTotalAmount(''); setDate(todayISO()); setDescription(''); setError(null)
  }, [open])

  const preview = partners
    .filter(p => p.share > 0)
    .map(p => ({ ...p, amount: totalAmount ? Math.round(Number(totalAmount) * p.share / 100) : 0 }))

  async function handleSubmit() {
    if (!totalAmount || Number(totalAmount) <= 0) { setError('مبلغ کل سود باید عدد مثبت باشد'); return }
    if (Math.abs(shareSum - 100) > 0.5) { setError(`مجموع سهم شرکا الان ${shareSum}٪ است، نه ۱۰۰٪ — قبل از تقسیم سود اصلاح کنید`); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ totalAmount: Number(totalAmount), date, description: description || 'تقسیم سود' })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تقسیم سود بین شرکا" width={540}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0,display:'flex',alignItems:'center',gap:6 }}>
          <Sparkles size={13} style={{ color:'var(--t-accent)' }} />
          مبلغ کل سود به‌نسبت درصد سهم هر شریک، خودکار محاسبه و برای همه ثبت می‌شه.
        </p>
        <FormField label="مبلغ کل سود قابل تقسیم (تومان)" required>
          <input value={totalAmount} onChange={e=>setTotalAmount(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
        </FormField>
        <FormField label="تاریخ" required>
          <PersianDatePicker value={date} onChange={setDate} required />
        </FormField>
        <FormField label="توضیحات">
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="مثلاً سود سه‌ماهه‌ی دوم ۱۴۰۴" style={inputStyle} />
        </FormField>

        {totalAmount > 0 && (
          <div style={{ border:'0.5px solid var(--t-card-border)',borderRadius:8,overflow:'hidden' }}>
            {preview.map(p => (
              <div key={p.partnerId} style={{ display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:'0.5px solid var(--t-card-border)',fontSize:12 }}>
                <span style={{ color:'var(--t-txt)' }}>{p.name} ({p.share}٪)</span>
                <span style={{ fontWeight:600,color:'var(--t-txt)',direction:'ltr' }}>{formatToman(p.amount)} ت</span>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{error}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'در حال تقسیم...' : 'تقسیم سود'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── صفحه‌ی جزئیات یک شریک: تاریخچه‌ی کامل دفتر حسابش ── */
function PartnerDetail({ partner, onBack, ledger, refreshKey }) {
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance] = useState(partner.capital)
  const [loading, setLoading] = useState(true)
  const [showTxForm, setShowTxForm] = useState(false)
  const [txType, setTxType] = useState('capital_in')
  const [exporting, setExporting] = useState(false)
  const { company } = useCompany()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ledger.fetchTransactions(partner.id)
      setTransactions(res.transactions || [])
      setBalance(res.balance)
    } catch {
      setTransactions([]); setBalance(partner.capital)
    } finally {
      setLoading(false)
    }
  }, [partner.id, partner.capital, ledger])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleAddTx(payload) {
    await ledger.addTransaction(partner.id, payload)
    await load()
  }
  async function handleDeleteTx(tx) {
    if (tx.distribution_batch) {
      alert('این ردیف بخشی از یک تقسیم سود گروهیه — از تاریخچه‌ی تقسیم سود لغو بشه')
      return
    }
    if (!confirm('این ردیف از دفتر حساب شریک حذف بشه؟')) return
    await ledger.removeTransaction(partner.id, tx.id)
    await load()
  }

  async function handlePrint() {
    printPartnerLedger(partner, transactions, balance, company)
  }
  async function handleDownloadPDF() {
    setExporting(true)
    try {
      await downloadPartnerLedgerPDF(partner, transactions, balance, company)
    } finally {
      setExporting(false)
    }
  }

  const mainAccount = partner.accounts?.[0]

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <button onClick={onBack} className="btn-secondary" style={{ alignSelf:'flex-start' }}>
        <ChevronLeft size={14} /> بازگشت به لیست شرکا
      </button>

      <div className="card" style={{ display:'flex',alignItems:'center',gap:16 }}>
        <div style={{ width:52,height:52,borderRadius:14,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--t-accent)',flexShrink:0 }}>
          {partner.name.slice(0,1)}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:16,fontWeight:600,color:'var(--t-txt)',margin:'0 0 2px' }}>{partner.name}</p>
          <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>{partner.role} · {partner.share}٪ سهام · عضویت از {isoToFaDisplay(partner.joinDate)}</p>
          {mainAccount?.card && (
            <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:'4px 0 0',display:'flex',alignItems:'center',gap:4 }}>
              <CreditCard size={11} /> <span dir="ltr">{mainAccount.card}</span> · بانک {mainAccount.bank}
            </p>
          )}
        </div>
        <div style={{ textAlign:'left' }}>
          <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:'0 0 2px' }}>موجودی فعلی حساب</p>
          <p style={{ fontSize:20,fontWeight:700,color:'var(--t-accent)',margin:0,direction:'ltr' }}>{formatToman(balance)} ت</p>
        </div>
      </div>

      <div style={{ display:'flex',gap:8 }}>
        <button className="btn-secondary" onClick={()=>{setTxType('capital_in');setShowTxForm(true)}}>
          <ArrowDownCircle size={14} /> ثبت آورده
        </button>
        <button className="btn-secondary" onClick={()=>{setTxType('capital_out');setShowTxForm(true)}}>
          <ArrowUpCircle size={14} /> ثبت برداشت
        </button>
        <button className="btn-secondary" onClick={()=>{setTxType('adjustment');setShowTxForm(true)}}>
          اصلاحیه
        </button>
        <div style={{ flex:1 }} />
        <button className="btn-secondary" onClick={handlePrint} disabled={loading} title="چاپ دفتر حساب">
          <Printer size={14} /> چاپ
        </button>
        <button className="btn-secondary" onClick={handleDownloadPDF} disabled={loading || exporting} title="دانلود PDF دفتر حساب">
          <FileDown size={14} /> {exporting ? 'در حال ساخت PDF...' : 'دانلود PDF'}
        </button>
      </div>

      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)' }}>
          <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>تاریخچه‌ی دفتر حساب</h2>
        </div>
        {loading ? (
          <div style={{ padding:24,textAlign:'center',fontSize:12,color:'var(--t-txt-muted)' }}>در حال بارگذاری...</div>
        ) : !transactions.length ? (
          <EmptyState icon={DollarSign} title="هنوز رویدادی ثبت نشده" desc="آورده، برداشت یا سهم سود این شریک اینجا نمایش داده می‌شه" />
        ) : (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                <th style={{ textAlign:'right',padding:'10px 20px',fontSize:11,color:'var(--t-txt-muted)',fontWeight:500 }}>تاریخ</th>
                <th style={{ textAlign:'right',padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',fontWeight:500 }}>نوع</th>
                <th style={{ textAlign:'right',padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',fontWeight:500 }}>توضیحات</th>
                <th style={{ textAlign:'left',padding:'10px 12px',fontSize:11,color:'var(--t-txt-muted)',fontWeight:500 }}>مبلغ</th>
                <th style={{ width:40 }} />
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const meta = TX_META[tx.type]
                return (
                  <tr key={tx.id} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                    <td style={{ padding:'10px 20px',color:'var(--t-txt-muted)' }}>{isoToFaDisplay(tx.date)}</td>
                    <td style={{ padding:'10px 12px' }}><Badge type={meta.type}>{meta.label}</Badge></td>
                    <td style={{ padding:'10px 12px',color:'var(--t-txt-muted)' }}>{tx.description || '—'}</td>
                    <td style={{ padding:'10px 12px',textAlign:'left',fontWeight:600,color:'var(--t-txt)',direction:'ltr' }}>
                      {meta.sign}{formatToman(tx.amount)} ت
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <button className="icon-btn" style={{ width:26,height:26 }} onClick={()=>handleDeleteTx(tx)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <TransactionForm open={showTxForm} onClose={()=>setShowTxForm(false)} partner={partner} defaultType={txType} onSubmit={handleAddTx} />
    </div>
  )
}

/* ── صفحه‌ی اصلی شرکا ── */
export default function Partners() {
  const { partners, isMock: partnersIsMock, createPartner, updatePartner, removePartner } = usePartners()
  const ledger = usePartnerLedger()
  const [showForm, setShowForm] = useState(false)
  const [editPartner, setEditPartner] = useState(null)
  const [showDistribute, setShowDistribute] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // موجودی هر شریک از دفتر حساب واقعیه (نه فقط capital اولیه)، پس این رو با partners شناسنامه‌ای ادغام می‌کنیم
  const balanceByPartnerId = Object.fromEntries(ledger.balances.map(b => [b.partnerId, b.balance]))
  const totalEquity = ledger.isMock ? partners.reduce((s,p)=>s+p.capital,0) : ledger.totalEquity
  const shareSum = ledger.isMock ? partners.reduce((s,p)=>s+p.share,0) : ledger.shareSum

  async function handleFormSubmit(payload) {
    if (editPartner) await updatePartner(editPartner.id, payload)
    else await createPartner(payload)
    setRefreshKey(k => k + 1)
    await ledger.reload()
  }
  async function handleDelete(partner) {
    if (!confirm(`شریک «${partner.name}» حذف بشه؟ تاریخچه‌ی دفتر حساب این شریک هم غیرقابل‌دسترس می‌شه.`)) return
    await removePartner(partner.id)
    await ledger.reload()
  }
  async function handleDistribute(payload) {
    await ledger.distributeProfit(payload)
    setRefreshKey(k => k + 1)
  }

  const selectedPartner = selectedPartnerId ? partners.find(p => p.id === selectedPartnerId) : null
  if (selectedPartner) {
    return <PartnerDetail partner={selectedPartner} onBack={()=>setSelectedPartnerId(null)} ledger={ledger} refreshKey={refreshKey} />
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      {(partnersIsMock || ledger.isMock) && (
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:'#fef3c7',color:'#92400e',fontSize:12 }}>
          <WifiOff size={14} />
          اتصال به سرور برقرار نشد یا هنوز دیتای واقعی ثبت نشده — نمونه‌ی نمایشی نشون داده میشه.
        </div>
      )}

      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:16,fontWeight:600,color:'var(--t-txt)',margin:0 }}>شرکا و سهام‌داران</h1>
          <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>حساب سرمایه‌ی هر شریک، آورده/برداشت و تقسیم سود</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn-secondary" onClick={()=>setShowDistribute(true)} disabled={!partners.length}>
            <Sparkles size={14} /> تقسیم سود
          </button>
          <button className="btn-primary" onClick={()=>{setEditPartner(null);setShowForm(true)}}>
            <Plus size={14} /> شریک جدید
          </button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14 }}>
        <StatCard icon={Users}      label="تعداد شرکا"    value={partners.length.toString()} />
        <StatCard icon={DollarSign} label="کل حقوق صاحبان سهام" value={`${(totalEquity/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان — از دفتر حساب" />
        <StatCard icon={PieChart}   label="سهام ثبت‌شده"  value={`${shareSum}٪`} sub={Math.abs(shareSum-100) > 0.5 ? 'باید ۱۰۰٪ بشه' : 'تکمیل'} subColor={Math.abs(shareSum-100) > 0.5 ? '#dc2626' : undefined} />
        <StatCard icon={TrendingUp} label="سرمایه‌ی اولیه‌ی ثبت‌شده" value={`${(partners.reduce((s,p)=>s+p.capital,0)/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان" />
      </div>

      {/* ترکیب مالکیت */}
      {partners.length > 0 && (
        <div className="card" style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>ترکیب مالکیت</h2>
          <div style={{ display:'flex',alignItems:'center',gap:24,flexWrap:'wrap' }}>
            <svg width={140} height={140} viewBox="0 0 140 140" aria-label="نمودار دایره‌ای سهام شرکا">
              {(() => {
                let offset = 0
                return partners.map((p,i)=>{
                  const pct = p.share / 100
                  const r = 55, cx = 70, cy = 70
                  const circ = 2 * Math.PI * r
                  const dash = pct * circ
                  const rotate = -90 + (offset * 360)
                  offset += pct
                  return (
                    <circle key={p.id} cx={cx} cy={cy} r={r}
                      fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={20}
                      strokeDasharray={`${dash} ${circ}`}
                      transform={`rotate(${rotate} ${cx} ${cy})`}
                      style={{ transition:'stroke-dasharray .3s' }}
                    />
                  )
                })
              })()}
              <circle cx={70} cy={70} r={45} fill="var(--t-card-bg)" />
              <text x={70} y={66} textAnchor="middle" style={{ fontSize:14,fontWeight:600,fill:'var(--t-txt)' }}>{shareSum}٪</text>
              <text x={70} y={82} textAnchor="middle" style={{ fontSize:10,fill:'var(--t-txt-muted)' }}>سهام</text>
            </svg>
            <div style={{ display:'flex',flexDirection:'column',gap:10,flex:1,minWidth:180 }}>
              {partners.map((p,i)=>(
                <div key={p.id} style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ width:10,height:10,borderRadius:'50%',background:COLORS[i % COLORS.length],flexShrink:0,display:'inline-block' }} />
                  <span style={{ fontSize:13,color:'var(--t-txt)',flex:1 }}>{p.name}</span>
                  <span style={{ fontSize:13,fontWeight:600,color:'var(--t-txt)' }}>{p.share}٪</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* لیست شرکا */}
      {!partners.length ? (
        <EmptyState icon={Users} title="هنوز شریکی ثبت نشده" desc="با دکمه‌ی «شریک جدید» اولین شریک رو اضافه کن" />
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {partners.map((p,i)=>{
            const balance = balanceByPartnerId[p.id] ?? p.capital
            const mainAccount = p.accounts?.[0]
            return (
              <div key={p.id} className="card" style={{ display:'flex',alignItems:'center',gap:16, cursor:'pointer' }}
                onClick={()=>setSelectedPartnerId(p.id)}>
                <div style={{ width:44,height:44,borderRadius:12,background:COLORS[i % COLORS.length]+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:COLORS[i % COLORS.length],flexShrink:0 }}>
                  {p.name.slice(0,1)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:'0 0 2px' }}>{p.name}</p>
                  <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>{p.role} · عضویت از {isoToFaDisplay(p.joinDate)}</p>
                </div>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize:18,fontWeight:700,color:COLORS[i % COLORS.length],margin:'0 0 2px' }}>{p.share}٪</p>
                  <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>سهام</p>
                </div>
                <div style={{ textAlign:'left',minWidth:130 }}>
                  <p style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:'0 0 2px',direction:'ltr' }}>{formatToman(balance)}</p>
                  <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>موجودی حساب (تومان)</p>
                </div>
                {mainAccount?.card && (
                  <div>
                    <div style={{ fontSize:11,color:'var(--t-txt-muted)',display:'flex',alignItems:'center',gap:4 }}>
                      <CreditCard size={11} style={{ color:'var(--t-accent)' }} />
                      <span dir="ltr">{mainAccount.card}</span>
                    </div>
                    <div style={{ fontSize:11,color:'var(--t-txt-muted)',marginTop:2 }}>بانک {mainAccount.bank}</div>
                  </div>
                )}
                <div style={{ display:'flex',gap:4 }} onClick={e=>e.stopPropagation()}>
                  <button className="icon-btn" aria-label="ویرایش" style={{ width:28,height:28 }} onClick={()=>{setEditPartner(p);setShowForm(true)}}><Edit2 size={14}/></button>
                  <button className="icon-btn" aria-label="حذف" style={{ width:28,height:28 }} onClick={()=>handleDelete(p)}><Trash2 size={14}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PartnerForm open={showForm} onClose={()=>setShowForm(false)} partner={editPartner} onSubmit={handleFormSubmit} />
      <DistributeProfitWizard open={showDistribute} onClose={()=>setShowDistribute(false)} partners={ledger.balances.length ? ledger.balances : partners.map(p=>({partnerId:p.id,name:p.name,share:p.share}))} shareSum={shareSum} onSubmit={handleDistribute} />
    </div>
  )
}
