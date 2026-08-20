import db from '../db.js'

/**
 * دسترسی‌های ریزدانه (RBAC ماژول‌محور).
 *
 * قوانین:
 *   - owner و admin همیشه دسترسی کامل دارن — این‌ها هیچ‌وقت از permissions_json خونده نمی‌شن.
 *   - employee فقط به ماژول‌هایی دسترسی داره که توی permissions_json خودش true باشه.
 *   - حذف (DELETE) یک اجازه‌ی جدا و سخت‌گیرانه‌تره: حتی اگه کارمند به یک ماژول
 *     دسترسی «مشاهده/ویرایش» داشته باشه، برای حذف باید canDelete هم true باشه.
 *
 * این‌جا از دیتابیس تازه می‌خونیم (نه از خود JWT) تا وقتی مالک دسترسی یک کارمند
 * رو عوض می‌کنه، بدون نیاز به لاگین دوباره‌ی اون کارمند، فوراً اعمال بشه.
 */

export const MODULES = [
  { key: 'clients', label: 'مشتریان' },
  { key: 'products', label: 'کالاها' },
  { key: 'invoices', label: 'فاکتورها' },
  { key: 'payments', label: 'دریافت/پرداخت' },
  { key: 'checks', label: 'دسته چک' },
  { key: 'employees', label: 'کارمندان' },
  { key: 'banking_accounts', label: 'حساب‌های بانکی' },
  { key: 'partners', label: 'شرکا' },
  { key: 'reports', label: 'گزارش‌ها' },
]

export const MODULE_KEYS = MODULES.map((m) => m.key)

export const PRESETS = {
  manager: {
    label: 'مدیر عملیات (دسترسی گسترده، بدون حذف)',
    perms: { clients: true, products: true, invoices: true, payments: true, checks: true, employees: true, banking_accounts: true, partners: true, reports: true, canDelete: false },
  },
  editor: {
    label: 'ویرایشگر (فروش و مالی روزمره)',
    perms: { clients: true, products: true, invoices: true, payments: true, checks: true, employees: false, banking_accounts: false, partners: false, reports: true, canDelete: false },
  },
  viewer: {
    label: 'بیننده (فقط گزارش‌ها)',
    perms: { clients: false, products: false, invoices: false, payments: false, checks: false, employees: false, banking_accounts: false, partners: false, reports: true, canDelete: false },
  },
}

function fullAccess() {
  const perms = { canDelete: true }
  for (const key of MODULE_KEYS) perms[key] = true
  return perms
}

function emptyAccess() {
  const perms = { canDelete: false }
  for (const key of MODULE_KEYS) perms[key] = false
  return perms
}

/** دسترسی‌های واقعیِ اعمال‌شونده برای یک کاربر (owner/admin = کامل، employee = از دیتابیس) */
export function getEffectivePermissions(user) {
  if (!user) return emptyAccess()
  if (user.role === 'owner' || user.role === 'admin') return fullAccess()

  const row = db.prepare('SELECT permissions_json FROM users WHERE id = ?').get(user.id)
  if (!row || !row.permissions_json) return emptyAccess() // پیش‌فرض امن: بدون تنظیم صریح، دسترسی نداره
  try {
    const parsed = JSON.parse(row.permissions_json)
    return { ...emptyAccess(), ...parsed }
  } catch {
    return emptyAccess()
  }
}

/** برای فیلدی که به کلاینت برمی‌گرده (لیست کاربران توی تنظیمات) */
export function permissionsForResponse(userRow) {
  if (userRow.role === 'owner' || userRow.role === 'admin') return fullAccess()
  if (!userRow.permissions_json) return emptyAccess()
  try {
    return { ...emptyAccess(), ...JSON.parse(userRow.permissions_json) }
  } catch {
    return emptyAccess()
  }
}

/** ورودی permissions از کلاینت رو پاک‌سازی می‌کنه (فقط کلیدهای شناخته‌شده، فقط boolean) */
export function sanitizePermissionsInput(input) {
  const safe = emptyAccess()
  if (!input || typeof input !== 'object') return safe
  for (const key of [...MODULE_KEYS, 'canDelete']) {
    if (typeof input[key] === 'boolean') safe[key] = input[key]
  }
  return safe
}

/**
 * میان‌افزار Express: قبل از هر route ای که به یک ماژول خاص مربوطه استفاده می‌شه.
 * باید بعد از requireAuth بیاد (به req.user نیاز داره).
 *
 * options.readableForReports: اگه true باشه، درخواست‌های GET (فقط خواندن) علاوه بر
 * perms[moduleKey]، با perms.reports هم عبور داده می‌شن. دلیل: صفحه‌ی گزارش‌ها
 * (useReportsData.js در فرانت) مستقیماً از endpoint های invoices/payments/clients/partners
 * می‌خونه تا نمودارها رو بسازه — یک endpoint تجمیعی جدا نداریم. بدون این گزینه، پریست
 * «بیننده» (فقط reports:true) با ۴۰۳ روی همین fetch های زیرین گیر می‌کنه و کل صفحه‌ی
 * گزارش‌ها خراب می‌شه. نوشتن (POST/PUT/DELETE) همچنان فقط با perms[moduleKey] واقعی
 * مجازه — این گزینه هرگز اجازه‌ی تغییر داده نمی‌ده، فقط مشاهده.
 */
export function requireModuleAccess(moduleKey, options = {}) {
  return (req, res, next) => {
    const perms = getEffectivePermissions(req.user)
    const hasDirectAccess = !!perms[moduleKey]
    const hasReadViaReports = options.readableForReports && req.method === 'GET' && !!perms.reports
    if (!hasDirectAccess && !hasReadViaReports) {
      return res.status(403).json({ error: 'شما به این بخش دسترسی ندارید. برای دسترسی با مدیر شرکت خود تماس بگیرید.' })
    }
    if (req.method === 'DELETE' && !perms.canDelete) {
      return res.status(403).json({ error: 'شما اجازه‌ی حذف رکورد را ندارید.' })
    }
    next()
  }
}
