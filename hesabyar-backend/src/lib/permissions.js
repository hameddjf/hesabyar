import { dbGet } from '../db.js'

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
export async function getEffectivePermissions(user) {
  if (!user) return emptyAccess()
  if (user.role === 'owner' || user.role === 'admin') return fullAccess()

  const row = await dbGet('SELECT permissions_json FROM users WHERE id = ?', [user.id])
  if (!row || !row.permissions_json) return emptyAccess()
  try {
    const parsed = JSON.parse(row.permissions_json)
    return { ...emptyAccess(), ...parsed }
  } catch {
    return emptyAccess()
  }
}

/** برای فیلدی که به کلاینت برمی‌گرده (لیست کاربران توی تنظیمات) — روی یک ردیف از‌قبل‌خونده‌شده کار می‌کنه، پس sync می‌مونه */
export function permissionsForResponse(userRow) {
  if (userRow.role === 'owner' || userRow.role === 'admin') return fullAccess()
  if (!userRow.permissions_json) return emptyAccess()
  try {
    return { ...emptyAccess(), ...JSON.parse(userRow.permissions_json) }
  } catch {
    return emptyAccess()
  }
}

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
 * async هست چون getEffectivePermissions حالا دیتابیس رو async می‌خونه — Express
 * منتظر برگشتن Promise می‌مونه چون next()/res.json() از داخل همون تابع صدا زده می‌شن.
 */
export function requireModuleAccess(moduleKey, options = {}) {
  return async (req, res, next) => {
    const perms = await getEffectivePermissions(req.user)
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
