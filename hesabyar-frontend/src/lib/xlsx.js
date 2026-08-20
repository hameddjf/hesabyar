import * as XLSX from 'xlsx'

/**
 * خروجی Excel واقعی (فایل .xlsx باینری واقعی، نه CSV با پسوند عوض‌شده).
 * برخلاف lib/csv.js که فقط متن ساده تولید می‌کنه، اینجا سلول‌های عددی واقعاً
 * type=number ذخیره می‌شن (تا اکسل بتونه روشون SUM/فرمول بزنه)، و می‌شه چند
 * sheet مستقل توی یک فایل داشت (مثلاً یک sheet خلاصه + یک sheet جزئیات).
 */

const MAX_SHEET_NAME_LEN = 31 // محدودیت خود فرمت xlsx، نه یه انتخاب دلخواه

/** اکسل نام sheet با کاراکترهای \\/?*[]  رو هم قبول نمی‌کنه */
function sanitizeSheetName(name, usedNames) {
  let safe = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim()
  if (safe.length > MAX_SHEET_NAME_LEN) safe = safe.slice(0, MAX_SHEET_NAME_LEN)
  if (!safe) safe = 'Sheet'
  // اگه بعد از کوتاه‌کردن، دو تا sheet هم‌نام شدن، با شماره جدا بشن
  let unique = safe
  let i = 2
  while (usedNames.has(unique)) {
    const suffix = `-${i}`
    unique = safe.slice(0, MAX_SHEET_NAME_LEN - suffix.length) + suffix
    i += 1
  }
  usedNames.add(unique)
  return unique
}

/**
 * ورودی: [{ name, headers: string[], rows: any[][] }, ...]
 * خروجی: یک XLSX.WorkBook آماده‌ی نوشتن روی دیسک/دانلود.
 * تابع جدا از downloadXLSX نگه داشته شده تا بدون نیاز به DOM/Blob قابل تست باشه.
 */
export function buildWorkbook(sheets) {
  const wb = XLSX.utils.book_new()
  const usedNames = new Set()
  for (const sheet of sheets) {
    const sheetName = sanitizeSheetName(sheet.name, usedNames)
    const aoa = [sheet.headers, ...(sheet.rows || [])]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }
  return wb
}

/** برای تست: یک sheet رو به آرایه‌ی آرایه (همون شکل ورودی) برمی‌گردونه */
export function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1 })
}

/**
 * دانلود فایل xlsx در مرورگر. sheets همون فرمت buildWorkbook رو می‌گیره.
 * مثال: downloadXLSX('payments-1404-05-16.xlsx', [{ name:'پرداخت‌ها', headers:[...], rows:[...] }])
 */
export function downloadXLSX(filename, sheets) {
  const wb = buildWorkbook(sheets)
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}
