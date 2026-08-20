import { useState, useRef, useEffect } from 'react'
import {
  Database, Plug, Upload, Download, AlertTriangle, CheckCircle2, XCircle,
  Clock, Users, FileText, Info, FileUp, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useHoloSync } from '@/hooks/useHoloSync'

const inp = { background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%' }

function Section({ title, sub, children, action }) {
  return (
    <div className="card">
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:13,fontWeight:600,color:'var(--t-txt)',margin:0 }}>{title}</h2>
          {sub && <p style={{ fontSize:11,color:'var(--t-txt-muted)',margin:'2px 0 0' }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* موجودیت‌هایی که واقعاً import/export می‌شن (بقیه‌ی جدول‌های هلو فقط مستندن) */
const SYNCABLE_ENTITIES = [
  { key:'clients',  label:'مشتریان (Customer)', icon:Users },
  { key:'invoices', label:'فاکتورها (FACTURE)',  icon:FileText },
]
const HOLO_TABLE_BY_ENTITY = { clients: 'Customer', invoices: 'FACTURE' }

export default function HoloIntegration() {
  const {
    tables, log, loadingLog, testing, syncing, testResult, testConnection, runImport, runExport,
    prereqs, checkingPrereqs, checkPrereqs, uploading, uploadAndImport,
    installingLocalDb, installError, installLocalDb,
  } = useHoloSync()
  const [conn, setConn] = useState({ host:'', port:'1433', database:'Holoo', user:'', password:'' })
  const [selected, setSelected] = useState({ clients:true, invoices:true })
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const [errHint, setErrHint] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  // اگه سرور لینوکسیه (پلتفرم این روش رو پشتیبانی نمی‌کنه)، بخش «روش پیشرفته»
  // که تنها گزینه‌ی واقعی می‌مونه رو خودکار باز می‌کنیم — کاربر مجبور نباشه
  // اول بفهمه چرا بخش بالا کار نمی‌کنه، بعد بره دنبال دکمه‌ی جمع‌شده بگرده.
  useEffect(() => {
    if (prereqs && prereqs.supportedOnThisPlatform === false) setShowAdvanced(true)
  }, [prereqs])
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  const set = (k) => (e) => setConn((c) => ({ ...c, [k]: e.target.value }))
  const toggle = (k) => setSelected((s) => ({ ...s, [k]: !s[k] }))
  const connReady = conn.host && conn.user && conn.password
  const selectedHoloTables = Object.entries(selected).filter(([,v]) => v).map(([k]) => HOLO_TABLE_BY_ENTITY[k]).filter(Boolean)

  const prereqsReady = prereqs?.sqlcmd && prereqs?.localdb
  const platformSupported = prereqs?.supportedOnThisPlatform !== false // تا وقتی هنوز چک نشده، خوش‌بینانه فرض می‌کنیم

  const doUploadImport = async () => {
    setErr(null); setErrHint(null); setResult(null)
    if (!file) return
    try {
      const res = await uploadAndImport(file, selectedHoloTables)
      setResult({ type:'import', data: res.imported })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErr(e.detail || e.message)
      setErrHint(e.hint || null)
    }
  }

  const doImport = async () => {
    setErr(null); setErrHint(null); setResult(null)
    try {
      const entities = Object.entries(selected).filter(([,v])=>v).map(([k])=>k)
      const res = await runImport(conn, entities)
      setResult({ type:'import', data: res.imported })
    } catch (e) { setErr(e.detail || e.message) }
  }

  const doExport = async () => {
    setErr(null); setErrHint(null); setResult(null)
    try {
      const entities = Object.entries(selected).filter(([,v])=>v).map(([k])=>k)
      const res = await runExport(conn, entities)
      setResult({ type:'export', data: res.exported })
    } catch (e) { setErr(e.detail || e.message) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{
        display:'flex', alignItems:'flex-start', gap:10, fontSize:12,
        background:'#fffbeb', color:'#92400e', borderRadius:10, padding:'12px 16px', lineHeight:1.8,
      }}>
        <Info size={16} style={{ flexShrink:0, marginTop:1 }}/>
        <div>
          فعلاً فقط دو جدول (مشتریان، فاکتورها) کامل تایید و قابل sync هستن — بقیه (کالا، اقلام فاکتور،
          اسناد حسابداری) هنوز نیاز به بررسی روی یک نمونه‌ی واقعی دارن.
        </div>
      </div>

      <Section
        title="ورود از فایل بکاپ هلو (.bak)"
        sub="فقط فایل بکاپ رو آپلود کن — نیازی به اتصال به یک SQL Server از‌قبل در حال اجرا نیست"
      >
        {checkingPrereqs ? (
          <p style={{ fontSize:12, color:'var(--t-txt-muted)' }}>در حال بررسی پیش‌نیازها...</p>
        ) : !platformSupported ? (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:12, background:'var(--t-search-bg)', color:'var(--t-txt-muted)', borderRadius:8, padding:'12px 14px', lineHeight:1.9 }}>
            <Info size={15} style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              این روش (ورود مستقیم از فایل بکاپ) فقط روی سرور ویندوزی در دسترسه — این سرور
              {prereqs?.platform ? ` (${prereqs.platform})` : ''} لینوکس/غیرویندوزه. از «روش پیشرفته»
              پایین‌تر استفاده کن.
            </div>
          </div>
        ) : !prereqsReady ? (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:12, background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'12px 14px', lineHeight:1.9 }}>
            <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }}/>
            <div style={{ flex:1 }}>
              {!prereqs?.sqlcmd && (
                <div style={{ marginBottom:6 }}>
                  ✗ ابزار sqlcmd همراه خود پروژه میاد ولی الان پیدا نشد — احتمالاً پوشه‌ی
                  <code style={{ margin:'0 4px' }}>hesabyar-backend/bin</code> جابه‌جا یا حذف شده.
                </div>
              )}
              {!prereqs?.localdb && (
                <div>
                  ✗ SQL Server Express LocalDB روی این سیستم نصب نیست. این یکی (بر‌خلاف sqlcmd)
                  یه کامپوننت سیستمیه و نمی‌شه همراه پروژه آوردش — ولی نصبش رو می‌تونیم خودکار انجام
                  بدیم؛ فقط یه پنجره‌ی تأیید استاندارد ویندوز (UAC) باز می‌شه که باید «Yes» بزنی:
                  <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
                    <button className="btn-primary" disabled={installingLocalDb} onClick={installLocalDb}>
                      {installingLocalDb
                        ? <><Loader2 size={14} className="animate-spin"/> در حال دانلود و نصب (منتظر تأیید UAC هم باش)...</>
                        : <>نصب خودکار LocalDB</>}
                    </button>
                    <button className="btn-secondary" disabled={installingLocalDb} onClick={checkPrereqs}>بررسی دوباره</button>
                  </div>
                  {installError && <div style={{ marginTop:8, color:'#991b1b' }}>{installError}</div>}
                  <div style={{ marginTop:8, fontSize:11, color:'#991b1b' }}>
                    ترجیح می‌دی دستی نصب کنی؟ از{' '}
                    <a href="https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb" target="_blank" rel="noreferrer" style={{ color:'#dc2626' }}>
                      این لینک رسمی مایکروسافت
                    </a>.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <label
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:8,
                border:'1.5px dashed var(--t-card-border)', cursor:'pointer', fontSize:12, color:'var(--t-txt)',
                background: file ? 'var(--t-accent-light)' : 'transparent',
              }}
            >
              <FileUp size={15} style={{ color:'var(--t-accent)' }}/>
              {file ? file.name : 'انتخاب فایل .bak'}
              <input
                ref={fileInputRef} type="file" accept=".bak" style={{ display:'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <button className="btn-primary" disabled={!file || uploading} onClick={doUploadImport}>
              {uploading ? <><Loader2 size={14} className="animate-spin"/> در حال Restore و Import (ممکنه چند دقیقه طول بکشه)...</> : <><Upload size={14}/> آپلود و Import</>}
            </button>
          </div>
        )}
      </Section>

      <Section title="انتخاب موجودیت‌ها">
        <div style={{ display:'flex', gap:12, marginBottom:4 }}>
          {SYNCABLE_ENTITIES.map(({ key, label, icon:Icon }) => (
            <label key={key} style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, flex:1,
              border: `1.5px solid ${selected[key] ? 'var(--t-accent)' : 'var(--t-card-border)'}`,
              background: selected[key] ? 'var(--t-accent-light)' : 'transparent', cursor:'pointer',
            }}>
              <input type="checkbox" checked={!!selected[key]} onChange={() => toggle(key)} style={{ accentColor:'var(--t-accent)' }}/>
              <Icon size={14} style={{ color:'var(--t-accent)' }}/>
              <span style={{ fontSize:12, fontWeight:500, color:'var(--t-txt)' }}>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      {err && (
        <div style={{ display:'flex',flexDirection:'column',gap:4,fontSize:12,background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'10px 14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}><XCircle size={14}/> {err}</div>
          {errHint && <div style={{ color:'#991b1b', fontSize:11, paddingRight:22, lineHeight:1.8 }}>{errHint}</div>}
        </div>
      )}
      {result && (
        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,background:'#f0fdf4',color:'#059669',borderRadius:8,padding:'10px 14px' }}>
          <CheckCircle2 size={14}/>
          {result.type === 'import' ? 'Import انجام شد: ' : 'Export انجام شد: '}
          {Object.entries(result.data || {}).map(([k,v]) => `${k}: ${v}`).join(' — ')}
        </div>
      )}

      <button
        onClick={() => setShowAdvanced((s) => !s)}
        style={{
          display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
          fontSize:12, color:'var(--t-txt-muted)', padding:'4px 0', width:'fit-content',
        }}
      >
        {showAdvanced ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        روش پیشرفته: اتصال مستقیم به یک SQL Server در حال اجرا (برای Export، یا وقتی روش بالا در دسترس نیست)
      </button>

      {showAdvanced && (
        <>
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10, fontSize:12,
            background:'#fffbeb', color:'#92400e', borderRadius:10, padding:'12px 16px', lineHeight:1.8,
          }}>
            <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              این روش به یک نمونه‌ی <b>در حال اجرای</b> SQL Server نیاز داره — نه فقط فایل بکاپ. داشتن
              فایل بکاپ کافی نیست؛ باید ابتدا اون رو روی یک SQL Server واقعی Restore کنی، بعد اطلاعات
              اتصال همون نمونه‌ی در حال اجرا رو اینجا وارد کنی.
            </div>
          </div>

          <Section title="اتصال به SQL Server هلو" sub="اطلاعات این فرم به هیچ‌جا ذخیره نمی‌شن — فقط برای همین درخواست استفاده می‌شن">
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11,color:'var(--t-txt-muted)',display:'block',marginBottom:5 }}>آدرس سرور (Host / IP)</label>
                <input value={conn.host} onChange={set('host')} placeholder="192.168.1.10" style={inp} dir="ltr"/>
              </div>
              <div>
                <label style={{ fontSize:11,color:'var(--t-txt-muted)',display:'block',marginBottom:5 }}>پورت</label>
                <input value={conn.port} onChange={set('port')} style={inp} dir="ltr"/>
              </div>
              <div>
                <label style={{ fontSize:11,color:'var(--t-txt-muted)',display:'block',marginBottom:5 }}>نام دیتابیس</label>
                <input value={conn.database} onChange={set('database')} style={inp} dir="ltr"/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11,color:'var(--t-txt-muted)',display:'block',marginBottom:5 }}>یوزر SQL Server</label>
                <input value={conn.user} onChange={set('user')} placeholder="sa یا یک یوزر اختصاصی" style={inp} dir="ltr"/>
              </div>
              <div>
                <label style={{ fontSize:11,color:'var(--t-txt-muted)',display:'block',marginBottom:5 }}>رمز عبور</label>
                <input value={conn.password} onChange={set('password')} type="password" style={inp} dir="ltr"/>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="btn-secondary" disabled={!connReady || testing} onClick={() => testConnection(conn)}>
                <Plug size={14}/> {testing ? 'در حال تست...' : 'تست اتصال'}
              </button>
              {testResult && (
                <span style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,color: testResult.ok ? '#059669' : '#dc2626' }}>
                  {testResult.ok ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {testResult.message}
                </span>
              )}
            </div>
          </Section>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Section title="ورود از هلو (Import)" sub="خواندن مشتریان/فاکتورها از هلو و ثبت در حسابیار">
              <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={!connReady || syncing} onClick={doImport}>
                <Download size={14}/> {syncing ? 'در حال اجرا...' : 'شروع Import'}
              </button>
            </Section>
            <Section title="خروجی به هلو (Export)" sub="نوشتن مشتریان/فاکتورهای حسابیار در دیتابیس هلو">
              <button className="btn-secondary" style={{ width:'100%', justifyContent:'center' }} disabled={!connReady || syncing} onClick={doExport}>
                <Upload size={14}/> {syncing ? 'در حال اجرا...' : 'شروع Export'}
              </button>
            </Section>
          </div>
        </>
      )}

      <Section title="جدول‌های شناخته‌شده‌ی هلو" sub="وضعیت هر جدول در نگاشت فعلی">
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'var(--t-search-bg)' }}>
              {['جدول هلو','جدول حسابیار','توضیح'].map(h=>(
                <th key={h} style={{ padding:'8px 12px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map(t => (
              <tr key={t.holoTable} style={{ borderBottom:'0.5px solid var(--t-card-border)' }}>
                <td style={{ padding:'8px 12px', fontWeight:500, color:'var(--t-txt)', direction:'ltr', textAlign:'left' }}>{t.holoTable}</td>
                <td style={{ padding:'8px 12px' }}>
                  {t.hesabyarTable
                    ? <span style={{ fontSize:11,color:'#059669',fontWeight:500 }}>✓ {t.hesabyarTable}</span>
                    : <span style={{ fontSize:11,color:'var(--t-txt-muted)' }}>فقط مستندسازی، هنوز sync نمی‌شه</span>}
                </td>
                <td style={{ padding:'8px 12px', fontSize:11, color:'var(--t-txt-muted)' }}>{t.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="تاریخچه‌ی همگام‌سازی">
        {loadingLog ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>در حال بارگذاری...</p>
        ) : !log.length ? (
          <p style={{ fontSize:12,color:'var(--t-txt-muted)' }}>هنوز هیچ همگام‌سازی‌ای انجام نشده.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {log.map(l => (
              <div key={l.id} style={{ display:'flex',alignItems:'center',gap:10,fontSize:12,padding:'8px 0',borderBottom:'0.5px solid var(--t-card-border)' }}>
                {l.status === 'success' ? <CheckCircle2 size={14} style={{ color:'#059669',flexShrink:0 }}/> : <XCircle size={14} style={{ color:'#dc2626',flexShrink:0 }}/>}
                <span style={{ color:'var(--t-txt)' }}>{l.direction === 'import' ? 'ورود' : 'خروجی'} — {l.entity}</span>
                <span style={{ color:'var(--t-txt-muted)' }}>{l.records_count} رکورد</span>
                <span style={{ marginRight:'auto', color:'var(--t-txt-muted)', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={11}/> {l.created_at}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
