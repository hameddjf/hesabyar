import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'
import { useOffline } from '@/features/offline/useOffline'
import { withOfflineWrite } from '@/features/offline/withOfflineWrite'

/* ── fallback mock (تا وقتی دیتای واقعی کامل نشده) ── */
const MOCK_PRODUCTS = [
  {id:'PRD-001',name:'خدمات مشاوره مالی',          sku:'SRV-FIN-01',category:'consulting',unit:'hour',  price:1_200_000,  stock:null,status:'active',  desc:'مشاوره تخصصی در امور مالی و حسابداری'},
  {id:'PRD-002',name:'نرم‌افزار حسابداری (ماهانه)', sku:'SFT-ACC-01',category:'software',  unit:'month', price:850_000,    stock:null,status:'active',  desc:'اشتراک ماهانه نرم‌افزار حسابداری ابری'},
  {id:'PRD-003',name:'دوربین مداربسته ۴K',          sku:'HW-CAM-4K', category:'hardware',  unit:'piece', price:4_500_000,  stock:23,  status:'active',  desc:'دوربین IP با وضوح ۴K و ذخیره‌سازی ابری'},
  {id:'PRD-004',name:'کابل شبکه CAT6 (متری)',       sku:'HW-CAB-C6', category:'hardware',  unit:'meter', price:85_000,     stock:540, status:'active',  desc:'کابل شبکه استاندارد CAT6'},
  {id:'PRD-010',name:'دیسک SSD 1TB',                sku:'HW-SSD-1T', category:'hardware',  unit:'piece', price:6_200_000,  stock:0,   status:'inactive',desc:'SSD NVMe 1 ترابایت'},
]

/**
 * از بکند واقعی می‌خونه؛ اگه API در دسترس نبود/خالی بود → mock (isMock=true)
 * ستون‌های بکند (description, ...) به شکلی که UI انتظار داره (desc, ...) نگاشت میشن.
 */
export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [isMock, setIsMock]     = useState(false)
  const { isOnline, saveOffline } = useOffline()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.products.list()
      if (!raw.length) {
        setProducts(MOCK_PRODUCTS)
        setIsMock(true)
      } else {
        setProducts(
          raw.map((row) => {
            const p = toCamel(row)
            return {
              ...p,
              desc: p.description,
              price: Number(p.price || 0),
              stock: p.stock === null || p.stock === undefined ? null : Number(p.stock),
            }
          })
        )
        setIsMock(false)
      }
    } catch (err) {
      setError(err)
      setProducts(MOCK_PRODUCTS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createProduct = useCallback(async (payload) => {
    if (!isOnline) {
      await saveOffline('products', 'create', payload)
      setProducts((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
      return { offline: true }
    }
    try {
      const created = await api.products.create(payload)
      await load()
      return created
    } catch (err) {
      if (!err.status) {
        await saveOffline('products', 'create', payload)
        setProducts((prev) => [{ ...payload, id: `pending-${Date.now()}`, status: 'pending_sync', _offline: true }, ...prev])
        return { offline: true }
      }
      throw err
    }
  }, [load, isOnline, saveOffline])

  const updateProduct = useCallback(async (id, payload) => {
    const { offline, result } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'products', action: 'update', data: { id, ...payload },
      onlineFn: () => api.products.update(id, payload),
    })
    if (offline) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload, _offline: true, pendingSync: true } : p)))
      return { offline: true }
    }
    await load()
    return result
  }, [load, isOnline, saveOffline])

  const removeProduct = useCallback(async (id) => {
    const { offline } = await withOfflineWrite({
      isOnline, saveOffline, entity: 'products', action: 'delete', data: { id },
      onlineFn: () => api.products.remove(id),
    })
    if (offline) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      return { offline: true }
    }
    await load()
  }, [load, isOnline, saveOffline])

  return { products, loading, error, isMock, reload: load, createProduct, updateProduct, removeProduct }
}
