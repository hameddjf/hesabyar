import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCompanyUsers, emptyPermissions, PERMISSION_MODULES } from '@/hooks/useCompanyUsers'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useHoloSync } from '@/hooks/useHoloSync'
import { useLayout } from '@/hooks/useLayout'
import { mockFetchOnce, mockFetchSequence, mockFetchDown } from '../helpers/mockFetch'

afterEach(() => { vi.restoreAllMocks() })

describe('useCompanyUsers', () => {
  it('لیست کاربران رو می‌گیره', async () => {
    mockFetchOnce([{ id: 'u1', name: 'کاربر ۱', role: 'admin' }])
    const { result } = renderHook(() => useCompanyUsers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.users).toHaveLength(1)
  })

  it('اگه سرور خطا بده، error پر می‌شه (نه mock fallback)', async () => {
    mockFetchDown()
    const { result } = renderHook(() => useCompanyUsers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.users).toEqual([])
    expect(result.current.error).toBeTruthy()
  })

  it('inviteUser باید POST بزنه و نتیجه (شامل رمز موقت) رو برگردونه', async () => {
    mockFetchSequence([
      { body: [] },
      { body: { user: { id: 'u2' }, tempPassword: 'abc123' } },
      { body: [{ id: 'u2', name: 'جدید' }] },
    ])

    const { result } = renderHook(() => useCompanyUsers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.inviteUser({ name: 'جدید' }) })

    expect(res.tempPassword).toBe('abc123')
    expect(global.fetch.mock.calls[1][1].method).toBe('POST')
  })
})

describe('emptyPermissions', () => {
  it('همه‌ی ماژول‌ها رو false می‌ذاره', () => {
    const p = emptyPermissions()
    PERMISSION_MODULES.forEach((m) => expect(p[m.key]).toBe(false))
    expect(p.canDelete).toBe(false)
  })
})

describe('useActivityLog', () => {
  it('لاگ فعالیت‌ها رو می‌گیره و canRollback رو درست محاسبه می‌کنه', async () => {
    mockFetchOnce([
      { id: 1, action: 'create', entity: 'client', rolled_back: false, user_name: 'علی' },
      { id: 2, action: 'create', entity: 'client', rolled_back: true, user_name: 'علی' }, // قبلاً rollback شده
      { id: 3, action: 'login', entity: null, user_name: 'علی' },
    ])

    const { result } = renderHook(() => useActivityLog())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.log[0].canRollback).toBe(true)
    expect(result.current.log[1].canRollback).toBe(false) // چون قبلاً rollback شده
    expect(result.current.log[2].canRollback).toBe(false) // چون login قابل rollback نیست
  })

  it('rollback موفق باید true برگردونه و لاگ رو رفرش کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 1, action: 'create', entity: 'client', rolled_back: false }] },
      { body: { ok: true } },
      { body: [{ id: 1, action: 'create', entity: 'client', rolled_back: true }] },
    ])

    const { result } = renderHook(() => useActivityLog())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok
    await act(async () => { ok = await result.current.rollback(1) })

    expect(ok).toBe(true)
    expect(result.current.rollbackError).toBeNull()
  })

  it('rollback ناموفق باید false برگردونه و rollbackError رو پر کنه', async () => {
    mockFetchSequence([
      { body: [{ id: 1, action: 'create', entity: 'client', rolled_back: false }] },
      { body: { error: 'قابل بازگردانی نیست' }, ok: false, status: 400 },
    ])

    const { result } = renderHook(() => useActivityLog())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok
    await act(async () => { ok = await result.current.rollback(1) })

    expect(ok).toBe(false)
    expect(result.current.rollbackError).toBe('قابل بازگردانی نیست')
  })
})

describe('useHoloSync', () => {
  it('جدول‌ها و لاگ رو می‌گیره', async () => {
    mockFetchSequence([
      { body: [{ name: 'invoices' }] },
      { body: [{ id: 1, direction: 'import' }] },
    ])

    const { result } = renderHook(() => useHoloSync())
    await waitFor(() => expect(result.current.loadingLog).toBe(false))

    expect(result.current.tables).toHaveLength(1)
    expect(result.current.log).toHaveLength(1)
  })

  it('testConnection موفق باید testResult.ok=true بده', async () => {
    mockFetchSequence([
      { body: [] },
      { body: [] },
      { body: { ok: true } },
    ])

    const { result } = renderHook(() => useHoloSync())
    await waitFor(() => expect(result.current.loadingLog).toBe(false))

    let ok
    await act(async () => { ok = await result.current.testConnection({ host: '1.2.3.4' }) })

    expect(ok).toBe(true)
    expect(result.current.testResult.ok).toBe(true)
  })

  it('testConnection ناموفق باید پیام خطای سرور رو نشون بده', async () => {
    mockFetchSequence([
      { body: [] },
      { body: [] },
      { body: { error: 'اتصال برقرار نشد', detail: 'timeout' }, ok: false, status: 500 },
    ])

    const { result } = renderHook(() => useHoloSync())
    await waitFor(() => expect(result.current.loadingLog).toBe(false))

    let ok
    await act(async () => { ok = await result.current.testConnection({ host: 'x' }) })

    expect(ok).toBe(false)
    expect(result.current.testResult.ok).toBe(false)
    expect(result.current.testResult.message).toBe('timeout')
  })
})

describe('useLayout', () => {
  const widgetDefs = [
    { id: 'w1', title: 'ویجت ۱', defaultVisible: true },
    { id: 'w2', title: 'ویجت ۲', defaultVisible: false },
  ]

  it('اگه چیدمان ذخیره‌شده نباشه، از پیش‌فرض widgetDefs استفاده می‌کنه', async () => {
    mockFetchOnce({ layout: null }, { ok: false, status: 404 })

    const { result } = renderHook(() => useLayout('dashboard', widgetDefs))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.visibleItems.map((i) => i.id)).toEqual(['w1'])
    expect(result.current.hiddenItems.map((i) => i.id)).toEqual(['w2'])
  })

  it('toggleWidget باید persist کنه (PUT به user-layouts)', async () => {
    mockFetchSequence([
      { body: {}, ok: false, status: 404 },
      { body: { layout: [] } },
    ])

    const { result } = renderHook(() => useLayout('dashboard', widgetDefs))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { result.current.toggleWidget('w2') })
    await waitFor(() => expect(result.current.saving).toBe(false))

    const call = global.fetch.mock.calls[1]
    expect(call[0]).toContain('/user-layouts/dashboard')
    expect(call[1].method).toBe('PUT')
  })
})
