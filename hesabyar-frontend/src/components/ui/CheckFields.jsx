/**
 * CheckFields — فیلدهای اطلاعات چک
 * فقط وقتی روش پرداخت "چک" انتخاب شده نشون داده میشه
 */
import { FormField } from '@/components/ui'

const BANKS = ['ملت','صادرات','ملی','پارسیان','آینده','رسالت','سپه','تجارت','رفاه','سامان','پاسارگاد','اقتصادنوین','کشاورزی','مسکن','توسعه صادرات']

export default function CheckFields({ data, onChange }) {
  const set = (k,v) => onChange({ ...data, [k]: v })
  const inp = {
    background:'var(--t-search-bg)', border:'0.5px solid var(--t-card-border)',
    borderRadius:7, padding:'8px 10px', fontSize:12,
    color:'var(--t-txt)', fontFamily:'inherit', outline:'none', width:'100%',
  }

  return (
    <div style={{
      background:'var(--t-search-bg)', borderRadius:10,
      padding:'14px', border:'0.5px solid var(--t-card-border)',
      display:'flex', flexDirection:'column', gap:12,
    }}>
      <p style={{ fontSize:11,fontWeight:600,color:'var(--t-txt)',margin:0,display:'flex',alignItems:'center',gap:6 }}>
        <span style={{ fontSize:14 }}>🏦</span> اطلاعات چک
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <FormField label="شماره سریال چک">
          <input value={data.serial||''} onChange={e=>set('serial',e.target.value)}
            placeholder="مثلاً: ۱۲۳۴۵۶" style={inp} dir="ltr" />
        </FormField>
        <FormField label="بانک صادرکننده">
          <select value={data.bank||''} onChange={e=>set('bank',e.target.value)} style={inp}>
            <option value="">انتخاب بانک...</option>
            {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
        </FormField>
        <FormField label="شماره حساب / شعبه">
          <input value={data.accountNo||''} onChange={e=>set('accountNo',e.target.value)}
            placeholder="شماره حساب چک‌کش" style={inp} dir="ltr" />
        </FormField>
        <FormField label="تاریخ سررسید چک">
          <input value={data.dueDate||''} onChange={e=>set('dueDate',e.target.value)}
            placeholder="۱۴۰۴/۰۵/۰۱" style={inp} />
        </FormField>
        <FormField label="نام صاحب حساب">
          <input value={data.owner||''} onChange={e=>set('owner',e.target.value)}
            placeholder="نام روی چک..." style={inp} />
        </FormField>
        <FormField label="وضعیت وصول">
          <select value={data.status||''} onChange={e=>set('status',e.target.value)} style={inp}>
            <option value="">انتخاب...</option>
            <option value="pending">در انتظار وصول</option>
            <option value="cleared">وصول شده</option>
            <option value="bounced">برگشت خورده</option>
            <option value="transferred">به دیگری منتقل شده</option>
          </select>
        </FormField>
      </div>
      <FormField label="توضیحات چک">
        <input value={data.note||''} onChange={e=>set('note',e.target.value)}
          placeholder="هرگونه توضیح اضافی..." style={inp} />
      </FormField>
    </div>
  )
}
