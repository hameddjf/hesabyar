import { describe, it, expect } from 'vitest'
import { toCamel, formatToman } from '@/lib/format'

describe('toCamel', () => {
  it('کلیدهای snake_case رو به camelCase تبدیل می‌کنه', () => {
    expect(toCamel({ join_date: '2024-01-01', partner_id: 5 }))
      .toEqual({ joinDate: '2024-01-01', partnerId: 5 })
  })
  it('کلیدهای بدون underscore رو دست‌نخورده می‌ذاره', () => {
    expect(toCamel({ name: 'علی', share: 30 })).toEqual({ name: 'علی', share: 30 })
  })
  it('ورودی null/غیرآبجکت رو همون‌طور برمی‌گردونه', () => {
    expect(toCamel(null)).toBeNull()
    expect(toCamel(undefined)).toBeUndefined()
    expect(toCamel(5)).toBe(5)
  })
})

describe('formatToman', () => {
  it('عدد رو با جداکننده‌ی هزارگان فارسی نمایش می‌ده', () => {
    expect(formatToman(1000000)).toBe('۱٬۰۰۰٬۰۰۰')
  })
  it('صفر رو درست نمایش می‌ده (نه به‌عنوان مقدار خالی)', () => {
    expect(formatToman(0)).toBe('۰')
  })
  it('null/undefined رو به خط‌تیره تبدیل می‌کنه', () => {
    expect(formatToman(null)).toBe('—')
    expect(formatToman(undefined)).toBe('—')
  })
})
