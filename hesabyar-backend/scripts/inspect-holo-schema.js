/**
 * inspect-holo-schema.js
 * ─────────────────────────────────────────────────────────
 * این اسکریپت رو *بعد* از این‌که بکاپ هلو (فایل .bak) روی یک
 * SQL Server (حتی نسخه‌ی رایگان Express) Restore شد اجرا کن.
 * خروجی یک فایل JSON با لیست کامل جدول‌ها، ستون‌ها، نوع
 * داده‌ها و چند ردیف نمونه از هر جدول مهم می‌سازه — همین فایل
 * رو برای من بفرست تا نگاشت دقیق src/lib/holoSchema.js رو کامل کنم.
 *
 * اجرا:
 *   1) npm install   (اگه هنوز نصب نکردی)
 *   2) این متغیرها رو تنظیم کن (یا در .env بذار):
 *      HOLO_MSSQL_SERVER=localhost
 *      HOLO_MSSQL_DATABASE=NameOfRestoredDB
 *      HOLO_MSSQL_USER=sa
 *      HOLO_MSSQL_PASSWORD=...
 *   3) node scripts/inspect-holo-schema.js
 *   4) فایل holo-schema-report.json ساخته میشه؛ همونو برام بفرست
 */
import sql from 'mssql'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const config = {
  server: process.env.HOLO_MSSQL_SERVER || 'localhost',
  database: process.env.HOLO_MSSQL_DATABASE,
  user: process.env.HOLO_MSSQL_USER || 'sa',
  password: process.env.HOLO_MSSQL_PASSWORD,
  options: { trustServerCertificate: true, encrypt: false },
}

// جدول‌هایی که احتمالاً معادل مشتری/کالا/فاکتور/سند هستن (بر اساس نام‌گذاری متداول هلو)
const LIKELY_TABLES_PATTERN = /ASH|ART|FACT|SND|HESAB|TAFSILI|ANBAR|CHECK|BANK/i

async function main() {
  if (!config.database) {
    console.error('❌ HOLO_MSSQL_DATABASE تنظیم نشده. مقادیر بالای فایل رو در .env بذار.')
    process.exit(1)
  }

  console.log(`اتصال به ${config.server}/${config.database} ...`)
  const pool = await sql.connect(config)

  const tablesResult = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `)
  const allTables = tablesResult.recordset.map(r => r.TABLE_NAME)
  console.log(`${allTables.length} جدول پیدا شد.`)

  const report = { database: config.database, generatedAt: new Date().toISOString(), tables: {} }

  const interesting = allTables.filter(t => LIKELY_TABLES_PATTERN.test(t))
  console.log(`${interesting.length} جدول محتمل (نام‌شون شبیه ASH/ART/FACT/SND/...) — این‌ها با جزئیات کامل بررسی میشن.`)
  console.log('بقیه‌ی جدول‌ها فقط در allTableNames لیست میشن (بدون جزئیات، برای این‌که فایل خروجی خیلی بزرگ نشه).')

  for (const table of interesting) {
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION
    `)
    let sample = []
    try {
      const sampleResult = await pool.request().query(`SELECT TOP 3 * FROM [${table}]`)
      sample = sampleResult.recordset
    } catch (e) {
      sample = [`(خطا در خواندن نمونه: ${e.message})`]
    }
    report.tables[table] = { columns: columnsResult.recordset, sampleRows: sample }
    console.log(`  ✓ ${table} (${columnsResult.recordset.length} ستون)`)
  }

  report.allTableNames = allTables

  fs.writeFileSync('holo-schema-report.json', JSON.stringify(report, null, 2), 'utf-8')
  console.log('\n✅ گزارش ساخته شد: holo-schema-report.json')
  console.log('این فایل رو برای تکمیل نگاشت هلو بفرست.')

  await pool.close()
}

main().catch(err => {
  console.error('❌ خطا:', err.message)
  process.exit(1)
})
