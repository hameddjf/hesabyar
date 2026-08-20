#!/usr/bin/env node
// مقادیر تصادفی امن برای JWT_SECRET / ADMIN_JWT_SECRET / ADMIN_ROUTE_SECRET
// می‌سازه — همین خروجی رو مستقیم توی .env کپی کن.
//
// اجرا:
//   node scripts/generate-secrets.js

import { randomBytes } from 'crypto'

const hex = (bytes) => randomBytes(bytes).toString('hex')

console.log('# این مقادیر رو کپی و توی .env جایگزین همین کلیدها کن (هر بار اجرا، مقدار جدید می‌ده):\n')
console.log(`JWT_SECRET=${hex(32)}`)
console.log(`ADMIN_JWT_SECRET=${hex(32)}`)
console.log(`ADMIN_ROUTE_SECRET=${hex(16)}`)
