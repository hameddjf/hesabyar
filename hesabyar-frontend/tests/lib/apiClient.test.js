import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, getToken, setToken, onUnauthorized, onTransientError } from '@/lib/apiClient'

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('توکن (localStorage)', () => {
  it('setToken ذخیره می‌کنه و getToken برش می‌گردونه', () => {
    setToken('abc123')
    expect(getToken()).toBe('abc123')
  })
  it('setToken(null) توکن رو پاک می‌کنه', () => {
    setToken('abc123')
    setToken(null)
    expect(getToken()).toBeNull()
  })
})

describe('هدرها', () => {
  it('اگه توکن باشه، هدر Authorization اضافه می‌شه', async () => {
    setToken('my-token')
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await api.get('/company')

    const headers = global.fetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer my-token')
  })
  it('بدون توکن، هدر Authorization فرستاده نمی‌شه', async () => {
    setToken(null)
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await api.get('/company')

    const headers = global.fetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })
})

describe('مدیریت خطا', () => {
  it('پاسخ غیر-ok رو به Exception با status درست تبدیل می‌کنه', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ error: 'داده نامعتبر' }),
      headers: { get: () => null },
    })

    await expect(api.get('/clients')).rejects.toMatchObject({ status: 400, message: 'داده نامعتبر' })
  })

  it('روی 401، توکن رو پاک می‌کنه و لیسنرهای onUnauthorized رو صدا می‌زنه', async () => {
    setToken('my-token')
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ error: 'توکن نامعتبر' }),
      headers: { get: () => null },
    })

    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)

    await expect(api.get('/clients')).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('روی خطای گذرا (503)، لیسنرهای onTransientError صدا زده می‌شن', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 503,
      json: async () => ({ error: 'سرور موقتاً در دسترس نیست' }),
      headers: { get: () => null },
    })

    const listener = vi.fn()
    const unsubscribe = onTransientError(listener)

    await expect(api.get('/clients')).rejects.toMatchObject({ status: 503 })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('قطعی کامل شبکه (fetch throw می‌کنه) رو به خطای isNetworkError تبدیل می‌کنه', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

    await expect(api.get('/clients')).rejects.toMatchObject({ isNetworkError: true, status: 0 })
  })

  it('پاسخ 204 رو null برمی‌گردونه (نه اینکه بخواد json پارس کنه)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('نباید صدا زده بشه') } })

    const res = await api.del('/clients/1')
    expect(res).toBeNull()
  })
})

describe('متدهای HTTP', () => {
  it('api.post بادی رو JSON.stringify می‌کنه و method رو POST می‌ذاره', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1 }) })

    await api.post('/clients', { name: 'تست' })

    const [, options] = global.fetch.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'تست' })
  })
})
