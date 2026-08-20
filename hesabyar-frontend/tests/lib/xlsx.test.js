import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildWorkbook, sheetToRows } from '../../src/lib/xlsx.js'

describe('lib/xlsx — خروجی Excel واقعی', () => {
  it('buildWorkbook باید یک workbook با یک sheet و همون هدر/ردیف‌ها بسازه', () => {
    const wb = buildWorkbook([
      { name: 'پرداخت‌ها', headers: ['شناسه', 'مبلغ'], rows: [['p1', 100000], ['p2', 250000]] },
    ])
    expect(wb.SheetNames).toEqual(['پرداخت‌ها'])
    const rows = sheetToRows(wb.Sheets['پرداخت‌ها'])
    expect(rows[0]).toEqual(['شناسه', 'مبلغ'])
    expect(rows[1]).toEqual(['p1', 100000])
    expect(rows[2]).toEqual(['p2', 250000])
  })

  it('باید بتونه چند sheet مستقل بسازه', () => {
    const wb = buildWorkbook([
      { name: 'برگه یک', headers: ['a'], rows: [[1]] },
      { name: 'برگه دو', headers: ['b'], rows: [[2]] },
    ])
    expect(wb.SheetNames).toEqual(['برگه یک', 'برگه دو'])
  })

  it('نام sheet طولانی‌تر از ۳۱ کاراکتر (محدودیت اکسل) باید کوتاه بشه', () => {
    const longName = 'یک-نام-خیلی-خیلی-خیلی-طولانی-برای-شیت-اکسل-که-قطعا-از-سی‌ویک-کاراکتر-بیشتره'
    const wb = buildWorkbook([{ name: longName, headers: ['a'], rows: [[1]] }])
    expect(wb.SheetNames[0].length).toBeLessThanOrEqual(31)
  })

  it('مقدار عددی باید به‌صورت number (نه string) در سلول ذخیره بشه تا اکسل قابل جمع‌زدنش باشه', () => {
    const wb = buildWorkbook([{ name: 's', headers: ['مبلغ'], rows: [[123456]] }])
    const cell = wb.Sheets['s']['A2']
    expect(cell.t).toBe('n')
    expect(cell.v).toBe(123456)
  })

  it('sheet خالی (بدون ردیف) نباید کرش کنه، فقط هدر داشته باشه', () => {
    const wb = buildWorkbook([{ name: 's', headers: ['x', 'y'], rows: [] }])
    const rows = sheetToRows(wb.Sheets['s'])
    expect(rows).toEqual([['x', 'y']])
  })
})
