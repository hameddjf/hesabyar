import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Receipts from '@/pages/Receipts'
import * as csvLib from '@/lib/csv'
import * as xlsxLib from '@/lib/xlsx'

vi.mock('@/components/ui/CustomizableGrid', () => ({
  default: ({ widgetDefs, renderWidget }) => (
    <div>{widgetDefs.map((w) => <div key={w.id}>{renderWidget(w.id)}</div>)}</div>
  ),
}))

// دقیقاً همون دلیل Payments.test.jsx: فرم (که همیشه رندر می‌مونه) خودش useClients
// جدا صدا می‌زنه و صف fetch مخصوص useReceipts رو قاطی می‌کنه.
vi.mock('@/hooks/useClients', () => ({
  useClients: () => ({ clients: [{ id: 'c1', name: 'مشتری الف' }], loading: false, isMock: false }),
}))

function mockFetchSequence(responses) {
  const fn = vi.fn()
  responses.forEach(({ body, ok = true, status = ok ? 200 : 500 }) => {
    fn.mockResolvedValueOnce({ ok, status, json: async () => body })
  })
  global.fetch = fn
  return fn
}

const RECEIPT_ROW = {
  id: 'r1', partner_id: 'pt1', client_id: 'c1', amount: 45000000,
  method: 'transfer', status: 'confirmed', date: '2024-01-01', reference: '123456',
  transaction_type: 'receipt',
}

afterEach(() => { vi.restoreAllMocks() })

describe('صفحه‌ی Receipts — دکمه‌های عملیات', () => {
  it('دکمه‌ی حذف بعد از تاییدیه، removeReceipt رو صدا می‌زنه و رکورد از جدول می‌ره', async () => {
    mockFetchSequence([
      { body: [RECEIPT_ROW] },                       // payments.list
      { body: [{ id: 'c1', name: 'مشتری الف' }] },    // clients.list (داخل useReceipts.load)
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },   // fetchPartners
      { body: {}, status: 204 },                      // DELETE
      { body: [] }, { body: [] }, { body: [] },       // reload -> خالی
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Receipts />)
    await waitFor(() => expect(screen.getByText('مشتری الف')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('حذف'))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('مشتری الف')).not.toBeInTheDocument())
  })

  it('دکمه‌ی ویرایش، فرم رو با اطلاعات همون دریافتی باز می‌کنه', async () => {
    mockFetchSequence([
      { body: [RECEIPT_ROW] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    render(<Receipts />)
    await waitFor(() => expect(screen.getByText('مشتری الف')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('ویرایش'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('123456')).toBeInTheDocument()
    })
  })

  it('دکمه‌ی مشاهده، جزئیات دریافتی رو در یک مودال read-only نشون می‌ده', async () => {
    mockFetchSequence([
      { body: [RECEIPT_ROW] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])

    render(<Receipts />)
    await waitFor(() => expect(screen.getByText('مشتری الف')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('مشاهده جزئیات'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('دکمه‌ی CSV، downloadCSV رو با ردیف‌های فیلترشده صدا می‌زنه', async () => {
    mockFetchSequence([
      { body: [RECEIPT_ROW] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])
    const spy = vi.spyOn(csvLib, 'downloadCSV').mockImplementation(() => {})

    render(<Receipts />)
    await waitFor(() => expect(screen.getByText('مشتری الف')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /CSV/ }))

    expect(spy).toHaveBeenCalledTimes(1)
    const [, , rows] = spy.mock.calls[0]
    expect(rows.length).toBe(1)
  })

  it('دکمه‌ی Excel، downloadXLSX رو با یک sheet و ردیف‌های فیلترشده صدا می‌زنه', async () => {
    mockFetchSequence([
      { body: [RECEIPT_ROW] },
      { body: [{ id: 'c1', name: 'مشتری الف' }] },
      { body: [{ id: 'pt1', name: 'علی رضایی' }] },
    ])
    const spy = vi.spyOn(xlsxLib, 'downloadXLSX').mockImplementation(() => {})

    render(<Receipts />)
    await waitFor(() => expect(screen.getByText('مشتری الف')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Excel/ }))

    expect(spy).toHaveBeenCalledTimes(1)
    const [filename, sheets] = spy.mock.calls[0]
    expect(filename).toMatch(/\.xlsx$/)
    expect(sheets[0].rows.length).toBe(1)
  })
})
