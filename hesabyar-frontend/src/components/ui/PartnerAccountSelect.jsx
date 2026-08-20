import { CreditCard, TrendingDown, TrendingUp } from 'lucide-react'
import { usePartners } from '@/hooks/usePartners'
import { FormField } from '@/components/ui'

export default function PartnerAccountSelect({
  partnerId,    onPartnerChange,
  partnerAccId, onPartnerAccChange,
  mode = 'payment',
  required,
}) {
  const { partners } = usePartners()
  const partner = partners.find(p => p.id === partnerId)

  const cfg = {
    payment: { label:'پرداخت‌کننده (شریک)', cardLabel:'کارت پرداخت',      icon:TrendingDown, color:'#dc2626' },
    receipt: { label:'دریافت‌کننده (شریک)', cardLabel:'کارت دریافت',      icon:TrendingUp,   color:'#059669' },
    expense: { label:'پرداخت‌کننده (شریک)', cardLabel:'کارت پرداخت هزینه',icon:TrendingDown, color:'#d97706' },
  }[mode]

  const sel = {
    background:'var(--t-search-bg)', border:'0.5px solid var(--t-card-border)',
    borderRadius:7, padding:'8px 10px', fontSize:12,
    color:'var(--t-txt)', fontFamily:'inherit', outline:'none', width:'100%',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <FormField label={cfg.label} required={required}>
        <select value={partnerId||''} onChange={e=>onPartnerChange(e.target.value)} style={sel}>
          <option value="">انتخاب شریک...</option>
          {partners.map(p=>(
            <option key={p.id} value={p.id}>{p.name} — {p.role} ({p.share}٪)</option>
          ))}
        </select>
      </FormField>

      {partner && (
        <div style={{ background:'var(--t-accent-light)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:28,height:28,borderRadius:'50%',flexShrink:0,background:cfg.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:cfg.color }}>
            {partner.avatar || partner.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
          </div>
          <span style={{ fontSize:12,fontWeight:500,color:'var(--t-txt)' }}>{partner.name}</span>
          <span style={{ fontSize:11,color:'var(--t-txt-muted)' }}>· {partner.role} · {partner.share}٪</span>
          <span style={{ marginRight:'auto',fontSize:11,fontWeight:600,color:cfg.color }}>
            {partner.accounts.reduce((s,a)=>s+(a.balance||0),0).toLocaleString('fa-IR')} ت
          </span>
        </div>
      )}

      {partner && (
        <FormField label={cfg.cardLabel} required={required}>
          <select value={partnerAccId||''} onChange={e=>onPartnerAccChange(e.target.value)} style={sel}>
            <option value="">انتخاب کارت...</option>
            {partner.accounts.map(acc=>(
              <option key={acc.id} value={acc.id}>
                {acc.bank} · {acc.card} · {(acc.balance||0).toLocaleString('fa-IR')} ت
              </option>
            ))}
          </select>
          {partnerAccId && (()=>{
            const acc = partner.accounts.find(a=>a.id===partnerAccId)
            if (!acc) return null
            return (
              <div style={{ marginTop:6,borderRadius:8,overflow:'hidden',border:`1px solid ${cfg.color}33` }}>
                <div style={{ background:`linear-gradient(135deg,${cfg.color}22,${cfg.color}11)`,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:10,color:'var(--t-txt-muted)',marginBottom:3 }}>{acc.label} · بانک {acc.bank}</div>
                    <div style={{ fontSize:14,fontWeight:700,color:'var(--t-txt)',letterSpacing:2,direction:'ltr' }}>{acc.card}</div>
                  </div>
                  <CreditCard size={20} style={{ color:cfg.color,opacity:.7 }} />
                </div>
                <div style={{ padding:'7px 14px',background:'var(--t-card-bg)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:10,color:'var(--t-txt-muted)',direction:'ltr' }}>IBAN: {acc.iban}</span>
                  <span style={{ fontSize:12,fontWeight:600,color:cfg.color }}>{(acc.balance||0).toLocaleString('fa-IR')} ت</span>
                </div>
              </div>
            )
          })()}
        </FormField>
      )}
    </div>
  )
}
