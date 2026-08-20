import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAppStore } from '@/store/appStore'

const PAGE_META = {
  '/':          { title: 'dashboard.title' },
  '/invoices':  { title: 'invoices.title',  subtitle: 'invoices.subtitle' },
  '/payments':  { title: 'payments.title',  subtitle: 'payments.subtitle' },
  '/checks':    { title: 'nav.checks',      subtitle: 'checks.subtitle' },
  '/receipts':  { title: 'receipts.title',  subtitle: 'receipts.subtitle' },
  '/expenses':  { title: 'expenses.title',  subtitle: 'expenses.subtitle' },
  '/banking':   { title: 'banking.title',   subtitle: 'banking.subtitle' },
  '/clients':   { title: 'clients.title',   subtitle: 'clients.subtitle' },
  '/employees': { title: 'employees.title', subtitle: 'employees.subtitle' },
  '/products':  { title: 'products.title',  subtitle: 'products.subtitle' },
  '/reports':   { title: 'reports.title',   subtitle: 'reports.subtitle' },
  '/settings':  { title: 'settings.title',  subtitle: 'settings.subtitle' },
  '/oversight': { title: 'oversight.title', subtitle: 'oversight.subtitle' },
}

export default function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const fontScale = useAppStore((s) => s.fontScale)
  const meta = PAGE_META[pathname] || PAGE_META['/']

  return (
    <div className="layout-shell" style={{ zoom: fontScale }}>
      {sidebarOpen && <Sidebar />}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={t(meta.title)}
          subtitle={meta.subtitle ? t(meta.subtitle) : undefined}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--t-content-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
