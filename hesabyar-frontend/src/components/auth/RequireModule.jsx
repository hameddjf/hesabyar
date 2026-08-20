import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/permissions'

/**
 * گارد سطح-route برای صفحاتی که به یک ماژول خاص محدودن (فاکتورها، شرکا، ...)
 * یا (با prop جدا) فقط به یک نقش خاص (مثل صفحه‌ی «نظارت مالک» که فقط owner/admin می‌بینن).
 *
 * قبلاً هیچ‌جای فرانت این چک وجود نداشت — کارمند بدون دسترسی می‌تونست مستقیم
 * آدرس رو توی مرورگر تایپ کنه، صفحه لود می‌شد و بعد هر فراخوانی API با ۴۰۳
 * برمی‌گشت (نه یه حفره‌ی امنیتی چون بک‌اند واقعاً مسدود می‌کرد، ولی UX گیج‌کننده
 * بود: کاربر یه صفحه‌ی نیمه‌خراب/خالی می‌دید به‌جای پیام روشن).
 *
 * این فقط یه لایه‌ی UX اضافه‌ست، نه جایگزین اعتبارسنجی بک‌اند —
 * requireModuleAccess سمت سرور همچنان تنها مرجع واقعی امنیتیه.
 */
export default function RequireModule({ module, ownerOnly, children }) {
  const user = useAuthStore((s) => s.user)
  if (ownerOnly) {
    const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'
    if (!isOwnerOrAdmin) return <Navigate to="/403" replace />
    return children
  }
  if (!canAccessModule(user, module)) {
    return <Navigate to="/403" replace />
  }
  return children
}
