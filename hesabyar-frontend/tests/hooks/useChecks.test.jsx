import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChecks, useCheckSummary } from '@/hooks/useChecks'
import { mockFetchOnce, mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useChecks', () => {
  it('لیست چک‌ها رو می‌گیره', async () => {
    mockFetchOnce([{ id: 'ch1', direction: 'received', amount: 1000 }])

    const { result } = renderHook(() => useChecks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.checks).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('برخلاف بقیه‌ی هوک‌ها، وقتی سرور خطا می‌ده به mock فال‌بک نمی‌کنه — خطای واقعی رو نگه می‌داره', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useChecks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.checks).toEqual([])
    expect(result.current.error).toBeTruthy()
  })

  it('changeStatus باید درخواست تغییر وضعیت بفرسته و لیست رو رفرش کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'ch1', status: 'in_hand' }] },
      { body: { id: 'ch1', status: 'deposited' } },
      { body: [{ id: 'ch1', status: 'deposited' }] },
    ])

    const { result } = renderHook(() => useChecks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.changeStatus('ch1', 'deposited', 'یادداشت') })

    const call = global.fetch.mock.calls[1]
    expect(call[0]).toContain('/checks/ch1/status')
    expect(JSON.parse(call[1].body)).toEqual({ status: 'deposited', note: 'یادداشت' })
  })
})

describe('useCheckSummary', () => {
  it('خلاصه‌ی چک‌ها رو می‌گیره', async () => {
    mockFetchOnce({ inHandTotal: 500, upcomingCount: 3 })
    const { result } = renderHook(() => useCheckSummary())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary.upcomingCount).toBe(3)
  })

  it('اگه خطا بده، summary رو null نگه می‌داره (نه کرش)', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useCheckSummary())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary).toBeNull()
  })
})
