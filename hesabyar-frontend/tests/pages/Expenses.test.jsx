import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Expenses from '@/pages/Expenses'
import * as csvLib from '@/lib/csv'
import * as xlsxLib from '@/lib/xlsx'

// CustomizableGrid/useLayout درخواست جدای خودش (/user-layouts) به fetch می‌زنه که با
// صف پاسخ‌های این تست (مخصوص payments/partners) قاطی می‌شه؛ چون رفتار چیدمان موضوع
// این تست نیست، ساده‌سازی می‌شه تا فقط widgetهای پیش‌فرض رو مستقیم رندر کنه.
vi.mock('@/components/ui/CustomizableGrid', () => ({
  default: ({ widgetDefs, renderWidget }) => (
    <div>{widgetDefs.map((w) => <div key={w.id}>{renderWidget(w.id)}</div>)}</div>
  ),
}))

function mockFetchSequence(responses) {
  const fn = vi.fn()
  responses.forEach(({ body, ok = true, status = ok ? 200 : 500 }) => {
    fn.mockResolvedValueOnce({ ok, status, json: async () => body })
  })
  global.fetch = fn
  return fn
}

const EXPENSE_ROW = {
  id: 'p1', transaction_type: 'expense', partner_id: 'pt1',
  amount: 5000, description: 'اجاره دفتر', category: 'rent', date: '2024-01-01',
}

afterEach(() => { vi.restoreAllMocks() })

describe('صفحه‌ی Expenses — دکمه‌های عملیات', () => {
  it('دکمه‌ی حذف بعد از تاییدیه، removeExpense رو صدا می‌زنه و رکورد از جدول می‌ره', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },              // payments.list
      { body: [{ id: 'pt1', name: 'علی رضایی' }] }, // fetchPartners
      { body: {}, status: 204 },            // DELETE
      { body: [] },                          // reload -> خالی
      { body: [] },
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    const deleteBtn = screen.getByLabelText('حذف')
    await user.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('اجاره دفتر')).not.toBeInTheDocument())
  })

  it('اگه کاربر تاییدیه‌ی حذف رو لغو کنه، هیچ درخواست DELETE ای نمی‌ره', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('حذف'))

    expect(window.confirm).toHaveBeenCalled()
    // فقط همون ۲ فراخوانی اولیه‌ی بارگذاری، نه درخواست حذف
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('دکمه‌ی ویرایش، فرم رو با اطلاعات همون هزینه باز می‌کنه', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('ویرایش'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('اجاره دفتر')).toBeInTheDocument()
    })
  })

  it('دکمه‌ی مشاهده، جزئیات هزینه رو در یک مودال read-only نشون می‌ده', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('مشاهده جزئیات'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('دکمه‌ی خروجی، downloadCSV رو با ردیف‌های فیلترشده صدا می‌زنه', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])
    const spy = vi.spyOn(csvLib, 'downloadCSV').mockImplementation(() => {})

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /CSV/ }))

    expect(spy).toHaveBeenCalledTimes(1)
    const [, , rows] = spy.mock.calls[0]
    expect(rows.length).toBe(1)
  })

  it('دکمه‌ی Excel، downloadXLSX رو با یک sheet و ردیف‌های فیلترشده صدا می‌زنه', async () => {
    mockFetchSequence([
      { body: [EXPENSE_ROW] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])
    const spy = vi.spyOn(xlsxLib, 'downloadXLSX').mockImplementation(() => {})

    render(<Expenses />)
    await waitFor(() => expect(screen.getByText('اجاره دفتر')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Excel/ }))

    expect(spy).toHaveBeenCalledTimes(1)
    const [filename, sheets] = spy.mock.calls[0]
    expect(filename).toMatch(/\.xlsx$/)
    expect(sheets[0].rows.length).toBe(1)
  })
})
