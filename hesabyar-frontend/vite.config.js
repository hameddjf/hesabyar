import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
      output: {
        // کتابخانه‌های سنگین که فقط توی بعضی صفحات لازمن، از باندل اصلی جدا می‌شن
        // تا هر کاربر فقط چیزی که واقعاً استفاده می‌کنه رو دانلود کنه
        manualChunks: {
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          jalali: ['jalaali-js'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    css: false,
  },
})
