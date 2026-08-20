import { useState, useEffect } from 'react'
import { Plus, Trash2, Send, Save, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { FormField, Select, Modal } from '@/components/ui'
import PersianDatePicker from '@/components/ui/PersianDatePicker'
import { useClients } from '@/hooks/useClients'
import { todayISO, addDaysISO } from '@/lib/jalali'

const INVOICE_TYPES = [
  { key: 'sale',    label: 'فروش',     color: '#1d4ed8', bg: '#eff6ff' },
  { key: 'buy',     label: 'خرید',     color: '#15803d', bg: '#f0fdf4' },
  { key: 'presale', label: 'پیش‌فروش', color: '#7e22ce', bg: '#fdf4ff' },
  { key: 'prebuy',  label: 'پیش‌خرید', color: '#c2410c', bg: '#fff7ed' },
]

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'نقدی' },
  { value: 'check',    label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
  { value: 'card',     label: 'کارت' },
]

const emptyItem = () => ({ id: Date.now() + Math.random(), desc: '', qty: 1, price: '', total: 0 })

export default function InvoiceForm({ open, onClose, onSubmit, invoiceNumber = '', editInvoice = null }) {
  const { clients } = useClients()
  const clientOpts = clients.map(c => ({ value: c.id, label: c.name }))
  const isEdit = !!editInvoice

  const parseEditItems = () => {
    if (!editInvoice) return [emptyItem()]
    try {
      const arr = JSON.parse(editInvoice.itemsJson || '[]')
      return arr.length ? arr.map(it => ({ ...it, id: Date.now() + Math.random() })) : [emptyItem()]
    } catch { return [emptyItem()] }
  }

  const [type, setType] = useState(editInvoice?.type || 'sale')
  const [client, setClient] = useState(editInvoice?.clientId || '')
  const [issueDate, setIssueDate] = useState(editInvoice?.issueDate || todayISO())
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate || addDaysISO(todayISO(), 30))
  const [note, setNote] = useState(editInvoice?.description || '')
  const [discount, setDiscount] = useState(editInvoice?.discount || '')
  const computeEditTaxPct = () => {
    if (!editInvoice) return '10'
    const base = (Number(editInvoice.totalAmount) || 0) - (Number(editInvoice.discount) || 0)
    if (base <= 0) return '10'
    const pct = Math.round((Number(editInvoice.taxAmount) || 0) / base * 100)
    return String(Math.min(100, Math.max(0, pct)))
  }
  const [tax, setTax] = useState(computeEditTaxPct())
  const [payMethod, setPayMethod] = useState('')
  const [items, setItems] = useState(parseEditItems())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // چون این کامپوننت remount نمی‌شه (فقط open toggle می‌شه)، هر بار که باز می‌شه
  // باید state رو دوباره از روی editInvoice (یا خالی، برای فاکتور جدید) sync کنیم
  useEffect(() => {
    if (!open) return
    setType(editInvoice?.type || 'sale')
    setClient(editInvoice?.clientId || '')
    setIssueDate(editInvoice?.issueDate || todayISO())
    setDueDate(editInvoice?.dueDate || addDaysISO(todayISO(), 30))
    setNote(editInvoice?.description || '')
    setDiscount(editInvoice?.discount || '')
    setTax(computeEditTaxPct())
    setPayMethod('')
    setItems(parseEditItems())
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editInvoice?.id])

  const updateItem = (id, field, val) => {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it
      const updated = { ...it, [field]: val }
      updated.total = (Number(updated.qty) || 0) * (Number(updated.price) || 0)
      return updated
    }))
  }

  const removeItem = (id) => setItems((p) => p.filter((it) => it.id !== id))
  const addItem = () => setItems((p) => [...p, emptyItem()])

  const subtotal = items.reduce((s, it) => s + it.total, 0)
  const discountAmt = Number(discount) || 0
  const taxAmt = ((subtotal - discountAmt) * (Number(tax) || 0)) / 100
  const grandTotal = subtotal - discountAmt + taxAmt

  const fmt = (n) => n.toLocaleString('fa-IR')

  const resetForm = () => {
    setType('sale'); setClient(''); setIssueDate(todayISO()); setDueDate(addDaysISO(todayISO(), 30))
    setNote(''); setDiscount(''); setTax('10'); setPayMethod(''); setItems([emptyItem()])
  }

  const submit = async (status) => {
    setErr(null)
    if (!client) { setErr('انتخاب طرف حساب الزامی است'); return }
    if (!items.some(it => it.desc && it.total > 0)) { setErr('حداقل یک قلم با شرح و مبلغ معتبر لازم است'); return }

    setSaving(true)
    try {
      const payload = {
        invoiceNumber: invoiceNumber || editInvoice?.invoiceNumber || undefined,
        type, clientId: client, issueDate, dueDate,
        totalAmount: subtotal, discount: discountAmt, taxAmount: Math.round(taxAmt), grandTotal: Math.round(grandTotal),
        status, description: note, source: 'hesabyar',
        itemsJson: JSON.stringify(items.filter(it => it.desc).map(({ desc, qty, price, total }) => ({ desc, qty, price, total }))),
      }
      const res = await onSubmit(payload)
      resetForm()
      onClose(res)
    } catch (e) {
      setErr(e.message || 'خطا در ثبت فاکتور')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
    borderRadius: 7, padding: '7px 10px', fontSize: 12,
    color: 'var(--t-txt)', fontFamily: 'inherit', outline: 'none', width: '100%',
  }

  return (
    <Modal open={open} onClose={() => onClose()} title={isEdit ? `ویرایش فاکتور ${editInvoice.invoiceNumber || ''}` : `فاکتور جدید${invoiceNumber ? ' · ' + invoiceNumber : ''}`} width={780}>
      {/* Type selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--t-txt-muted)', flexShrink: 0 }}>نوع فاکتور:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {INVOICE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: type === t.key ? t.bg : 'var(--t-search-bg)',
                color: type === t.key ? t.color : 'var(--t-txt-muted)',
                outline: type === t.key ? `1.5px solid ${t.color}40` : 'none',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="طرف حساب / مشتری" required>
            <Select value={client} onChange={setClient} options={clientOpts} placeholder={clients.length ? 'انتخاب کنید...' : 'ابتدا یک مشتری ثبت کنید'} />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="تاریخ صدور" required>
              <PersianDatePicker value={issueDate} onChange={setIssueDate} required />
            </FormField>
            <FormField label="تاریخ سررسید">
              <PersianDatePicker value={dueDate} onChange={setDueDate} />
            </FormField>
          </div>

          <FormField label="توضیحات">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="توضیحات اختیاری..."
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </FormField>

          {/* Items */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)', marginBottom: 8 }}>اقلام فاکتور</p>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr .8fr 1fr 1fr .3fr',
              gap: 6, padding: '5px 8px',
              background: 'var(--t-search-bg)', borderRadius: 6, marginBottom: 4,
            }}>
              {['شرح', 'تعداد', 'قیمت واحد', 'جمع', ''].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 500, color: 'var(--t-txt-muted)' }}>{h}</span>
              ))}
            </div>
            {items.map((it) => (
              <div key={it.id} style={{
                display: 'grid', gridTemplateColumns: '2fr .8fr 1fr 1fr .3fr',
                gap: 6, marginBottom: 5, alignItems: 'center',
              }}>
                <input value={it.desc} onChange={(e) => updateItem(it.id, 'desc', e.target.value)} placeholder="شرح کالا / خدمت" style={inputStyle} />
                <input value={it.qty}  onChange={(e) => updateItem(it.id, 'qty',  e.target.value)} type="number" min="1" style={inputStyle} />
                <input value={it.price} onChange={(e) => updateItem(it.id, 'price', e.target.value)} placeholder="0" style={inputStyle} />
                <input value={it.total ? fmt(it.total) : ''} readOnly style={{ ...inputStyle, background: 'var(--t-accent-light)', color: 'var(--t-accent)', fontWeight: 500 }} />
                <button onClick={() => removeItem(it.id)} disabled={items.length === 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, opacity: items.length === 1 ? .3 : 1 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={addItem} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              width: '100%', padding: '7px 0', borderRadius: 6, marginTop: 4,
              border: '0.5px dashed var(--t-card-border)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: 'var(--t-txt-muted)', fontFamily: 'inherit',
            }}>
              <Plus size={13} /> افزودن ردیف
            </button>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary */}
          <div style={{ background: 'var(--t-search-bg)', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)', marginBottom: 12 }}>خلاصه مالی</p>
            {[
              ['جمع اقلام', fmt(subtotal) + ' ت', 'var(--t-txt)'],
              ['تخفیف', '- ' + fmt(discountAmt) + ' ت', '#059669'],
              ['مالیات ' + tax + '٪', fmt(Math.round(taxAmt)) + ' ت', '#d97706'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t-txt-muted)', marginBottom: 8 }}>
                <span>{l}</span>
                <span style={{ color: c, direction: 'ltr', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid var(--t-card-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-txt)' }}>مبلغ قابل پرداخت</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-accent)', direction: 'ltr' }}>{fmt(Math.round(grandTotal))} ت</span>
            </div>
          </div>

          <FormField label="روش پرداخت">
            <Select value={payMethod} onChange={setPayMethod} options={PAYMENT_METHODS} placeholder="انتخاب کنید..." />
          </FormField>
          <FormField label="تخفیف (تومان)">
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" style={inputStyle} />
          </FormField>
          <FormField label="مالیات بر ارزش افزوده (%)">
            <input value={tax} onChange={(e) => setTax(e.target.value)} style={inputStyle} />
          </FormField>
        </div>
      </div>

      {err && (
        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px',marginTop:14 }}>
          <AlertTriangle size={14}/> {err}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, marginTop: 16, borderTop: '0.5px solid var(--t-card-border)' }}>
        <button onClick={() => onClose()} className="btn-secondary" disabled={saving}>انصراف</button>
        {isEdit ? (
          <button onClick={() => submit(editInvoice.status)} className="btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        ) : (
          <>
            <button onClick={() => submit('draft')} className="btn-secondary" disabled={saving}><Save size={14} /> ذخیره پیش‌نویس</button>
            <button onClick={() => submit('pending')} className="btn-primary" disabled={saving}>
              <Send size={14} /> {saving ? 'در حال ثبت...' : 'صدور فاکتور'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
