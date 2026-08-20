/* ─────────────────────────────────────────────
   Sync Engine — صف آفلاین رو واقعاً به بک‌اند می‌فرسته.
   قبلاً این مسیر (وقتی Background Sync پشتیبانی نمی‌شد) فقط با
   setTimeout وانمود می‌کرد sync انجام شده، بدون اینکه واقعاً
   چیزی به سرور بفرسته. اینجا واقعی شده.
   ───────────────────────────────────────────── */
import { api } from '@/lib/apiClient'
import { getPendingSyncItems, dbPut } from './offlineDB'

/** نگاشت entity آفلاین → متد واقعی apiClient برای create */
const CREATE_MAP = {
  invoices: (data) => api.invoices.create(data),
  clients:  (data) => api.clients.create(data),
  payments: (data) => api.post('/payments', data),
  receipts: (data) => api.post('/payments', data), // دریافتی هم از همون endpoint پرداختی‌ها رد می‌شه
  expenses: (data) => api.post('/payments', data),
  products: (data) => api.post('/products', data),
  employees:(data) => api.post('/employees', data),
  checks:   (data) => api.checks.create(data),
}

/**
 * نگاشت entity → متد update. data همیشه شامل id هست (هوک‌های آفلاین موقع
 * queue کردن، id رو داخل خود data می‌ذارن — همون الگوی create که از قبل بود).
 */
const UPDATE_MAP = {
  invoices: (data) => api.invoices.update(data.id, data),
  clients:  (data) => api.clients.update(data.id, data),
  payments: (data) => api.put(`/payments/${data.id}`, data),
  receipts: (data) => api.put(`/payments/${data.id}`, data),
  expenses: (data) => api.put(`/payments/${data.id}`, data),
  products: (data) => api.products.update(data.id, data),
  employees:(data) => api.put(`/employees/${data.id}`, data),
  checks:   (data) => api.checks.update(data.id, data),
}

/** نگاشت entity → متد delete. data = { id } */
const DELETE_MAP = {
  invoices: (data) => api.invoices.remove(data.id),
  clients:  (data) => api.clients.remove(data.id),
  payments: (data) => api.del(`/payments/${data.id}`),
  receipts: (data) => api.del(`/payments/${data.id}`),
  expenses: (data) => api.del(`/payments/${data.id}`),
  products: (data) => api.products.remove(data.id),
  employees:(data) => api.del(`/employees/${data.id}`),
  checks:   (data) => api.checks.remove(data.id),
}

/** بر اساس action (create/update/delete) نگاشت درست رو انتخاب می‌کنه */
function resolveSyncFn(entity, action) {
  const map = action === 'create' ? CREATE_MAP : action === 'update' ? UPDATE_MAP : action === 'delete' ? DELETE_MAP : null
  return map ? map[entity] : null
}

const MAX_RETRIES = 3

async function markItem(item, patch) {
  await dbPut('syncQueue', { ...item, ...patch })
}

/**
 * همه‌ی آیتم‌های pending رو یکی‌یکی به سرور می‌فرسته (create/update/delete،
 * بر اساس item.action). موفق‌ها → status:'done'. ناموفق‌ها بعد از MAX_RETRIES
 * تلاش → status:'failed' (تا کاربر بتونه توی پنل ببینتشون، نه اینکه بی‌صدا گم بشن).
 */
export async function syncPendingItems() {
  const pending = await getPendingSyncItems()
  const result = { synced: 0, failed: 0, total: pending.length }

  for (const item of pending) {
    const syncFn = resolveSyncFn(item.entity, item.action)
    if (!syncFn) {
      await markItem(item, { status: 'failed', lastError: `entity/action ناشناخته: ${item.entity}/${item.action}` })
      result.failed++
      continue
    }
    try {
      await syncFn(item.data)
      await markItem(item, { status: 'done' })
      result.synced++
    } catch (err) {
      const retries = (item.retries || 0) + 1
      if (retries >= MAX_RETRIES) {
        await markItem(item, { status: 'failed', retries, lastError: err.message })
        result.failed++
      } else {
        await markItem(item, { retries, lastError: err.message })
      }
    }
  }
  return result
}
