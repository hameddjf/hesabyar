/* ─────────────────────────────────────────────
   Hesabyar Service Worker
   آفلاین مود — کش استراتژی + sync صف
   ───────────────────────────────────────────── */

const CACHE_NAME   = 'hesabyar-v1'
const SYNC_TAG     = 'hesabyar-sync'

/* فایل‌هایی که باید همیشه کش بشن (App Shell) */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

/* ── Install: کش کردن App Shell ── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

/* ── Activate: پاک کردن کش‌های قدیمی ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

/* ── Fetch: استراتژی Cache First برای assets، Network First برای API ── */
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // API calls → Network First با fallback به کش
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirstStrategy(request))
    return
  }

  // Assets → Cache First
  e.respondWith(cacheFirstStrategy(request))
})

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(
      JSON.stringify({ error: 'offline', message: 'شما آفلاین هستید' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // fallback به index.html برای SPA routing
    return caches.match('/index.html')
  }
}

/* ── Background Sync: ارسال تراکنش‌های آفلاین ── */
self.addEventListener('sync', (e) => {
  if (e.tag === SYNC_TAG) {
    e.waitUntil(syncPendingTransactions())
  }
})

async function syncPendingTransactions() {
  /*
   * ⚠️ توضیح مهم: Service Worker به localStorage و توکن JWT کاربر دسترسی نداره
   * (این محدودیت مرورگره، نه یک نقص کد). پس خودِ SW نمی‌تونه مستقیم درخواست
   * احراز-هویت‌شده به بک‌اند بزنه. به‌جاش، از هر تب باز حسابیار می‌خواد که
   * خودش sync واقعی رو انجام بده (چون تب به apiClient و توکن دسترسی داره).
   * منطق واقعی sync در src/features/offline/syncEngine.js پیاده‌سازی شده.
   * اگه هیچ تبی باز نباشه، این پیام به جایی نمی‌رسه و sync موقع باز شدن بعدی
   * برنامه (رویداد 'online' در useOffline.jsx) به‌صورت خودکار انجام می‌شه.
   */
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'REQUEST_SYNC', timestamp: Date.now() })
  })
}

/* ── Push Notifications ── */
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title || 'حسابیار', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      dir: 'rtl',
      lang: 'fa',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url))
  }
})
