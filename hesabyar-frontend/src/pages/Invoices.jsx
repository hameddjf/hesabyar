import { useState } from 'react'
import { FileText, Clock, CheckCircle, AlertCircle, Plus, Download, Eye, Edit2, Printer, WifiOff } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Select, Pagination, EmptyState } from '@/components/ui'
import InvoiceForm from '@/components/ui/InvoiceForm'
import InvoiceDetailModal from '@/components/ui/InvoiceDetailModal'
import CustomizableGrid from '@/components/ui/CustomizableGrid'
import { useInvoices } from '@/hooks/useInvoices'
import { useCompany } from '@/hooks/useCompany'
import { isoToFaDisplay } from '@/lib/jalali'

const STAT_WIDGETS = [
  { id: 'stat-total',   title: 'کارت کل فاکتورها',       span: 1, defaultVisible: true },
  { id: 'stat-paid',    title: 'کارت پرداخت‌شده',        span: 1, defaultVisible: true },
  { id: 'stat-pending', title: 'کارت در انتظار پرداخت',  span: 1, defaultVisible: true },
  { id: 'stat-overdue', title: 'کارت سررسید گذشته',      span: 1, defaultVisible: true },
]

const TYPE_META = {
  sale:    { label: 'فروش',     bg: '#eff6ff', color: '#1d4ed8' },
  buy:     { label: 'خرید',     bg: '#f0fdf4', color: '#15803d' },
  presale: { label: 'پیش‌فروش', bg: '#fdf4ff', color: '#7e22ce' },
  prebuy:  { label: 'پیش‌خرید', bg: '#fff7ed', color: '#c2410c' },
}

const STATUS_META = {
  paid:    { label: 'پرداخت‌شده',   type: 'green' },
  pending: { label: 'در انتظار',     type: 'amber' },
  overdue: { label: 'سررسید گذشته', type: 'red'   },
  draft:   { label: 'پیش‌نویس',     type: 'gray'  },
  pending_sync: { label: 'در صف ارسال (آفلاین)', type: 'amber' },
}

const TABS_BASE = [
  { key: 'all',     label: 'همه' },
  { key: 'sale',    label: 'فروش' },
  { key: 'buy',     label: 'خرید' },
  { key: 'presale', label: 'پیش‌فروش' },
  { key: 'prebuy',  label: 'پیش‌خرید' },
]

const STATUS_OPTS = [
  { value: 'paid',    label: 'پرداخت‌شده' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'overdue', label: 'سررسید گذشته' },
  { value: 'draft',   label: 'پیش‌نویس' },
]

export default function Invoices() {
  const { invoices, loading, isMock, reload, createInvoice, removeInvoice, updateInvoice } = useInvoices()
  const { company } = useCompany()
  const [downloadingId, setDownloadingId] = useState(null)
  const [detailInvoice, setDetailInvoice] = useState(null)
  const [editInvoice, setEditInvoice] = useState(null)
  const [tab, setTab]       = useState('all')
  const TABS = TABS_BASE.map(t => ({
    ...t,
    count: t.key === 'all' ? invoices.length : invoices.filter(i => i.type === t.key).length,
  }))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  const [showForm, setShowForm] = useState(false)

  const filtered = invoices.filter((inv) => {
    if (tab !== 'all' && inv.type !== tab) return false
    if (status && inv.status !== status) return false
    if (search && !inv.client.includes(search) && !inv.id.includes(search)) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {isMock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: 12 }}>
          <WifiOff size={14} />
          اتصال به سرور برقرار نشد یا هنوز دیتای واقعی ثبت نشده — نمونه‌ی نمایشی نشون داده میشه.
        </div>
      )}

      {/* Stats */}
      <CustomizableGrid
        pageKey="invoices"
        widgetDefs={STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          const paidCount    = invoices.filter(i => i.status === 'paid').length
          const pendingCount = invoices.filter(i => i.status === 'pending').length
          const overdueCount = invoices.filter(i => i.status === 'overdue').length
          const toFa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
          switch (id) {
            case 'stat-total':   return <StatCard icon={FileText}    label="کل فاکتورها"       value={loading ? '...' : toFa(invoices.length)} />
            case 'stat-paid':    return <StatCard icon={CheckCircle} label="پرداخت‌شده"        value={toFa(paidCount)} sub={`${toFa(paidCount)} مورد`} subColor="#059669" />
            case 'stat-pending': return <StatCard icon={Clock}       label="در انتظار پرداخت"  value={toFa(pendingCount)} sub={`${toFa(pendingCount)} مورد`} />
            case 'stat-overdue': return <StatCard icon={AlertCircle} label="سررسید گذشته"      value={toFa(overdueCount)} sub={overdueCount ? 'نیاز به پیگیری' : 'موردی نیست'} subColor="#dc2626" />
            default: return null
          }
        }}
      />

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--t-card-border)' }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>فاکتورها</h2>
            <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: '2px 0 0' }}>مدیریت و پیگیری تمام فاکتورها</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary"><Download size={14} /> خروجی Excel</button>
            <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> فاکتور جدید</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '0.5px solid var(--t-card-border)', flexWrap: 'wrap' }}>
          <Tabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setPage(1) }} />
          <div style={{ flex: 1 }} />
          <SearchInput value={search} onChange={setSearch} placeholder="جستجوی فاکتور، مشتری..." />
          <Select value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="وضعیت" />
        </div>

        {/* Table */}
        <div style={{ padding: '0 4px' }}>
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="فاکتوری یافت نشد" desc="معیار جستجو را تغییر دهید" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--t-search-bg)' }}>
                  {['شماره / نوع', 'مشتری', 'تاریخ صدور', 'سررسید', 'مبلغ', 'وضعیت', ''].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'var(--t-txt-muted)', borderBottom: '0.5px solid var(--t-card-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const tm = TYPE_META[inv.type]
                  const sm = STATUS_META[inv.status]
                  return (
                    <tr key={inv.id} style={{ borderBottom: '0.5px solid var(--t-card-border)', transition: 'background .1s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--t-search-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t-txt)', margin: '0 0 3px' }}>{inv.id}</p>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--t-txt)' }}>{inv.client}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--t-txt-muted)' }}>{isoToFaDisplay(inv.issueDate)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: inv.status === 'overdue' ? '#dc2626' : 'var(--t-txt-muted)' }}>{isoToFaDisplay(inv.dueDate)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--t-txt)', direction: 'ltr', textAlign: 'right' }}>{inv.amount}</td>
                      <td style={{ padding: '12px 14px' }}><Badge type={sm.type}>{sm.label}</Badge></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button className="icon-btn" aria-label="مشاهده جزئیات" style={{ width: 28, height: 28 }} onClick={() => setDetailInvoice(inv)}><Eye size={14} /></button>
                          <button className="icon-btn" aria-label="ویرایش" style={{ width: 28, height: 28 }} onClick={() => setEditInvoice(inv)}><Edit2 size={14} /></button>
                          <button
                            className="icon-btn" style={{ width: 28, height: 28 }}
                            title="دانلود PDF"
                            disabled={downloadingId === inv.id}
                            onClick={async () => {
                              setDownloadingId(inv.id)
                              // dynamic import: همون دلیل InvoiceDetailModal.jsx — jsPDF فقط وقتی
                              // واقعاً لازمه بارگذاری بشه، نه توی باندل اولیه‌ی صفحه‌ی فاکتورها
                              try {
                                const { downloadInvoicePDF } = await import('@/lib/invoicePdf')
                                await downloadInvoicePDF(inv, company, inv.client)
                              }
                              finally { setDownloadingId(null) }
                            }}
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 20px' }}>
          <Pagination page={page} total={invoices.length} perPage={10} onChange={setPage} />
        </div>
      </div>

      <InvoiceForm
        open={showForm || !!editInvoice}
        invoiceNumber={isMock ? '' : `INV-${String(invoices.length + 1).padStart(4, '0')}`}
        editInvoice={editInvoice}
        onSubmit={editInvoice ? (payload) => updateInvoice(editInvoice.id, payload) : createInvoice}
        onClose={() => { setShowForm(false); setEditInvoice(null); reload() }}
      />
      <InvoiceDetailModal
        invoice={detailInvoice}
        company={company}
        onClose={() => setDetailInvoice(null)}
        onDelete={async (id) => { await removeInvoice(id) }}
        onEdit={(inv) => setEditInvoice(inv)}
      />
    </div>
  )
}
