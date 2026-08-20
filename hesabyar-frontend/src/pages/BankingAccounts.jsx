import { useState } from 'react'
import { Landmark, Plus, CreditCard, ArrowUpRight, ArrowDownRight, Edit2, Trash2, WifiOff } from 'lucide-react'
import { Modal, FormField, StatCard } from '@/components/ui'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { usePayments } from '@/hooks/usePayments'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const BANK_STAT_WIDGETS = [
  { id: 'stat-balance',  title: 'کارت کل موجودی شرکت', span: 1, defaultVisible: true },
  { id: 'stat-receipts', title: 'کارت دریافتی‌ها',      span: 1, defaultVisible: true },
  { id: 'stat-payments', title: 'کارت پرداختی‌ها',      span: 1, defaultVisible: true },
]

const BANKS = ['ملت','صادرات','ملی','پارسیان','آینده','رسالت','سپه','تجارت','رفاه','سامان','پاسارگاد']

function AccountCard({ acc, onEdit, onDelete }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:'var(--t-accent-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--t-accent)' }}>
            <Landmark size={18} />
          </div>
          <div>
            <p style={{ fontSize:13,fontWeight:600,color:'var(--t-txt)',margin:0 }}>{acc.label}</p>
            <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>بانک {acc.bank}</p>
          </div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          <button className="icon-btn" aria-label="ویرایش" onClick={() => onEdit(acc)}><Edit2 size={14} /></button>
          <button className="icon-btn" aria-label="حذف" onClick={() => onDelete(acc.id)}><Trash2 size={14} /></button>
        </div>
      </div>
      <div style={{ background:'var(--t-search-bg)',borderRadius:8,padding:'12px 14px' }}>
        <p style={{ fontSize:22,fontWeight:700,color:'var(--t-txt)',margin:'0 0 4px',direction:'ltr',textAlign:'right' }}>
          {acc.balance.toLocaleString('fa-IR')} <span style={{ fontSize:13,fontWeight:400,color:'var(--t-txt-muted)' }}>تومان</span>
        </p>
        <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:0 }}>موجودی فعلی</p>
      </div>
      {acc.card && (
        <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <CreditCard size={13} style={{ color:'var(--t-txt-muted)' }} />
            <span style={{ fontSize:12,color:'var(--t-txt-muted)' }}>شماره کارت</span>
            <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)',direction:'ltr',letterSpacing:1 }}>{acc.card}</span>
          </div>
          {acc.iban && <div style={{ fontSize:11,color:'var(--t-txt-muted)',direction:'ltr',paddingRight:19 }}>IBAN: {acc.iban}</div>}
        </div>
      )}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,borderTop:'0.5px solid var(--t-card-border)',paddingTop:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12 }}>
          <ArrowDownRight size={14} style={{ color:'#059669' }} />
          <span style={{ color:'var(--t-txt-muted)' }}>دریافتی ماه:</span>
          <span style={{ color:'#059669',fontWeight:500 }}>۸۵م</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12 }}>
          <ArrowUpRight size={14} style={{ color:'#dc2626' }} />
          <span style={{ color:'var(--t-txt-muted)' }}>پرداختی ماه:</span>
          <span style={{ color:'#dc2626',fontWeight:500 }}>۴۲م</span>
        </div>
      </div>
    </div>
  )
}

function AccountForm({ open, onClose, account, onSubmit }) {
  const inputStyle = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }
  const [label, setLabel]     = useState(account?.label || '')
  const [bank, setBank]       = useState(account?.bank || '')
  const [balance, setBalance] = useState(account?.balance ?? '')
  const [card, setCard]       = useState(account?.card || '')
  const [iban, setIban]       = useState(account?.iban || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit() {
    if (!label || !bank) { setError('نام حساب و بانک الزامی هستن'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ label, bank, balance: Number(balance) || 0, card: card || null, iban: iban || null })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? 'ویرایش حساب بانکی' : 'افزودن حساب بانکی'} width={460}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <FormField label="نام حساب / برچسب" required>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="مثلاً: حساب جاری اصلی" style={inputStyle} />
        </FormField>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <FormField label="نام بانک" required>
            <select value={bank} onChange={e=>setBank(e.target.value)} style={inputStyle}>
              <option value="">انتخاب...</option>
              {BANKS.map((b)=><option key={b} value={b}>{b}</option>)}
            </select>
          </FormField>
          <FormField label="موجودی اولیه (تومان)">
            <input value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0" style={inputStyle} dir="ltr" />
          </FormField>
        </div>
        <FormField label="شماره کارت">
          <input value={card} onChange={e=>setCard(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" style={inputStyle} dir="ltr" />
        </FormField>
        <FormField label="شماره شبا (IBAN)">
          <input value={iban} onChange={e=>setIban(e.target.value)} placeholder="IR000000000000000000000000" style={inputStyle} dir="ltr" />
        </FormField>
        {error && <p style={{ fontSize:12,color:'#dc2626',margin:0 }}>{error}</p>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ثبت...' : (account ? 'ذخیره' : 'افزودن')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function BankingAccounts() {
  const { accounts, isMock, createAccount, updateAccount, removeAccount } = useBankAccounts()
  const { payments } = usePayments()
  const [showForm, setShowForm] = useState(false)
  const [editAcc,  setEditAcc]  = useState(null)
  const total = accounts.reduce((s,a)=>s+(a.balance||0),0)

  async function handleSubmit(payload) {
    if (editAcc) await updateAccount(editAcc.id, payload)
    else await createAccount(payload)
  }
  async function handleDelete(id) {
    if (!confirm('این حساب حذف بشه؟')) return
    await removeAccount(id)
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
        pageKey="banking-accounts"
        widgetDefs={BANK_STAT_WIDGETS}
        columns={3}
        renderWidget={(id) => {
          const receiptsTotal = payments.filter(p=>p.transactionType==='receipt').reduce((s,p)=>s+(Number(String(p.amount).replace(/[^\d]/g,''))||0),0)
          const paymentsTotal = payments.filter(p=>p.transactionType==='payment'||p.transactionType==='expense').reduce((s,p)=>s+(Number(String(p.amount).replace(/[^\d]/g,''))||0),0)
          switch (id) {
            case 'stat-balance':  return <StatCard icon={Landmark}       label="کل موجودی شرکت" value={`${(total/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان" />
            case 'stat-receipts': return <StatCard icon={ArrowDownRight} label="دریافتی‌ها"      value={`${(receiptsTotal/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان، تجمعی" subColor="#059669" />
            case 'stat-payments': return <StatCard icon={ArrowUpRight}   label="پرداختی‌ها"      value={`${(paymentsTotal/1_000_000).toLocaleString('fa-IR')}م`} sub="تومان، تجمعی" subColor="#dc2626" />
            default: return null
          }
        }}
      />
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0 }}>حساب‌های بانکی شرکت</h2>
          <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>مدیریت حساب‌ها، کارت‌ها و شبا</p>
        </div>
        <button className="btn-primary" onClick={()=>{setEditAcc(null);setShowForm(true)}}><Plus size={14} /> افزودن حساب</button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16 }}>
        {accounts.map((acc)=>(
          <AccountCard key={acc.id} acc={acc} onEdit={(a)=>{setEditAcc(a);setShowForm(true)}} onDelete={handleDelete} />
        ))}
      </div>
      <AccountForm open={showForm} onClose={()=>setShowForm(false)} account={editAcc} onSubmit={handleSubmit} />
    </div>
  )
}
