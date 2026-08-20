import { describe, it, expect } from 'vitest'
import { aggregateReportsData, buildMonthlyFromISO, buildCashflowFromISO, toM } from '@/lib/reportsAggregations'

describe('lib/reportsAggregations — منطق خالص گزارشات (بدون React/fetch)', () => {
  describe('toM', () => {
    it('عدد تومان رو به میلیون تومان با یک رقم اعشار گرد می‌کنه', () => {
      expect(toM(1_000_000)).toBe(1)
      expect(toM(1_250_000)).toBe(1.3)
      expect(toM(0)).toBe(0)
      expect(toM(null)).toBe(0)
    })
  })

  describe('buildMonthlyFromISO', () => {
    it('اگه هیچ رکورد تاریخ ISO معتبری نباشه، null برمی‌گردونه (فراخوان باید mock بذاره)', () => {
      const result = buildMonthlyFromISO([{ issueDate: 'تاریخ آزاد قدیمی' }], [])
      expect(result).toBeNull()
    })

    it('درآمد و هزینه رو بر اساس ماه شمسی جمع می‌زنه', () => {
      const today = new Date().toISOString().slice(0, 10)
      const result = buildMonthlyFromISO(
        [{ issueDate: today, grandTotal: 1_000_000 }],
        [{ date: today, amount: 300_000 }],
      )
      expect(result).not.toBeNull()
      const thisMonth = result[result.length - 1]
      expect(thisMonth.income).toBe(1)
      expect(thisMonth.expense).toBe(0.3)
      expect(thisMonth.profit).toBe(0.7)
    })
  })

  describe('buildCashflowFromISO', () => {
    it('اگه هیچ رکورد معتبری نباشه، null برمی‌گردونه', () => {
      expect(buildCashflowFromISO([], [])).toBeNull()
    })

    it('دریافتی و پرداختی رو در ۶ بازه‌ی هفتگی جمع می‌زنه', () => {
      const today = new Date().toISOString().slice(0, 10)
      const result = buildCashflowFromISO(
        [{ date: today, amount: 500_000 }],
        [{ date: today, amount: 200_000 }],
      )
      expect(result).toHaveLength(6)
      const lastWeek = result[5]
      expect(lastWeek.in).toBe(0.5)
      expect(lastWeek.out).toBe(0.2)
    })
  })

  describe('aggregateReportsData', () => {
    it('جمع درآمد فقط فاکتورهای sale/presale با status=paid رو حساب می‌کنه', () => {
      const result = aggregateReportsData({
        invoices: [
          { type: 'sale', status: 'paid', grandTotal: 1_000_000, clientId: 'c1', issueDate: '2024-05-01' },
          { type: 'sale', status: 'draft', grandTotal: 500_000, clientId: 'c1', issueDate: '2024-05-02' },
          { type: 'buy', status: 'paid', grandTotal: 900_000, clientId: 'c1', issueDate: '2024-05-03' },
        ],
        payments: [],
        clientsById: { c1: 'مشتری الف' },
        partnersById: {},
      })
      expect(result.totals.income).toBe(1)
    })

    it('هزینه‌ها رو بر اساس دسته‌بندی جمع و به ترتیب نزولی مرتب می‌کنه', () => {
      const result = aggregateReportsData({
        invoices: [],
        payments: [
          { transactionType: 'expense', amount: 500_000, category: 'rent' },
          { transactionType: 'expense', amount: 200_000, category: 'rent' },
          { transactionType: 'expense', amount: 800_000, category: 'salary' },
        ],
        clientsById: {}, partnersById: {},
      })
      expect(result.expenseCats[0].name).toBe('حقوق و دستمزد')
      expect(result.expenseCats[0].value).toBe(0.8)
      expect(result.expenseCats[1].name).toBe('اجاره')
      expect(result.expenseCats[1].value).toBe(0.7)
    })

    it('برترین مشتریان رو بر اساس مجموع فاکتور مرتب می‌کنه و حداکثر ۱۰ تا برمی‌گردونه', () => {
      const invoices = Array.from({ length: 12 }, (_, i) => ({
        type: 'sale', status: 'paid', grandTotal: (12 - i) * 100_000, clientId: `c${i}`, issueDate: '2024-05-01',
      }))
      const clientsById = Object.fromEntries(invoices.map((_, i) => [`c${i}`, `مشتری ${i}`]))
      const result = aggregateReportsData({ invoices, payments: [], clientsById, partnersById: {} })
      expect(result.topClients).toHaveLength(10)
      expect(result.topClients[0].name).toBe('مشتری 0') // بیشترین مبلغ
    })

    it('عملکرد شرکا رو از روی payment های partnerId‌دار می‌سازه (received از receipt، paid از expense/payment)', () => {
      const result = aggregateReportsData({
        invoices: [],
        payments: [
          { transactionType: 'receipt', amount: 1_000_000, partnerId: 'p1' },
          { transactionType: 'expense', amount: 400_000, partnerId: 'p1' },
        ],
        clientsById: {},
        partnersById: { p1: { name: 'شریک الف', share: 50 } },
      })
      expect(result.partnerPerf[0]).toMatchObject({ name: 'شریک الف', received: 1, paid: 0.4, balance: 0.6, share: 50 })
    })

    it('اگه هیچ رکورد واقعی‌ای نبود (لیست‌ها خالی)، خروجی‌های محاسباتی هم خالی/صفر می‌مونن ولی کرش نمی‌کنه', () => {
      const result = aggregateReportsData({ invoices: [], payments: [], clientsById: {}, partnersById: {} })
      expect(result.totals).toEqual({ income: 0, expense: 0, profit: 0, margin: 0 })
      expect(result.expenseCats).toEqual([])
      expect(result.topClients).toEqual([])
      expect(result.partnerPerf).toEqual([])
      expect(result.monthlyIsReal).toBe(false)
      expect(result.cashflowIsReal).toBe(false)
    })
  })
})
