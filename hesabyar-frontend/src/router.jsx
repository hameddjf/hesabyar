import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import RequireModule from '@/components/auth/RequireModule'
import ErrorBoundary from '@/components/errors/ErrorBoundary'
import RouteErrorElement from '@/components/errors/RouteErrorElement'

// صفحات lazy-load می‌شن تا حجم بسته‌ی اصلی JS کوچیک‌تر بمونه (هر صفحه فقط وقتی بارگذاری می‌شه که واقعاً بازش می‌کنی)
const Dashboard       = lazy(() => import('@/pages/Dashboard'))
const Invoices        = lazy(() => import('@/pages/Invoices'))
const Expenses        = lazy(() => import('@/pages/Expenses'))
const Payments        = lazy(() => import('@/pages/Payments'))
const Checks          = lazy(() => import('@/pages/Checks'))
const Receipts        = lazy(() => import('@/pages/Receipts'))
const Clients         = lazy(() => import('@/pages/Clients'))
const Employees       = lazy(() => import('@/pages/Employees'))
const Partners         = lazy(() => import('@/pages/Partners'))
const BankingAccounts = lazy(() => import('@/pages/BankingAccounts'))
const Products        = lazy(() => import('@/pages/Products'))
const Reports          = lazy(() => import('@/pages/Reports'))
const HoloIntegration = lazy(() => import('@/pages/HoloIntegration'))
const Settings         = lazy(() => import('@/pages/Settings'))
const OwnerOversight   = lazy(() => import('@/pages/owner/OwnerOversight'))
const Login            = lazy(() => import('@/pages/auth/Login'))
const Register         = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword   = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword    = lazy(() => import('@/pages/auth/ResetPassword'))
const NotFound          = lazy(() => import('@/pages/errors/NotFound'))
const Forbidden         = lazy(() => import('@/pages/errors/Forbidden'))
const ServerErrorPage   = lazy(() => import('@/pages/errors/ServerError'))

function PageLoading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200, fontSize:12, color:'var(--t-txt-muted)' }}>
      در حال بارگذاری...
    </div>
  )
}

/** هر صفحه رو داخل Suspense می‌پیچه تا حین lazy-load کردن، به‌جای صفحه‌ی سفید یه پیام نمایش داده بشه */
const s = (Component) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
)

/** صفحه رو هم داخل Suspense هم داخل گارد ماژول می‌پیچه (فقط برای صفحاتی که یه ماژول RBAC مشخص دارن) */
const g = (moduleKey, Component) => (
  <RequireModule module={moduleKey}>{s(Component)}</RequireModule>
)

export const router = createBrowserRouter([
  // ── Auth (بدون Layout) ──
  { path: '/login',           element: s(Login),          errorElement: <RouteErrorElement /> },
  { path: '/register',        element: s(Register),       errorElement: <RouteErrorElement /> },
  { path: '/forgot-password', element: s(ForgotPassword), errorElement: <RouteErrorElement /> },
  { path: '/reset-password',  element: s(ResetPassword),  errorElement: <RouteErrorElement /> },

  // ── صفحات ارور (بدون Layout و بدون نیاز به ورود؛ باید همیشه رندر بشن حتی اگه بقیه‌ی اپ خرابه) ──
  { path: '/403', element: s(Forbidden) },
  { path: '/500', element: s(ServerErrorPage) },

  // ── پنل اصلی (نیاز به ورود) ──
  {
    path: '/',
    element: <RequireAuth><ErrorBoundary><AppLayout /></ErrorBoundary></RequireAuth>,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true,       element: s(Dashboard) },
      { path: 'invoices',  element: g('invoices', Invoices) },
      { path: 'expenses',  element: g('payments', Expenses) },
      { path: 'payments',  element: g('payments', Payments) },
      { path: 'checks',    element: g('checks', Checks) },
      { path: 'receipts',  element: g('payments', Receipts) },
      { path: 'clients',   element: g('clients', Clients) },
      { path: 'employees', element: g('employees', Employees) },
      { path: 'partners',  element: g('partners', Partners) },
      { path: 'banking',   element: g('banking_accounts', BankingAccounts) },
      { path: 'products',  element: g('products', Products) },
      { path: 'reports',   element: g('reports', Reports) },
      { path: 'holo',      element: s(HoloIntegration) },
      { path: 'settings',  element: s(Settings) },
      { path: 'oversight', element: <RequireModule ownerOnly>{s(OwnerOversight)}</RequireModule> },
    ],
  },

  // ── هر مسیر ناشناخته‌ی دیگه (باید همیشه آخرین آیتم لیست باشه) ──
  { path: '*', element: s(NotFound) },
])
