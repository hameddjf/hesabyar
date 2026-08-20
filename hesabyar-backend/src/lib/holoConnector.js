import sql from 'mssql'

/**
 * ⚠️ اصلاح مهم: بعد از بررسی یک بکاپ واقعی هلو، مشخص شد هلو از
 * Microsoft SQL Server استفاده می‌کنه (نه Firebird که قبلاً فرض شده بود).
 * این فایل کاملاً با درایور mssql بازنویسی شده.
 *
 * برای اتصال، سرویس SQL Server مشتری (که هلو روش نصبه) باید:
 *   ۱) TCP/IP روش فعال باشه (پیش‌فرض پورت 1433)
 *   ۲) از شبکه‌ای که این بکند روش اجرا میشه قابل‌دسترس باشه
 *      (VPN / port-forward / یا اجرای بکند روی همون شبکه محلی)
 *   ۳) یک یوزر SQL Server (نه Windows Auth) با دسترسی خواندن/نوشتن ساخته بشه
 */
function buildConfig(overrides = {}) {
  return {
    server: overrides.host || process.env.HOLO_DEFAULT_HOST || '127.0.0.1',
    port: Number(overrides.port || process.env.HOLO_DEFAULT_PORT || 1433),
    database: overrides.database || process.env.HOLO_DEFAULT_DATABASE || 'Holoo',
    user: overrides.user || process.env.HOLO_DEFAULT_USER,
    password: overrides.password || process.env.HOLO_DEFAULT_PASSWORD,
    options: {
      encrypt: false,              // اکثر نصب‌های SQL Server داخلی SSL ندارن
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  }
}

export async function connectToHolo(overrides) {
  const config = buildConfig(overrides)
  if (!config.user || !config.password) {
    throw new Error('یوزر/پسورد اتصال به SQL Server هلو مشخص نشده')
  }
  const pool = new sql.ConnectionPool(config)
  await pool.connect()
  return pool
}

export async function queryHolo(pool, queryText, params = {}) {
  const request = pool.request()
  for (const [key, value] of Object.entries(params)) request.input(key, value)
  const result = await request.query(queryText)
  return result.recordset
}

export async function closeHolo(pool) {
  await pool.close()
}

/** خواندن تمام رکوردهای یک جدول هلو (با TOP به‌جای LIMIT — نحو SQL Server) */
export async function readHoloTable(pool, tableName, limit = 5000) {
  return queryHolo(pool, `SELECT TOP ${limit} * FROM [dbo].[${tableName}]`)
}

/**
 * نوشتن/به‌روزرسانی یک رکورد در جدول هلو (export از حسابیار به هلو).
 * ⚠️ فقط بعد از verify شدن اسکیمای دقیق روی یک نمونه واقعی (نه فقط بکاپ خام)
 * باید فعال بشه — ساختار PK هر جدول هلو ممکنه IDENTITY یا کد دستی باشه.
 */
export async function upsertHoloRow(pool, tableName, row, pkColumn = 'ID') {
  const keys = Object.keys(row)
  const existing = await queryHolo(pool, `SELECT ${pkColumn} FROM [dbo].[${tableName}] WHERE ${pkColumn} = @pk`, { pk: row[pkColumn] })
  const request = pool.request()
  keys.forEach((k) => request.input(k, row[k]))

  if (existing && existing.length) {
    const setClause = keys.filter((k) => k !== pkColumn).map((k) => `${k} = @${k}`).join(', ')
    await request.query(`UPDATE [dbo].[${tableName}] SET ${setClause} WHERE ${pkColumn} = @${pkColumn}`)
    return 'updated'
  }
  const cols = keys.join(', ')
  const placeholders = keys.map((k) => `@${k}`).join(', ')
  await request.query(`INSERT INTO [dbo].[${tableName}] (${cols}) VALUES (${placeholders})`)
  return 'inserted'
}
