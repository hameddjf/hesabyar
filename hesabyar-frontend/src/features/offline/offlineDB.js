/* ─────────────────────────────────────────────
   Hesabyar Offline DB
   IndexedDB wrapper برای ذخیره آفلاین داده‌ها
   ───────────────────────────────────────────── */

const DB_NAME    = 'hesabyar_offline'
const DB_VERSION = 1

const STORES = {
  invoices:   { keyPath: 'id', indexes: ['status', 'clientId', 'type', 'issueDate'] },
  payments:   { keyPath: 'id', indexes: ['partnerId', 'status', 'date'] },
  receipts:   { keyPath: 'id', indexes: ['partnerId', 'status', 'date'] },
  expenses:   { keyPath: 'id', indexes: ['category', 'date', 'partnerId'] },
  clients:    { keyPath: 'id', indexes: ['name', 'status', 'type'] },
  employees:  { keyPath: 'id', indexes: ['dept', 'status'] },
  products:   { keyPath: 'id', indexes: ['category', 'status', 'sku'] },
  syncQueue:  { keyPath: 'queueId', indexes: ['entity', 'action', 'createdAt'] },
}

let _db = null

export async function getDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onerror = () => reject(req.error)

    req.onsuccess = () => {
      _db = req.result
      resolve(_db)
    }

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      Object.entries(STORES).forEach(([name, cfg]) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: cfg.keyPath })
          cfg.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }))
        }
      })
    }
  })
}

/* ── CRUD عمومی ── */
export async function dbGet(storeName, id) {
  const db   = await getDB()
  const tx   = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  return new Promise((res, rej) => {
    const req = store.get(id)
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

export async function dbGetAll(storeName, indexName, value) {
  const db    = await getDB()
  const tx    = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  return new Promise((res, rej) => {
    const req = indexName
      ? store.index(indexName).getAll(value)
      : store.getAll()
    req.onsuccess = () => res(req.result || [])
    req.onerror   = () => rej(req.error)
  })
}

export async function dbPut(storeName, data) {
  const db    = await getDB()
  const tx    = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  return new Promise((res, rej) => {
    const req = store.put(data)
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

export async function dbDelete(storeName, id) {
  const db    = await getDB()
  const tx    = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  return new Promise((res, rej) => {
    const req = store.delete(id)
    req.onsuccess = () => res(true)
    req.onerror   = () => rej(req.error)
  })
}

export async function dbCount(storeName) {
  const db    = await getDB()
  const tx    = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  return new Promise((res, rej) => {
    const req = store.count()
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

/* ── Sync Queue: ثبت عملیات‌های آفلاین برای sync بعدی ── */
export async function addToSyncQueue(entity, action, data) {
  const item = {
    queueId:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entity,
    action,    // 'create' | 'update' | 'delete'
    data,
    createdAt: new Date().toISOString(),
    retries:   0,
    status:    'pending', // 'pending' | 'syncing' | 'done' | 'failed'
  }
  await dbPut('syncQueue', item)
  return item.queueId
}

export async function getPendingSyncItems() {
  return dbGetAll('syncQueue', 'status', 'pending')
}

export async function markSyncDone(queueId) {
  const item = await dbGet('syncQueue', queueId)
  if (item) await dbPut('syncQueue', { ...item, status: 'done' })
}

/* ── آمار کلی آفلاین ── */
export async function getOfflineStats() {
  const stores = ['invoices','payments','receipts','expenses','clients','products']
  const results = await Promise.all(stores.map(async s => ({ store: s, count: await dbCount(s) })))
  const pending = (await getPendingSyncItems()).length
  return { stores: Object.fromEntries(results.map(r => [r.store, r.count])), pendingSync: pending }
}

/* ── پاک کردن همه داده‌ها ── */
export async function clearAllOfflineData() {
  const db = await getDB()
  const storeNames = Object.keys(STORES)
  const tx = db.transaction(storeNames, 'readwrite')
  await Promise.all(storeNames.map(s => new Promise((res, rej) => {
    const req = tx.objectStore(s).clear()
    req.onsuccess = res
    req.onerror   = rej
  })))
}
