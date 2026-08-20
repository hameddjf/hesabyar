import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Menu, Globe, Database, LogOut, FileText, Clock, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'
import OfflineBadge  from '@/features/offline/OfflineBadge'
import GlobalSearchModal from '@/components/ui/GlobalSearchModal'

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR')

function NotifPanel({ alerts, loading, onClose, onNavigate }) {
  return (
    <div style={{
      position:'absolute', top:'120%', left:0, zIndex:100, width:340,
      background:'var(--t-card-bg)', border:'0.5px solid var(--t-card-border)',
      borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.2)', overflow:'hidden',
    }}>
      <div style={{ padding:'12px 14px', borderBottom:'0.5px solid var(--t-card-border)' }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--t-txt)', margin:0 }}>اعلان‌های سررسید</p>
      </div>
      <div style={{ maxHeight:340, overflowY:'auto' }}>
        {loading ? (
          <p style={{ fontSize:12, color:'var(--t-txt-muted)', padding:16, textAlign:'center' }}>در حال بارگذاری...</p>
        ) : !alerts.length ? (
          <p style={{ fontSize:12, color:'var(--t-txt-muted)', padding:16, textAlign:'center' }}>هیچ سررسید نزدیکی نیست 🎉</p>
        ) : alerts.map(a => (
          <button
            key={`${a.type}-${a.id}`}
            onClick={() => { onNavigate(a.type === 'invoice' ? '/invoices' : '/payments'); onClose() }}
            style={{
              display:'flex', alignItems:'flex-start', gap:10, width:'100%', textAlign:'right',
              padding:'10px 14px', border:'none', borderBottom:'0.5px solid var(--t-card-border)',
              background:'none', cursor:'pointer', fontFamily:'inherit',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
          >
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              background: a.overdue ? '#fef2f2' : '#fffbeb',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {a.type === 'invoice'
                ? <FileText size={13} style={{ color: a.overdue ? '#dc2626' : '#d97706' }}/>
                : <Clock size={13} style={{ color: a.overdue ? '#dc2626' : '#d97706' }}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:500, color:'var(--t-txt)', margin:'0 0 2px' }}>{a.label}</p>
              <p style={{ fontSize:11, color:'var(--t-txt-muted)', margin:0 }}>{a.detail} · {fmt(a.amount)} ت</p>
              <p style={{ fontSize:10, color: a.overdue ? '#dc2626' : '#d97706', margin:'2px 0 0' }}>
                {a.overdue ? 'سررسید گذشته' : 'نزدیک سررسید'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Topbar({ title, subtitle }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language, setLanguage, toggleSidebar } = useAppStore()
  const { user, logout } = useAuthStore()
  const { alerts, loading: notifLoading, overdueCount } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={toggleSidebar} aria-label="تغییر نوار کناری">
          <Menu size={18} />
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:14,fontWeight:600,color:'var(--t-topbar-txt)',margin:0,lineHeight:1.3 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:12,color:'var(--t-search-txt)',margin:0 }}>{subtitle}</p>}
        </div>

        <button className="search-box" style={{ width:200, cursor:'pointer', fontFamily:'inherit', textAlign:'inherit' }} onClick={() => setShowSearch(true)}>
          <Search size={14} />
          <span>{t('common.search')}</span>
          <span style={{ marginRight:'auto', fontSize:10, opacity:.6 }}>⌘K</span>
        </button>

        {/* دکمه هلو */}
        <button
          onClick={() => navigate('/holo')}
          title="یکپارچه‌سازی با هلو"
          style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:500,
            color:'var(--t-icon-color)',padding:'5px 10px',borderRadius:8,
            border:'0.5px solid var(--t-card-border)',background:'var(--t-search-bg)',
            cursor:'pointer',transition:'all .15s',fontFamily:'inherit',
          }}
        >
          <Database size={13} />
          هلو
        </button>

        {/* آفلاین badge */}
        <OfflineBadge />

        {/* تغییر زبان */}
        <button
          style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:500,
            color:'var(--t-icon-color)',padding:'6px 10px',borderRadius:8,
            border:'0.5px solid var(--t-card-border)',background:'var(--t-search-bg)',
            cursor:'pointer',transition:'opacity .15s',fontFamily:'inherit',
          }}
          onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
        >
          <Globe size={13} />
          {language === 'fa' ? 'EN' : 'FA'}
        </button>

        <ThemeSwitcher />

        {user && (
          <span style={{ fontSize: 12, color: 'var(--t-icon-color)', whiteSpace: 'nowrap' }}>
            {user.name}
          </span>
        )}
        <button className="icon-btn" onClick={handleLogout} title="خروج از حساب" aria-label="خروج">
          <LogOut size={16} />
        </button>

        <div ref={notifRef} style={{ position:'relative' }}>
          <button className="icon-btn" style={{ position:'relative' }} aria-label={`${alerts.length} اعلان`} onClick={() => setShowNotif(v => !v)}>
            <Bell size={18} />
            {alerts.length > 0 && (
              <span style={{
                position:'absolute',top:5,insetInlineEnd:5,minWidth:14,height:14,padding:'0 3px',
                background: overdueCount > 0 ? '#ef4444' : '#f59e0b', borderRadius:99,
                border:'2px solid var(--t-topbar-bg)', fontSize:9, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
              }}>
                {alerts.length}
              </span>
            )}
          </button>
          {showNotif && <NotifPanel alerts={alerts} loading={notifLoading} onClose={() => setShowNotif(false)} onNavigate={navigate} />}
        </div>
      </header>

      <GlobalSearchModal open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  )
}
