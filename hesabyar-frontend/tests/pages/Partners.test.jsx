import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Partners from '@/pages/Partners'

function mockFetchSequence(responses) {
  const fn = vi.fn()
  responses.forEach(({ body, ok = true, status = ok ? 200 : 500 }) => {
    fn.mockResolvedValueOnce({ ok, status, json: async () => body })
  })
  global.fetch = fn
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('صفحه‌ی Partners — حالت خالی', () => {
  it('وقتی هیچ شریکی نیست، EmptyState نشون می‌ده', async () => {
    mockFetchSequence([
      { body: [] },                                              // GET /partners
      { body: { partners: [], totalEquity: 0, shareSum: 0 } },   // GET /partner-ledger/balances
    ])

    render(<Partners />)

    await waitFor(() => {
      expect(screen.getByText('هنوز شریکی ثبت نشده')).toBeInTheDocument()
    })
  })
})

describe('صفحه‌ی Partners — با دیتای واقعی', () => {
  it('لیست شرکا و کارت‌های آماری رو با دیتای درست نشون می‌ده', async () => {
    mockFetchSequence([
      { body: [
        { id: 'p1', name: 'علی رضایی', role: 'مدیرعامل', share: 60, phone: '0912', join_date: '2024-01-01', capital: 1_000_000, accounts_json: '[]' },
        { id: 'p2', name: 'سارا کریمی', role: 'سهام‌دار', share: 30, phone: '0915', join_date: '2024-01-01', capital: 500_000, accounts_json: '[]' },
      ] },
      { body: {
        partners: [
          { partnerId: 'p1', name: 'علی رضایی', share: 60, balance: 1_200_000 },
          { partnerId: 'p2', name: 'سارا کریمی', share: 30, balance: 500_000 },
        ],
        totalEquity: 1_700_000,
        shareSum: 90,
      } },
    ])

    render(<Partners />)

    await waitFor(() => {
      expect(screen.getAllByText('علی رضایی').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('سارا کریمی').length).toBeGreaterThan(0)

    // چون مجموع سهام ۹۰٪ شده (نه ۱۰۰٪)، کارت آماری باید هشدار بده
    expect(screen.getByText('باید ۱۰۰٪ بشه')).toBeInTheDocument()
  })

  it('وقتی سرور جواب نده، بنر «دیتای نمونه» رو نشون می‌ده', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<Partners />)

    await waitFor(() => {
      expect(screen.getByText(/دیتای واقعی ثبت نشده/)).toBeInTheDocument()
    })
  })
})
