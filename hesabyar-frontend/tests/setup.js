import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

/* هوک‌های زیادی (useClients/useInvoices/useProducts/...) به useOffline وابسته‌ن که
   خودش IndexedDB واقعی + service worker لازم داره (jsdom هیچ‌کدوم رو نداره).
   برای تست واحد این هوک‌ها، فرض می‌کنیم همیشه آنلاینیم — منطق آفلاین/صف sync
   قلمرو جدا و مستقل خودشه (offlineDB.js/syncEngine.js) که باید جدا تست بشه. */
vi.mock('@/features/offline/useOffline', () => ({
  useOffline: () => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    stats: null,
    triggerSync: vi.fn(),
    saveOffline: vi.fn(),
    refreshStats: vi.fn(),
  }),
  OfflineProvider: ({ children }) => children,
}))
