/* ─────────────────────────────────────────────
   useOffline hook
   مدیریت وضعیت آنلاین/آفلاین + sync
   ───────────────────────────────────────────── */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { getOfflineStats, getPendingSyncItems, addToSyncQueue } from './offlineDB'
import { syncPendingItems } from './syncEngine'

const OfflineContext = createContext(null)

export function OfflineProvider({ children }) {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine)
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [pendingCount,setPendingCount]= useState(0)
  const [lastSync,    setLastSync]    = useState(null)
  const [stats,       setStats]       = useState(null)

  const triggerSyncRef = useRef(() => {})

  /* ثبت service worker */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          console.log('[SW] ثبت شد:', reg.scope)
          // گوش دادن به پیام‌های SW — از ref استفاده می‌کنیم تا همیشه آخرین نسخه‌ی triggerSync صدا زده بشه
          navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data?.type === 'REQUEST_SYNC') {
              triggerSyncRef.current()
            }
          })
        })
        .catch(err => console.warn('[SW] خطا در ثبت:', err))
    }
  }, [])

  /* رصد وضعیت شبکه */
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  triggerSyncRef.current() }
    const goOffline = () => { setIsOnline(false) }
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  /* بروزرسانی آمار */
  const refreshStats = useCallback(async () => {
    try {
      const s = await getOfflineStats()
      setStats(s)
      setPendingCount(s.pendingSync)
    } catch {
      // خطای خوندن آمار IndexedDB نباید کل اپ رو بترکونه — بار بعد refreshStats دوباره تلاش می‌کنه
    }
  }, [])

  useEffect(() => { refreshStats() }, [refreshStats])

  /* trigger sync — واقعاً صف رو به سرور می‌فرسته (نه فقط شبیه‌سازی) */
  const triggerSync = useCallback(async () => {
    if (!isOnline) return
    const pending = await getPendingSyncItems()
    if (pending.length === 0) return
    setIsSyncing(true)
    try {
      await syncPendingItems()
    } finally {
      setIsSyncing(false)
      setLastSync(new Date())
      await refreshStats()
    }
    // best-effort: اگه Background Sync پشتیبانی می‌شه، برای دفعاتی که
    // تب بسته می‌شه هم ثبتش می‌کنیم (SW از خود صفحه می‌خواد sync کنه،
    // چون service worker به localStorage/توکن دسترسی نداره)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.sync.register('hesabyar-sync')
      } catch { /* بی‌اهمیت — مسیر اصلی همین بالا با موفقیت انجام شد */ }
    }
  }, [isOnline, refreshStats])

  useEffect(() => { triggerSyncRef.current = triggerSync }, [triggerSync])

  /* ثبت عملیات آفلاین */
  const saveOffline = useCallback(async (entity, action, data) => {
    const queueId = await addToSyncQueue(entity, action, data)
    await refreshStats()
    return queueId
  }, [refreshStats])

  const value = { isOnline, isSyncing, pendingCount, lastSync, stats, triggerSync, saveOffline, refreshStats }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be inside OfflineProvider')
  return ctx
}
