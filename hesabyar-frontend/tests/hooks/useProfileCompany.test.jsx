import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useProfile } from '@/hooks/useProfile'
import { useCompany } from '@/hooks/useCompany'
import { mockFetchOnce, mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useProfile', () => {
  it('پروفایل کاربر رو می‌گیره و به camelCase تبدیل می‌کنه', async () => {
    mockFetchOnce({ id: 'u1', name: 'علی', role: 'owner', join_date: '2024-01-01' })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.profile.joinDate).toBe('2024-01-01')
  })

  it('اگه سرور خطا بده، پیام خطا رو ست می‌کنه (نه فال‌بک به mock)', async () => {
    mockFetchOnce({ error: 'سرور در دسترس نیست' }, { ok: false, status: 500 })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBe('سرور در دسترس نیست')
  })

  it('updateProfile باید PATCH بزنه و پروفایل جدید رو برگردونه', async () => {
    mockFetchSequence([
      { body: { id: 'u1', name: 'علی' } },                  // بارگذاری اولیه
      { body: { id: 'u1', name: 'علی رضایی جدید' } },        // پاسخ updateMe
    ])

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let updated
    await act(async () => {
      updated = await result.current.updateProfile({ name: 'علی رضایی جدید' })
    })

    expect(updated.name).toBe('علی رضایی جدید')
    const patchCall = global.fetch.mock.calls[1]
    expect(patchCall[1].method).toBe('PATCH')
  })
})

describe('useCompany', () => {
  it('اطلاعات شرکت رو می‌گیره', async () => {
    mockFetchOnce({ id: 'c1', name: 'شرکت تست', national_id: '12345' })

    const { result } = renderHook(() => useCompany())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.company.nationalId).toBe('12345')
  })

  it('updateCompany باید PUT بزنه', async () => {
    mockFetchSequence([
      { body: { id: 'c1', name: 'شرکت قدیمی' } },
      { body: { id: 'c1', name: 'شرکت جدید' } },
    ])

    const { result } = renderHook(() => useCompany())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateCompany({ name: 'شرکت جدید' }) })

    expect(result.current.company.name).toBe('شرکت جدید')
    expect(global.fetch.mock.calls[1][1].method).toBe('PUT')
  })
})
