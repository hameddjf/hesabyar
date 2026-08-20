import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireModule from '@/components/auth/RequireModule'
import { useAuthStore } from '@/store/authStore'

const ORIGINAL_STATE = useAuthStore.getState()

afterEach(() => {
  useAuthStore.setState(ORIGINAL_STATE, true)
})

function renderWithGuard(moduleKey, { initialPath = '/protected', ownerOnly = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={
          <RequireModule module={moduleKey} ownerOnly={ownerOnly}><div>محتوای محافظت‌شده</div></RequireModule>
        } />
        <Route path="/403" element={<div>صفحه‌ی ممنوعه</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireModule', () => {
  it('اگه کاربر به این ماژول دسترسی داشته باشه، محتوا رو نشون می‌ده', () => {
    useAuthStore.setState({ user: { role: 'employee', perms: { partners: true } } })
    renderWithGuard('partners')
    expect(screen.getByText('محتوای محافظت‌شده')).toBeInTheDocument()
  })

  it('اگه کاربر به این ماژول دسترسی نداشته باشه، به /403 ری‌دایرکت می‌کنه', () => {
    useAuthStore.setState({ user: { role: 'employee', perms: { partners: false } } })
    renderWithGuard('partners')
    expect(screen.getByText('صفحه‌ی ممنوعه')).toBeInTheDocument()
    expect(screen.queryByText('محتوای محافظت‌شده')).not.toBeInTheDocument()
  })

  it('owner/admin همیشه دسترسی داره حتی اگه perms هنوز نیومده باشه', () => {
    useAuthStore.setState({ user: { role: 'owner', perms: null } })
    renderWithGuard('partners')
    expect(screen.getByText('محتوای محافظت‌شده')).toBeInTheDocument()
  })

  it('وقتی perms هنوز نیومده (لحظه‌ی اول لود) کارمند رو قفل نمی‌کنه، منتظر می‌مونه', () => {
    useAuthStore.setState({ user: { role: 'employee', perms: null } })
    renderWithGuard('partners')
    expect(screen.getByText('محتوای محافظت‌شده')).toBeInTheDocument()
  })
})

describe('RequireModule — ownerOnly', () => {
  it('owner به صفحه‌ی ownerOnly دسترسی داره', () => {
    useAuthStore.setState({ user: { role: 'owner' } })
    renderWithGuard(null, { ownerOnly: true })
    expect(screen.getByText('محتوای محافظت‌شده')).toBeInTheDocument()
  })

  it('کارمند به صفحه‌ی ownerOnly دسترسی نداره', () => {
    useAuthStore.setState({ user: { role: 'employee' } })
    renderWithGuard(null, { ownerOnly: true })
    expect(screen.getByText('صفحه‌ی ممنوعه')).toBeInTheDocument()
  })
})
