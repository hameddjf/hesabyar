import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, FileText, CreditCard, Receipt,
  Users, UserCheck, Package, BarChart2, Settings,
  ChevronDown, PieChart, Wallet, Landmark, ShieldCheck, Database, Banknote, HandCoins,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { canAccessNavKey } from '@/lib/permissions'

const ROLE_LABEL_FA = { owner: 'مالک', admin: 'مدیر', employee: 'کارمند' }

/** حروف اول نام برای آواتار متنی (مثل قبل که «ع.م» ثابت بود، حالا واقعاً از نام کاربر می‌سازتش) */
function initials(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return parts.slice(0, 2).map((p) => p[0]).join('.')
}

const NAV = [
  {
    group: 'nav_group.main',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/' },
      { key: 'invoices',  icon: FileText,        path: '/invoices', badge: 12 },
      { key: 'payments',  icon: CreditCard,      path: '/payments' },
      { key: 'checks',    icon: Banknote,        path: '/checks' },
      { key: 'receipts',  icon: Wallet,          path: '/receipts' },
      { key: 'expenses',  icon: Receipt,         path: '/expenses' },
      { key: 'banking',   icon: Landmark,        path: '/banking' },
    ],
  },
  {
    group: 'nav_group.management',
    items: [
      { key: 'clients',   icon: Users,     path: '/clients' },
      { key: 'employees', icon: UserCheck, path: '/employees' },
      { key: 'partners',  icon: HandCoins, path: '/partners' },
      { key: 'products',  icon: Package,   path: '/products' },
    ],
  },
  {
    group: 'nav_group.analytics',
    items: [
      { key: 'reports',  icon: BarChart2, path: '/reports' },
      { key: 'holo',     icon: Database,  path: '/holo' },
      { key: 'settings', icon: Settings,  path: '/settings' },
    ],
  },
  {
    group: 'nav_group.owner',
    items: [
      { key: 'oversight', icon: ShieldCheck, path: '/oversight' },
    ],
  },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const perms = user?.perms
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'

  // منو بر اساس دسترسی واقعی کاربر (perms، از /me یا پاسخ ورود/ثبت‌نام) فیلتر می‌شه:
  // آیتم «نظارت مالک» فقط برای owner/admin (نقش، نه ماژول)، بقیه بر اساس ماژول متناظرشون
  // (lib/permissions.js). قبلاً منو همیشه کامل نشون داده می‌شد و کارمند فقط بعد از کلیک
  // به خطای ۴۰۳ بک‌اند می‌خورد — این همون گپ شناخته‌شده‌ی UX بود که اینجا رفع شد.
  const visibleNav = NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.key === 'oversight') return isOwnerOrAdmin
        return canAccessNavKey(perms, item.key)
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside className="sidebar">
      {/* لوگو */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--t-sidebar-border)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--t-logo-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.25s',
        }}>
          <PieChart size={15} color="var(--t-logo-color)" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-topbar-txt)', margin: 0, lineHeight: 1.3 }}>حسابیار</p>
          <p style={{ fontSize: 10, color: 'var(--t-txt-muted)', margin: 0 }}>پنل مالی B2B</p>
        </div>
      </div>

      {/* منو */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {visibleNav.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 500,
              color: 'var(--t-group-label)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '6px 10px 3px', transition: 'color 0.25s',
            }}>
              {t(group)}
            </p>
            {items.map(({ key, icon: Icon, path, badge }) => {
              const isActive = path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(path)
              return (
                <NavLink
                  key={key}
                  to={path}
                  className={`nav-item${isActive ? ' active' : ''}`}
                  style={{ marginBottom: 1 }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{t(`nav.${key}`)}</span>
                  {badge && (
                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      padding: '1px 7px', borderRadius: 99,
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--t-accent-light)',
                      color: isActive ? 'var(--t-nav-active-txt)' : 'var(--t-accent)',
                    }}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* کاربر */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--t-sidebar-border)' }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 8, border: 'none',
          background: 'transparent', cursor: 'pointer', textAlign: 'inherit',
          transition: 'background 0.12s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--t-nav-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--t-accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: 'var(--t-accent)',
          }}>
            {initials(user?.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t-txt)', margin: 0 }}>{user?.name || '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--t-txt-muted)', margin: 0 }}>{ROLE_LABEL_FA[user?.role] || user?.role || '—'}</p>
          </div>
          <ChevronDown size={13} style={{ color: 'var(--t-txt-muted)', flexShrink: 0 }} />
        </button>
      </div>
    </aside>
  )
}
