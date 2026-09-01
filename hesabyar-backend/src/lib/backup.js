import fs from 'fs'
import path from 'path'
import db, { isPostgres } from '../db.js'

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'data', 'backups')
const KEEP_LAST_N = Number(process.env.BACKUP_KEEP_LAST_N || 14) // ~۲ هفته با بکاپ روزانه
const INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS || 24)

/**
 * بکاپ امن آنلاین دیتابیس (از API رسمی better-sqlite3، نه کپی خام فایل —
 * کپی خام فایل ممکنه هم‌زمان با نوشتن دیتابیس ناقص/خراب بشه، این روش امنه).
 * فایل‌های قدیمی‌تر از KEEP_LAST_N خودکار حذف می‌شن تا دیسک پر نشه.
 *
 * فقط برای SQLite معنی داره (کپی فایل دیسک محلی). روی Postgres/Neon این
 * بی‌معنیه — Neon خودش snapshot خودکار می‌گیره — پس بی‌صدا رد می‌شیم، نه
 * این‌که تلاش کنیم و با خطای گیج‌کننده «Cannot read properties of
 * undefined» توی لاگ اسپم کنیم.
 */
export async function runBackup() {
  if (isPostgres) return null
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = path.join(BACKUP_DIR, `hesabyar-${stamp}.sqlite`)
    await db.backup(dest)

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('hesabyar-') && f.endsWith('.sqlite'))
      .sort() // نام‌ها بر اساس timestamp ISO، مرتب‌سازی رشته‌ای = مرتب‌سازی زمانی
    const toDelete = files.slice(0, Math.max(0, files.length - KEEP_LAST_N))
    toDelete.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)))

    console.log(`💾 بکاپ دیتابیس گرفته شد: ${dest} (${files.length - toDelete.length} بکاپ نگه‌داری می‌شه)`)
    return dest
  } catch (err) {
    console.error('❌ خطا در گرفتن بکاپ دیتابیس:', err.message)
    return null
  }
}

/** شروع بکاپ‌گیری زمان‌بندی‌شده — یک بار موقع بالا اومدن سرور + هر INTERVAL_HOURS ساعت (فقط SQLite) */
export function scheduleBackups() {
  if (isPostgres) {
    console.log('ℹ️  دیتابیس Postgres/Neon هست — بکاپ داخلی رد شد (Neon خودش snapshot خودکار می‌گیره).')
    return
  }
  runBackup()
  setInterval(runBackup, INTERVAL_HOURS * 60 * 60 * 1000)
  console.log(`🕐 بکاپ خودکار هر ${INTERVAL_HOURS} ساعت فعال شد (نگهداری آخرین ${KEEP_LAST_N} بکاپ)`)
}
