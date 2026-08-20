import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext'
import AdminLogin      from './AdminLogin'
import AdminLayout     from './layout/AdminLayout'
import AdminDashboard  from './pages/AdminDashboard'
import AdminCompanies  from './pages/AdminCompanies'
import AdminUsers      from './pages/AdminUsers'
import AdminBilling    from './pages/AdminBilling'

function RequireAdminAuth({ children }) {
  const { admin } = useAdminAuth()
  if (!admin) return <Navigate to="/login" replace />
  return children
}

function AdminRoot() {
  const router = createHashRouter([
    { path: '/login', element: <AdminLogin /> },
    {
      path: '/',
      element: <RequireAdminAuth><AdminLayout /></RequireAdminAuth>,
      children: [
        { index: true,      element: <AdminDashboard /> },
        { path: 'companies', element: <AdminCompanies /> },
        { path: 'users',     element: <AdminUsers /> },
        { path: 'billing',   element: <AdminBilling /> },
      ],
    },
  ])

  return <RouterProvider router={router} />
}

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoot />
    </AdminAuthProvider>
  )
}
