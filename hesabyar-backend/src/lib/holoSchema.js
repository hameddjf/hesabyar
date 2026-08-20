/* ─────────────────────────────────────────────
   نقشه‌برداری جداول هلو (Microsoft SQL Server) ↔ حسابیار
   ───────────────────────────────────────────── */

/*
 * ✅ این نگاشت بعد از بررسی یک بکاپ واقعی SQL Server هلو به‌روزرسانی شد.
 * جدول Customer و FACTURE با اسم فیلد دقیق تایید شدن (از داخل خود
 * stored procedure های بکاپ استخراج شدن، نه حدس).
 *
 * ⚠️ هنوز باقی‌مونده (چون بکاپ خام NT Backup صرفاً با strings قابل parse
 * بود، نه یک SQL Server واقعی برای query مستقیم):
 *   - اسم دقیق جدول اصلی کالا/موجودی (فقط از طریق ستون‌هایی مثل A_Code,
 *     ArticleSarfasl, AnbargardFarsh می‌شناسیمش، ولی اسم جدول master هنوز
 *     قطعی نیست — احتمالاً "KALA" یا "ARTICLE")
 *   - جدول اقلام فاکتور (FACTART از نام stored procedure ها معلومه که
 *     هست، ولی لیست کامل ستون‌هاش تایید نشده)
 *   - جدول پرداخت/دریافت مستقل (احتمالاً از طریق Sanad + Snd_List با
 *     Col_Code خاصِ صندوق/بانک شناسایی می‌شه، نه یک جدول جدا)
 * برای تکمیل این‌ها لازمه یا این بکاپ روی یک SQL Server واقعی restore
 * بشه و مستقیم query بگیریم، یا مستندات API/دیتابیس هلو رو از خود
 * شرکت هلو بخوایم.
 */

export const HOLO_TABLE_MAP = {
  /* ── اشخاص/مشتریان — تایید شده ── */
  Customer: {
    hesabyarTable: 'clients',
    pkColumn: 'C_Code',
    fields: {
      C_Code: 'id',
      C_Name: 'name',
      C_AliasName: 'contact',
      C_Mobile: 'phone',
      C_Address: 'address',
      // نکته: در دیتای واقعی هلو ایمیل مشتری معمولاً وجود نداره
    },
  },

  /* ── فاکتورها — تایید شده (از FACTURE) ── */
  FACTURE: {
    hesabyarTable: 'invoices',
    pkColumn: 'Fac_Code',
    fields: {
      Fac_Code: 'id',
      Fac_Code_C: 'invoice_number',
      C_Code: 'client_id',
      Fac_Comment: 'description',
      Sum_Few: 'total_amount',
      Takhfif: 'discount',
      Fac_Date: { to: 'issue_date', fromHolo: fromHoloDate, toHolo: toHoloDate },
      // نوع فاکتور در هلو با یک کاراکتر مشخص می‌شه (١=فروش, ٢=خرید, و...)
      // این مقادیر باید با یک نمونه‌ی واقعی verify بشه، فعلاً حدسیه:
      Fac_Type: { to: 'type', fromHolo: mapHoloFacType, toHolo: mapFacTypeToHolo },
      // هلو مبلغ رو بین نقد/چک/پوز/نسیه تفکیک می‌کنه؛ حسابیار فعلاً
      // یک grand_total واحد داره — جمعشون می‌کنیم موقع import:
      // (منطق دقیق‌تر توی import handler پیاده می‌شه، نه اینجا)
    },
  },

  /*
   * ── سند حسابداری (Sanad + Snd_List) — این خودِ «کدینگ حسابداری»
   *    واقعیه که در گفتگوی قبلی توضیح دادیم! ──
   * ساختار Col_Code (کل) / Moien_Code (معین) / Tafzili_Code (تفصیلی)
   * دقیقاً همون سلسله‌مراتب کدینگ حسابداری سه‌سطحیه.
   * فعلاً فقط برای «فاز ۴ - نمایش read-only» علامت‌گذاری می‌شه،
   * هنوز به جدول حسابیار وصل نشده (چون حسابیار هنوز مدل حسابداری
   * دوطرفه نداره - طبق تصمیم قبلی، قراره فقط آینه بشه نه بازسازی).
   */
  Sanad: { hesabyarTable: null, note: 'سرفصل سند حسابداری - Sanad_Code, Sanad_Date' },
  Snd_List: { hesabyarTable: null, note: 'ردیف‌های سند - Col_Code/Moien_Code/Tafzili_Code/Bed/Bes' },
}

function mapHoloFacType(v) {
  // TODO: بعد از دیدن دیتای واقعی، این نگاشت باید verify بشه
  return { '1': 'sale', '2': 'buy', '3': 'presale', '4': 'prebuy' }[v] || 'sale'
}
function mapFacTypeToHolo(v) {
  return { sale: '1', buy: '2', presale: '3', prebuy: '4' }[v] || '1'
}
function fromHoloDate(v) {
  if (!v) return null
  // SQL Server معمولاً تاریخ رو به‌صورت Date/DateTime واقعی برمی‌گردونه
  // (نه رشته‌ی عددی مثل Firebird که قبلاً فرض شده بود)
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toISOString().slice(0, 10)
}
function toHoloDate(v) {
  if (!v) return null
  return new Date(v)
}

/** رکورد هلو → رکورد حسابیار */
export function holoRowToHesabyar(tableName, row) {
  const schema = HOLO_TABLE_MAP[tableName]
  if (!schema || !schema.hesabyarTable) return null
  const out = { source: 'holo' }
  for (const [holoField, mapping] of Object.entries(schema.fields)) {
    const value = row[holoField]
    if (value === undefined) continue
    if (typeof mapping === 'string') out[mapping] = value
    else out[mapping.to] = mapping.fromHolo(value)
  }
  return out
}

/** رکورد حسابیار → رکورد هلو */
export function hesabyarRowToHolo(tableName, row) {
  const schema = HOLO_TABLE_MAP[tableName]
  if (!schema || !schema.hesabyarTable) return null
  const out = {}
  for (const [holoField, mapping] of Object.entries(schema.fields)) {
    if (typeof mapping === 'string') out[holoField] = row[mapping]
    else out[holoField] = mapping.toHolo(row[mapping.to])
  }
  return out
}
