import { test, expect } from '@playwright/test'

/**
 * مسیر بحرانی: ثبت‌نام شرکت جدید → ثبت یک مشتری → صدور فاکتور برای همون مشتری
 * → ثبت پرداختی. هدف این تست تأیید «سیم‌کشی سرتاسری» بین فرانت و بک‌اند واقعیه
 * (نه mock)، نه پوشش کامل هر حالت خطا — برای همون منظور تست‌های واحد/کامپوننت
 * (vitest) در هر دو پروژه هستن.
 *
 * ⚠️ این فایل در محیطی نوشته شده که اجرای واقعی مرورگر (دانلود باینری Chromium
 * از cdn.playwright.dev) در sandbox مسدوده، پس هنوز یک‌بار هم با مرورگر واقعی
 * اجرا نشده. سلکتورها بر اساس خوندن دقیق کد فعلی صفحات (placeholder ها، متن
 * دکمه‌ها، مسیر route ها) نوشته شدن، ولی قبل از تکیه‌کردن روی این تست در CI،
 * حتماً یک‌بار محلی اجرا و در صورت لزوم سلکتورها اصلاح بشن:
 *   npx playwright install --with-deps chromium && npm test
 */

test.describe('مسیر بحرانی: ثبت‌نام ← مشتری ← فاکتور ← پرداخت', () => {
  test('یک شرکت جدید می‌تونه ثبت‌نام کنه، مشتری بسازه، فاکتور بزنه و پرداخت ثبت کنه', async ({ page }) => {
    const unique = Date.now()
    const email = `e2e-${unique}@test.local`
    const companyName = `شرکت تست ${unique}`
    const ownerName = 'کاربر تست e2e'
    const clientName = `مشتری تست ${unique}`

    // ── ۱. ثبت‌نام (دو مرحله‌ای) ──
    await page.goto('/register')
    await page.getByPlaceholder('مثلاً: حسابیار تک').fill(companyName)
    await page.getByPlaceholder('نام کامل').fill(ownerName)
    await page.getByRole('button', { name: /ادامه/ }).click()

    await page.getByPlaceholder('name@company.ir').fill(email)
    await page.getByPlaceholder('حداقل ۸ کاراکتر').fill('Test12345!')
    await page.getByPlaceholder('••••••••').fill('Test12345!')
    await page.getByRole('button', { name: /ساخت حساب/ }).click()

    // بعد از ثبت‌نام موفق، به داشبورد (مسیر `/`) هدایت می‌شه
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    // ── ۲. ساخت یک مشتری (پیش‌نیاز فاکتور) ──
    await page.goto('/clients')
    await page.getByRole('button', { name: /مشتری جدید/ }).click()
    // فیلد «نام» پلیس‌هولدر نداره، پس اولین input داخل مودال همینه (تنها فیلد الزامی فرم مشتری)
    await page.getByRole('dialog').locator('input').first().fill(clientName)
    await page.getByRole('button', { name: /افزودن مشتری/ }).click()
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10_000 })

    // ── ۳. صدور فاکتور برای همون مشتری ──
    await page.goto('/invoices')
    await page.getByRole('button', { name: /فاکتور جدید/ }).click()
    const invoiceDialog = page.getByRole('dialog')
    // صفحه‌ی Invoices خودش یه Select فیلتر «وضعیت» جدا از مودال داره، پس باید
    // انتخابگر مشتری رو محدود به داخل مودال کنیم، نه اولین <select> کل صفحه.
    await invoiceDialog.locator('select').first().selectOption({ label: clientName })
    // یک ردیف قلم با شرح و مبلغ (شرط submit در InvoiceForm: حداقل یک قلم با desc و total>0)
    await invoiceDialog.getByPlaceholder('شرح کالا / خدمت').first().fill('خدمات مشاوره‌ی تستی')
    await invoiceDialog.getByPlaceholder('0').first().fill('1000000')
    await invoiceDialog.getByRole('button', { name: /ثبت|صدور/ }).last().click()

    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10_000 })

    // ── ۴. ثبت یک پرداختی ──
    await page.goto('/payments')
    await page.getByRole('button', { name: /پرداختی جدید/ }).click()
    const paymentDialog = page.getByRole('dialog')
    await paymentDialog.getByPlaceholder('0').first().fill('500000')
    // روش پرداخت الزامیه (FormField «روش پرداخت» → Select با گزینه‌های نقدی/چک/انتقال بانکی/کارت)
    await paymentDialog.locator('select').filter({ hasText: 'نقدی' }).selectOption({ label: 'نقدی' })
    await paymentDialog.getByRole('button', { name: /ثبت پرداختی/ }).click()

    await expect(page.getByText('500,000').or(page.getByText('۵۰۰,۰۰۰'))).toBeVisible({ timeout: 10_000 })
  })
})
