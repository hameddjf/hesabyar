import { useState } from 'react'
import {
  Building2, Users, CreditCard, TrendingUp,
  ArrowUpRight, ArrowDownRight, Activity, Database,
  AlertCircle, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

/* PERSIAN_MONTHS و توابع بازه‌بندی شمسی برای محاسبه‌ی رشد واقعی از created_at شرکت‌ها */
import { isoToJalali, todayJalali, PERSIAN_MONTHS } from '@/lib/jalali'

function last6JalaliMonthKeys() {
  const { jy, jm } = todayJalali()
  const keys = []
  let y = jy, m = jm
  for (let i = 0; i < 6; i++) {
    keys.unshift(`${y}-${m}`)
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return keys
}

/** کلید شمسی "jy-jm" رو به عدد قابل‌مقایسه (jy*12+jm) تبدیل می‌کنه */
const monthKeyToOrdinal = (key) => {
  const [jy, jm] = key.split('-').map(Number)
  return jy * 12 + jm
}

/**
 * رشد واقعی پلتفرم از روی companies.created_at (که برخلاف تاریخ فاکتورها،
 * یک timestamp واقعی SQL هست نه متن آزاد — پس اینجا محدودیت فرمت تاریخ صدق نمی‌کنه).
 * تجمعی حساب می‌شه (تعداد کل شرکت/کاربر/درآمد تا پایان هر ماه شمسی).
 */
function buildGrowthFromCompanies(companies) {
  const monthKeys = last6JalaliMonthKeys()

  const withOrdinal = companies.map(c => {
    const d = new Date(String(c.joined || '').replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return null
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const j = isoToJalali(iso)
    return { ...c, _ordinal: j.jy * 12 + j.jm }
  }).filter(Boolean)

  return monthKeys.map((key) => {
    const cutoff = monthKeyToOrdinal(key)
    const upToHere = withOrdinal.filter(c => c._ordinal <= cutoff)
    const [, jm] = key.split('-').map(Number)
    return {
      month: PERSIAN_MONTHS[jm-1],
      companies: upToHere.length,
      users: upToHere.reduce((s,c)=>s+(c.users||0),0),
      revenue: upToHere.reduce((s,c)=>s+(c.revenue||0),0),
    }
  })
}

const PLAN_COLORS = { Pro: '#c4b5fd', Basic: '#93c5fd', Free: '#64748b' }
const PLAN_BG     = { Pro: '#1e0a3d', Basic: '#0c1a3d', Free: '#1a1a26' }
const STATUS_CLS  = { active: 'admin-badge-green', trial: 'admin-badge-amber', suspended: 'admin-badge-red' }
const STATUS_LBL  = { active: 'فعال', trial: 'آزمایشی', suspended: 'تعلیق' }

/* ── Tooltip سفارشی ── */
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const names = { companies: 'شرکت', users: 'کاربر', revenue: 'درآمد(م)' }
  return (
    <div style={{ background: 'var(--admin-surface)', border: '0.5px solid var(--admin-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--admin-muted)', marginBottom: 5 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {names[p.name] || p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, change, up, color, sub }) {
  return (
    <div className="admin-stat">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: (color || '#6366f1') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color: color || 'var(--admin-accent)' }} />
        </div>
        {change !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, color: up ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--admin-txt)', margin: '0 0 2px', direction: 'ltr', textAlign: 'right' }}>{value}</p>
        <p style={{ fontSize: 12, color: 'var(--admin-muted)', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--admin-muted)', margin: '3px 0 0', opacity: .7 }}>{sub}</p>}
      </div>
    </div>
  )
}

function fmtRelative(iso) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'همین الان'
  if (diffMin < 60) return `${diffMin} دقیقه پیش`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} ساعت پیش`
  const diffD = Math.round(diffH / 24)
  return `${diffD} روز پیش`
}

import { useAdminCompanies } from '../hooks/useAdminCompanies'
import { adminApi } from '../lib/adminApiClient'

export default function AdminDashboard() {
  const [chartTab, setChartTab] = useState('companies')
  const [backingUp, setBackingUp] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)
  const { companies, loading } = useAdminCompanies()

  const totalCompanies = companies.length
  const totalUsers = companies.reduce((s,c)=>s+(c.users||0),0)
  const monthlyRevenue = companies.reduce((s,c)=>s+(c.revenue||0),0)
  const suspendedCount = companies.filter(c=>c.status==='suspended').length
  const growthData = buildGrowthFromCompanies(companies)

  /* ── توزیع پلن‌ها (واقعی) ── */
  const planDist = ['Pro','Basic','Free'].map(plan => {
    const inPlan = companies.filter(c => c.plan === plan)
    return { plan, count: inPlan.length, revenue: inPlan.reduce((s,c)=>s+(c.revenue||0),0) }
  })

  /* ── آخرین ثبت‌نام‌ها (واقعی، بر اساس تاریخ عضویت) ── */
  const recentSignups = companies.slice().sort((a,b) => new Date(b.joined) - new Date(a.joined)).slice(0, 5)

  /* ── هشدارها (واقعی — فقط چیزهایی که از دیتای موجود قابل استنتاجه) ── */
  const alerts = []
  if (suspendedCount > 0) {
    alerts.push({ type:'warning', msg: `${suspendedCount} شرکت در حال حاضر تعلیق هستن`, time:'اکنون' })
  }
  const todaySignups = companies.filter(c => new Date(c.joined).toDateString() === new Date().toDateString())
  if (todaySignups.length > 0) {
    alerts.push({ type:'success', msg: `${todaySignups.length} شرکت جدید امروز ثبت‌نام کردن`, time:'امروز' })
  }
  if (!alerts.length) {
    alerts.push({ type:'info', msg: 'هشدار جدیدی وجود نداره', time:'—' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'adminFadeIn .3s ease-out' }}>

      {/* عنوان */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-txt)', margin: '0 0 4px' }}>داشبورد سیستم</h1>
          <p style={{ fontSize: 13, color: 'var(--admin-muted)', margin: 0 }}>نمای کلی پلتفرم حسابیار{loading ? ' (در حال بارگذاری...)' : ''}</p>
        </div>
        <button
          className="admin-btn admin-btn-ghost"
          disabled={backingUp}
          onClick={async () => {
            setBackingUp(true); setBackupMsg(null)
            try { const res = await adminApi.companies.backup(); setBackupMsg({ ok:true, text:`بکاپ گرفته شد: ${res.path?.split('/').pop() || ''}` }) }
            catch (e) { setBackupMsg({ ok:false, text: e.message || 'بکاپ ناموفق بود' }) }
            finally { setBackingUp(false) }
          }}
        >
          <Database size={14}/> {backingUp ? 'در حال بکاپ...' : 'بکاپ دستی دیتابیس'}
        </button>
      </div>
      {backupMsg && (
        <div style={{ fontSize:12, color: backupMsg.ok ? 'var(--admin-success)' : '#f87171' }}>{backupMsg.text}</div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard icon={Building2}   label="کل شرکت‌ها"        value={String(totalCompanies)} color="#818cf8" sub="شرکت‌های ثبت‌نامی" />
        <StatCard icon={Users}       label="کاربران فعال"       value={String(totalUsers)}    color="#34d399" sub={`در ${totalCompanies} شرکت`} />
        <StatCard icon={CreditCard}  label="درآمد ماهانه (م)"  value={String(monthlyRevenue)} color="#fbbf24" sub="میلیون تومان" />
        <StatCard icon={AlertCircle} label="شرکت‌های تعلیق‌شده" value={String(suspendedCount)} color="#f87171" sub="نیاز به بررسی" />
      </div>

      {/* هشدارها */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => {
          const cfg = {
            warning: { bg: 'rgba(245,158,11,.07)', border: 'rgba(245,158,11,.25)', color: '#fbbf24', Icon: AlertCircle },
            info:    { bg: 'rgba(56,189,248,.07)',  border: 'rgba(56,189,248,.25)',  color: '#67e8f9', Icon: Activity },
            success: { bg: 'rgba(16,185,129,.07)',  border: 'rgba(16,185,129,.25)',  color: '#4ade80', Icon: CheckCircle2 },
          }[a.type]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: cfg.bg, border: `0.5px solid ${cfg.border}` }}>
              <cfg.Icon size={15} style={{ color: cfg.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--admin-txt2)' }}>{a.msg}</span>
              <span style={{ fontSize: 11, color: 'var(--admin-muted)', whiteSpace: 'nowrap' }}>
                <Clock size={11} style={{ display: 'inline', verticalAlign: -1, marginLeft: 3 }} />{a.time}
              </span>
            </div>
          )
        })}
      </div>

      {/* نمودارها */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* رشد پلتفرم */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-txt)', margin: 0 }}>رشد پلتفرم <span style={{fontSize:10,fontWeight:400,color:'var(--admin-muted)'}}>(تجمعی، ۶ ماه اخیر)</span></h2>
              <p style={{ fontSize: 11, color: 'var(--admin-muted)', margin: '2px 0 0' }}>۶ ماه اخیر — منتظر فرمت تاریخ استاندارد برای بازه‌بندی واقعی</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['companies','شرکت'],['users','کاربر'],['revenue','درآمد']].map(([k, l]) => (
                <button key={k} onClick={() => setChartTab(k)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: chartTab === k ? 'var(--admin-accent)' : 'var(--admin-surface2)', color: chartTab === k ? '#fff' : 'var(--admin-muted)' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--admin-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey={chartTab} stroke="var(--admin-accent)" strokeWidth={2.5} dot={{ fill: 'var(--admin-accent)', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* توزیع پلن‌ها */}
        <div className="admin-card">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-txt)', margin: 0 }}>توزیع پلن‌های اشتراکی</h2>
            <p style={{ fontSize: 11, color: 'var(--admin-muted)', margin: '2px 0 0' }}>شرکت و درآمد به تفکیک پلن</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={planDist} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="plan" tick={{ fontSize: 11, fill: 'var(--admin-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CT />} cursor={{ fill: 'rgba(99,102,241,.05)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--admin-muted)', paddingTop: 8 }}
                formatter={v => v === 'count' ? 'تعداد شرکت' : 'درآمد (م)'} />
              <Bar dataKey="count"   fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
              <Bar dataKey="revenue" fill="#1e0a3d" radius={[4, 4, 0, 0]} name="revenue" />
            </BarChart>
          </ResponsiveContainer>

          {/* legend سفارشی */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {planDist.map(p => (
              <div key={p.plan} style={{ flex: 1, background: 'var(--admin-surface2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '1px 8px', borderRadius: 99, background: PLAN_BG[p.plan], color: PLAN_COLORS[p.plan], display: 'inline-block', marginBottom: 4 }}>{p.plan}</span>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--admin-txt)', margin: '0 0 1px' }}>{p.count}</p>
                <p style={{ fontSize: 10, color: 'var(--admin-muted)', margin: 0 }}>شرکت</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ثبت‌نام‌های اخیر */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-txt)', margin: 0 }}>آخرین ثبت‌نام‌ها</h2>
          <button className="admin-btn admin-btn-ghost admin-btn-sm">مشاهده همه</button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              {['شرکت', 'پلن', 'زمان ثبت‌نام', 'وضعیت'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {recentSignups.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500, color: 'var(--admin-txt)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={12} style={{ color: 'var(--admin-accent)' }} />
                    </div>
                    {c.name}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: PLAN_BG[c.plan], color: PLAN_COLORS[c.plan] }}>{c.plan}</span>
                </td>
                <td style={{ color: 'var(--admin-muted)', fontSize: 12 }}>
                  <Clock size={11} style={{ display: 'inline', verticalAlign: -1, marginLeft: 4 }} />{fmtRelative(c.joined)}
                </td>
                <td>
                  <span className={`admin-badge ${STATUS_CLS[c.status]}`}>{STATUS_LBL[c.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
