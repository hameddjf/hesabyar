import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApi = vi.hoisted(() => ({
  invoices: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  clients: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  products: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  checks: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))
vi.mock('@/lib/apiClient', () => ({ api: mockApi }))

// دیتابیس واقعی IndexedDB توی jsdom نیست، پس مستقیم mock می‌شه — تمرکز این تست
// روی منطق dispatch (کدوم action به کدوم متد api می‌ره) و مدیریت retries/status‌هاست،
// نه خود IndexedDB (که در محیط واقعی مرورگر تست می‌شه).
const queueState = vi.hoisted(() => ({ items: [] }))
vi.mock('../../src/features/offline/offlineDB.js', () => ({
  getPendingSyncItems: vi.fn(async () => queueState.items.filter((i) => i.status === 'pending')),
  dbPut: vi.fn(async (store, item) => {
    const idx = queueState.items.findIndex((i) => i.queueId === item.queueId)
    if (idx >= 0) queueState.items[idx] = item
    else queueState.items.push(item)
  }),
}))

import { syncPendingItems } from '../../src/features/offline/syncEngine.js'

function queueItem(entity, action, data, overrides = {}) {
  return {
    queueId: `${entity}-${action}-${Math.random()}`,
    entity, action, data,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
    ...overrides,
  }
}

beforeEach(() => {
  queueState.items = []
  vi.clearAllMocks()
})

describe('syncEngine.syncPendingItems — dispatch بر اساس action', () => {
  it('action=create باید api.entity.create رو صدا بزنه (رفتار قبلی، نباید بشکنه)', async () => {
    mockApi.clients.create.mockResolvedValue({ id: 'c1' })
    queueState.items.push(queueItem('clients', 'create', { name: 'مشتری' }))

    const result = await syncPendingItems()

    expect(mockApi.clients.create).toHaveBeenCalledWith({ name: 'مشتری' })
    expect(result.synced).toBe(1)
    expect(queueState.items[0].status).toBe('done')
  })

  it('action=update باید api.entity.update رو با id از data صدا بزنه', async () => {
    mockApi.clients.update.mockResolvedValue({ id: 'c1', name: 'تغییریافته' })
    queueState.items.push(queueItem('clients', 'update', { id: 'c1', name: 'تغییریافته' }))

    const result = await syncPendingItems()

    expect(mockApi.clients.update).toHaveBeenCalledWith('c1', { id: 'c1', name: 'تغییریافته' })
    expect(result.synced).toBe(1)
    expect(queueState.items[0].status).toBe('done')
  })

  it('action=delete باید api.entity.remove رو با id از data صدا بزنه', async () => {
    mockApi.clients.remove.mockResolvedValue(null)
    queueState.items.push(queueItem('clients', 'delete', { id: 'c1' }))

    const result = await syncPendingItems()

    expect(mockApi.clients.remove).toHaveBeenCalledWith('c1')
    expect(result.synced).toBe(1)
  })

  it('برای entity هایی که از /payments مشترک استفاده می‌کنن (payments/receipts/expenses)، update با api.put درست مسیر می‌سازه', async () => {
    mockApi.put.mockResolvedValue({ id: 'p1' })
    queueState.items.push(queueItem('expenses', 'update', { id: 'p1', amount: 5000 }))

    await syncPendingItems()

    expect(mockApi.put).toHaveBeenCalledWith('/payments/p1', { id: 'p1', amount: 5000 })
  })

  it('برای entity هایی که از /payments مشترک استفاده می‌کنن، delete با api.del درست مسیر می‌سازه', async () => {
    mockApi.del.mockResolvedValue(null)
    queueState.items.push(queueItem('receipts', 'delete', { id: 'r1' }))

    await syncPendingItems()

    expect(mockApi.del).toHaveBeenCalledWith('/payments/r1')
  })

  it('اگه entity/action ناشناخته باشه، failed می‌شه بدون کرش کردن کل sync', async () => {
    queueState.items.push(queueItem('unknown-thing', 'update', { id: 'x' }))

    const result = await syncPendingItems()

    expect(result.failed).toBe(1)
    expect(queueState.items[0].status).toBe('failed')
  })

  it('اگه سرور خطا بده، بعد از MAX_RETRIES (۳) تلاش status=failed می‌شه، قبلش retries رو زیاد می‌کنه', async () => {
    mockApi.clients.update.mockRejectedValue(new Error('خطای سرور'))
    queueState.items.push(queueItem('clients', 'update', { id: 'c1' }, { retries: 2 }))

    const result = await syncPendingItems()

    expect(result.failed).toBe(1)
    expect(queueState.items[0].status).toBe('failed')
    expect(queueState.items[0].retries).toBe(3)
  })

  it('اگه هنوز به MAX_RETRIES نرسیده، status همچنان pending می‌مونه (برای تلاش بعدی)', async () => {
    mockApi.clients.update.mockRejectedValue(new Error('خطای موقت'))
    queueState.items.push(queueItem('clients', 'update', { id: 'c1' }, { retries: 0 }))

    const result = await syncPendingItems()

    expect(result.failed).toBe(0)
    expect(queueState.items[0].status).toBe('pending')
    expect(queueState.items[0].retries).toBe(1)
  })
})
