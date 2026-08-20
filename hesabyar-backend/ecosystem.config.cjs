// تنظیمات pm2 — نگه‌داشتن بک‌اند همیشه روشن + ری‌استارت خودکار در صورت کرش.
//
// نصب pm2 (فقط یه‌بار، سراسری):
//   npm install -g pm2
//
// اجرا:
//   cd hesabyar-backend
//   pm2 start ecosystem.config.cjs
//
// دستورهای مفید بعدش:
//   pm2 status              وضعیت پراسس‌ها
//   pm2 logs hesabyar-api    لاگ زنده
//   pm2 restart hesabyar-api ری‌استارت دستی
//   pm2 save                 ذخیره‌ی لیست پراسس‌ها
//   pm2 startup               دستوری می‌ده که با اجراش pm2 خودش با روشن‌شدن سیستم بالا میاد

module.exports = {
  apps: [
    {
      name: 'hesabyar-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      // اگه توی ۱۵ ثانیه‌ی اول بعد از هر استارت دوباره کرش کنه، یعنی مشکل
      // اساسیه (نه یه خطای موقت) — pm2 بعد از چند بار تلاش پشت‌سرهم متوقفش
      // می‌کنه تا لوپ بی‌نهایت crash/restart ایجاد نشه.
      min_uptime: '15s',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
