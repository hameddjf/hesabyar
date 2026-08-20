import { toGregorian, toJalaali, jalaaliMonthLength } from 'jalaali-js'

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹']
const PERSIAN_MONTHS = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
  'مهر','آبان','آذر','دی','بهمن','اسفند',
]

export function toFaDigits(n) {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[d])
}
function toEnDigits(s) {
  return String(s).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
}

/**
 * تبدیل تاریخ شمسی {jy,jm,jd} به رشته‌ی ISO میلادی "YYYY-MM-DD"
 * (این چیزیه که باید توی دیتابیس ذخیره بشه — قابل مرتب‌سازی و بازه‌بندی واقعی)
 */
export function jalaliToISO(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`
}

/** تبدیل ISO میلادی به {jy,jm,jd} شمسی */
export function isoToJalali(iso) {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const [, gy, gm, gd] = m.map(Number)
  const { jy, jm, jd } = toJalaali(gy, gm, gd)
  return { jy, jm, jd }
}

/** ISO -> رشته‌ی نمایشی "۱۴۰۴/۰۳/۲۰" */
export function isoToFaDisplay(iso) {
  const j = isoToJalali(iso)
  if (!j) return iso || '—'
  return toFaDigits(`${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`)
}

/** ISO -> "۲۰ خرداد ۱۴۰۴" (فرمت خواناتر) */
export function isoToFaLong(iso) {
  const j = isoToJalali(iso)
  if (!j) return iso || '—'
  return `${toFaDigits(j.jd)} ${PERSIAN_MONTHS[j.jm-1]} ${toFaDigits(j.jy)}`
}

/**
 * یه رشته‌ی تاریخ (که ممکنه ISO باشه یا فرمت آزاد قدیمی مثل "۱۴۰۴/۰۳/۲۰") رو
 * فقط اگه واقعاً ISO معتبر باشه پارس می‌کنه؛ در غیر این‌صورت null برمی‌گردونه.
 * برای فیلتر کردن دیتای «قابل بازه‌بندی» از دیتای آزاد قدیمی استفاده می‌شه.
 */
export function parseISOStrict(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}/.test(str)) return null
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

export function todayJalali() {
  const { jy, jm, jd } = toJalaali(new Date())
  return { jy, jm, jd }
}

export function addDaysISO(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function jalaliMonthLength(jy, jm) {
  return jalaaliMonthLength(jy, jm)
}

export { PERSIAN_MONTHS, toEnDigits }
