import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReportsData } from '@/hooks/useReportsData'
import { mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'
import { vi } from 'vitest'

afterEach(() => { vi.restoreAllMocks() })

describe('useReportsData', () => {
  it('وقتی فاکتور/پرداختی خالیه، به دیتای نمونه (mock) فال‌بک می‌کنه', async () => {
    mockFetchSequence([
      { body: [] }, // /invoices
      { body: [] }, // /payments
      { body: [] }, // clients.list
      { body: [] }, // fetchPartners -> /partners (خالی هم باشه usePartners خودش mock برمی‌گردونه)
    ])

    const { result } = renderHook(() => useReportsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(true)
    expect(result.current.data.totals).toEqual({ income: 472, expense: 273, profit: 199, margin: 42 })
  })

  it('با دیتای واقعی، جمع درآمد/هزینه/سود رو درست محاسبه می‌کنه', async () => {
    mockFetchSequence([
      { body: [
        { id: 'inv1', type: 'sale', status: 'paid', client_id: 'c1', grand_total: 1_000_000, issue_date: '2024-05-01' },
        { id: 'inv2', type: 'sale', status: 'draft', client_id: 'c1', grand_total: 500_000, issue_date: '2024-05-02' }, // draft، نباید توی درآمد حساب بشه
      ] },
      { body: [
        { id: 'pay1', transaction_type: 'expense', amount: 300_000, category: 'rent', date: '2024-05-03' },
      ] },
      { body: [{ id: 'c1', name: 'مشتری تست' }] },
      { body: [] }, // fetchPartners → خالی → usePartners خودش MOCK_PARTNERS برمی‌گردونه، partnerPerf محاسبه‌ی مالی رو خراب نمی‌کنه چون هیچ payment ای partnerId نداره
    ])

    const { result } = renderHook(() => useReportsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    // ۱ میلیون درآمد (فقط فاکتور paid)، ۳۰۰ هزار هزینه → به میلیون تومان: ۱ و ۰.۳
    expect(result.current.data.totals.income).toBe(1)
    expect(result.current.data.totals.expense).toBe(0.3)
    expect(result.current.data.totals.profit).toBe(0.7)
  })

  it('اگه سرور کلاً جواب نده، isMock=true و دیتای نمونه برمی‌گرده (بدون کرش)', async () => {
    mockFetchDown()

    const { result } = renderHook(() => useReportsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(true)
    expect(result.current.data).not.toBeNull()
    expect(result.current.error).toBeTruthy()
  })
})
