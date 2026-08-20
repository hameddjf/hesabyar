import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useEmployees } from '@/hooks/useEmployees'
import { useClients } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { mockFetchOnce, mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useEmployees', () => {
  it('کارمندهای واقعی رو می‌گیره و حساب بانکی رو تجمیع می‌کنه', async () => {
    mockFetchOnce([{ id: 'e1', name: 'مریم', position: 'فروش', bank: 'ملت', card: '1234', iban: 'IR1' }])

    const { result } = renderHook(() => useEmployees())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMock).toBe(false)
    expect(result.current.employees[0].account).toEqual({ bank: 'ملت', card: '1234', iban: 'IR1' })
  })

  it('اگه لیست خالی باشه، فال‌بک به mock', async () => {
    mockFetchOnce([])
    const { result } = renderHook(() => useEmployees())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
  })

  it('createEmployee آنلاین باید POST بزنه', async () => {
    mockFetchSequence([
      { body: [] },
      { body: {} },
      { body: [{ id: 'e2', name: 'جدید', position: 'ادمین' }] },
    ])

    const { result } = renderHook(() => useEmployees())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.createEmployee({ name: 'جدید' }) })

    expect(global.fetch.mock.calls[1][1].method).toBe('POST')
  })
})

describe('useClients', () => {
  it('مشتری‌ها رو با آمار فاکتور (تعداد و مجموع مبلغ) تجمیع می‌کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 'c1', name: 'مشتری الف', updated_at: '2024-01-01' }] }, // clients.list
      { body: [
        { id: 'i1', client_id: 'c1', grand_total: 1000 },
        { id: 'i2', client_id: 'c1', grand_total: 500 },
        { id: 'i3', client_id: 'other', grand_total: 999999 },
      ] }, // invoices.list
    ])

    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.clients[0].totalInvoices).toBe(2)
    expect(result.current.clients[0].totalAmount).toBe(1500)
  })

  it('اگه هیچ مشتری‌ای نباشه، فال‌بک به mock', async () => {
    mockFetchSequence([{ body: [] }, { body: [] }])
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
  })
})

describe('useProducts', () => {
  it('محصولات رو می‌گیره و description رو به desc نگاشت می‌کنه', async () => {
    mockFetchOnce([{ id: 'p1', name: 'محصول ۱', description: 'توضیح', price: '100', stock: '5' }])

    const { result } = renderHook(() => useProducts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.products[0].desc).toBe('توضیح')
    expect(result.current.products[0].price).toBe(100)
    expect(result.current.products[0].stock).toBe(5)
  })

  it('stock نال رو null نگه می‌داره (نه صفر) — یعنی کالای خدماتی بدون موجودی', async () => {
    mockFetchOnce([{ id: 'p1', name: 'خدمت', description: '', price: '100', stock: null }])
    const { result } = renderHook(() => useProducts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.products[0].stock).toBeNull()
  })

  it('اگه سرور خطا بده، isMock=true و error پر می‌شه', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useProducts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.error).toBeTruthy()
  })
})
