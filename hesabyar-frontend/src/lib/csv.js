/**
 * خروجی CSV ساده و بدون وابستگی خارجی.
 * چون اعداد/متن‌های فارسی می‌تونن حاوی کاما یا نقل‌قول باشن، هر سلول escape می‌شه.
 * BOM ابتدای فایل اضافه می‌شه تا اکسل فارسی رو درست (نه به‌صورت جوی‌بگی) نشون بده.
 */
function escapeCell(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCSV(headers, rows) {
  const lines = [headers.map(escapeCell).join(',')]
  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(','))
  })
  return lines.join('\r\n')
}

export function downloadCSV(filename, headers, rows) {
  const csv = rowsToCSV(headers, rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
