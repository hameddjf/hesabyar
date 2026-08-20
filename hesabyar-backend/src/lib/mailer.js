import nodemailer from 'nodemailer'

/**
 * ابزار ساده‌ی ارسال ایمیل.
 *
 * اگه متغیرهای SMTP_HOST / SMTP_USER / SMTP_PASS در .env پر شده باشن،
 * ایمیل واقعی از طریق SMTP ارسال می‌شه.
 *
 * اگه پر نشده باشن (مثلاً در محیط توسعه یا تست)، به‌جای ارسال واقعی،
 * لینک/محتوای ایمیل توی کنسول سرور چاپ می‌شه تا بدون نیاز به SMTP واقعی
 * بشه جریان رو تست کرد. هیچ‌وقت خطا نمی‌ده و جریان اصلی برنامه رو متوقف
 * نمی‌کنه — چون شکست ارسال ایمیل نباید باعث لو رفتن اطلاعات (وجود/عدم‌وجود
 * ایمیل کاربر) یا کرش کل درخواست بشه.
 */

let transporter = null
function getTransporter() {
  if (transporter) return transporter
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter()
  if (!t) {
    // حالت dev / بدون SMTP تنظیم‌شده: به‌جای ارسال واقعی، لاگ می‌کنیم.
    console.log('────────────────────────────────────────────')
    console.log('📧 [SMTP تنظیم نشده — ایمیل به‌جاش اینجا چاپ می‌شه]')
    console.log('به:', to)
    console.log('موضوع:', subject)
    console.log(text || html)
    console.log('────────────────────────────────────────────')
    return { sent: false, reason: 'smtp-not-configured' }
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || `"حسابیار" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    })
    return { sent: true }
  } catch (err) {
    console.error('❌ خطا در ارسال ایمیل:', err.message)
    return { sent: false, reason: err.message }
  }
}

/**
 * بررسی واقعی اینکه SMTP قابل استفاده‌ست یا نه — بدون فرستادن ایمیل واقعی،
 * فقط اتصال/احراز هویت رو با سرور SMTP تست می‌کنه (nodemailer transporter.verify).
 * برای دیباگ «چرا ایمیل نمی‌رسه» خیلی کاربردی‌تر از تست با ارسال واقعیه، چون
 * قبل از هر ارسالی (مثلاً موقع بالا اومدن سرور) می‌شه فهمید تنظیمات درسته یا نه.
 */
export async function verifyMailConfig() {
  const t = getTransporter()
  if (!t) return { configured: false }
  try {
    await t.verify()
    return { configured: true, ok: true }
  } catch (err) {
    return { configured: true, ok: false, error: err.message }
  }
}
