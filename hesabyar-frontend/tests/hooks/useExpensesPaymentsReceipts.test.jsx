import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useReceipts } from '@/hooks/useReceipts'
import { mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useExpenses', () => {
  it('فقط ردیف‌های transaction_type=expense رو نگه می‌داره و اسم شریک رو join می‌کنه', async () => {
    mockFetchSequence([
      { body: [
        { id: 'p1', transaction_type: 'expense', partner_id: 'pt1', amount: 5000, description: 'اجاره' },
        { id: 'p2', transaction_type: 'receipt', partner_id: 'pt1', amount: 9999999 }, // نباید بیاد
      ] }, // payments.list
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },                                    // fetchPartners -> /partners
    ])

    const { result } = renderHook(() => useExpenses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.expenses).toHaveLength(1)
    expect(result.current.expenses[0].partner).toBe('علی رضایی')
    expect(result.current.expenses[0].desc).toBe('اجاره')
  })

  it('اگه هیچ هزینه‌ای نباشه، فال‌بک به mock', async () => {
    mockFetchSequence([{ body: [] }, { body: [] }])
    const { result } = renderHook(() => useExpenses())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
  })
})

describe('usePayments', () => {
  it('پرداختی‌ها رو با اسم مشتری و شریک تجمیع می‌کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', partner_id: 'pt1', client_id: 'c1', amount: 1000 }] }, // payments.list
      { body: [{ id: 'c1', name: 'مشتری الف' }] },                                 // clients.list
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },                                // fetchPartners
    ])

    const { result } = renderHook(() => usePayments())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.payments[0].to).toBe('مشتری الف')
    expect(result.current.payments[0].partner).toBe('علی رضایی')
  })
})

describe('useReceipts', () => {
  it('فقط ردیف‌های transaction_type=receipt رو نگه می‌داره', async () => {
    mockFetchSequence([
      { body: [
        { id: 'p1', transaction_type: 'receipt', partner_id: 'pt1', client_id: 'c1', amount: 2000 },
        { id: 'p2', transaction_type: 'expense', amount: 9999999 },
      ] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    const { result } = renderHook(() => useReceipts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.receipts).toHaveLength(1)
    expect(result.current.receipts[0].from).toBe('مشتری الف')
  })

  it('اگه سرور کلاً جواب نده، فال‌بک به mock', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useReceipts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
  })

  it('updateReceipt باید api PUT /payments/:id رو صدا بزنه و بعدش لیست رو دوباره بخونه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', transaction_type: 'receipt', partner_id: 'pt1', client_id: 'c1', amount: 2000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: { id: 'p1', amount: 3000 } },                                        // PUT
      { body: [{ id: 'p1', transaction_type: 'receipt', partner_id: 'pt1', client_id: 'c1', amount: 3000 }] }, // reload
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    const { result } = renderHook(() => useReceipts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateReceipt('p1', { amount: 3000 }) })

    await waitFor(() => expect(result.current.receipts[0].amount).toBe((3000).toLocaleString('fa-IR')))
  })

  it('removeReceipt باید api DELETE /payments/:id رو صدا بزنه و بعدش لیست رو دوباره بخونه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', transaction_type: 'receipt', partner_id: 'pt1', client_id: 'c1', amount: 2000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: {}, status: 204 },                                                    // DELETE
      { body: [] },                                                                 // reload -> خالی -> mock
      { body: [] },
      { body: [] },
    ])

    const { result } = renderHook(() => useReceipts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.removeReceipt('p1') })

    await waitFor(() => expect(result.current.isMock).toBe(true))
  })
})
