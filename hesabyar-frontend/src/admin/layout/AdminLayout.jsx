import { useState } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  BarChart2, ShieldCheck, Settings, LogOut,
  Bell, Search, Menu, Activity, Zap,
} from 'lucide-react'
import { useAdminAuth } from '../AdminAuthContext'

const NAV = [
  {
    group: 'اصلی',
    items: [
      { path: '',           label: 'داشبورد',       icon: LayoutDashboard },
      { path: 'companies',  label: 'شرکت‌ها',        icon: Building2 },
      { path: 'users',      label: 'کاربران',         icon: Users },
      { path: 'billing',    label: 'صورتحساب‌ها',     icon: CreditCard },
    ],
  },
  {
    group: 'تحلیل',
    items: [
      { path: 'analytics',  label: 'آمار پلتفرم',    icon: BarChart2 },
      { path: 'activity',   label: 'لاگ فعالیت',     icon: Activity },
    ],
  },
  {
    group: 'سیستم',
    items: [
      { path: 'security',   label: 'امنیت',           icon: ShieldCheck },
      { path: 'settings',   label: 'تنظیمات سیستم',  icon: Settings },
    ],
  },
]

export default function AdminLayout() {
  const { admin, logout }         = useAdminAuth()
  const [collapsed, setCollapsed] = useState(false)
  const location                  = useLocation()

  const isActive = (path) => {
    const seg = location.pathname.split('/').pop()
    if (path === '') return seg === '' || location.pathname.endsWith('admin') || location.pathname.endsWith('admin/')
    return location.pathname.includes('/' + path)
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--admin-bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width:          collapsed ? 60 : 'var(--admin-sidebar-w)',
        minWidth:       collapsed ? 60 : 'var(--admin-sidebar-w)',
        background:     'var(--admin-surface)',
        borderInlineEnd:'0.5px solid var(--admin-border)',
        display:        'flex',
        flexDirection:  'column',
        overflow:       'hidden',
        transition:     'width .2s ease, min-width .2s ease',
        flexShrink:     0,
      }}>

        {/* لوگو */}
        <div style={{
          padding: '18px 14px 14px',
          borderBottom: '0.5px solid var(--admin-border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-txt)', margin: 0, whiteSpace: 'nowrap' }}>Admin Panel</p>
              <p style={{ fontSize: 10, color: 'var(--admin-muted)', margin: 0 }}>Hesabyar System</p>
            </div>
          )}
        </div>

        {/* منو */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {NAV.map(({ group, items }) => (
            <div key={group} style={{ marginBottom: 18 }}>
              {!collapsed && (
                <p style={{
                  fontSize: 9, fontWeight: 600, color: 'var(--admin-muted)',
                  textTransform: 'uppercase', letterSpacing: '.08em',
                  padding: '2px 8px 6px', margin: 0,
                }}>
                  {group}
                </p>
              )}
              {items.map(({ path, label, icon: Icon }) => {
                const active = isActive(path)
                return (
                  <NavLink
                    key={path}
                    to={path === '' ? '.' : path}
                    end={path === ''}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      gap:            10,
                      padding:        collapsed ? '9px 0' : '9px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius:   8,
                      marginBottom:   2,
                      textDecoration: 'none',
                      fontSize:       13,
                      fontWeight:     active ? 500 : 400,
                      background:     active ? 'rgba(99,102,241,.14)' : 'transparent',
                      color:          active ? 'var(--admin-accent2)' : 'var(--admin-muted)',
                      transition:     'all .12s',
                      position:       'relative',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--admin-surface2)'
                        e.currentTarget.style.color = 'var(--admin-txt2)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--admin-muted)'
                      }
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
                    {active && !collapsed && (
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--admin-accent)',
                        flexShrink: 0,
                      }} />
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* کاربر */}
        <div style={{ padding: '10px 8px', borderTop: '0.5px solid var(--admin-border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px', borderRadius: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(99,102,241,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--admin-accent2)',
            }}>
              SA
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--admin-txt)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Super Admin
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--admin-muted)', margin: 0, direction: 'ltr', textAlign: 'right' }}>
                    {admin?.email}
                  </p>
                </div>
                <button
                  onClick={logout}
                  title="خروج"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--admin-muted)', display: 'flex',
                    padding: 5, borderRadius: 6, flexShrink: 0, transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--admin-danger)'; e.currentTarget.style.background = 'rgba(239,68,68,.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--admin-muted)'; e.currentTarget.style.background = 'none' }}
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 52, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 20px',
          background: 'var(--admin-surface)',
          borderBottom: '0.5px solid var(--admin-border)',
          flexShrink: 0,
        }}>
          {/* toggle sidebar */}
          <button
            onClick={() => setCollapsed(p => !p)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex', padding:5, borderRadius:6, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--admin-surface2)'; e.currentTarget.style.color='var(--admin-txt)' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--admin-muted)' }}
          >
            <Menu size={18} />
          </button>

          {/* search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--admin-surface2)', border: '0.5px solid var(--admin-border)',
            borderRadius: 8, padding: '6px 12px', flex: 1, maxWidth: 280,
          }}>
            <Search size={14} style={{ color: 'var(--admin-muted)', flexShrink: 0 }} />
            <input
              placeholder="جستجو در پنل..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--admin-txt)', fontFamily: 'inherit',
                flex: 1, direction: 'rtl',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* وضعیت سیستم */}
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--admin-success)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--admin-success)', animation:'adminPulse 2s infinite', display:'inline-block' }} />
            سیستم آنلاین
          </div>

          {/* اعلان */}
          <button
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-muted)', display:'flex', position:'relative', padding:6, borderRadius:8, transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--admin-surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
          >
            <Bell size={17} />
            <span style={{ position:'absolute', top:4, insetInlineEnd:4, width:7, height:7, background:'var(--admin-danger)', borderRadius:'50%', border:'2px solid var(--admin-surface)' }} />
          </button>
        </header>

        {/* محتوا */}
        <main style={{ flex:1, overflowY:'auto', padding:20, animation:'adminFadeIn .3s ease-out' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
