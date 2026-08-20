import { useState } from 'react'
import { Building2, CreditCard, User } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { FormField } from '@/components/ui'

/**
 * ⚠️ این کامپوننت فعلاً هیچ‌جای پروژه import نمی‌شه (orphan).
 * قبلاً به یک فایل mockData حذف‌شده (COUNTERPARTIES/COMPANY_ACCOUNTS) وصل بود که کل build رو می‌شکست.
 * فعلاً به clients واقعی (فقط مشتری، بدون تأمین‌کننده چون هنوز مدلی براش نیست) و بانک‌های شرکت وصل شد.
 * اگه قراره واقعاً استفاده بشه، باید بعداً suppliers هم به بک‌اند/مدل اضافه بشه.
 */
export default function PartyBankSelect({
  label = 'طرف حساب',
  partyId, onPartyChange,
  partyAccountIdx, onPartyAccountChange,
  companyAccountId, onCompanyAccountChange,
  companyLabel = 'حساب شرکت (مبدأ)',
  partyLabel   = 'حساب طرف حساب (مقصد)',
  required,
}) {
  const { clients } = useClients()
  const { accounts: companyAccounts } = useBankAccounts()
  const counterparties = clients.map(c => ({ ...c, type: 'client', accounts: c.accounts || [] }))
  const party = counterparties.find((c) => c.id === partyId)
  const sel = {
    background: 'var(--t-search-bg)', border: '0.5px solid var(--t-card-border)',
    borderRadius: 7, padding: '8px 10px', fontSize: 12,
    color: 'var(--t-txt)', fontFamily: 'inherit', outline: 'none', width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FormField label={label} required={required}>
        <select value={partyId || ''} onChange={(e) => onPartyChange(e.target.value)} style={sel}>
          <option value="">انتخاب طرف حساب...</option>
          <optgroup label="مشتریان">
            {counterparties.filter((c) => c.type === 'client').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="تأمین‌کنندگان">
            {counterparties.filter((c) => c.type === 'supplier').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        </select>
      </FormField>

      {party && (
        <div style={{
          background: 'var(--t-accent-light)', borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: 'var(--t-txt-muted)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <User size={13} style={{ color: 'var(--t-accent)' }} />
          <span>{party.contact}</span>
          <span style={{ opacity: .5 }}>·</span>
          <span dir="ltr">{party.phone}</span>
        </div>
      )}

      {party && party.accounts.length > 0 && (
        <FormField label={partyLabel}>
          <select value={partyAccountIdx ?? ''} onChange={(e) => onPartyAccountChange(Number(e.target.value))} style={sel}>
            <option value="">انتخاب حساب...</option>
            {party.accounts.map((acc, i) => (
              <option key={i} value={i}>{acc.bank} · {acc.card}</option>
            ))}
          </select>
          {partyAccountIdx !== undefined && partyAccountIdx !== '' && (
            <div style={{
              marginTop: 5, padding: '6px 10px', borderRadius: 6,
              background: 'var(--t-card-bg)', border: '0.5px solid var(--t-card-border)',
              fontSize: 11, color: 'var(--t-txt-muted)', direction: 'ltr',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={12} style={{ color: 'var(--t-accent)' }} />
                <span style={{ fontWeight: 500, color: 'var(--t-txt)', letterSpacing: 1 }}>
                  {party.accounts[partyAccountIdx]?.card}
                </span>
              </div>
              <div style={{ marginTop: 3, opacity: .7 }}>IBAN: {party.accounts[partyAccountIdx]?.iban}</div>
            </div>
          )}
        </FormField>
      )}

      <FormField label={companyLabel}>
        <select value={companyAccountId || ''} onChange={(e) => onCompanyAccountChange(e.target.value)} style={sel}>
          <option value="">انتخاب حساب شرکت...</option>
          {companyAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.label} · موجودی: {(acc.balance||0).toLocaleString('fa-IR')} ت
            </option>
          ))}
        </select>
        {companyAccountId && (() => {
          const acc = companyAccounts.find((a) => a.id === companyAccountId)
          return acc ? (
            <div style={{
              marginTop: 5, padding: '6px 10px', borderRadius: 6,
              background: 'var(--t-card-bg)', border: '0.5px solid var(--t-card-border)',
              fontSize: 11, color: 'var(--t-txt-muted)', direction: 'ltr',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} style={{ color: 'var(--t-accent)' }} />
                <span style={{ fontWeight: 500, color: 'var(--t-txt)', letterSpacing: 1 }}>
                  {acc.card ?? 'صندوق نقد'}
                </span>
              </div>
              {acc.iban && <div style={{ marginTop: 3, opacity: .7 }}>IBAN: {acc.iban}</div>}
            </div>
          ) : null
        })()}
      </FormField>
    </div>
  )
}
