import { Router } from 'express'
import { z } from 'zod'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const layoutItemSchema = z.object({
  id: z.string().max(100),
  visible: z.boolean(),
  order: z.number().int().nonnegative(),
})
const layoutSchema = z.array(layoutItemSchema).max(100)

/** چیدمان ذخیره‌شده‌ی کاربر جاری برای یک صفحه — اگه هنوز چیزی ذخیره نشده، null برمی‌گرده (فرانت پیش‌فرض خودش رو نشون می‌ده) */
router.get('/:pageKey', (req, res) => {
  const row = db.prepare('SELECT layout_json FROM user_layouts WHERE user_id = ? AND page_key = ?')
    .get(req.user.id, req.params.pageKey)
  res.json({ layout: row ? JSON.parse(row.layout_json) : null })
})

router.put('/:pageKey', (req, res) => {
  const parsed = layoutSchema.safeParse(req.body?.layout || [])
  if (!parsed.success) {
    return res.status(400).json({ error: 'ساختار چیدمان نامعتبر است' })
  }
  const layoutJson = JSON.stringify(parsed.data)
  db.prepare(`
    INSERT INTO user_layouts (user_id, page_key, layout_json, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, page_key) DO UPDATE SET layout_json = excluded.layout_json, updated_at = datetime('now')
  `).run(req.user.id, req.params.pageKey, layoutJson)
  res.json({ layout: parsed.data })
})

router.delete('/:pageKey', (req, res) => {
  db.prepare('DELETE FROM user_layouts WHERE user_id = ? AND page_key = ?').run(req.user.id, req.params.pageKey)
  res.json({ ok: true })
})

export default router
