import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui'
import { Printer, Trash2, Link2, Building2, User, Calendar, AlertTriangle, Loader2, Edit2 } from 'lucide-react'
import { api } from '@/lib/apiClient'
import { isoToFaDisplay } from '@/lib/jalali'

const TYPE_META = {
  sale:    { label: 'فاکتور فروش',     color: '#1d4ed8', bg: '#eff6ff' },
  buy:     { label: 'فاکتور خرید',     color: '#15803d', bg: '#f0fdf4' },
  presale: { label: 'پیش‌فاکتور فروش', color: '#7e22ce', bg: '#fdf4ff' },
  prebuy:  { label: 'پیش‌فاکتور خرید', color: '#c2410c', bg: '#fff7ed' },
}
const STATUS_META = {
  draft:   { label: 'پیش‌نویس',        color: '#6b7280', bg: '#f3f4f6' },
  pending: { label: 'در انتظار پرداخت', color: '#d97706', bg: '#fffbeb' },
  paid:    { label: 'پرداخت‌شده',       color: '#059669', bg: '#f0fdf4' },
  overdue: { label: 'سررسید گذشته',    color: '#dc2626', bg: '#fef2f2' },
}

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR')

export default function InvoiceDetailModal({ invoice, company, onClose, onDelete, onEdit }) {
  const [balance, setBalance] = useState(null)
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!invoice) return
    setLoading(true)
    setError(null)
    Promise.all([api.invoices.balance(invoice.id), api.invoices.links(invoice.id)])
      .then(([b, l]) => { setBalance(b); setLinks(l) })
      .catch((e) => setError(e.message || 'خطا در دریافت جزئیات مالی فاکتور'))
      .finally(() => setLoading(false))
  }, [invoice])

  if (!invoice) return null

  let items = []
  try { items = JSON.parse(invoice.itemsJson || '[]') } catch { items = [] }

  const tm = TYPE_META[invoice.type] || TYPE_META.sale
  const sm = STATUS_META[invoice.status] || STATUS_META.draft

  const doDelete = async () => {
    if (!confirm(`فاکتور «${invoice.invoiceNumber || invoice.id}» حذف بشه؟ این عمل قابل بازگشت نیست.`)) return
    setDeleting(true)
    try { await onDelete(invoice.id); onClose() }
    catch (e) { setError(e.message || 'حذف ناموفق بود') }
    finally { setDeleting(false) }
  }

  const doPDF = async () => {
    setDownloading(true)
    // dynamic import عمداً: jsPDF حجیمه (~590KB) و این مودال توی چند صفحه‌ی پراستفاده mount می‌شه؛
    // قبلاً import ثابت بود یعنی این حجم برای هر کاربری بارگذاری می‌شد حتی اگه هیچ‌وقت PDF دانلود نکنه.
    try {
      const { downloadInvoicePDF } = await import('@/lib/invoicePdf')
      await downloadInvoicePDF(invoice, company, invoice.client)
    }
    finally { setDownloading(false) }
  }

  return (
    <Modal open={!!invoice} onClose={onClose} title={`جزئیات فاکتور ${invoice.invoiceNumber || ''}`} width={720}>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {/* هدر وضعیت */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:99, background:tm.bg, color:tm.color }}>{tm.label}</span>
          <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:99, background:sm.bg, color:sm.color }}>{sm.label}</span>
          {invoice._offline && <span style={{ fontSize:11, color:'#d97706' }}>در صف ارسال آفلاین</span>}
        </div>

        {/* اطلاعات کلی */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:'var(--t-search-bg)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <User size={12} style={{ color:'var(--t-txt-muted)' }}/>
              <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>طرف حساب</span>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--t-txt)', margin:0 }}>{invoice.client || '—'}</p>
          </div>
          <div style={{ background:'var(--t-search-bg)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Building2 size={12} style={{ color:'var(--t-txt-muted)' }}/>
              <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>شماره فاکتور</span>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--t-txt)', margin:0, direction:'ltr', textAlign:'left' }}>{invoice.invoiceNumber || '—'}</p>
          </div>
          <div style={{ background:'var(--t-search-bg)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Calendar size={12} style={{ color:'var(--t-txt-muted)' }}/>
              <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>تاریخ صدور</span>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--t-txt)', margin:0 }}>{isoToFaDisplay(invoice.issueDate)}</p>
          </div>
          <div style={{ background:'var(--t-search-bg)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Calendar size={12} style={{ color:'var(--t-txt-muted)' }}/>
              <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>تاریخ سررسید</span>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color: invoice.status==='overdue' ? '#dc2626' : 'var(--t-txt)', margin:0 }}>{isoToFaDisplay(invoice.dueDate)}</p>
          </div>
        </div>

        {/* اقلام */}
        <div>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--t-txt-muted)', marginBottom:8 }}>اقلام فاکتور</p>
          {items.length ? (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--t-search-bg)' }}>
                  {['شرح','تعداد','قیمت واحد','جمع'].map(h => (
                    <th key={h} style={{ padding:'7px 10px', textAlign: h==='شرح'?'right':'left', fontSize:10, fontWeight:500, color:'var(--t-txt-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                    <td style={{ padding:'7px 10px', color:'var(--t-txt)' }}>{it.desc}</td>
                    <td style={{ padding:'7px 10px', textAlign:'left', direction:'ltr', color:'var(--t-txt-muted)' }}>{fmt(it.qty)}</td>
                    <td style={{ padding:'7px 10px', textAlign:'left', direction:'ltr', color:'var(--t-txt-muted)' }}>{fmt(it.price)}</td>
                    <td style={{ padding:'7px 10px', textAlign:'left', direction:'ltr', fontWeight:600, color:'var(--t-txt)' }}>{fmt(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize:12, color:'var(--t-txt-muted)' }}>قلمی برای این فاکتور ثبت نشده (فاکتورهای قدیمی‌تر ممکنه اقلام جداگانه نداشته باشن).</p>
          )}
        </div>

        {/* خلاصه مالی */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:260 }}>
            {[
              ['جمع اقلام', fmt(invoice.totalAmount)],
              ['تخفیف', '- ' + fmt(invoice.discount)],
              ['مالیات', fmt(invoice.taxAmount)],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t-txt-muted)', padding:'3px 0' }}>
                <span>{l}</span><span style={{ direction:'ltr' }}>{v} ت</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1.5px solid var(--t-card-border)', marginTop:6, paddingTop:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--t-txt)' }}>مبلغ نهایی</span>
              <span style={{ fontSize:15, fontWeight:700, color:'var(--t-accent)', direction:'ltr' }}>{fmt(invoice.grandTotal)} ت</span>
            </div>
          </div>
        </div>

        {/* وضعیت پرداخت / مانده */}
        <div>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--t-txt-muted)', marginBottom:8 }}>وضعیت پرداخت</p>
          {loading ? (
            <p style={{ fontSize:12, color:'var(--t-txt-muted)', display:'flex', alignItems:'center', gap:6 }}><Loader2 size={13} className="spin"/> در حال محاسبه...</p>
          ) : error ? (
            <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'8px 12px' }}>
              <AlertTriangle size={13}/> {error}
            </div>
          ) : balance ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              <div style={{ background:'var(--t-search-bg)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--t-txt-muted)', margin:'0 0 4px' }}>پرداخت‌شده</p>
                <p style={{ fontSize:14, fontWeight:700, color:'#059669', margin:0, direction:'ltr' }}>{fmt(balance.paid)}</p>
              </div>
              <div style={{ background:'var(--t-search-bg)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--t-txt-muted)', margin:'0 0 4px' }}>مانده</p>
                <p style={{ fontSize:14, fontWeight:700, color: balance.balance > 0 ? '#dc2626' : '#059669', margin:0, direction:'ltr' }}>{fmt(balance.balance)}</p>
              </div>
              <div style={{ background:'var(--t-search-bg)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--t-txt-muted)', margin:'0 0 4px' }}>انتقال‌یافته</p>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--t-txt)', margin:0, direction:'ltr' }}>{fmt(balance.transferredOut - balance.transferredIn)}</p>
              </div>
            </div>
          ) : null}

          {links.length > 0 && (
            <div style={{ marginTop:10 }}>
              <p style={{ fontSize:11, color:'var(--t-txt-muted)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}><Link2 size={11}/> انتقال‌های بین‌فاکتوری</p>
              {links.map(l => (
                <div key={l.id} style={{ fontSize:11, color:'var(--t-txt-muted)', padding:'4px 0' }}>
                  {l.from_invoice_id === invoice.id ? 'ارسال به' : 'دریافت از'} {l.from_invoice_id === invoice.id ? l.to_invoice_id : l.from_invoice_id} — {fmt(l.amount)} ت
                </div>
              ))}
            </div>
          )}
        </div>

        {invoice.description && (
          <div style={{ borderTop:'0.5px solid var(--t-card-border)', paddingTop:12 }}>
            <p style={{ fontSize:11, color:'var(--t-txt-muted)', margin:0 }}>توضیحات: {invoice.description}</p>
          </div>
        )}

        {/* اکشن‌ها */}
        <div style={{ display:'flex', justifyContent:'space-between', gap:8, borderTop:'0.5px solid var(--t-card-border)', paddingTop:16 }}>
          <button onClick={doDelete} disabled={deleting} className="btn-secondary" style={{ color:'#dc2626' }}>
            <Trash2 size={14}/> {deleting ? 'در حال حذف...' : 'حذف فاکتور'}
          </button>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} className="btn-secondary">بستن</button>
            {onEdit && (
              <button onClick={() => { onEdit(invoice); onClose() }} className="btn-secondary">
                <Edit2 size={14}/> ویرایش
              </button>
            )}
            <button onClick={doPDF} disabled={downloading} className="btn-primary">
              <Printer size={14}/> {downloading ? 'در حال آماده‌سازی...' : 'دانلود PDF'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
