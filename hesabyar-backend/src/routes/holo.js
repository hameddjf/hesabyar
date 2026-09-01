import { Router } from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import { dbGet, dbAll, dbRun } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { HOLO_TABLE_MAP, holoRowToHesabyar, hesabyarRowToHolo } from '../lib/holoSchema.js'
import { connectToHolo, readHoloTable, upsertHoloRow, closeHolo } from '../lib/holoConnector.js'
import {
  checkPrereqs, ensureLocalDbInstance, restoreBakFile, extractTableAsJson,
  dropDatabase, cleanupFiles, makeTempWorkDir, installLocalDb,
} from '../lib/holoLocalRestore.js'

const router = Router()
router.use(requireAuth)

const upload = multer({
  dest: undefined, // پایین‌تر با diskStorage مسیر مشخص می‌شه
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = makeTempWorkDir()
      fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir)).catch(cb)
    },
    filename: (req, file, cb) => cb(null, 'upload.bak'),
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // ۴ گیگ کافیه برای اکثر دیتابیس‌های هلو کسب‌وکار کوچیک
  fileFilter: (req, file, cb) => {
    if (!/\.bak$/i.test(file.originalname)) {
      return cb(new Error('فقط فایل با پسوند .bak قابل قبوله'))
    }
    cb(null, true)
  },
})

async function logSync(companyId, direction, entity, count, status, message = '') {
  await dbRun(
    'INSERT INTO holo_sync_log (company_id, direction, entity, records_count, status, message) VALUES (?, ?, ?, ?, ?, ?)',
    [companyId, direction, entity, count, status, message]
  )
}

function connErrorResponse(res, err) {
  return res.status(502).json({
    error: 'اتصال به دیتابیس هلو (SQL Server) ناموفق بود',
    detail: err.message,
    hint: 'مطمئن شو: ۱) سرویس SQL Server که هلو روش نصبه در حال اجراست، ۲) TCP/IP روش فعاله (پیش‌فرض پورت 1433)، ۳) این سرور از شبکه‌ای که حسابیار روش اجرا می‌شه قابل‌دسترسیه، ۴) یوزر/پسورد SQL Server (نه Windows Auth) درسته. توجه: صرفاً داشتن فایل بکاپ (.bak) کافی نیست — باید روی یک نمونه‌ی در حال اجرای SQL Server، دیتابیس از روی اون بکاپ Restore شده باشه.',
  })
}

/** بررسی این‌که پیش‌نیازهای Restore محلی (sqlcmd + LocalDB) روی سیستم موجودن */
router.get('/local-restore/prereqs', async (req, res) => {
  const status = await checkPrereqs()
  res.json(status)
})

/**
 * نصب خودکار SQL Server Express LocalDB (دانلود + نصب بی‌صدا).
 * sqlcmd نیازی به این مسیر نداره چون همراه خود پروژه (bin/sqlcmd.exe) میاد؛
 * فقط LocalDB باقی می‌مونه چون یه کامپوننت سیستمیه، نه یه exe پورتابل.
 * تنها چیزی که کاربر می‌بینه: یه پنجره‌ی استاندارد UAC ویندوز که باید
 * «Yes» بزنه — این غیرقابل‌حذفه (هر نصب واقعی همینه)، بقیه‌ش خودکاره.
 */
router.post('/local-restore/install-localdb', async (req, res) => {
  try {
    await installLocalDb()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: 'نصب خودکار LocalDB ناموفق بود', detail: err.message })
  }
})

/**
 * آپلود مستقیم فایل بکاپ (.bak) — نیازی به SQL Server از‌قبل در حال اجرا نیست.
 * این‌جا خودمون موقتاً روی LocalDB Restore می‌کنیم، می‌خونیم، و پاک می‌کنیم.
 */
router.post('/local-restore/import', upload.single('backup'), async (req, res) => {
  const companyId = req.user.companyId
  if (!req.file) {
    return res.status(400).json({ error: 'فایل بکاپ (.bak) دریافت نشد' })
  }
  const bakPath = req.file.path
  const workDir = req.file.destination
  const tablesParam = req.body?.tables
  const targetTables = tablesParam ? JSON.parse(tablesParam) : Object.keys(HOLO_TABLE_MAP)

  const prereqs = await checkPrereqs()
  if (!prereqs.sqlcmd || !prereqs.localdb) {
    await cleanupFiles([bakPath])
    if (!prereqs.supportedOnThisPlatform) {
      return res.status(501).json({
        error: 'این روش (ورود مستقیم از فایل بکاپ) فقط روی سرور ویندوزی در دسترسه',
        detail: `این سرور ${prereqs.platform} هست، نه ویندوز — LocalDB اصلاً روی این سیستم‌عامل وجود نداره.`,
        hint: 'از «روش پیشرفته» (اتصال زنده به یک SQL Server در حال اجرا) استفاده کن.',
      })
    }
    const missing = []
    if (!prereqs.sqlcmd) missing.push('sqlcmd (ابزار خط‌فرمان SQL Server)')
    if (!prereqs.localdb) missing.push('SQL Server Express LocalDB')
    return res.status(501).json({
      error: 'برای خوندن مستقیم فایل بکاپ، این ابزار(ها) روی سیستم لازمه و پیدا نشد',
      detail: missing.join(' و ') + ' نصب نیست.',
      hint: 'از https://aka.ms/sqlcmd-installer (sqlcmd) و https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb (LocalDB) رایگان قابل نصبن — هر دو سبک هستن، نیازی به SQL Server کامل یا Visual Studio نیست. یا به‌جاش می‌تونی از روش قبلی (اتصال به یک SQL Server در حال اجرا) استفاده کنی.',
    })
  }

  let dbName
  let dataFiles = []
  try {
    await ensureLocalDbInstance()
    const restored = await restoreBakFile(bakPath, workDir)
    dbName = restored.dbName
    dataFiles = restored.dataFiles

    const results = {}
    for (const holoTable of targetTables) {
      const schema = HOLO_TABLE_MAP[holoTable]
      if (!schema || !schema.hesabyarTable) continue
      const { ok, rows, error } = await extractTableAsJson(dbName, holoTable)
      if (!ok) {
        logSync(companyId, 'import', schema.hesabyarTable, 0, 'error', error)
        continue
      }
      let count = 0
      for (const holoRow of rows) {
        const mapped = holoRowToHesabyar(holoTable, holoRow)
        if (!mapped) continue
        upsertHesabyarRow(schema.hesabyarTable, mapped, companyId)
        count++
      }
      results[schema.hesabyarTable] = count
      logSync(companyId, 'import', schema.hesabyarTable, count, 'success', 'از فایل بکاپ آپلودشده')
    }
    res.json({ status: 'ok', imported: results })
  } catch (err) {
    await logSync(companyId, 'import', 'unknown', 0, 'error', err.message)
    res.status(500).json({
      error: 'خطا هنگام Restore/خوندن فایل بکاپ',
      detail: err.message,
    })
  } finally {
    if (dbName) await dropDatabase(dbName).catch(() => {})
    await cleanupFiles([bakPath, ...dataFiles])
    await fs.rmdir(workDir).catch(() => {})
  }
})

router.get('/tables', (req, res) => {
  const info = Object.entries(HOLO_TABLE_MAP).map(([holoTable, schema]) => ({
    holoTable,
    hesabyarTable: schema.hesabyarTable,
    note: schema.note || null,
  }))
  res.json(info)
})

router.get('/log', async (req, res) => {
  const rows = await dbAll('SELECT * FROM holo_sync_log WHERE company_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.companyId])
  res.json(rows)
})

/** تست اتصال — فقط وصل می‌شه و قطع می‌کنه، هیچ دیتایی نمی‌خونه/نمی‌نویسه */
router.post('/test-connection', async (req, res) => {
  const { host, port, database, user, password } = req.body || {}
  let pool
  try {
    pool = await connectToHolo({ host, port, database, user, password })
    res.json({ status: 'ok', message: 'اتصال موفق بود' })
  } catch (err) {
    return connErrorResponse(res, err)
  } finally {
    if (pool) await closeHolo(pool)
  }
})

router.post('/import', async (req, res) => {
  const { host, port, database, user, password, tables } = req.body || {}
  const companyId = req.user.companyId
  const targetTables = tables?.length ? tables : Object.keys(HOLO_TABLE_MAP)

  let pool
  try {
    pool = await connectToHolo({ host, port, database, user, password })
  } catch (err) {
    return connErrorResponse(res, err)
  }

  const results = {}
  try {
    for (const holoTable of targetTables) {
      const schema = HOLO_TABLE_MAP[holoTable]
      if (!schema || !schema.hesabyarTable) continue // جداولی مثل Sanad فعلاً فقط مستندن، import نمی‌شن
      const rows = await readHoloTable(pool, holoTable)
      let count = 0
      for (const holoRow of rows) {
        const mapped = holoRowToHesabyar(holoTable, holoRow)
        if (!mapped) continue
        await upsertHesabyarRow(schema.hesabyarTable, mapped, companyId)
        count++
      }
      results[schema.hesabyarTable] = count
      await logSync(companyId, 'import', schema.hesabyarTable, count, 'success')
    }
    res.json({ status: 'ok', imported: results })
  } catch (err) {
    await logSync(companyId, 'import', 'unknown', 0, 'error', err.message)
    res.status(500).json({ error: 'خطا هنگام import از هلو', detail: err.message })
  } finally {
    await closeHolo(pool)
  }
})

router.post('/export', async (req, res) => {
  const { host, port, database, user, password, entities } = req.body || {}
  const companyId = req.user.companyId
  const targetEntities = entities?.length ? entities : Object.values(HOLO_TABLE_MAP).map((s) => s.hesabyarTable).filter(Boolean)

  let pool
  try {
    pool = await connectToHolo({ host, port, database, user, password })
  } catch (err) {
    return connErrorResponse(res, err)
  }

  const results = {}
  try {
    for (const [holoTable, schema] of Object.entries(HOLO_TABLE_MAP)) {
      if (!schema.hesabyarTable || !targetEntities.includes(schema.hesabyarTable)) continue
      const rows = await dbAll(`SELECT * FROM ${schema.hesabyarTable} WHERE company_id = ?`, [companyId])
      let count = 0
      for (const row of rows) {
        const holoRow = hesabyarRowToHolo(holoTable, row)
        await upsertHoloRow(pool, holoTable, holoRow)
        count++
      }
      results[schema.hesabyarTable] = count
      await logSync(companyId, 'export', schema.hesabyarTable, count, 'success')
    }
    res.json({ status: 'ok', exported: results })
  } catch (err) {
    await logSync(companyId, 'export', 'unknown', 0, 'error', err.message)
    res.status(500).json({ error: 'خطا هنگام export به هلو', detail: err.message })
  } finally {
    await closeHolo(pool)
  }
})

/** insert-or-update ساده روی جداول SQLite حسابیار بر اساس id — همیشه محدود به company_id فعلی */
async function upsertHesabyarRow(table, row, companyId) {
  const cols = Object.keys(row).filter((c) => c !== 'source')
  const existing = row.id ? await dbGet(`SELECT id FROM ${table} WHERE id = ? AND company_id = ?`, [row.id, companyId]) : null
  const finalRow = { ...row, id: row.id || String(row.id ?? Date.now()) }

  if (existing) {
    const setClause = cols.filter((c) => c !== 'id').map((c) => `${c} = ?`).join(', ')
    const values = cols.filter((c) => c !== 'id').map((c) => finalRow[c])
    await dbRun(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ? AND company_id = ?`, [...values, finalRow.id, companyId])
  } else {
    const insertCols = ['company_id', 'source', ...cols]
    const placeholders = insertCols.map(() => '?').join(', ')
    await dbRun(`INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders})`, [companyId, 'holo', ...cols.map((c) => finalRow[c])])
  }
}

export default router

