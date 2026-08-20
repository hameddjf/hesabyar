import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePartners, usePartnerLedger } from '@/hooks/usePartners'

function mockFetchOnce(body, ok = true, status = ok ? 200 : 500) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok, status,
    json: async () => body,
  })
}
function mockFetchSequence(responses) {
  const fn = vi.fn()
  responses.forEach(({ body, ok = true, status = ok ? 200 : 500 }) => {
    fn.mockResolvedValueOnce({ ok, status, json: async () => body })
  })
  global.fetch = fn
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePartners', () => {
  it('لیست شرکا رو با موفقیت می‌گیره و isMock رو false نگه می‌داره', async () => {
    mockFetchOnce([{ id: 'p1', name: 'علی رضایی', role: 'مدیرعامل', share: 60, phone: '0912', join_date: '2024-01-01', capital: 1000, accounts_json: '[]' }])

    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    expect(result.current.partners).toHaveLength(1)
    expect(result.current.partners[0].name).toBe('علی رضایی')
  })

  it('اگه سرور جواب نده، به دیتای نمونه (mock) فال‌بک می‌کنه', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(true)
    expect(result.current.partners.length).toBeGreaterThan(0)
  })

  it('createPartner باید POST بزنه و بعدش لیست رو دوباره بگیره', async () => {
    mockFetchSequence([
      { body: [] },                                    // fetch اولیه‌ی لیست
      { body: { id: 'new1' } },                         // پاسخ POST
      { body: [{ id: 'new1', name: 'شریک جدید', role: 'شریک', share: 10, phone: '0910', join_date: '2024-01-01', capital: 0, accounts_json: '[]' }] }, // reload بعد از ساخت
    ])

    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createPartner({ name: 'شریک جدید', role: 'شریک', share: 10, phone: '0910', join_date: '2024-01-01', capital: 0, accounts: [] })
    })

    expect(global.fetch).toHaveBeenCalledTimes(3)
    const postCall = global.fetch.mock.calls[1]
    expect(postCall[1].method).toBe('POST')
    expect(result.current.partners[0].name).toBe('شریک جدید')
  })
})

describe('usePartnerLedger', () => {
  it('موجودی‌ها و جمع سهام رو از /partner-ledger/balances می‌گیره', async () => {
    mockFetchOnce({
      partners: [{ partnerId: 'p1', name: 'علی', share: 60, balance: 5000 }],
      totalEquity: 5000,
      shareSum: 60,
    })

    const { result } = renderHook(() => usePartnerLedger())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    expect(result.current.totalEquity).toBe(5000)
    expect(result.current.shareSum).toBe(60)
    expect(result.current.balances).toHaveLength(1)
  })

  it('اگه بک‌اند جواب نده، isMock می‌شه true و مقادیر صفر/خالی می‌مونن', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => usePartnerLedger())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(true)
    expect(result.current.balances).toEqual([])
    expect(result.current.totalEquity).toBe(0)
  })

  it('distributeProfit باید POST بزنه و بعدش موجودی‌ها رو رفرش کنه', async () => {
    mockFetchSequence([
      { body: { partners: [], totalEquity: 0, shareSum: 100 } },          // بارگذاری اولیه
      { body: { ok: true } },                                             // پاسخ POST تقسیم سود
      { body: { partners: [{ partnerId: 'p1', name: 'علی', share: 100, balance: 20000 }], totalEquity: 20000, shareSum: 100 } }, // رفرش بعدی
    ])

    const { result } = renderHook(() => usePartnerLedger())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.distributeProfit({ totalAmount: 20000, date: '2024-01-01', description: 'سود' })
    })

    const postCall = global.fetch.mock.calls[1]
    expect(postCall[0]).toContain('/partner-ledger/distribute-profit')
    expect(postCall[1].method).toBe('POST')
    expect(result.current.totalEquity).toBe(20000)
  })

  it('removeTransaction باید DELETE بزنه', async () => {
    mockFetchSequence([
      { body: { partners: [], totalEquity: 0, shareSum: 0 } },
      { body: { ok: true }, status: 204 },
      { body: { partners: [], totalEquity: 0, shareSum: 0 } },
    ])

    const { result } = renderHook(() => usePartnerLedger())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.removeTransaction('p1', 'tx1')
    })

    const delCall = global.fetch.mock.calls[1]
    expect(delCall[0]).toContain('/partner-ledger/p1/transactions/tx1')
    expect(delCall[1].method).toBe('DELETE')
  })
})
