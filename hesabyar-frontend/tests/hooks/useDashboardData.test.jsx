import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData, MOCK_STATS } from '@/hooks/useDashboardData'
import { mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'
import { todayJalali } from '@/lib/jalali'

function isoForCurrentJalaliMonth(day = 10) {
  // یه تاریخ ISO داخل همین ماه شمسی جاری می‌سازه، چون buildMonthlyFromISO فقط ۶ ماه اخیر رو می‌بینه
  const { jalaliToISO } = require('@/lib/jalali')
  const { jy, jm } = todayJalali()
  return jalaliToISO(jy, jm, day)
}

afterEach(() => { vi.restoreAllMocks() })

describe('useDashboardData', () => {
  it('اگه هیچ فاکتور/مشتری‌ای نباشه، به دیتای نمونه فال‌بک می‌کنه', async () => {
    mockFetchSequence([{ body: [] }, { body: [] }, { body: [] }])

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(true)
    expect(result.current.data.stats).toEqual(MOCK_STATS)
  })

  it('درآمد رو فقط از فاکتورهای sale/presale پرداخت‌شده حساب می‌کنه', async () => {
    mockFetchSequence([
      { body: [
        { id: 'i1', type: 'sale', status: 'paid', grand_total: 1000, client_id: 'c1' },
        { id: 'i2', type: 'sale', status: 'pending', grand_total: 5000, client_id: 'c1' }, // پرداخت‌نشده، نباید حساب بشه
        { id: 'i3', type: 'buy', status: 'paid', grand_total: 9999, client_id: 'c1' },      // خرید، نه فروش
      ] }, // /invoices
      { body: [] }, // /payments
      { body: [{ id: 'c1', name: 'مشتری الف' }] }, // clients.list
    ])

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    expect(result.current.data.stats.revenue).toBe(1000)
    expect(result.current.data.stats.openInvoices).toBe(1)
  })

  it('هزینه‌ها رو فقط از payments با transaction_type=expense حساب می‌کنه', async () => {
    mockFetchSequence([
      { body: [] },
      { body: [
        { id: 'p1', transaction_type: 'expense', amount: 300 },
        { id: 'p2', transaction_type: 'receipt', amount: 99999 },
      ] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
    ])

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data.stats.expenses).toBe(300)
  })

  it('اگه سرور کلاً قطع باشه، فال‌بک به mock + error پر می‌شه', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.error).toBeTruthy()
  })
})
