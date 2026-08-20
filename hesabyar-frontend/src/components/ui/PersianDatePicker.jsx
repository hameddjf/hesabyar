import { useMemo } from 'react'
import { PERSIAN_MONTHS, toFaDigits, jalaliToISO, isoToJalali, todayJalali, jalaliMonthLength } from '@/lib/jalali'

const selStyle = {
  background:'var(--t-search-bg)', border:'0.5px solid var(--t-card-border)', borderRadius:7,
  padding:'8px 6px', fontSize:12, color:'var(--t-txt)', fontFamily:'inherit', outline:'none', cursor:'pointer',
}

/**
 * انتخاب‌گر تاریخ شمسی — value/onChange به فرمت ISO میلادی "YYYY-MM-DD" کار می‌کنن
 * (یعنی همیشه یه تاریخ قابل‌مرتب‌سازی و قابل‌بازه‌بندی ذخیره می‌شه، نه متن آزاد)
 */
export default function PersianDatePicker({ value, onChange, required }) {
  const today = todayJalali()
  const current = useMemo(() => isoToJalali(value) || today, [value])

  const years = useMemo(() => {
    const base = today.jy
    return Array.from({ length: 6 }, (_, i) => base - 4 + i) // ۴ سال قبل تا ۱ سال بعد
  }, [today.jy])

  const dayCount = jalaliMonthLength(current.jy, current.jm)
  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  const update = (patch) => {
    const next = { ...current, ...patch }
    const maxDay = jalaliMonthLength(next.jy, next.jm)
    if (next.jd > maxDay) next.jd = maxDay
    onChange(jalaliToISO(next.jy, next.jm, next.jd))
  }

  return (
    <div style={{ display:'flex', gap:6 }} dir="ltr">
      <select required={required} value={current.jd} onChange={(e) => update({ jd: Number(e.target.value) })} style={{ ...selStyle, flex:'0 0 60px' }}>
        {days.map(d => <option key={d} value={d}>{toFaDigits(d)}</option>)}
      </select>
      <select required={required} value={current.jm} onChange={(e) => update({ jm: Number(e.target.value) })} style={{ ...selStyle, flex:1 }}>
        {PERSIAN_MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
      </select>
      <select required={required} value={current.jy} onChange={(e) => update({ jy: Number(e.target.value) })} style={{ ...selStyle, flex:'0 0 75px' }}>
        {years.map(y => <option key={y} value={y}>{toFaDigits(y)}</option>)}
      </select>
    </div>
  )
}
