import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '@/lib/apiClient'

/**
 * چیدمان قابل‌شخصی‌سازی یک صفحه.
 * widgetDefs: [{ id, title, defaultVisible }] — تعریف همه‌ی باکس‌های ممکن این صفحه (توسط خود صفحه داده می‌شه)
 * برمی‌گردونه: لیست مرتب‌شده‌ی باکس‌های قابل‌نمایش + ابزار مدیریت (toggle/reorder/reset) + حالت ویرایش
 */
export function useLayout(pageKey, widgetDefs) {
  const [saved, setSaved] = useState(null) // چیدمان ذخیره‌شده از سرور، یا null اگه هنوز شخصی‌سازی نشده
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.userLayouts.get(pageKey)
      .then((res) => { if (alive) setSaved(res.layout) })
      .catch(() => { if (alive) setSaved(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [pageKey])

  /** ترکیب چیدمان ذخیره‌شده با تعریف widgetها؛ widget جدیدی که در چیدمان قدیمی نبوده (مثلاً بعد از آپدیت) با پیش‌فرض خودش اضافه می‌شه */
  const items = useMemo(() => {
    const defMap = Object.fromEntries(widgetDefs.map((w) => [w.id, w]))
    let base
    if (saved && saved.length) {
      base = saved
        .filter((s) => defMap[s.id]) // widgetهایی که دیگه وجود ندارن (حذف شدن از کد) نادیده گرفته می‌شن
        .map((s) => ({ ...defMap[s.id], visible: s.visible, order: s.order }))
      const knownIds = new Set(base.map((b) => b.id))
      widgetDefs.forEach((w, i) => {
        if (!knownIds.has(w.id)) base.push({ ...w, visible: w.defaultVisible !== false, order: base.length + i })
      })
    } else {
      base = widgetDefs.map((w, i) => ({ ...w, visible: w.defaultVisible !== false, order: i }))
    }
    return base.sort((a, b) => a.order - b.order)
  }, [saved, widgetDefs])

  const visibleItems = items.filter((i) => i.visible)
  const hiddenItems = items.filter((i) => !i.visible)

  const persist = useCallback(async (nextItems) => {
    setSaving(true)
    try {
      const layout = nextItems.map((it, i) => ({ id: it.id, visible: it.visible, order: i }))
      await api.userLayouts.save(pageKey, layout)
      setSaved(layout)
    } finally {
      setSaving(false)
    }
  }, [pageKey])

  const toggleWidget = useCallback((id) => {
    const next = items.map((it) => it.id === id ? { ...it, visible: !it.visible } : it)
    persist(next)
  }, [items, persist])

  const reorder = useCallback((orderedIds) => {
    const byId = Object.fromEntries(items.map((it) => [it.id, it]))
    const next = orderedIds.map((id) => byId[id]).filter(Boolean)
    // اضافه کردن هر آیتمی که توی orderedIds نبوده (احتیاط)
    items.forEach((it) => { if (!orderedIds.includes(it.id)) next.push(it) })
    persist(next)
  }, [items, persist])

  const resetToDefault = useCallback(async () => {
    setSaving(true)
    try {
      await api.userLayouts.reset(pageKey)
      setSaved(null)
    } finally {
      setSaving(false)
    }
  }, [pageKey])

  return {
    loading, saving, editing, setEditing,
    items, visibleItems, hiddenItems,
    toggleWidget, reorder, resetToDefault,
  }
}
