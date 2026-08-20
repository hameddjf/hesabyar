/**
 * الگوی مشترک برای update/delete که هم آنلاین هم آفلاین کار کنه — دقیقاً
 * همون منطقی که قبلاً فقط برای create توی هر هوک جدا کپی‌پیست شده بود
 * (useInvoices.createInvoice و مشابهش)، اینجا یک‌بار نوشته شده تا هر هوک
 * فقط با یه فراخوانی ازش استفاده کنه.
 *
 * - اگه از قبل آفلاینیم: اصلاً تلاش برای اتصال به سرور نمی‌کنه، مستقیم
 *   توی صف (IndexedDB) queue می‌شه.
 * - اگه آنلاینیم ولی درخواست به‌خاطر قطعی ناگهانی شبکه شکست بخوره
 *   (fetch خام موقع قطعی شبکه هیچ err.status ای نمی‌ذاره، نه حتی صفر —
 *   apiClient.js این حالت رو err.status=0 می‌کنه)، همون‌جا queue می‌شه.
 * - اگه خطا واقعاً از سمت سرور باشه (مثلاً 400/403/404)، نباید صف بشه —
 *   چون این یعنی درخواست به سرور رسیده و رد شده، تکرارش بی‌فایده‌ست؛
 *   throw می‌شه تا caller (خود هوک) خطا رو به کاربر نشون بده.
 *
 * @returns {{offline:true}} اگه صف شد، یا {{offline:false, result}} اگه آنلاین موفق شد.
 */
export async function withOfflineWrite({ isOnline, saveOffline, entity, action, data, onlineFn }) {
  if (!isOnline) {
    await saveOffline(entity, action, data)
    return { offline: true }
  }
  try {
    const result = await onlineFn()
    return { offline: false, result }
  } catch (err) {
    if (!err.status) {
      await saveOffline(entity, action, data)
      return { offline: true }
    }
    throw err
  }
}
