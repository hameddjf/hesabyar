import { describe, it, expect } from 'vitest'
import { canAccessNavKey } from '@/lib/permissions'

describe('canAccessNavKey', () => {
  it('برای کلیدهای بدون نگاشت (dashboard/holo/settings) همیشه true برمی‌گردونه', () => {
    expect(canAccessNavKey({ invoices: false }, 'dashboard')).toBe(true)
    expect(canAccessNavKey({ invoices: false }, 'holo')).toBe(true)
    expect(canAccessNavKey({ invoices: false }, 'settings')).toBe(true)
  })

  it('وقتی perms هنوز نیومده (null/undefined) باید true برگردونه (نه قفل‌کردن UI حین لود)', () => {
    expect(canAccessNavKey(null, 'invoices')).toBe(true)
    expect(canAccessNavKey(undefined, 'partners')).toBe(true)
  })

  it('اگه ماژول متناظر false باشه، دسترسی رد می‌شه', () => {
    expect(canAccessNavKey({ invoices: false, partners: true }, 'invoices')).toBe(false)
  })

  it('اگه ماژول متناظر true باشه، دسترسی تاییده', () => {
    expect(canAccessNavKey({ invoices: true }, 'invoices')).toBe(true)
  })

  it('دریافتی/پرداختی/هزینه‌ها همه به ماژول payments نگاشت می‌شن', () => {
    const perms = { payments: true }
    expect(canAccessNavKey(perms, 'receipts')).toBe(true)
    expect(canAccessNavKey(perms, 'expenses')).toBe(true)
    expect(canAccessNavKey({ payments: false }, 'receipts')).toBe(false)
  })

  it('banking به ماژول banking_accounts نگاشت می‌شه', () => {
    expect(canAccessNavKey({ banking_accounts: true }, 'banking')).toBe(true)
    expect(canAccessNavKey({ banking_accounts: false }, 'banking')).toBe(false)
  })
})
