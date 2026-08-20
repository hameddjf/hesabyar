import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { mockFetchSequence } from '../helpers/mockFetch'

/**
 * این فایل مکمل tests/hooks/useExpensesPaymentsReceipts.test.jsx است — اونجا فقط
 * خواندن (list) پوشش داده شده بود. اینجا عملیات نوشتنِ تازه‌اضافه‌شده (ویرایش/حذف)
 * تست می‌شن، چون طبق قانون TDD پروژه هر فیچر جدید باید تست رگرسیون داشته باشه.
 */

afterEach(() => { vi.restoreAllMocks() })

describe('useExpenses — updateExpense/removeExpense', () => {
  it('updateExpense با متد PUT به /payments/:id درخواست می‌زنه و لیست رو رفرش می‌کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', transaction_type: 'expense', partner_id: 'pt1', amount: 5000, description: 'اجاره' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: { id: 'p1' } }, // پاسخ PUT
      { body: [{ id: 'p1', transaction_type: 'expense', partner_id: 'pt1', amount: 7000, description: 'اجاره ویرایش‌شده' }] }, // reload
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    const { result } = renderHook(() => useExpenses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateExpense('p1', { description: 'اجاره ویرایش‌شده', amount: 7000 })
    })

    // سومین فراخوانی fetch باید PUT به /payments/p1 باشه
    const thirdCall = global.fetch.mock.calls[2]
    expect(thirdCall[0]).toContain('/payments/p1')
    expect(thirdCall[1].method).toBe('PUT')

    await waitFor(() => expect(result.current.expenses[0].desc).toBe('اجاره ویرایش‌شده'))
  })

  it('removeExpense با متد DELETE به /payments/:id درخواست می‌زنه و لیست رو رفرش می‌کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', transaction_type: 'expense', partner_id: 'pt1', amount: 5000, description: 'اجاره' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: {}, status: 204 }, // پاسخ DELETE
      { body: [] }, // reload -> خالی -> فال‌بک mock
      { body: [] },
    ])

    const { result } = renderHook(() => useExpenses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.removeExpense('p1')
    })

    const thirdCall = global.fetch.mock.calls[2]
    expect(thirdCall[0]).toContain('/payments/p1')
    expect(thirdCall[1].method).toBe('DELETE')
  })
})

describe('usePayments — updatePayment/removePayment', () => {
  it('updatePayment با متد PUT به /payments/:id درخواست می‌زنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', partner_id: 'pt1', client_id: 'c1', amount: 1000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: { id: 'p1' } },
      { body: [{ id: 'p1', partner_id: 'pt1', client_id: 'c1', amount: 2000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    const { result } = renderHook(() => usePayments())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updatePayment('p1', { amount: 2000 })
    })

    const fourthCall = global.fetch.mock.calls[3]
    expect(fourthCall[0]).toContain('/payments/p1')
    expect(fourthCall[1].method).toBe('PUT')
  })

  it('removePayment با متد DELETE به /payments/:id درخواست می‌زنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'p1', partner_id: 'pt1', client_id: 'c1', amount: 1000 }] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
      { body: {}, status: 204 },
      { body: [] },
      { body: [] },
      { body: [] },
    ])

    const { result } = renderHook(() => usePayments())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.removePayment('p1')
    })

    const fourthCall = global.fetch.mock.calls[3]
    expect(fourthCall[0]).toContain('/payments/p1')
    expect(fourthCall[1].method).toBe('DELETE')
  })
})
