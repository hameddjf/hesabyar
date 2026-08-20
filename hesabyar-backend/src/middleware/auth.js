import jwt from 'jsonwebtoken'

/** توکن کاربران عادی شرکت‌ها — payload شامل companyId هست */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    if (!decoded.companyId) return res.status(401).json({ error: 'توکن نامعتبر' })
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' })
  }
}

/**
 * توکن سوپرادمین — کاملاً جدا، با سکرت مستقل (ADMIN_JWT_SECRET).
 * حتی اگه یکی توکن کاربر عادی رو بگیره، روی مسیرهای ادمین کار نمی‌کنه
 * چون سکرت امضا فرق داره.
 */
export function requireSuperAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده' })
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'dev-admin-secret')
    if (decoded.type !== 'super_admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' })
    req.admin = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' })
  }
}
