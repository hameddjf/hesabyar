import { useState } from 'react'
import { BarChart2, TrendingUp, TrendingDown, DollarSign, PieChart, Download, Calendar, AlertTriangle } from 'lucide-react'
import { StatCard, Tabs, Select, Badge } from '@/components/ui'
import {
  BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useReportsData } from '@/hooks/useReportsData'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const PERIODS = [
  { value:'month3', label:'۳ ماه اخیر' },
  { value:'month6', label:'۶ ماه اخیر' },
  { value:'year1',  label:'۱ سال اخیر' },
  { value:'year2',  label:'۲ سال اخیر' },
]

const TABS_MAIN = [
  { key:'overview',  label:'خلاصه کلی' },
  { key:'cashflow',  label:'جریان نقدی' },
  { key:'partners',  label:'عملکرد شرکا' },
  { key:'clients',   label:'برترین مشتریان' },
  { key:'tax',       label:'مالیات' },
]

/* ── Tooltip سفارشی ── */
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--t-card-bg)', border:'0.5px solid var(--t-card-border)', borderRadius:10, padding:'8px 12px', fontSize:12 }}>
      <p style={{ fontWeight:500, color:'var(--t-txt)', marginBottom:4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color, margin:0 }}>
          {p.name}: {p.value}م
        </p>
      ))}
    </div>
  )
}

/* ── کارت بخش ── */
function Section({ title, sub, children, action }) {
  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <h2 style={{ fontSize:13, fontWeight:600, color:'var(--t-txt)', margin:0 }}>{title}</h2>
          {sub && <p style={{ fontSize:11, color:'var(--t-txt-muted)', margin:'2px 0 0' }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

const OVERVIEW_WIDGETS = [
  { id: 'stat-income',    title: 'کارت درآمد کل',        span: 1, defaultVisible: true },
  { id: 'stat-expense',   title: 'کارت هزینه کل',        span: 1, defaultVisible: true },
  { id: 'stat-profit',    title: 'کارت سود خالص',        span: 1, defaultVisible: true },
  { id: 'stat-expcats',   title: 'کارت تعداد دسته‌ی هزینه', span: 1, defaultVisible: true },
  { id: 'chart-monthly',  title: 'نمودار درآمد/هزینه/سود ماهانه', span: 2, defaultVisible: true },
  { id: 'chart-expcats',  title: 'نمودار ترکیب هزینه‌ها', span: 2, defaultVisible: true },
]

/* ── تب خلاصه ── */
function Overview({ period, data }) {
  const { totals, monthly, expenseCats, monthlyIsReal } = data

  const renderWidget = (id) => {
    switch (id) {
      case 'stat-income':  return <StatCard icon={TrendingUp}   label="درآمد کل" value={`${totals.income}م`}  sub={`تومان · ${period}`} subColor="#059669" />
      case 'stat-expense': return <StatCard icon={TrendingDown} label="هزینه کل" value={`${totals.expense}م`} sub={`تومان · ${period}`} subColor="#dc2626" />
      case 'stat-profit':  return <StatCard icon={DollarSign}   label="سود خالص" value={`${totals.profit}م`}  sub={`حاشیه ${totals.margin}٪`} subColor="#059669" />
      case 'stat-expcats': return <StatCard icon={BarChart2}    label="تعداد دسته هزینه" value={expenseCats.length} sub="دسته‌بندی فعال" subColor="var(--t-accent)" />

      case 'chart-monthly':
        return (
          <Section title="درآمد، هزینه و سود" sub={`۶ ماه اخیر — میلیون تومان${monthlyIsReal ? '' : ' (نمونه — هنوز رکورد با تاریخ ثبت‌شده‌ی جدید کافی نیست)'}`}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthly} barGap={3} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-card-border)" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:10,fill:'var(--t-txt-muted)'}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<CT/>} cursor={{fill:'var(--t-accent-light)'}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:'var(--t-txt-muted)',paddingTop:8}}
                  formatter={v=>v==='income'?'درآمد':v==='expense'?'هزینه':'سود'}/>
                <Bar dataKey="income"  fill="var(--t-bar-main)" radius={[4,4,0,0]} name="income"/>
                <Bar dataKey="expense" fill="var(--t-bar-sub)"  radius={[4,4,0,0]} name="expense"/>
                <Bar dataKey="profit"  fill="#059669"           radius={[4,4,0,0]} name="profit" opacity={.8}/>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )

      case 'chart-expcats':
        return (
          <Section title="ترکیب هزینه‌ها" sub="بر اساس دسته‌بندی">
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <ResponsiveContainer width={160} height={160}>
                <RPieChart>
                  <Pie data={expenseCats} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                    {expenseCats.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[v+'م','مبلغ']}/>
                </RPieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                {expenseCats.map(cat => (
                  <div key={cat.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:10,height:10,borderRadius:'50%',background:cat.color,flexShrink:0,display:'inline-block' }}/>
                    <span style={{ fontSize:12,color:'var(--t-txt)',flex:1 }}>{cat.name}</span>
                    <span style={{ fontSize:12,fontWeight:600,color:'var(--t-txt)' }}>{cat.value}م</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )

      default: return null
    }
  }

  return <CustomizableGrid pageKey="reports-overview" widgetDefs={OVERVIEW_WIDGETS} renderWidget={renderWidget} columns={4} />
}

/* ── تب جریان نقدی ── */
function CashFlow({ data }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="جریان نقدی هفتگی" sub={`ورودی در برابر خروجی — میلیون تومان${data.cashflowIsReal ? '' : ' (نمونه — هنوز رکورد کافی با تاریخ ثبت‌شده نیست)'}`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.cashflow}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--t-card-border)" vertical={false}/>
            <XAxis dataKey="week" tick={{fontSize:11,fill:'var(--t-txt-muted)'}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip content={<CT/>}/>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:'var(--t-txt-muted)',paddingTop:8}}
              formatter={v=>v==='in'?'ورودی':'خروجی'}/>
            <Line type="monotone" dataKey="in"  stroke="#059669" strokeWidth={2.5} dot={{fill:'#059669',r:4}} name="in"/>
            <Line type="monotone" dataKey="out" stroke="#dc2626" strokeWidth={2.5} dot={{fill:'#dc2626',r:4}} name="out"/>
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'موجودی اول دوره', value:'۱۸۲م', color:'var(--t-txt)' },
          { label:'خالص ورودی',      value:'+۲۰۸م', color:'#059669' },
          { label:'موجودی پایان دوره',value:'۳۹۱م', color:'var(--t-accent)' },
        ].map(({label,value,color}) => (
          <div key={label} className="card" style={{ textAlign:'center', padding:'20px 16px' }}>
            <p style={{ fontSize:24,fontWeight:700,color,margin:'0 0 4px' }}>{value}</p>
            <p style={{ fontSize:12,color:'var(--t-txt-muted)',margin:0 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── تب عملکرد شرکا ── */
function Partners({ data }) {
  const perf = data.partnerPerf
  if (!perf.length) return <Section title="عملکرد مالی شرکا"><p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>هنوز تراکنشی با شریک ثبت نشده.</p></Section>
  const maxVal = Math.max(...perf.map(p => p.received), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="عملکرد مالی شرکا" sub="دریافتی و پرداختی هر شریک — میلیون تومان">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={perf} layout="vertical" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--t-card-border)" horizontal={false}/>
            <XAxis type="number" hide/>
            <YAxis type="category" dataKey="name" tick={{fontSize:12,fill:'var(--t-txt)'}} axisLine={false} tickLine={false} width={90}/>
            <Tooltip content={<CT/>} cursor={{fill:'var(--t-accent-light)'}}/>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:'var(--t-txt-muted)',paddingTop:8}}
              formatter={v=>v==='received'?'دریافتی':'پرداختی'}/>
            <Bar dataKey="received" fill="var(--t-bar-main)" radius={[0,4,4,0]} name="received"/>
            <Bar dataKey="paid"     fill="var(--t-bar-sub)"  radius={[0,4,4,0]} name="paid"/>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {perf.map((p, i) => {
          const colors = ['var(--t-accent)','#059669','#7c3aed']
          const pct = (p.received / maxVal) * 100
          return (
            <div key={p.name} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:38,height:38,borderRadius:10,background:colors[i]+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:colors[i],flexShrink:0 }}>
                {p.name.split(' ').map(w=>w[0]).join('')}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{p.name}</span>
                  <span style={{ fontSize:11,color:'var(--t-txt-muted)' }}>سهام: {p.share}٪</span>
                </div>
                <div style={{ height:6,borderRadius:99,background:'var(--t-search-bg)',overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${pct}%`,background:colors[i],borderRadius:99,transition:'width .4s' }}/>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,textAlign:'center',flexShrink:0 }}>
                {[['دریافتی',p.received,'#059669'],['پرداختی',p.paid,'#dc2626'],['مانده',p.balance,colors[i]]].map(([l,v,c])=>(
                  <div key={l}>
                    <p style={{ fontSize:15,fontWeight:700,color:c,margin:0 }}>{v}م</p>
                    <p style={{ fontSize:10,color:'var(--t-txt-muted)',margin:0 }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── تب برترین مشتریان ── */
function TopClients({ data }) {
  const clients = data.topClients
  return (
    <Section title="برترین مشتریان" sub="بر اساس مجموع فاکتورها">
      {!clients.length ? (
        <p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>هنوز فاکتوری برای مشتری‌ها ثبت نشده.</p>
      ) : (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'var(--t-search-bg)' }}>
            {['رتبه','مشتری','تعداد فاکتور','مجموع (م ت)','پرداخت‌شده','نرخ وصول',''].map(h=>(
              <th key={h} style={{ padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c,i) => {
            const rate = c.total ? Math.round((c.paid/c.total)*100) : 0
            const medals = ['🥇','🥈','🥉']
            return (
              <tr key={c.name} style={{ borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{ padding:'12px 14px',fontSize:16 }}>{medals[i]||`#${i+1}`}</td>
                <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{c.name}</td>
                <td style={{ padding:'12px 14px',fontSize:12,color:'var(--t-txt-muted)',textAlign:'center' }}>{c.invoices}</td>
                <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--t-txt)',direction:'ltr',textAlign:'right' }}>{c.total}م</td>
                <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'#059669',direction:'ltr',textAlign:'right' }}>{c.paid}م</td>
                <td style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ flex:1,height:6,borderRadius:99,background:'var(--t-search-bg)',overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${rate}%`,background:rate>=90?'#059669':rate>=70?'#d97706':'#dc2626',borderRadius:99 }}/>
                    </div>
                    <span style={{ fontSize:11,fontWeight:500,color:rate>=90?'#059669':rate>=70?'#d97706':'#dc2626',minWidth:32 }}>{rate}٪</span>
                  </div>
                </td>
                <td style={{ padding:'12px 14px' }}>
                  <button className="btn-ghost" style={{ fontSize:11,padding:'4px 8px' }}>مشاهده</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      )}
    </Section>
  )
}

/* ── تب مالیات ── */
function Tax() {
  const quarters = [
    { q:'فصل اول ۱۴۰۴', income:228, taxable:190, tax:19, status:'paid' },
    { q:'فصل چهارم ۱۴۰۳', income:312, taxable:265, tax:26.5, status:'paid' },
    { q:'فصل سوم ۱۴۰۳', income:287, taxable:240, tax:24, status:'paid' },
    { q:'فصل دوم ۱۴۰۳', income:198, taxable:162, tax:16.2, status:'pending' },
  ]
  const statusMeta = {
    paid:    { label:'تسویه‌شده', color:'#059669', bg:'#d1fae5' },
    pending: { label:'در انتظار',  color:'#d97706', bg:'#fef3c7' },
    overdue: { label:'معوق',       color:'#dc2626', bg:'#fee2e2' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8, fontSize:12,
        background:'#fffbeb', color:'#92400e', borderRadius:8, padding:'10px 14px',
      }}>
        <AlertTriangle size={14}/> هنوز موتور محاسبه‌ی مالیات پیاده‌سازی نشده — این تب فقط برای نمایش طرح UI با داده‌ی نمونه‌ست.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <StatCard icon={DollarSign} label="مالیات پرداخت‌شده (امسال)" value="۱۹م" sub="تومان"/>
        <StatCard icon={Calendar}   label="مالیات بر درآمد" value="۱۰٪" sub="نرخ مؤثر"/>
        <StatCard icon={BarChart2}  label="اعتبار مالیاتی" value="۳.۲م" sub="تومان قابل کسر"/>
      </div>

      <Section title="سابقه مالیاتی" sub="فصلی — میلیون تومان">
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--t-search-bg)' }}>
              {['دوره','درآمد','درآمد مشمول','مالیات','وضعیت'].map(h=>(
                <th key={h} style={{ padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarters.map(q => {
              const sm = statusMeta[q.status]
              return (
                <tr key={q.q} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'var(--t-txt)' }}>{q.q}</td>
                  <td style={{ padding:'12px 14px',fontSize:13,color:'var(--t-txt)',direction:'ltr',textAlign:'right' }}>{q.income}م</td>
                  <td style={{ padding:'12px 14px',fontSize:13,color:'var(--t-txt)',direction:'ltr',textAlign:'right' }}>{q.taxable}م</td>
                  <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'#dc2626',direction:'ltr',textAlign:'right' }}>{q.tax}م</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:99,background:sm.bg,color:sm.color }}>{sm.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

/* ── صفحه اصلی ── */
export default function Reports() {
  const [tab,    setTab]    = useState('overview')
  const [period, setPeriod] = useState('month6')
  const { data, loading, error, isMock } = useReportsData()

  if (loading || !data) {
    return <p style={{ fontSize:12, color:'var(--t-txt-muted)' }}>در حال بارگذاری گزارشات...</p>
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {error && (
        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px' }}>
          <AlertTriangle size={14}/> خطا در دریافت دیتای واقعی گزارشات — نمونه نمایش داده می‌شه. ({error.message || 'خطای نامشخص'})
        </div>
      )}
      <ReportsBody tab={tab} setTab={setTab} period={period} setPeriod={setPeriod} data={data} isMock={isMock} />
    </div>
  )
}

function ReportsBody({ tab, setTab, period, setPeriod, data, isMock }) {

  const tabContent = {
    overview: <Overview period={PERIODS.find(p=>p.value===period)?.label} data={data}/>,
    cashflow: <CashFlow data={data}/>,
    partners: <Partners data={data}/>,
    clients:  <TopClients data={data}/>,
    tax:      <Tax/>,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Tabs tabs={TABS_MAIN} active={tab} onChange={setTab}/>
        <div style={{ display:'flex', gap:8 }}>
          <Select value={period} onChange={setPeriod} options={PERIODS}/>
          <button className="btn-secondary"><Download size={14}/> خروجی PDF</button>
        </div>
      </div>
      {isMock && (
        <div style={{
          display:'flex', alignItems:'center', gap:8, fontSize:12,
          background:'#fffbeb', color:'#92400e', borderRadius:8, padding:'10px 14px',
        }}>
          <AlertTriangle size={14}/> هنوز فاکتور یا تراکنش واقعی ثبت نشده — این گزارش با داده‌ی نمونه نمایش داده می‌شه.
        </div>
      )}
      {tabContent[tab]}
    </div>
  )
}
