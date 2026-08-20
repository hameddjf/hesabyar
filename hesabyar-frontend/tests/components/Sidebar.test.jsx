import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n' // Sidebar از useTranslation استفاده می‌کنه، پس i18next باید قبل از رندر مقداردهی شده باشه
import Sidebar from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'

const ORIGINAL_STATE = useAuthStore.getState()

afterEach(() => {
  useAuthStore.setState(ORIGINAL_STATE, true)
})

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar — هویت واقعی کاربر', () => {
  it('نام و نقش واقعی کاربر لاگین‌شده رو نشون می‌ده، نه متن ثابت', () => {
    useAuthStore.setState({
      user: { id: 1, name: 'زهرا حسینی', role: 'owner', email: 'z@x.com', companyId: 'c1', perms: null },
    })
    renderSidebar()
    expect(screen.getByText('زهرا حسینی')).toBeInTheDocument()
    expect(screen.queryByText('علی محمدی')).not.toBeInTheDocument()
  })
})

describe('Sidebar — فیلتر منو بر اساس دسترسی واقعی', () => {
  it('owner همه‌ی آیتم‌های منو رو می‌بینه', () => {
    useAuthStore.setState({
      user: { id: 1, name: 'مالک شرکت', role: 'owner', perms: {
        clients: true, products: true, invoices: true, payments: true, checks: true,
        employees: true, banking_accounts: true, partners: true, reports: true, canDelete: true,
      } },
    })
    renderSidebar()
    expect(screen.getByText('شرکا')).toBeInTheDocument()
    expect(screen.getByText('فاکتورها')).toBeInTheDocument()
  })

  it('کارمندی که دسترسی partners نداره، آیتم «شرکا» رو توی منو نمی‌بینه', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'کارمند محدود', role: 'employee', perms: {
        clients: true, products: false, invoices: true, payments: false, checks: false,
        employees: false, banking_accounts: false, partners: false, reports: true, canDelete: false,
      } },
    })
    renderSidebar()
    expect(screen.queryByText('شرکا')).not.toBeInTheDocument()
    expect(screen.getByText('فاکتورها')).toBeInTheDocument()
    expect(screen.queryByText('محصولات')).not.toBeInTheDocument()
  })

  it('صفحاتی که ماژول‌محور نیستن (داشبورد/تنظیمات) همیشه برای هر کاربری دیده می‌شن', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'کارمند محدود', role: 'employee', perms: {
        clients: false, products: false, invoices: false, payments: false, checks: false,
        employees: false, banking_accounts: false, partners: false, reports: false, canDelete: false,
      } },
    })
    renderSidebar()
    expect(screen.getByText('داشبورد')).toBeInTheDocument()
    expect(screen.getByText('تنظیمات')).toBeInTheDocument()
  })

  it('آیتم «نظارت مالک» فقط برای owner/admin دیده می‌شه', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'کارمند محدود', role: 'employee', perms: {
        clients: true, products: true, invoices: true, payments: true, checks: true,
        employees: true, banking_accounts: true, partners: true, reports: true, canDelete: true,
      } },
    })
    renderSidebar()
    expect(screen.queryByText('نظارت مالک')).not.toBeInTheDocument()
  })
})
