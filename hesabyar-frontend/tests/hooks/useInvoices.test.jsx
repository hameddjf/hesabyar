import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useInvoices } from '@/hooks/useInvoices'
import { mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useInvoices', () => {
  it('فاکتورها رو با اسم مشتری join می‌کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'i1', client_id: 'c1', grand_total: 5000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
    ])

    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.invoices[0].client).toBe('مشتری الف')
    expect(result.current.isMock).toBe(false)
  })

  it('اگه هیچ فاکتوری نباشه، فال‌بک به mock', async () => {
    mockFetchSequence([{ body: [] }, { body: [] }])
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
  })

  it('اگه سرور کلاً قطع باشه، به mock فال‌بک می‌کنه و error رو هم پر می‌کنه', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.error).toBeTruthy()
  })

  it('linkInvoices باید به /invoice-links POST بزنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'i1', client_id: 'c1' }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: { ok: true } },
      { body: [{ id: 'i1', client_id: 'c1' }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
    ])

    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.linkInvoices('i1', 'i2', 1000, 'تسویه')
    })

    const linkCall = global.fetch.mock.calls[2]
    expect(linkCall[0]).toContain('/invoice-links')
    expect(linkCall[1].method).toBe('POST')
  })

  it('removeInvoice باید DELETE بزنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'i1', client_id: 'c1' }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: {}, status: 204 },
      { body: [] },
      { body: [] },
    ])

    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.removeInvoice('i1') })

    const delCall = global.fetch.mock.calls[2]
    expect(delCall[0]).toContain('/invoices/i1')
    expect(delCall[1].method).toBe('DELETE')
  })
})
