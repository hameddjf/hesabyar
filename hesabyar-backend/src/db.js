import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const DB_PATH = process.env.DB_PATH || './data/hesabyar.sqlite'
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/* migration امن: اگه دیتابیس از قبل وجود داشته و ستون جدید رو نداره، اضافه‌ش کن.
   (فقط برای ستون‌هایی که بعد از اولین ریلیز اضافه شدن) */
function safeAddColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

db.exec(`
/* ══════════════════════════════════════════════
   چندمستأجری (Multi-tenant)
   هر شرکتی که ثبت‌نام می‌کنه یک ردیف اینجا می‌گیره؛
   تمام دیتای عملیاتی (clients, invoices, ...) با
   company_id به این جدول وصل و ایزوله می‌شه.
   ══════════════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  plan TEXT DEFAULT 'free',       -- free | basic | pro
  status TEXT DEFAULT 'trial',    -- trial | active | suspended
  max_users INTEGER DEFAULT 1,
  national_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  industry TEXT,
  address TEXT,
  currency TEXT DEFAULT 'IRR',
  default_tax_rate REAL DEFAULT 10,
  invoice_number_format TEXT DEFAULT 'INV-{YEAR}-{NUM}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

/* ══════════════════════════════════════════════
   سوپرادمین — کاملاً جدا از users شرکت‌ها، جدول
   مستقل، سکرت JWT مستقل، بدون هیچ ارتباطی به
   company_id (سوپرادمین به هیچ شرکتی تعلق نداره)
   ══════════════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS super_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  otp_code_hash TEXT,               -- هش کد یک‌بارمصرف فعلی (2FA)
  otp_expires TEXT,                 -- انقضای کد یک‌بارمصرف
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner', -- owner | admin | employee
  status TEXT DEFAULT 'active',       -- active | suspended
  last_login_at TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'person',
  contact TEXT,
  national_code TEXT,
  eco_code TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  status TEXT DEFAULT 'active',
  bank_iban TEXT,
  bank_card TEXT,
  source TEXT DEFAULT 'hesabyar',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'piece',
  price REAL DEFAULT 0,
  buy_price REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  tax_rate REAL DEFAULT 10,
  description TEXT,
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'hesabyar',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  invoice_number TEXT,
  type TEXT DEFAULT 'sale',
  issue_date TEXT,
  due_date TEXT,
  client_id TEXT,
  total_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  description TEXT,
  source TEXT DEFAULT 'hesabyar',
  items_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  qty REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  date TEXT,
  amount REAL DEFAULT 0,
  transaction_type TEXT DEFAULT 'receipt',
  method TEXT DEFAULT 'cash',
  reference TEXT,
  description TEXT,
  invoice_id TEXT,
  check_number TEXT,
  check_date TEXT,
  check_bank TEXT,
  partner_id TEXT,
  partner_account TEXT,
  client_id TEXT,
  category TEXT,
  has_receipt INTEGER DEFAULT 0,
  status TEXT DEFAULT 'done',
  source TEXT DEFAULT 'hesabyar',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_links (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  from_invoice_id TEXT NOT NULL,
  to_invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT DEFAULT (datetime('now')),
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS holo_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  direction TEXT NOT NULL,
  entity TEXT NOT NULL,
  records_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ══════════════════════════════════════════════
   مدیریت دسته چک (چک‌های دریافتی و پرداختی) —
   موجودیت مستقل با گردش‌کار وضعیت خودش، جدا از
   جدول payments (که فقط یک پرداخت نقدی/چکی ساده‌ست).
   ══════════════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS checks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  direction TEXT NOT NULL,             -- received (دریافتنی) | issued (پرداختنی)
  check_number TEXT,
  sayad_id TEXT,                       -- شناسه صیادی ۱۶ رقمی چک
  bank_name TEXT,
  branch TEXT,
  amount REAL NOT NULL DEFAULT 0,
  issue_date TEXT,
  due_date TEXT,
  party_name TEXT,                     -- received: پرداخت‌کننده / issued: در وجه چه کسی
  client_id TEXT REFERENCES clients(id),
  invoice_id TEXT REFERENCES invoices(id),
  status TEXT NOT NULL DEFAULT 'in_hand', -- in_hand|deposited|cleared|bounced|passed_on|cancelled
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

/* تاریخچه‌ی تغییر وضعیت هر چک — برای نمایش Timeline و اینکه هیچ تغییر
   وضعیتی بی‌سروصدا و بدون ردّ گم نشه (برخلاف status روی payments قدیمی
   که با overwrite ساده عوض می‌شد و تاریخچه‌ای نداشت) */
CREATE TABLE IF NOT EXISTS check_status_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_id TEXT NOT NULL REFERENCES checks(id),
  company_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  user_id INTEGER,
  user_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* لاگ فعالیت سوپرادمین روی شرکت‌ها (تعلیق/فعال‌سازی/تغییر پلن و ...) */
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  company_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  position TEXT,
  dept TEXT,
  salary REAL DEFAULT 0,
  hire_date TEXT,
  phone TEXT,
  bank TEXT,
  card TEXT,
  iban TEXT,
  status TEXT DEFAULT 'active',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banking_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  label TEXT NOT NULL,
  bank TEXT,
  balance REAL DEFAULT 0,
  card TEXT,
  iban TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  role TEXT,
  share REAL DEFAULT 0,
  phone TEXT,
  join_date TEXT,
  capital REAL DEFAULT 0,
  accounts_json TEXT DEFAULT '[]',  -- آرایه‌ی حساب‌های بانکی شخصی شریک: [{bank,card,iban,label}]
  updated_at TEXT DEFAULT (datetime('now'))
);

/*
 * دفتر حساب شراکت (equity ledger) — جایگزین مدل مینیمال هلو (فقط تعریف کارت بانکی).
 * هر ردیف یک رویداد مالی روی حساب سرمایه‌ی یک شریکه:
 *   capital_in   — آورده‌ی نقدی/غیرنقدی شریک به شرکت (سرمایه‌گذاری)
 *   capital_out  — برداشت شریک از سرمایه (draw)
 *   profit_share — سهم شریک از سود تقسیم‌شده (از ویزارد تقسیم سود یا دستی)
 *   adjustment   — اصلاحیه‌ی دستی (مثلاً تسویه‌ی اختلاف حسابرسی)
 * موجودی هر شریک = capital اولیه‌ی جدول partners + مجموع این ردیف‌ها (in/profit مثبت، out منفی)
 * payment_id اختیاریه: اگه این رویداد با یک تراکنش بانکی واقعی (از جدول payments) همراه بوده،
 * برای رهگیری دوطرفه بهش وصل می‌شه (نه اجباری، چون آورده‌ی غیرنقدی یا تسویه‌ی دفتری هم ممکنه).
 */
CREATE TABLE IF NOT EXISTS partner_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  type TEXT NOT NULL,          -- capital_in | capital_out | profit_share | adjustment
  amount REAL NOT NULL,        -- همیشه مثبت ذخیره می‌شه؛ جهت از روی type مشخصه
  date TEXT NOT NULL,          -- ISO میلادی (YYYY-MM-DD)، هم‌راستا با فاز فرمت تاریخ استاندارد
  description TEXT,
  payment_id TEXT REFERENCES payments(id),
  distribution_batch TEXT,     -- شناسه‌ی مشترک برای ردیف‌های ساخته‌شده در یک اجرای ویزارد تقسیم سود
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

/* لاگ فعالیت کاربران داخل یک شرکت (برای صفحه نظارت مالک) */
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  user_id INTEGER,
  user_name TEXT,
  action TEXT NOT NULL,     -- create | update | delete | login
  entity TEXT,               -- invoice | payment | client | product | employee | ...
  entity_id TEXT,
  entity_label TEXT,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ══════════════════════════════════════════════
   یادآوری خودکار سررسید فاکتور (فاز ۵).
   هر بار که برای یک فاکتور، در یک آستانه‌ی مشخص (مثلاً «۳ روز مونده»
   یا «سررسید گذشته») یادآوری فرستاده می‌شه، یک ردیف اینجا ثبت می‌شه تا
   دوباره برای همون فاکتور و همون آستانه یادآوری تکراری فرستاده نشه.
   UNIQUE(invoice_id, threshold) دقیقاً همین «فقط یک‌بار به‌ازای هر آستانه»
   رو تضمین می‌کنه.
   ══════════════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS invoice_reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  invoice_id TEXT NOT NULL,
  threshold TEXT NOT NULL,   -- 'upcoming' (۳ روز مونده) | 'overdue' (سررسید گذشته)
  email_sent INTEGER DEFAULT 0,
  sent_at TEXT DEFAULT (datetime('now')),
  UNIQUE(invoice_id, threshold)
);

CREATE TABLE IF NOT EXISTS user_layouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  page_key TEXT NOT NULL,        -- مثلاً 'dashboard', 'reports'
  layout_json TEXT,              -- [{ id, visible, order }, ...]
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_clients_company   ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company  ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company  ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company  ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company     ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_checks_company    ON checks(company_id);
CREATE INDEX IF NOT EXISTS idx_checks_due_date   ON checks(due_date);
CREATE INDEX IF NOT EXISTS idx_check_status_log_check ON check_status_log(check_id);

/* فاز ۲ (بهینه‌سازی) این چت: بقیه‌ی جدول‌هایی که همیشه با company_id فیلتر می‌شن ولی
   ایندکس نداشتن. با حجم دیتای فعلی (SMB، چند صد تا چند هزار ردیف در هر شرکت) فرقش
   محسوس نبود، ولی هرچی شرکت‌های بیشتری روی یه دیتابیس مشترک جمع بشن، فول‌اسکن روی
   کل جدول (نه فقط شرکت خودشون) گرون‌تر می‌شه — این ایندکس‌ها هزینه‌ی نوشتنی تقریباً
   صفر دارن (SQLite) و از قبل جلوش رو می‌گیرن. */
CREATE INDEX IF NOT EXISTS idx_employees_company        ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_banking_accounts_company  ON banking_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_partners_company          ON partners(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_tx_company_partner ON partner_transactions(company_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON activity_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_links_company     ON invoice_links(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_links_from        ON invoice_links(from_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_links_to          ON invoice_links(to_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice          ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice     ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminder_company  ON invoice_reminder_log(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminder_invoice  ON invoice_reminder_log(invoice_id);
`)

/* ستون‌هایی که بعد از اولین ریلیز اضافه شدن — برای دیتابیس‌های قدیمی‌تر */
safeAddColumn('users', 'last_login_at', 'TEXT')
safeAddColumn('users', 'failed_attempts', 'INTEGER DEFAULT 0')
safeAddColumn('users', 'locked_until', 'TEXT')
safeAddColumn('users', 'reset_token_hash', 'TEXT')
safeAddColumn('users', 'reset_token_expires', 'TEXT')
safeAddColumn('users', 'permissions_json', 'TEXT')
safeAddColumn('invoices', 'items_json', 'TEXT')

/* برای قابلیت «بازگردانی تغییرات» (rollback فعالیت‌ها):
   جدول/نام و اسنپ‌شات کامل رکورد قبل و بعد از عملیات ذخیره می‌شه تا بشه دقیقاً برگردوند. */
safeAddColumn('activity_log', 'table_name', 'TEXT')
safeAddColumn('activity_log', 'before_json', 'TEXT')
safeAddColumn('activity_log', 'after_json', 'TEXT')
safeAddColumn('activity_log', 'rolled_back', 'INTEGER DEFAULT 0')

/* migration یک‌باره: قبل از پیاده‌سازی دسترسی‌های ریزدانه (permissions_json)،
   همه‌ی کارمندهای موجود دسترسی کامل داشتن. برای اینکه با اضافه‌شدن این
   قابلیت، دسترسی هیچ کارمند فعلی‌ای ناگهان قطع نشه، به کسانی که هنوز
   permissions_json ندارن، دسترسی کامل (معادل قبل) رو صریحاً می‌دیم؛
   از این به بعد مالک/مدیر می‌تونه از تنظیمات محدودش کنه. */
db.prepare(
  "UPDATE users SET permissions_json = ? WHERE role = 'employee' AND permissions_json IS NULL"
).run(JSON.stringify({
  clients: true, products: true, invoices: true, payments: true,
  employees: true, banking_accounts: true, partners: true, reports: true,
  canDelete: true,
}))

export default db
