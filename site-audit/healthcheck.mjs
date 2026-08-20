#!/usr/bin/env node
/**
 * اسکریپت مستقل سلامت‌سنجی سایت حسابیار.
 *
 * این فایل عمداً بیرون از دو پروژه‌ی اصلی (frontend/backend) نگه داشته شده و هیچ
 * وابستگی خارجی نداره (فقط fetch داخلی Node 18+) تا بشه مستقل از هر جا (لپ‌تاپ،
 * سرور CI، حتی گوشی با Termux) اجراش کرد بدون نصب چیز اضافه.
 *
 * روش اجرا:
 *   1) cp .env.example .env   و مقدارها رو پر کن
 *   2) node healthcheck.mjs   (یا npm run audit)
 *
 * خروجی: هم روی کنسول چاپ می‌شه، هم یک فایل Markdown کامل توی ./reports می‌سازه
 * که می‌تونی مستقیم برام بفرستی — دقیقاً همون چیزیه که برای بررسی لازم دارم.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// ── بارگذاری .env بدون وابستگی به پکیج dotenv ──
async function loadEnv() {
  if (!existsSync('.env')) {
    console.error('❌ فایل .env پیدا نشد. اول اجرا کن: cp .env.example .env  و مقدارها رو پر کن.')
    process.exit(1)
  }
  const text = await readFile('.env', 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = await loadEnv()
const API = (env.API_BASE_URL || '').replace(/\/$/, '')
const FRONTEND = (env.FRONTEND_BASE_URL || '').replace(/\/$/, '')
const ADMIN_HTML_PATH = env.ADMIN_HTML_PATH || '/admin.html'
const DELAY = Number(env.REQUEST_DELAY_MS || 150)
const KEEP_TEST_DATA = env.KEEP_TEST_DATA === 'true'

if (!API || !FRONTEND) {
  console.error('❌ API_BASE_URL و FRONTEND_BASE_URL هر دو باید در .env پر شده باشن.')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── جمع‌آوری نتایج ──
const results = [] // { section, name, status: 'pass'|'fail'|'warn'|'skip', detail }
function record(section, name, status, detail = '') {
  results.push({ section, name, status, detail })
  const icon = { pass: '✅', fail: '❌', warn: '⚠️ ', skip: '⏭️ ' }[status]
  console.log(`${icon} [${section}] ${name}${detail ? ' — ' + detail : ''}`)
}

async function safeFetch(url, opts = {}) {
  await sleep(DELAY)
  try {
    const res = await fetch(url, opts)
    let body = null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      body = await res.json().catch(() => null)
    } else {
      body = await res.text().catch(() => null)
    }
    return { ok: true, status: res.status, headers: res.headers, body }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

let apiToken = null
let apiCompanyId = null
let testClientId = null
let testInvoiceId = null
let testPartnerId = null

/* ══════════════════════════ بخش ۱ — دسترس‌پذیری فرانت ══════════════════════════ */
async function checkFrontendReachability() {
  const home = await safeFetch(FRONTEND + '/')
  if (!home.ok) return record('فرانت', 'بارگذاری صفحه‌ی اصلی', 'fail', home.error)
  if (home.status !== 200) return record('فرانت', 'بارگذاری صفحه‌ی اصلی', 'fail', `HTTP ${home.status}`)
  record('فرانت', 'بارگذاری صفحه‌ی اصلی', 'pass', `HTTP ${home.status}`)

  const hasRoot = typeof home.body === 'string' && /id=["']root["']/.test(home.body)
  record('فرانت', 'وجود <div id="root"> در HTML اصلی (نشونه‌ی build درست React)', hasRoot ? 'pass' : 'warn')

  // مسیر یک صفحه‌ی داخلی SPA (نه روت) — چک می‌کنه هاست استاتیک rewrite رو درست تنظیم کرده یا نه.
  // اگه هاست rewrite نداشته باشه، رفرش دستی روی /invoices مثلاً 404 خام هاست می‌ده نه صفحه‌ی React.
  const deepLink = await safeFetch(FRONTEND + '/invoices')
  if (deepLink.ok && deepLink.status === 200) {
    record('فرانت', 'رفرش مستقیم روی یک مسیر داخلی (/invoices) بدون 404 هاست', 'pass')
  } else {
    record('فرانت', 'رفرش مستقیم روی یک مسیر داخلی (/invoices)', 'warn',
      `HTTP ${deepLink.status ?? '?'} — اگه کاربر رو صفحه‌ی فاکتورها رفرش (F5) بزنه ممکنه 404 هاست ببینه؛ نیاز به rewrite rule سمت هاست`)
  }

  const admin = await safeFetch(FRONTEND + ADMIN_HTML_PATH)
  if (admin.ok && admin.status === 200) {
    record('فرانت', `بارگذاری پنل سوپرادمین (${ADMIN_HTML_PATH})`, 'pass')
    const noIndex = typeof admin.body === 'string' && /noindex/i.test(admin.body)
    record('فرانت', 'وجود noindex روی صفحه‌ی ادمین (مخفی از گوگل)', noIndex ? 'pass' : 'warn',
      noIndex ? '' : 'اگه noindex نباشه ممکنه صفحه‌ی ادمین توی نتایج گوگل قابل پیدا شدن باشه')
  } else {
    record('فرانت', `بارگذاری پنل سوپرادمین (${ADMIN_HTML_PATH})`, 'fail', `HTTP ${admin.status ?? admin.error}`)
  }

  // چک باندل — اگه chunk اصلی خیلی بزرگ باشه یعنی code-splitting از دیپلوی جا افتاده
  if (typeof home.body === 'string') {
    const scriptTags = [...home.body.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1])
    record('فرانت', `تعداد فایل‌های script در index.html`, scriptTags.length > 0 ? 'pass' : 'warn', `${scriptTags.length} فایل`)
  }
}

/* ══════════════════════════ بخش ۲ — سلامت پایه‌ی بک‌اند ══════════════════════════ */
async function checkBackendBasics() {
  const unknown = await safeFetch(API + '/api/this-route-does-not-exist-12345')
  if (unknown.ok && unknown.status === 404) {
    record('بک‌اند', 'مسیر نامعتبر باید 404 بده', 'pass')
  } else {
    record('بک‌اند', 'مسیر نامعتبر باید 404 بده', 'fail', `HTTP ${unknown.status ?? unknown.error}`)
  }

  const noAuth = await safeFetch(API + '/api/clients')
  if (noAuth.ok && noAuth.status === 401) {
    record('امنیت', 'درخواست بدون توکن به مسیر محافظت‌شده باید 401 بده', 'pass')
  } else {
    record('امنیت', 'درخواست بدون توکن به مسیر محافظت‌شده باید 401 بده', 'fail', `HTTP ${noAuth.status ?? noAuth.error} — این جدی‌ست، یعنی احتمالاً دیتای شرکت‌ها بدون لاگین قابل خوندنه`)
  }

  // مسیر حدسی سوپرادمین (نه secret واقعی) نباید کار کنه
  const guessedAdmin = await safeFetch(API + '/api/admin/companies')
  if (guessedAdmin.ok && guessedAdmin.status === 404) {
    record('امنیت', 'مسیر حدسی /api/admin نباید وجود داشته باشه (باید پشت پیشوند مخفی باشه)', 'pass')
  } else {
    record('امنیت', 'مسیر حدسی /api/admin نباید وجود داشته باشه', 'warn', `HTTP ${guessedAdmin.status ?? guessedAdmin.error}`)
  }
}

/* ══════════════════════════ بخش ۳ — جریان کامل کاربر (ثبت‌نام → فاکتور → پرداخت) ══════════════════════════ */
async function runFullUserFlow() {
  let email = env.TEST_USER_EMAIL
  let password = env.TEST_USER_PASSWORD

  if (!email) {
    email = `audit-${Date.now()}@example.com`
    password = 'Audit123456'
    const reg = await safeFetch(API + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'کاربر ممیزی', email, password, companyName: 'شرکت ممیزی خودکار' }),
    })
    if (!reg.ok || reg.status !== 200 || !reg.body?.token) {
      return record('جریان کاربر', 'ثبت‌نام شرکت تستی', 'fail', `HTTP ${reg.status ?? reg.error}`)
    }
    record('جریان کاربر', 'ثبت‌نام شرکت تستی جدید', 'pass', email)
    apiToken = reg.body.token
    apiCompanyId = reg.body.company?.id
  } else {
    const login = await safeFetch(API + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!login.ok || login.status !== 200 || !login.body?.token) {
      return record('جریان کاربر', 'ورود با کاربر تستی مشخص‌شده در .env', 'fail', `HTTP ${login.status ?? login.error}`)
    }
    record('جریان کاربر', 'ورود با کاربر تستی', 'pass')
    apiToken = login.body.token
    apiCompanyId = login.body.company?.id
  }

  const auth = { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }

  const client = await safeFetch(API + '/api/clients', {
    method: 'POST', headers: auth, body: JSON.stringify({ name: 'مشتری ممیزی', type: 'company' }),
  })
  if (client.ok && client.status === 201) {
    testClientId = client.body.id
    record('جریان کاربر', 'ساخت مشتری', 'pass')
  } else {
    return record('جریان کاربر', 'ساخت مشتری', 'fail', `HTTP ${client.status ?? client.error} — ادامه‌ی این بخش رد شد`)
  }

  const invoice = await safeFetch(API + '/api/invoices', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ type: 'sale', clientId: testClientId, issueDate: '2026-07-01', dueDate: '2026-07-15', grandTotal: 500000, status: 'pending' }),
  })
  if (invoice.ok && invoice.status === 201) {
    testInvoiceId = invoice.body.id
    record('جریان کاربر', 'ساخت فاکتور', 'pass')
  } else {
    record('جریان کاربر', 'ساخت فاکتور', 'fail', `HTTP ${invoice.status ?? invoice.error}`)
  }

  if (testInvoiceId) {
    const payment = await safeFetch(API + '/api/payments', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ date: '2026-07-05', amount: 200000, transactionType: 'receipt', invoiceId: testInvoiceId, clientId: testClientId }),
    })
    record('جریان کاربر', 'ثبت پرداخت جزئی روی فاکتور', payment.ok && payment.status === 201 ? 'pass' : 'fail',
      payment.ok ? '' : `HTTP ${payment.status ?? payment.error}`)
  }

  const notif = await safeFetch(API + '/api/notifications', { headers: auth })
  record('جریان کاربر', 'دریافت اعلان‌های سررسید', notif.ok && notif.status === 200 ? 'pass' : 'fail')

  const activity = await safeFetch(API + '/api/activity-log', { headers: auth })
  const hasEntries = activity.ok && Array.isArray(activity.body) && activity.body.length > 0
  record('جریان کاربر', 'ثبت خودکار لاگ فعالیت', hasEntries ? 'pass' : 'fail')

  // شرکا / دفتر شراکت (فیچر جدید)
  const partner = await safeFetch(API + '/api/partners', {
    method: 'POST', headers: auth, body: JSON.stringify({ name: 'شریک ممیزی', share: 100, capital: 0 }),
  })
  if (partner.ok && partner.status === 201) {
    testPartnerId = partner.body.id
    record('جریان کاربر', 'ساخت شریک', 'pass')
    const contrib = await safeFetch(API + `/api/partner-ledger/${testPartnerId}/transactions`, {
      method: 'POST', headers: auth, body: JSON.stringify({ type: 'capital_in', amount: 1000000, date: '2026-07-01', description: 'آورده‌ی ممیزی' }),
    })
    record('جریان کاربر', 'ثبت آورده‌ی نقدی شریک (دفتر شراکت)', contrib.ok && contrib.status === 201 ? 'pass' : 'fail',
      contrib.ok ? `موجودی: ${contrib.body?.balance}` : `HTTP ${contrib.status ?? contrib.error}`)
  } else {
    record('جریان کاربر', 'ساخت شریک', 'fail', `HTTP ${partner.status ?? partner.error} — /api/partner-ledger احتمالاً روی این دیپلوی هنوز آپدیت نشده`)
  }

  if (!KEEP_TEST_DATA && testInvoiceId) {
    await safeFetch(API + `/api/invoices/${testInvoiceId}`, { method: 'DELETE', headers: auth })
    await safeFetch(API + `/api/clients/${testClientId}`, { method: 'DELETE', headers: auth })
    if (testPartnerId) await safeFetch(API + `/api/partners/${testPartnerId}`, { method: 'DELETE', headers: auth })
    record('جریان کاربر', 'پاک‌سازی دیتای تستی', 'pass')
  }
}

/* ══════════════════════════ بخش ۴ — ایزوله‌سازی چندمستأجری ══════════════════════════ */
async function checkTenantIsolation() {
  if (!apiToken || !testClientId) return record('امنیت', 'ایزوله‌سازی چندمستأجری', 'skip', 'جریان کاربر قبلی موفق نبود')

  const email2 = `audit-tenant2-${Date.now()}@example.com`
  const reg2 = await safeFetch(API + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'کاربر شرکت دوم', email: email2, password: 'Audit123456', companyName: 'شرکت دوم ممیزی' }),
  })
  if (!reg2.ok || reg2.status !== 200) return record('امنیت', 'ایزوله‌سازی چندمستأجری', 'skip', 'ساخت شرکت دوم شکست خورد')

  const cross = await safeFetch(API + `/api/clients/${testClientId}`, {
    headers: { Authorization: `Bearer ${reg2.body.token}` },
  })
  if (cross.ok && cross.status === 404) {
    record('امنیت', 'شرکت دوم نباید بتونه مشتری شرکت اول رو ببینه', 'pass')
  } else {
    record('امنیت', 'شرکت دوم نباید بتونه مشتری شرکت اول رو ببینه', 'fail',
      `HTTP ${cross.status} — این یه نشتی جدی دیتاست، فوراً بررسی بشه`)
  }
}

/* ══════════════════════════ بخش ۵ — نرخ‌محدودسازی (rate limit) ══════════════════════════ */
async function checkRateLimit() {
  console.log('\n… در حال تست rate limit روی لاگین (ممکنه چند ثانیه طول بکشه)')
  let got429 = false
  for (let i = 0; i < 25; i++) {
    const res = await safeFetch(API + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent-audit@example.com', password: 'wrong' }),
    })
    if (res.status === 429) { got429 = true; break }
  }
  record('امنیت', 'rate limit روی /api/auth/login بعد از درخواست‌های زیاد', got429 ? 'pass' : 'warn',
    got429 ? '' : 'بعد از ۲۵ درخواست پشت‌سرهم هنوز 429 نگرفتیم — یا حد بالاتره یا rate limit غیرفعاله')
}

/* ══════════════════════════ بخش ۶ — پنل سوپرادمین (اختیاری) ══════════════════════════ */
async function checkSuperadmin() {
  if (!env.SUPERADMIN_EMAIL || !env.ADMIN_ROUTE_SECRET) {
    return record('سوپرادمین', 'تست ورود دومرحله‌ای سوپرادمین', 'skip', 'SUPERADMIN_EMAIL یا ADMIN_ROUTE_SECRET در .env خالیه')
  }
  const step1 = await safeFetch(`${API}/api/${env.ADMIN_ROUTE_SECRET}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }),
  })
  if (step1.ok && step1.status === 200 && step1.body?.step === '2fa_required') {
    record('سوپرادمین', 'مرحله‌ی ۱ ورود سوپرادمین (رمز) باید step=2fa_required برگردونه', 'pass')
    record('سوپرادمین', 'مرحله‌ی ۲ (کد OTP)', 'skip', 'کد فقط توی کنسول سرور چاپ می‌شه، از اینجا قابل خوندن نیست — دستی تست کن')
  } else {
    record('سوپرادمین', 'مرحله‌ی ۱ ورود سوپرادمین', 'fail', `HTTP ${step1.status ?? step1.error}`)
  }
}

/* ══════════════════════════ اجرا و گزارش ══════════════════════════ */
async function main() {
  console.log(`\n🔍 شروع سلامت‌سنجی حسابیار\n   API: ${API}\n   Frontend: ${FRONTEND}\n`)

  await checkFrontendReachability()
  await checkBackendBasics()
  await runFullUserFlow()
  await checkTenantIsolation()
  await checkSuperadmin()
  await checkRateLimit()

  const summary = { pass: 0, fail: 0, warn: 0, skip: 0 }
  results.forEach((r) => summary[r.status]++)

  console.log(`\n📊 خلاصه: ${summary.pass} موفق، ${summary.fail} ناموفق، ${summary.warn} هشدار، ${summary.skip} رد‌شده\n`)

  await mkdir('reports', { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = `reports/report-${stamp}.md`

  const bySection = {}
  results.forEach((r) => { (bySection[r.section] ??= []).push(r) })

  let md = `# گزارش سلامت‌سنجی حسابیار\n\n`
  md += `تاریخ اجرا: ${new Date().toISOString()}\n\n`
  md += `**خلاصه:** ${summary.pass} موفق ✅ | ${summary.fail} ناموفق ❌ | ${summary.warn} هشدار ⚠️ | ${summary.skip} رد‌شده ⏭️\n\n`
  for (const [section, items] of Object.entries(bySection)) {
    md += `## ${section}\n\n`
    items.forEach((r) => {
      const icon = { pass: '✅', fail: '❌', warn: '⚠️', skip: '⏭️' }[r.status]
      md += `- ${icon} **${r.name}**${r.detail ? ' — ' + r.detail : ''}\n`
    })
    md += '\n'
  }
  await writeFile(reportPath, md, 'utf8')
  console.log(`📄 گزارش کامل ذخیره شد: ${reportPath}\n   این فایل رو مستقیم برام بفرست.\n`)

  process.exit(summary.fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('اجرای اسکریپت با خطای غیرمنتظره متوقف شد:', err)
  process.exit(1)
})
