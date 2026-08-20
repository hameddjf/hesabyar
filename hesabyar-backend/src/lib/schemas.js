import { z } from 'zod'

/* فقط برای route های حساس/پرریسک اضافه شده (فاکتور، پرداختی، مشتری، محصول)
   نه همه‌ی جدول‌ها — چون هدف جلوگیری از دیتای خراب/حمله‌ست، نه اعتبارسنجی تزئینی هر فیلد. */

export const invoiceSchema = z.object({
  invoiceNumber: z.string().max(50).optional().nullable(),
  type: z.enum(['sale', 'buy', 'presale', 'prebuy']).default('sale'),
  issueDate: z.string().max(30).optional().nullable(),
  dueDate: z.string().max(30).optional().nullable(),
  clientId: z.string().max(100).optional().nullable(),
  totalAmount: z.number().finite().nonnegative().optional(),
  discount: z.number().finite().nonnegative().optional(),
  taxAmount: z.number().finite().nonnegative().optional(),
  grandTotal: z.number().finite().nonnegative().optional(),
  status: z.enum(['draft', 'pending', 'paid', 'overdue']).default('draft'),
  description: z.string().max(2000).optional().nullable(),
  source: z.string().max(30).optional().nullable(),
  itemsJson: z.string().max(20000).optional().nullable(),
})

export const paymentSchema = z.object({
  date: z.string().max(30).optional().nullable(),
  amount: z.number().finite().nonnegative('مبلغ باید عدد مثبت باشد'),
  transactionType: z.enum(['receipt', 'payment', 'expense']).default('receipt'),
  method: z.string().max(30).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  invoiceId: z.string().max(100).optional().nullable(),
  checkNumber: z.string().max(50).optional().nullable(),
  checkDate: z.string().max(30).optional().nullable(),
  checkBank: z.string().max(100).optional().nullable(),
  partnerId: z.string().max(100).optional().nullable(),
  partnerAccount: z.string().max(200).optional().nullable(),
  clientId: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  hasReceipt: z.union([z.literal(0), z.literal(1)]).optional(),
  status: z.string().max(30).optional().nullable(),
  source: z.string().max(30).optional().nullable(),
})

export const clientSchema = z.object({
  name: z.string().min(1, 'نام الزامی است').max(200),
  type: z.enum(['person', 'company']).default('person'),
  contact: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email('ایمیل نامعتبر است').max(200).optional().nullable().or(z.literal('')),
  nationalCode: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const productSchema = z.object({
  name: z.string().min(1, 'نام الزامی است').max(200),
  category: z.string().max(50).optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  price: z.number().finite().nonnegative().optional(),
  stock: z.number().finite().optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  description: z.string().max(2000).optional().nullable(),
})

/* دفتر حساب شراکت — چون مستقیماً روی سرمایه‌ی شرکا و درنتیجه گزارش مالی اثر می‌ذاره،
   جزو route های پرریسکه و اعتبارسنجی کامل داره (نه فقط تزئینی). */
export const partnerTransactionSchema = z.object({
  type: z.enum(['capital_in', 'capital_out', 'profit_share', 'adjustment']),
  amount: z.number().finite().positive('مبلغ باید عدد مثبت بزرگ‌تر از صفر باشد'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ باید به‌فرمت ISO (YYYY-MM-DD) باشد'),
  description: z.string().max(500).optional().nullable(),
  paymentId: z.string().max(100).optional().nullable(),
})

/* دسته چک — چون سررسید/مبلغ چک مستقیماً روی جریان نقدی و گزارش‌های مالی
   اثر می‌ذاره، مثل فاکتور/پرداخت جزو route های پرریسک و اعتبارسنجی‌شده‌ست. */
export const checkSchema = z.object({
  direction: z.enum(['received', 'issued'], { errorMap: () => ({ message: 'نوع چک باید دریافتنی یا پرداختنی باشد' }) }),
  checkNumber: z.string().max(50).optional().nullable(),
  sayadId: z.string().max(20).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  branch: z.string().max(100).optional().nullable(),
  amount: z.number().finite().positive('مبلغ چک باید عدد مثبت بزرگ‌تر از صفر باشد'),
  issueDate: z.string().max(30).optional().nullable(),
  dueDate: z.string().max(30).optional().nullable(),
  partyName: z.string().max(200).optional().nullable(),
  clientId: z.string().max(100).optional().nullable(),
  invoiceId: z.string().max(100).optional().nullable(),
  status: z.enum(['in_hand', 'deposited', 'cleared', 'bounced', 'passed_on', 'cancelled']).default('in_hand'),
  description: z.string().max(1000).optional().nullable(),
})

export const checkStatusChangeSchema = z.object({
  status: z.enum(['in_hand', 'deposited', 'cleared', 'bounced', 'passed_on', 'cancelled']),
  note: z.string().max(500).optional().nullable(),
})
