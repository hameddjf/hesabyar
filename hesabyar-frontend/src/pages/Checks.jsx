import { useState, useMemo } from 'react'
import {
  Landmark, Plus, Edit2, Trash2, ArrowRightLeft, History, Banknote,
} from 'lucide-react'
import { Modal, FormField, StatCard, DataTable, Tabs, Badge, EmptyState } from '@/components/ui'
import ApiErrorPanel from '@/components/errors/ApiErrorPanel'
import { useChecks, useCheckSummary, CHECK_STATUS_META, CHECK_NEXT_STATUSES } from '@/hooks/useChecks'
import { useClients } from '@/hooks/useClients'
import CustomizableGrid from '@/components/ui/CustomizableGrid'
import { api } from '@/lib/apiClient'

const BANKS = ['ملت', 'صادرات', 'ملی', 'پارسیان', 'آینده', 'رسالت', 'سپه', 'تجارت', 'رفاه', 'سامان', 'پاسارگاد', 'اقتصادنوین']

const inputStyle = {
  background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
  borderRadius: 7, padding: '8px 10px', fontSize: 12,
  color: 'var(--t-txt)', fontFamily: 'inherit', outline: 'none', width: '100%',
}

const STAT_WIDGETS = [
  { id: 'stat-received-open', title: 'کارت چک‌های دریافتنی در جریان', span: 1, defaultVisible: true },
  { id: 'stat-issued-open',   title: 'کارت چک‌های پرداختنی در جریان', span: 1, defaultVisible: true },
  { id: 'stat-bounced',       title: 'کارت چک‌های برگشتی',           span: 1, defaultVisible: true },
]

function money(n) {
  return `${Number(n || 0).toLocaleString('fa-IR')} تومان`
}

/* ── فرم افزودن/ویرایش چک (فقط اطلاعات پایه؛ تغییر وضعیت جای جدایی داره) ── */
function CheckForm({ open, onClose, check, clients, onSubmit }) {
  const [direction, setDirection]     = useState(check?.direction || 'received')
  const [checkNumber, setCheckNumber] = useState(check?.checkNumber || '')
  const [sayadId, setSayadId]         = useState(check?.sayadId || '')
  const [bankName, setBankName]       = useState(check?.bankName || '')
  const [branch, setBranch]           = useState(check?.branch || '')
  const [amount, setAmount]           = useState(check?.amount ?? '')
  const [issueDate, setIssueDate]     = useState(check?.issueDate || '')
  const [dueDate, setDueDate]         = useState(check?.dueDate || '')
  const [partyName, setPartyName]     = useState(check?.partyName || '')
  const [clientId, setClientId]       = useState(check?.clientId || '')
  const [description, setDescription] = useState(check?.description || '')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError('مبلغ چک باید عدد مثبت باشد'); return }
    if (!dueDate) { setError('تاریخ سررسید الزامی است'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({
        direction, checkNumber: checkNumber || null, sayadId: sayadId || null,
        bankName: bankName || null, branch: branch || null, amount: Number(amount),
        issueDate: issueDate || null, dueDate, partyName: partyName || null,
        clientId: clientId || null, description: description || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'ثبت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={check ? 'ویرایش چک' : 'ثبت چک جدید'} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!check && (
          <FormField label="نوع چک" required>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['received', 'دریافتنی (از مشتری)'], ['issued', 'پرداختنی (به تأمین‌کننده)']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setDirection(v)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                    border: direction === v ? '1.5px solid var(--t-accent)' : '0.5px solid var(--t-card-border)',
                    background: direction === v ? 'var(--t-accent-light)' : 'var(--t-search-bg)',
                    color: direction === v ? 'var(--t-accent)' : 'var(--t-txt)', fontWeight: 500,
                  }}>{l}</button>
              ))}
            </div>
          </FormField>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="شماره چک">
            <input value={checkNumber} onChange={e => setCheckNumber(e.target.value)} style={inputStyle} dir="ltr" placeholder="مثلاً ۱۲۳۴۵۶" />
          </FormField>
          <FormField label="شناسه صیادی">
            <input value={sayadId} onChange={e => setSayadId(e.target.value)} style={inputStyle} dir="ltr" placeholder="۱۶ رقمی" maxLength={20} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="بانک">
            <select value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle}>
              <option value="">انتخاب بانک...</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </FormField>
          <FormField label="شعبه">
            <input value={branch} onChange={e => setBranch(e.target.value)} style={inputStyle} placeholder="نام یا کد شعبه" />
          </FormField>
        </div>
        <FormField label="مبلغ (تومان)" required>
          <input value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} dir="ltr" placeholder="0" inputMode="numeric" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ صدور">
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="تاریخ سررسید" required>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          </FormField>
        </div>
        <FormField label={direction === 'received' ? 'پرداخت‌کننده (نام روی چک)' : 'در وجه چه کسی'}>
          <input value={partyName} onChange={e => setPartyName(e.target.value)} style={inputStyle} placeholder="نام شخص یا شرکت" />
        </FormField>
        <FormField label="اتصال به مشتری (اختیاری)">
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
            <option value="">بدون اتصال</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="توضیحات">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </FormField>
        {error && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'در حال ثبت...' : (check ? 'ذخیره' : 'ثبت چک')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── تغییر وضعیت چک ── */
function StatusChangeModal({ open, onClose, check, onSubmit }) {
  const nextOptions = check ? (CHECK_NEXT_STATUSES[check.status] || []) : []
  const [status, setStatus] = useState(nextOptions[0] || '')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!check) return null

  async function handleSubmit() {
    if (!status) { setError('یک وضعیت انتخاب کنید'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit(check.id, status, note)
      onClose()
    } catch (err) {
      setError(err.message || 'تغییر وضعیت ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`تغییر وضعیت چک ${check.checkNumber || ''}`} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: 0 }}>
          وضعیت فعلی: <Badge type={CHECK_STATUS_META[check.status]?.color}>{CHECK_STATUS_META[check.status]?.label}</Badge>
        </p>
        {nextOptions.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>این چک در وضعیت نهایی است و دیگر قابل تغییر نیست.</p>
        ) : (
          <>
            <FormField label="وضعیت جدید" required>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nextOptions.map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    style={{
                      textAlign: 'right', padding: '8px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                      border: status === s ? '1.5px solid var(--t-accent)' : '0.5px solid var(--t-card-border)',
                      background: status === s ? 'var(--t-accent-light)' : 'var(--t-search-bg)',
                      color: 'var(--t-txt)', fontWeight: 500,
                    }}>{CHECK_STATUS_META[s]?.label}</button>
                ))}
              </div>
            </FormField>
            <FormField label="یادداشت (اختیاری)">
              <input value={note} onChange={e => setNote(e.target.value)} style={inputStyle} placeholder="مثلاً: بردیم بانک ملت شعبه مرکزی" />
            </FormField>
            {error && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'در حال ثبت...' : 'ثبت تغییر وضعیت'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/* ── تاریخچه‌ی چک ── */
function HistoryModal({ open, onClose, check }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useMemo(() => {
    if (!open || !check) return
    setLoading(true)
    api.checks.history(check.id).then(setHistory).finally(() => setLoading(false))
  }, [open, check])

  return (
    <Modal open={open} onClose={onClose} title={`تاریخچه‌ی چک ${check?.checkNumber || ''}`} width={440}>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>در حال بارگذاری...</p>
      ) : history.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>تاریخچه‌ای یافت نشد.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((h) => (
            <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10, borderBottom: '0.5px solid var(--t-card-border)' }}>
              <History size={14} style={{ color: 'var(--t-accent)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt)', margin: 0 }}>
                  {h.from_status ? `${CHECK_STATUS_META[h.from_status]?.label} ← ` : ''}{CHECK_STATUS_META[h.to_status]?.label}
                </p>
                {h.note && <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: '2px 0' }}>{h.note}</p>}
                <p style={{ fontSize: 10, color: 'var(--t-txt-muted)', margin: 0 }}>{h.user_name} — {h.created_at}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Checks() {
  const [direction, setDirection] = useState('received')
  const { checks, loading, error, createCheck, updateCheck, removeCheck, changeStatus, reload } = useChecks()
  const { summary } = useCheckSummary()
  const { clients } = useClients()

  const [showForm, setShowForm] = useState(false)
  const [editCheck, setEditCheck] = useState(null)
  const [statusCheck, setStatusCheck] = useState(null)
  const [historyCheck, setHistoryCheck] = useState(null)

  const filtered = checks.filter(c => c.direction === direction)

  async function handleSubmit(payload) {
    if (editCheck) await updateCheck(editCheck.id, payload)
    else await createCheck(payload)
  }
  async function handleDelete(id) {
    if (!confirm('این چک حذف بشه؟ این کار قابل بازگشت نیست.')) return
    await removeCheck(id)
  }

  const columns = [
    { key: 'checkNumber', label: 'شماره چک', render: (v) => v || '—' },
    { key: 'bankName', label: 'بانک', render: (v) => v || '—' },
    { key: 'partyName', label: direction === 'received' ? 'پرداخت‌کننده' : 'در وجه', render: (v) => v || '—' },
    { key: 'amount', label: 'مبلغ', render: (v) => money(v) },
    { key: 'dueDate', label: 'سررسید', render: (v) => v || '—' },
    {
      key: 'status', label: 'وضعیت',
      render: (v) => <Badge type={CHECK_STATUS_META[v]?.color}>{CHECK_STATUS_META[v]?.label || v}</Badge>,
    },
    {
      key: 'actions', label: '', width: 140,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {(CHECK_NEXT_STATUSES[row.status] || []).length > 0 && (
            <button className="icon-btn" title="تغییر وضعیت" onClick={(e) => { e.stopPropagation(); setStatusCheck(row) }}>
              <ArrowRightLeft size={14} />
            </button>
          )}
          <button className="icon-btn" title="تاریخچه" aria-label="تاریخچه" onClick={(e) => { e.stopPropagation(); setHistoryCheck(row) }}>
            <History size={14} />
          </button>
          <button className="icon-btn" title="ویرایش" aria-label="ویرایش" onClick={(e) => { e.stopPropagation(); setEditCheck(row); setShowForm(true) }}>
            <Edit2 size={14} />
          </button>
          <button className="icon-btn" title="حذف" aria-label="حذف" onClick={(e) => { e.stopPropagation(); handleDelete(row.id) }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <ApiErrorPanel error={error} onRetry={reload} />}

      <CustomizableGrid
        pageKey="checks"
        widgetDefs={STAT_WIDGETS}
        columns={3}
        renderWidget={(id) => {
          if (!summary) return null
          switch (id) {
            case 'stat-received-open':
              return <StatCard icon={Landmark} label="چک‌های دریافتنی در جریان" value={money(summary.received.totalOpenAmount)} sub={`${summary.received.in_hand + summary.received.deposited + summary.received.passed_on} فقره`} />
            case 'stat-issued-open':
              return <StatCard icon={Banknote} label="چک‌های پرداختنی در جریان" value={money(summary.issued.totalOpenAmount)} sub={`${summary.issued.in_hand + summary.issued.deposited + summary.issued.passed_on} فقره`} />
            case 'stat-bounced':
              return <StatCard icon={ArrowRightLeft} label="چک‌های برگشتی" value={`${summary.received.bounced + summary.issued.bounced}`} sub="فقره، نیاز به پیگیری" subColor="#dc2626" />
            default: return null
          }
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>مدیریت دسته چک</h2>
          <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: '2px 0 0' }}>چک‌های دریافتنی و پرداختنی و پیگیری وضعیت وصول</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tabs
            tabs={[
              { key: 'received', label: 'دریافتنی', count: checks.filter(c => c.direction === 'received').length },
              { key: 'issued', label: 'پرداختنی', count: checks.filter(c => c.direction === 'issued').length },
            ]}
            active={direction}
            onChange={setDirection}
          />
          <button className="btn-primary" onClick={() => { setEditCheck(null); setShowForm(true) }}>
            <Plus size={14} /> ثبت چک جدید
          </button>
        </div>
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="هنوز چکی ثبت نشده"
          desc="چک‌های دریافتنی و پرداختنی خود را اینجا ثبت و پیگیری کنید."
          action={<button className="btn-primary" onClick={() => { setEditCheck(null); setShowForm(true) }}><Plus size={14} /> ثبت چک جدید</button>}
        />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <CheckForm
        open={showForm}
        onClose={() => setShowForm(false)}
        check={editCheck}
        clients={clients}
        onSubmit={handleSubmit}
      />
      <StatusChangeModal
        open={!!statusCheck}
        onClose={() => setStatusCheck(null)}
        check={statusCheck}
        onSubmit={changeStatus}
      />
      <HistoryModal
        open={!!historyCheck}
        onClose={() => setHistoryCheck(null)}
        check={historyCheck}
      />
    </div>
  )
}
