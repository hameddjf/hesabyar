import fs from 'fs'

const TEST_DB = './data/test.sqlite'

// قبل از هر بار اجرای کل مجموعه تست‌ها، دیتابیس تستِ قبلی پاک بشه تا تست‌ها ایزوله باشن
for (const suffix of ['', '-shm', '-wal']) {
  try { fs.unlinkSync(TEST_DB + suffix) } catch { /* فایل وجود نداشت، مشکلی نیست */ }
}
