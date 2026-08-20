/**
 * نگاشت هر آیتم منو/route فرانت به ماژول دسترسی متناظرش در بک‌اند (lib/permissions.js).
 * دقیقاً باید با MODULE_KEYS بک‌اند هم‌خونی داشته باشه — دریافتی‌ها/پرداختی‌ها/هزینه‌ها
 * چون هر سه از همون endpoint واحد `/api/payments` رد می‌شن (نه یک ماژول جدا)، به همون
 * ماژول 'payments' نگاشت می‌شن.
 *
 * صفحاتی که اینجا نیستن (dashboard، holo، settings) هیچ‌جا توسط requireModuleAccess
 * بک‌اند مسدود نمی‌شن، پس همیشه برای هر کاربر لاگین‌شده قابل‌دسترسن.
 * 'oversight' مستقل از این نگاشته چون فقط owner/admin بهش دسترسی داره (نقش، نه ماژول).
 */
export const NAV_MODULE_MAP = {
  invoices: 'invoices',
  payments: 'payments',
  checks: 'checks',
  receipts: 'payments',
  expenses: 'payments',
  banking: 'banking_accounts',
  clients: 'clients',
  employees: 'employees',
  partners: 'partners',
  products: 'products',
  reports: 'reports',
}

/** آیا کاربر با این perms به این کلید منو/route دسترسی داره؟
 *  اگه ماژولی نگاشت نشده باشه (dashboard/holo/settings) یا perms هنوز نیومده باشه
 *  (لحظه‌ی اول لود، قبل از این‌که authStore پر بشه)، به‌صورت پیش‌فرض true برمی‌گردونه —
 *  تا از UI که یه لحظه خالی/قفل به‌نظر برسه جلوگیری بشه؛ بک‌اند در هر صورت خودش
 *  نهایتاً با ۴۰۳ درست مسدود می‌کنه، این فقط برای تجربه‌ی کاربریه. */
export function canAccessNavKey(perms, key) {
  const moduleKey = NAV_MODULE_MAP[key]
  if (!moduleKey) return true
  if (!perms) return true
  return !!perms[moduleKey]
}

/** گارد سطح-route: آیا کاربر به این ماژول (کلید مستقیم بک‌اند، نه کلید منو) دسترسی داره؟
 *  owner/admin همیشه true. تا وقتی perms کاربر هنوز لود نشده (لحظه‌ی اول بعد از رفرش،
 *  قبل از این‌که authStore پر بشه) بهش قفل نمی‌شه — بک‌اند در هر صورت نهایی و واقعی
 *  مسدود می‌کنه، این فقط تجربه‌ی کاربریه، نه لایه‌ی امنیتی. */
export function canAccessModule(user, moduleKey) {
  if (!user) return false
  if (user.role === 'owner' || user.role === 'admin') return true
  if (!user.perms) return true
  return !!user.perms[moduleKey]
}
