import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

/**
 * این ماژول به‌جای گرفتن host/port/user/pass از کاربر و وصل‌شدن به یک
 * SQL Server از‌قبل در حال اجرا (holoConnector.js)، مستقیم یک فایل بکاپ
 * (.bak) آپلودشده رو می‌گیره، خودش موقتاً روی SQL Server Express LocalDB
 * (رایگان، سبک، بدون سرویس ویندوزی جدا) Restore می‌کنه، داده‌ها رو
 * می‌خونه، و در پایان دیتابیس موقت رو پاک می‌کنه.
 *
 * چرا از پکیج native (مثل msnodesqlv8) استفاده نکردیم:
 *   دقیقاً همون کلاس مشکلی که با better-sqlite3 داشتیم (نیاز به node-gyp/
 *   Visual Studio) اینجا هم پیش می‌اومد. برای همین همه‌چیز رو با اجرای
 *   ابزار خط‌فرمان رسمی «sqlcmd» انجام می‌دیم — یه exe ساده، بدون کامپایل.
 *
 * ✅ sqlcmd دیگه نیازی به نصب جدا نداره — نسخه‌ی «go-sqlcmd» رسمی مایکروسافت
 *    (پورتابل، بدون نصب‌کننده، فقط یه exe مستقل) مستقیم توی پوشه‌ی
 *    hesabyar-backend/bin همراه پروژه اومده و همیشه اول از همون‌جا استفاده
 *    می‌شه. اگه به هر دلیلی نبود، fallback می‌کنه رو نسخه‌ی نصب‌شده روی PATH
 *    سیستم (اگه کاربر قبلاً جدا نصب کرده باشه).
 *
 * پیش‌نیاز باقی‌مونده روی سیستم کاربر (فقط همین یکی):
 *   SQL Server Express LocalDB — چون یه کامپوننت واقعی سیستمیه (نه یه exe
 *   پورتابل)، نمی‌شه همراه zip پروژه آوردش؛ ولی می‌شه نصبش رو کاملاً خودکار
 *   کرد (دانلود + نصب بی‌صدا با یک تأیید UAC) — ببین installLocalDb() پایین.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BUNDLED_SQLCMD = path.join(__dirname, '..', '..', 'bin', 'sqlcmd.exe')

const LOCALDB_INSTANCE = process.env.HOLO_LOCALDB_INSTANCE || 'MSSQLLocalDB'
const SQLCMD_SERVER = `(localdb)\\${LOCALDB_INSTANCE}`
const LOCALDB_MSI_URL = 'https://download.microsoft.com/download/5/1/4/5145fe04-4d30-4b85-b0d1-39533663a2f1/SqlLocalDB.msi'

let cachedSqlcmdPath = null
async function resolveSqlcmdPath() {
  if (cachedSqlcmdPath) return cachedSqlcmdPath
  try {
    await fs.access(BUNDLED_SQLCMD)
    cachedSqlcmdPath = BUNDLED_SQLCMD
  } catch {
    cachedSqlcmdPath = 'sqlcmd' // برو سراغ نسخه‌ی روی PATH سیستم
  }
  return cachedSqlcmdPath
}

function runCmd(cmd, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true })
    const stdoutChunks = []
    const stderrChunks = []
    const timer = setTimeout(() => {
      child.kill()
      reject(Object.assign(new Error(`اجرای «${cmd}» بیش از حد طول کشید و متوقف شد.`), { code: 'TIMEOUT' }))
    }, timeoutMs)

    child.on('error', (err) => {
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        reject(Object.assign(new Error(`«${cmd}» روی این سیستم پیدا نشد.`), { code: 'ENOENT' }))
      } else {
        reject(err)
      }
    })
    child.stdout.on('data', (d) => stdoutChunks.push(d))
    child.stderr.on('data', (d) => stderrChunks.push(d))
    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({
        exitCode,
        stdout: Buffer.concat(stdoutChunks).toString('utf16le'),
        stderr: Buffer.concat(stderrChunks).toString('utf16le'),
      })
    })
  })
}

/** sqlcmd با -u (خروجی یونیکد UTF-16) اجرا می‌شه تا متن فارسی خراب نشه */
async function sqlcmd(args, opts) {
  const bin = await resolveSqlcmdPath()
  return runCmd(bin, ['-S', SQLCMD_SERVER, '-u', '-h', '-1', '-W', '-y', '0', '-Y', '0', ...args], opts)
}

/** بررسی این‌که پیش‌نیازها (sqlcmd + LocalDB) روی سیستم موجودن یا نه */
export async function checkPrereqs() {
  const result = {
    sqlcmd: false, sqlcmdBundled: false, localdb: false, instanceRunning: false, detail: '',
    platform: process.platform,
    // این کل روش (sqlcmd پورتابل + LocalDB) فقط روی ویندوز کار می‌کنه — LocalDB
    // اصلاً روی لینوکس/مک وجود نداره. روی سرورهای لینوکسی (اکثر هاست‌ها)، این
    // مسیر رو از اول غیرفعال نشون می‌دیم؛ کاربر باید از «روش پیشرفته»
    // (اتصال زنده به یک SQL Server دیگه) استفاده کنه.
    supportedOnThisPlatform: process.platform === 'win32',
  }
  if (!result.supportedOnThisPlatform) return result

  const bin = await resolveSqlcmdPath()
  result.sqlcmdBundled = bin === BUNDLED_SQLCMD
  try {
    const r = await runCmd(bin, ['-?'], { timeoutMs: 8000 })
    result.sqlcmd = r.exitCode === 0 || r.exitCode === 1 // sqlcmd -? معمولاً کد ۱ برمی‌گردونه، طبیعیه
  } catch { /* پیدا نشد */ }

  try {
    const r = await runCmd('SqlLocalDB', ['info'], { timeoutMs: 8000 })
    result.localdb = r.exitCode === 0
    if (result.localdb) {
      const infoAll = r.stdout
      if (infoAll.toLowerCase().includes(LOCALDB_INSTANCE.toLowerCase())) {
        const detail = await runCmd('SqlLocalDB', ['info', LOCALDB_INSTANCE], { timeoutMs: 8000 })
        result.instanceRunning = /state:\s*running/i.test(detail.stdout)
      }
    }
  } catch { /* پیدا نشد */ }

  return result
}

/**
 * دانلود و نصب خودکار (بی‌صدا) SQL Server Express LocalDB.
 * چون یه کامپوننت سیستمیه، نصبش نیاز به یک تأیید UAC داره — این غیرقابل‌دور
 * زدنه (و نباید هم دور زده بشه؛ هر نصب‌کننده‌ی واقعی روی ویندوز همینه).
 * ولی همه‌چیز غیر از همون یه کلیک «بله» روی UAC کاملاً خودکاره: دانلود از
 * سرور رسمی مایکروسافت، اجرای msiexec با /quiet، بدون هیچ ویزارد یا
 * انتخاب گزینه‌ای از کاربر.
 */
export async function installLocalDb(onProgress) {
  const tmpMsi = path.join(os.tmpdir(), `SqlLocalDB-${randomUUID()}.msi`)
  onProgress?.('در حال دانلود نصب‌کننده‌ی رسمی LocalDB از مایکروسافت...')

  await new Promise((resolve, reject) => {
    // با curl.exe (از ویندوز ۱۰ ۱۸۰۹ به بعد داخل خود ویندوز هست) دانلود می‌کنیم
    // تا وابستگی جدید اضافه نشه.
    const child = spawn('curl.exe', ['-L', '-o', tmpMsi, LOCALDB_MSI_URL], { windowsHide: true })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`دانلود نصب‌کننده شکست خورد (کد ${code})`))))
  })

  onProgress?.('در حال نصب بی‌صدا (یه پنجره‌ی تأیید ویندوز ممکنه باز بشه — لطفاً «Yes» بزن)...')

  // msiexec خودش نیاز به admin داره؛ با PowerShell و -Verb RunAs درخواست
  // بالارفتن سطح دسترسی رو از خود ویندوز می‌گیریم (همون یه پنجره‌ی UAC استاندارد).
  const psCmd =
    `Start-Process msiexec.exe -ArgumentList '/i','"${tmpMsi}"','/quiet','/norestart' -Verb RunAs -Wait`
  const result = await runCmd('powershell.exe', ['-NoProfile', '-Command', psCmd], { timeoutMs: 5 * 60 * 1000 })

  await fs.unlink(tmpMsi).catch(() => {})

  if (result.exitCode !== 0) {
    throw new Error(
      'نصب LocalDB کامل نشد — یا پنجره‌ی UAC رد شد، یا نصب با خطا مواجه شد. ' +
      'می‌تونی دستی هم از https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb نصبش کنی.'
    )
  }
  onProgress?.('نصب LocalDB تموم شد.')
}

/** اگه نمونه‌ی LocalDB نبود می‌سازتش، اگه خاموش بود روشنش می‌کنه */
export async function ensureLocalDbInstance() {
  const info = await runCmd('SqlLocalDB', ['info', LOCALDB_INSTANCE], { timeoutMs: 8000 })
  if (info.exitCode !== 0) {
    const created = await runCmd('SqlLocalDB', ['create', LOCALDB_INSTANCE], { timeoutMs: 20000 })
    if (created.exitCode !== 0) {
      throw new Error(`ساخت نمونه‌ی LocalDB ممکن نشد: ${created.stderr || created.stdout}`)
    }
  }
  if (!/state:\s*running/i.test(info.stdout)) {
    const started = await runCmd('SqlLocalDB', ['start', LOCALDB_INSTANCE], { timeoutMs: 20000 })
    if (started.exitCode !== 0) {
      throw new Error(`روشن‌کردن نمونه‌ی LocalDB ممکن نشد: ${started.stderr || started.stdout}`)
    }
  }
}

/** پارس خروجی RESTORE FILELISTONLY (جدا‌شده با |) برای گرفتن اسم منطقی/نوع هر فایل */
function parseFileList(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^-+$/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()))
    .filter((cols) => cols.length >= 3 && cols[0])
    .map((cols) => ({ logicalName: cols[0], type: cols[2] })) // Type: D=data, L=log
}

/**
 * فایل .bak رو روی یه دیتابیس موقت جدید Restore می‌کنه.
 * برمی‌گردونه: { dbName, dataFiles: [مسیر فایل‌های mdf/ldf که خودمون ساختیم، برای پاک‌سازی بعدی] }
 */
export async function restoreBakFile(bakPath, workDir) {
  await fs.mkdir(workDir, { recursive: true })

  const listRes = await sqlcmd(['-s', '|', '-Q', `SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'${bakPath.replace(/'/g, "''")}'`])
  if (listRes.exitCode !== 0) {
    throw new Error(`خوندن لیست فایل‌های بکاپ ممکن نشد: ${listRes.stderr || listRes.stdout}`)
  }
  const files = parseFileList(listRes.stdout)
  if (!files.length) {
    throw new Error('این فایل یه بکاپ معتبر SQL Server (.bak) به نظر نمی‌رسه — لیست فایلی توش پیدا نشد.')
  }

  const dbName = `holoimport_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  const movedFiles = []
  const moveClauses = files.map((f, i) => {
    const ext = f.type === 'L' ? 'ldf' : 'mdf'
    const physicalPath = path.join(workDir, `${dbName}_${i}.${ext}`)
    movedFiles.push(physicalPath)
    return `MOVE N'${f.logicalName.replace(/'/g, "''")}' TO N'${physicalPath.replace(/'/g, "''")}'`
  }).join(', ')

  const restoreQuery =
    `RESTORE DATABASE [${dbName}] FROM DISK = N'${bakPath.replace(/'/g, "''")}' ` +
    `WITH ${moveClauses}, REPLACE, RECOVERY`
  const restoreRes = await sqlcmd(['-Q', restoreQuery], { timeoutMs: 10 * 60 * 1000 })
  if (restoreRes.exitCode !== 0) {
    throw new Error(`Restore کردن بکاپ شکست خورد: ${restoreRes.stderr || restoreRes.stdout}`)
  }

  return { dbName, dataFiles: movedFiles }
}

/**
 * یه جدول رو از دیتابیس Restore‌شده به‌صورت JSON می‌خونه.
 * از FOR JSON AUTO استفاده می‌کنه (SQL Server خودش این خروجی رو توی چند
 * ردیف تکه‌تکه می‌کنه اگه بزرگ باشه — این‌جا همه رو به هم می‌چسبونیم).
 */
export async function extractTableAsJson(dbName, tableName) {
  const query = `SET NOCOUNT ON; SELECT * FROM [dbo].[${tableName.replace(/[[\]]/g, '')}] FOR JSON AUTO, INCLUDE_NULL_VALUES`
  const res = await sqlcmd(['-d', dbName, '-Q', query], { timeoutMs: 5 * 60 * 1000 })
  if (res.exitCode !== 0) {
    // جدول شاید توی این بکاپ خاص وجود نداشته باشه — خطای نرم، نه فاجعه
    return { ok: false, rows: [], error: res.stderr || res.stdout }
  }
  const jsonText = res.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^-+$/.test(l))
    .join('')
  if (!jsonText) return { ok: true, rows: [] }
  try {
    return { ok: true, rows: JSON.parse(jsonText) }
  } catch (e) {
    return { ok: false, rows: [], error: `پارس JSON خروجی جدول ${tableName} شکست خورد: ${e.message}` }
  }
}

/** دیتابیس موقت رو پاک می‌کنه (بعد از این‌که کارمون باهاش تموم شد) */
export async function dropDatabase(dbName) {
  await sqlcmd(['-Q', `ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${dbName}]`])
}

/** فایل‌های mdf/ldf موقت + خود فایل بکاپ آپلودشده رو از دیسک پاک می‌کنه */
export async function cleanupFiles(paths) {
  for (const p of paths) {
    try { await fs.unlink(p) } catch { /* مهم نیست اگه از قبل نبود */ }
  }
}

export function makeTempWorkDir() {
  return path.join(os.tmpdir(), 'hesabyar-holo-restore', randomUUID())
}
