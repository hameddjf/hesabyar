import { useTranslation } from 'react-i18next'
import {
  TrendingUp, FileText, Receipt, Users,
  ArrowUpRight, ArrowDownRight, Building2, ChevronLeft, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useDashboardData } from '@/hooks/useDashboardData'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const STATUS = {
  paid:    { label: 'پرداخت‌شده', cls: 'status-paid' },
  pending: { label: 'در انتظار',  cls: 'status-pending' },
  overdue: { label: 'سررسید گذشته', cls: 'status-overdue' },
  draft:   { label: 'پیش‌نویس',  cls: 'status-draft' },
}

/* ── تعریف باکس‌های قابل‌شخصی‌سازی این صفحه — همه به‌صورت پیش‌فرض روشنن (defaultVisible) ── */
const WIDGETS = [
  { id: 'stat-revenue',     title: 'کارت درآمد',            span: 1, defaultVisible: true },
  { id: 'stat-invoices',    title: 'کارت فاکتورهای باز',     span: 1, defaultVisible: true },
  { id: 'stat-expenses',    title: 'کارت هزینه‌ها',          span: 1, defaultVisible: true },
  { id: 'stat-clients',     title: 'کارت مشتریان فعال',      span: 1, defaultVisible: true },
  { id: 'revenue-chart',    title: 'نمودار درآمد و هزینه',   span: 2, defaultVisible: true },
  { id: 'recent-invoices',  title: 'فاکتورهای اخیر',         span: 2, defaultVisible: true },
]

function StatCard({ icon: Icon, label, value, change, up, note }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--t-accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--t-accent)',
        }}>
          <Icon size={17} />
        </div>
        {change != null && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 2,
          fontSize: 11, fontWeight: 500,
          color: up ? '#059669' : '#dc2626',
        }}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
        )}
      </div>
      <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--t-txt)', margin: '0 0 2px', direction: 'ltr', textAlign: 'right' }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: 0 }}>{label}</p>
      {note && <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: '2px 0 0' }}>{note}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--t-card-bg)', border: '1px solid var(--t-card-border)',
      borderRadius: 10, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ fontWeight: 500, color: 'var(--t-txt)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: 0 }}>
          {p.name === 'revenue' ? 'درآمد' : 'هزینه'}: {p.value}م
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { data, loading, isMock } = useDashboardData()

  if (loading || !data) {
    return <p style={{ fontSize:12, color:'var(--t-txt-muted)' }}>در حال بارگذاری...</p>
  }

  const { stats, monthly, recentInvoices, monthlyIsReal } = data

  const renderWidget = (id) => {
    switch (id) {
      case 'stat-revenue':
        return <StatCard icon={TrendingUp} label={t('dashboard.monthly_revenue')} value={stats.revenue.toLocaleString('fa-IR')} note={isMock ? undefined : 'مجموع فاکتورهای پرداخت‌شده'} />
      case 'stat-invoices':
        return <StatCard icon={FileText} label={t('dashboard.open_invoices')} value={stats.openInvoices.toLocaleString('fa-IR')} note={t('dashboard.overdue_count', { count: stats.overdueCount })} />
      case 'stat-expenses':
        return <StatCard icon={Receipt} label={t('dashboard.monthly_expenses')} value={stats.expenses.toLocaleString('fa-IR')} note={isMock ? undefined : 'مجموع هزینه‌های ثبت‌شده'} />
      case 'stat-clients':
        return <StatCard icon={Users} label={t('dashboard.active_clients')} value={stats.activeClients.toLocaleString('fa-IR')} note={stats.newClientsCount != null ? t('dashboard.new_clients', { count: stats.newClientsCount }) : undefined} />

      case 'revenue-chart':
        return (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>{t('dashboard.revenue_overview')}</h2>
                <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: '2px 0 0' }}>۶ ماه گذشته{monthlyIsReal ? '' : ' (نمونه)'}</p>
              </div>
              <button className="btn-ghost" style={{ fontSize: 12 }}>
                {t('common.view_report')} <ChevronLeft size={12} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={monthly} barGap={3} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-card-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--t-txt-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-accent-light)' }} />
                <Bar dataKey="revenue"  fill="var(--t-bar-main)" radius={[4,4,0,0]} name="revenue" />
                <Bar dataKey="expenses" fill="var(--t-bar-sub)"  radius={[4,4,0,0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[['var(--t-bar-main)','درآمد'],['var(--t-bar-sub)','هزینه']].map(([bg,lbl])=>(
                <span key={lbl} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--t-txt-muted)' }}>
                  <span style={{ width:10,height:10,borderRadius:2,background:bg,display:'inline-block' }} />
                  {lbl}
                </span>
              ))}
            </div>
          </div>
        )

      case 'recent-invoices':
        return (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>{t('dashboard.recent_invoices')}</h2>
              <button style={{ fontSize: 12, color: 'var(--t-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {t('common.view_all')}
              </button>
            </div>
            {!recentInvoices.length ? (
              <p style={{ fontSize:12, color:'var(--t-txt-muted)' }}>هنوز فاکتوری ثبت نشده.</p>
            ) : recentInvoices.map((inv) => {
              const s = STATUS[inv.status] || STATUS.draft
              return (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--t-card-border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--t-accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Building2 size={14} style={{ color: 'var(--t-accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt)', margin: 0 }}>{inv.client}</p>
                    <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: 0 }}>{inv.date}</p>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-txt)', margin: '0 0 2px', direction: 'ltr' }}>{inv.amount}</p>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isMock && (
        <div style={{
          display:'flex', alignItems:'center', gap:8, fontSize:12,
          background:'#fffbeb', color:'#92400e', borderRadius:8, padding:'10px 14px',
        }}>
          <AlertTriangle size={14}/> هنوز داده‌ی واقعی (فاکتور/مشتری) ثبت نشده — این اعداد فقط نمونه‌ن تا صفحه خالی به‌نظر نرسه.
        </div>
      )}

      <CustomizableGrid pageKey="dashboard" widgetDefs={WIDGETS} renderWidget={renderWidget} columns={4} />
    </div>
  )
}
