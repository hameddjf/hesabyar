import { defineConfig } from '@playwright/test'

/**
 * این کانفیگ backend و frontend رو خودش (با یک دیتابیس SQLite جدا و یک‌بارمصرف،
 * data/e2e.sqlite) بالا میاره — نیازی نیست از قبل دستی اجرا بشن. اگه سرورها از
 * قبل روی همون پورت‌ها بالا باشن (توسعه‌ی محلی)، reuseExistingServer ازشون
 * استفاده می‌کنه به‌جای بالا آوردن نمونه‌ی جدید.
 *
 * پیش‌نیاز اجرا (این محیط sandbox دسترسی به cdn.playwright.dev نداره، پس باینری
 * مرورگر اینجا نصب نشده — باید یک‌بار محلی/در CI اجرا بشه):
 *   npm install
 *   npx playwright install --with-deps chromium
 *   npm test
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1, // همه‌ی تست‌ها روی یک دیتابیس مشترک کار می‌کنن، پس نباید موازی اجرا بشن
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../hesabyar-backend',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4000',
        DB_PATH: './data/e2e.sqlite',
        JWT_SECRET: 'e2e-jwt-secret',
        ADMIN_JWT_SECRET: 'e2e-admin-jwt-secret',
        ADMIN_ROUTE_SECRET: 'e2e-admin-secret',
        CORS_ORIGIN: 'http://localhost:5173',
        FRONTEND_URL: 'http://localhost:5173',
      },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '../hesabyar-frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        VITE_API_URL: 'http://localhost:4000/api',
      },
    },
  ],
})
