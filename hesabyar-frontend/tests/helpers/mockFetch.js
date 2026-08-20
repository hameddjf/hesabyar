import { vi } from 'vitest'

/** یه پاسخ موفق/ناموفق برای اولین فراخوانی fetch */
export function mockFetchOnce(body, { ok = true, status = ok ? 200 : 500 } = {}) {
  global.fetch = vi.fn().mockResolvedValueOnce({ ok, status, json: async () => body })
  return global.fetch
}

/** چند پاسخ پشت‌سرهم برای فراخوانی‌های متوالی fetch (به ترتیب همون‌طور که هوک صداشون می‌زنه) */
export function mockFetchSequence(responses) {
  const fn = vi.fn()
  responses.forEach(({ body, ok = true, status = ok ? 200 : 500 }) => {
    fn.mockResolvedValueOnce({ ok, status, json: async () => body })
  })
  global.fetch = fn
  return fn
}

/** شبیه‌سازی قطعی کامل شبکه (fetch throw می‌کنه، نه فقط ok:false) */
export function mockFetchDown() {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
  return global.fetch
}
