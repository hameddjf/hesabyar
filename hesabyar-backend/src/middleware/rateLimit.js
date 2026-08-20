import rateLimit from 'express-rate-limit'

const skipInTest = () => process.env.NODE_ENV === 'test'

/**
 * محدودسازی نرخ درخواست در سطح IP — علاوه بر قفل حساب (که در auth.js/adminAuth.js هست).
 * هدف این لایه جلوگیری از brute-force توزیع‌شده روی چند ایمیل مختلف از یک IPه،
 * چیزی که قفل حساب (که per-account هست) به‌تنهایی جلوش رو نمی‌گیره.
 */

/** محدود برای مسیرهای احراز هویت (لاگین/ثبت‌نام) — سخت‌گیرانه */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 20, // حداکثر ۲۰ تلاش از یک IP در این بازه (برای کل مسیرهای auth، نه فقط login)
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'تعداد درخواست‌ها از این آدرس بیش از حد مجازه. چند دقیقه‌ی دیگه دوباره امتحان کن.' },
})

/** محدود عمومی برای کل API — سخت‌گیر نیست، فقط جلوی سوءاستفاده‌ی فاحش رو می‌گیره */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // ۱ دقیقه
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجازه. کمی صبر کن.' },
})
