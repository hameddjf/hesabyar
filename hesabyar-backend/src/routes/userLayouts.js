import { Router } from 'express'
import { z } from 'zod'
import { dbGet, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const layoutItemSchema = z.object({
  id: z.string().max(100),
  visible: z.boolean(),
  order: z.number().int().nonnegative(),
})
const layoutSchema = z.array(layoutItemSchema).max(100)

router.get('/:pageKey', async (req, res) => {
  const row = await dbGet('SELECT layout_json FROM user_layouts WHERE user_id = ? AND page_key = ?', [req.user.id, req.params.pageKey])
  res.json({ layout: row ? JSON.parse(row.layout_json) : null })
})

router.put('/:pageKey', async (req, res) => {
  const parsed = layoutSchema.safeParse(req.body?.layout || [])
  if (!parsed.success) {
    return res.status(400).json({ error: 'ساختار چیدمان نامعتبر است' })
  }
  const layoutJson = JSON.stringify(parsed.data)
  await dbRun(`
    INSERT INTO user_layouts (user_id, page_key, layout_json, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, page_key) DO UPDATE SET layout_json = excluded.layout_json, updated_at = datetime('now')
  `, [req.user.id, req.params.pageKey, layoutJson])
  res.json({ layout: parsed.data })
})

router.delete('/:pageKey', async (req, res) => {
  await dbRun('DELETE FROM user_layouts WHERE user_id = ? AND page_key = ?', [req.user.id, req.params.pageKey])
  res.json({ ok: true })
})

export default router
