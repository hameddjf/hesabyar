import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

const ROLE_META = {
  owner:    { label: 'مالک',   type: 'purple' },
  admin:    { label: 'مدیر',   type: 'blue' },
  employee: { label: 'کارمند', type: 'gray' },
}

/** لیست ماژول‌های قابل‌تنظیم — باید با MODULES توی بک‌اند (src/lib/permissions.js) یکی باشه */
export const PERMISSION_MODULES = [
  { key: 'clients', label: 'مشتریان' },
  { key: 'products', label: 'کالاها' },
  { key: 'invoices', label: 'فاکتورها' },
  { key: 'payments', label: 'دریافت/پرداخت' },
  { key: 'checks', label: 'دسته چک' },
  { key: 'employees', label: 'کارمندان' },
  { key: 'banking_accounts', label: 'حساب‌های بانکی' },
  { key: 'partners', label: 'شرکا' },
  { key: 'reports', label: 'گزارش‌ها' },
]

export const PERMISSION_PRESETS = {
  manager: {
    label: 'مدیر عملیات',
    hint: 'دسترسی گسترده، بدون اجازه‌ی حذف',
    perms: { clients: true, products: true, invoices: true, payments: true, checks: true, employees: true, banking_accounts: true, partners: true, reports: true, canDelete: false },
  },
  editor: {
    label: 'ویرایشگر',
    hint: 'فروش و مالی روزمره',
    perms: { clients: true, products: true, invoices: true, payments: true, checks: true, employees: false, banking_accounts: false, partners: false, reports: true, canDelete: false },
  },
  viewer: {
    label: 'بیننده',
    hint: 'فقط مشاهده‌ی گزارش‌ها',
    perms: { clients: false, products: false, invoices: false, payments: false, checks: false, employees: false, banking_accounts: false, partners: false, reports: true, canDelete: false },
  },
}

export function emptyPermissions() {
  const p = { canDelete: false }
  for (const m of PERMISSION_MODULES) p[m.key] = false
  return p
}

export function useCompanyUsers() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.companyUsers.list()
      setUsers(raw.map(toCamel))
    } catch (err) {
      setError(err.message || 'خطا در دریافت لیست کاربران')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** خروجی شامل { user, tempPassword, note } چون سرویس ایمیل هنوز وصل نیست */
  const inviteUser = useCallback(async (payload) => {
    const res = await api.companyUsers.invite(payload)
    await load()
    return res
  }, [load])

  const updateUser = useCallback(async (id, payload) => { await api.companyUsers.update(id, payload); await load() }, [load])
  const removeUser  = useCallback(async (id) => { await api.companyUsers.remove(id); await load() }, [load])

  return { users, loading, error, reload: load, inviteUser, updateUser, removeUser, ROLE_META }
}
