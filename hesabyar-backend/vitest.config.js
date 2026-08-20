import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      DB_PATH: './data/test.sqlite',
      JWT_SECRET: 'test-jwt-secret',
      ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
      ADMIN_ROUTE_SECRET: 'test-admin-secret',
      DISABLE_AUTO_BACKUP: 'true',
    },
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false, // چون همه از یک فایل SQLite مشترک استفاده می‌کنن، تست‌ها نباید موازی اجرا بشن
  },
})
