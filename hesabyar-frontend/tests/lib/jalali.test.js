import { describe, it, expect } from 'vitest'
import {
  toFaDigits, jalaliToISO, isoToJalali, isoToFaDisplay, isoToFaLong,
  parseISOStrict, todayISO, addDaysISO,
} from '@/lib/jalali'

describe('toFaDigits', () => {
  it('ارقام انگلیسی رو به فارسی تبدیل می‌کنه', () => {
    expect(toFaDigits(1404)).toBe('۱۴۰۴')
    expect(toFaDigits('20')).toBe('۲۰')
  })
})

describe('jalaliToISO / isoToJalali (رفت‌وبرگشت)', () => {
  it('یه تاریخ شمسی شناخته‌شده رو درست به ISO تبدیل می‌کنه', () => {
    // اول فروردین ۱۴۰۳ برابره با ۲۰ مارس ۲۰۲۴
    expect(jalaliToISO(1403, 1, 1)).toBe('2024-03-20')
  })

  it('رفت‌وبرگشت شمسی -> ISO -> شمسی باید همون تاریخ رو بده', () => {
    const iso = jalaliToISO(1404, 5, 15)
    const back = isoToJalali(iso)
    expect(back).toEqual({ jy: 1404, jm: 5, jd: 15 })
  })

  it('ورودی خالی/نامعتبر باید null بده', () => {
    expect(isoToJalali('')).toBeNull()
    expect(isoToJalali(null)).toBeNull()
    expect(isoToJalali('تاریخ نامعتبر')).toBeNull()
  })
})

describe('isoToFaDisplay / isoToFaLong', () => {
  it('ISO رو به فرمت نمایشی اسلش‌دار فارسی تبدیل می‌کنه', () => {
    expect(isoToFaDisplay('2024-03-20')).toBe('۱۴۰۳/۰۱/۰۱')
  })
  it('ISO رو به فرمت خواناتر با اسم ماه تبدیل می‌کنه', () => {
    expect(isoToFaLong('2024-03-20')).toBe('۱ فروردین ۱۴۰۳')
  })
  it('اگه ورودی خالی باشه، خط تیره برمی‌گردونه', () => {
    expect(isoToFaDisplay('')).toBe('—')
  })
})

describe('parseISOStrict', () => {
  it('رشته‌ی ISO معتبر رو قبول می‌کنه', () => {
    expect(parseISOStrict('2024-03-20')).toBeInstanceOf(Date)
  })
  it('فرمت آزاد قدیمی (غیر ISO) رو رد می‌کنه', () => {
    expect(parseISOStrict('۱۴۰۳/۰۱/۰۱')).toBeNull()
  })
  it('رشته‌ی خالی رو رد می‌کنه', () => {
    expect(parseISOStrict('')).toBeNull()
  })
})

describe('todayISO / addDaysISO', () => {
  it('todayISO فرمت YYYY-MM-DD می‌ده', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('addDaysISO روزها رو درست جلو می‌بره', () => {
    expect(addDaysISO('2024-03-20', 10)).toBe('2024-03-30')
  })
  it('addDaysISO از مرز پایان ماه هم درست رد می‌شه', () => {
    expect(addDaysISO('2024-01-30', 5)).toBe('2024-02-04')
  })
})
