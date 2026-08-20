import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotifications } from '@/hooks/useNotifications'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { mockFetchOnce, mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useNotifications', () => {
  it('لیست هشدارها رو می‌گیره و overdueCount رو درست می‌شمره', async () => {
    mockFetchOnce([
      { id: 1, overdue: true },
      { id: 2, overdue: false },
      { id: 3, overdue: true },
    ])

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.alerts).toHaveLength(3)
    expect(result.current.overdueCount).toBe(2)
  })

  it('اگه سرور جواب نده، لیست خالی برمی‌گردونه (نه کرش)', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alerts).toEqual([])
    expect(result.current.overdueCount).toBe(0)
  })
})

describe('useBankAccounts', () => {
  it('حساب‌های واقعی رو می‌گیره', async () => {
    mockFetchOnce([{ id: 'b1', bank: 'ملت', label: 'جاری', balance: 1000 }])

    const { result } = renderHook(() => useBankAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    expect(result.current.accounts).toHaveLength(1)
  })

  it('اگه لیست خالی باشه، به دیتای نمونه فال‌بک می‌کنه', async () => {
    mockFetchOnce([])
    const { result } = renderHook(() => useBankAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.accounts.length).toBeGreaterThan(0)
  })

  it('createAccount باید POST بزنه و لیست رو رفرش کنه', async () => {
    mockFetchSequence([
      { body: [] },
      { body: {} },
      { body: [{ id: 'b2', bank: 'صادرات', label: 'جدید', balance: 0 }] },
    ])

    const { result } = renderHook(() => useBankAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.createAccount({ bank: 'صادرات' }) })

    expect(global.fetch.mock.calls[1][1].method).toBe('POST')
    expect(result.current.accounts[0].bank).toBe('صادرات')
  })

  it('removeAccount باید DELETE بزنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'b1', bank: 'ملت' }] },
      { body: {}, status: 204 },
      { body: [] },
    ])

    const { result } = renderHook(() => useBankAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.removeAccount('b1') })

    expect(global.fetch.mock.calls[1][1].method).toBe('DELETE')
  })
})
