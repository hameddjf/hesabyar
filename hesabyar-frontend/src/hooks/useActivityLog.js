import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

const ACTION_LABEL = { create:'ایجاد', update:'ویرایش', delete:'حذف', login:'ورود', rollback:'بازگردانی' }
const ENTITY_LABEL = {
  invoice:'فاکتور', payment:'پرداختی', client:'مشتری', product:'محصول',
  employee:'کارمند', partner:'شریک', bank_account:'حساب بانکی',
}
/* جدول‌هایی که بک‌اند اجازه‌ی rollback روشون رو می‌ده (باید با ROLLBACKABLE_TABLES بک‌اند هماهنگ بمونه) */
const ROLLBACKABLE_ENTITIES = new Set(['client','product','invoice','payment','employee','partner','bank_account'])

/** لاگ فعالیت‌های واقعی کاربران شرکت (از crudFactory خودکار نوشته می‌شه) */
export function useActivityLog() {
  const [log, setLog]         = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [rollingBackId, setRollingBackId] = useState(null)
  const [rollbackError, setRollbackError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.get('/activity-log')
      setLog(raw.map((row) => {
        const r = toCamel(row)
        const canRollback = ['create','update','delete'].includes(r.action)
          && !r.rolledBack
          && ROLLBACKABLE_ENTITIES.has(r.entity)
        return {
          id: r.id,
          user: r.userName || '—',
          action: r.action,
          entity: r.entity,
          entityLabel: r.entityLabel,
          detail: r.detail || `${ACTION_LABEL[r.action]||r.action} ${ENTITY_LABEL[r.entity]||r.entity||''}`.trim(),
          time: r.createdAt,
          rolledBack: !!r.rolledBack,
          canRollback,
          raw: r,
        }
      }))
    } catch (err) {
      setError(err.message || 'خطا در دریافت لاگ فعالیت‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rollback = useCallback(async (id) => {
    setRollingBackId(id)
    setRollbackError(null)
    try {
      await api.post(`/activity-log/${id}/rollback`, {})
      await load()
      return true
    } catch (err) {
      setRollbackError(err.message || 'بازگردانی ناموفق بود')
      return false
    } finally {
      setRollingBackId(null)
    }
  }, [load])

  return { log, loading, error, reload: load, ACTION_LABEL, ENTITY_LABEL, rollback, rollingBackId, rollbackError }
}
