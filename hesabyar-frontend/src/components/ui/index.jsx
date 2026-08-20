import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

/* ── Badge ── */
export function Badge({ type = 'gray', children }) {
  const map = {
    green:  { bg: '#d1fae5', color: '#065f46' },
    amber:  { bg: '#fef3c7', color: '#92400e' },
    red:    { bg: '#fee2e2', color: '#991b1b' },
    blue:   { bg: '#dbeafe', color: '#1e40af' },
    purple: { bg: '#ede9fe', color: '#6d28d9' },
    orange: { bg: '#ffedd5', color: '#9a3412' },
    gray:   { bg: 'var(--t-accent-light)', color: 'var(--t-txt-muted)' },
  }
  const s = map[type] || map.gray
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

/* ── StatCard ── */
export function StatCard({ icon: Icon, label, value, sub, subColor }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--t-accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--t-accent)',
        }}>
          <Icon size={16} />
        </div>
      </div>
      <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--t-txt)', margin: '0 0 2px', direction: 'ltr', textAlign: 'right' }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: subColor || 'var(--t-txt-muted)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

/* ── DataTable ── */
export function DataTable({ columns, data, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, paddingBottom: 10, paddingRight: 12, paddingLeft: 12 }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ paddingRight: 12, paddingLeft: 12 }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t-txt-muted)', fontSize: 13 }}>
          داده‌ای یافت نشد
        </div>
      )}
    </div>
  )
}

/* ── Tabs ── */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'var(--t-search-bg)',
      borderRadius: 8, padding: 3,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '5px 14px', borderRadius: 6, border: 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: active === tab.key ? 'var(--t-card-bg)' : 'transparent',
            color: active === tab.key ? 'var(--t-txt)' : 'var(--t-txt-muted)',
            boxShadow: active === tab.key ? '0 0 0 0.5px var(--t-card-border)' : 'none',
            transition: 'all .15s',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              marginRight: 5, fontSize: 10,
              background: active === tab.key ? 'var(--t-accent-light)' : 'transparent',
              color: active === tab.key ? 'var(--t-accent)' : 'var(--t-txt-muted)',
              padding: '1px 5px', borderRadius: 99,
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ── SearchInput ── */
export function SearchInput({ value, onChange, placeholder = 'جستجو...' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--t-search-bg)',
      border: '0.5px solid var(--t-card-border)',
      borderRadius: 8, padding: '7px 12px',
      flex: 1, maxWidth: 280,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t-txt-muted)" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none', background: 'transparent',
          fontSize: 13, color: 'var(--t-txt)',
          outline: 'none', width: '100%', fontFamily: 'inherit',
        }}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="پاک کردن جستجو" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-txt-muted)', display: 'flex' }}>
          <X size={13} />
        </button>
      )}
    </div>
  )
}

/* ── Select ── */
export function Select({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'var(--t-card-bg)',
          border: '0.5px solid var(--t-card-border)',
          borderRadius: 8, padding: '7px 30px 7px 12px',
          fontSize: 12, color: 'var(--t-txt)',
          cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', insetInlineEnd: 8, color: 'var(--t-txt-muted)', pointerEvents: 'none' }} />
    </div>
  )
}

/* ── ToggleSwitch ──
   یک <button role="switch"> واقعی، نه <div onClick> (که با کیبورد قابل فوکوس/فعال‌سازی
   نبود). label برای aria-label لازمه؛ اگه سوییچ کنار یه متن قابل‌مشاهده‌ست که خودش
   به‌عنوان برچسب کافیه (مثلاً یه ردیف تنظیمات)، همون متن رو به‌عنوان label بده. */
export function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 99, border: 'none', padding: 0,
        background: checked ? 'var(--t-accent)' : 'var(--t-card-border)',
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'background .2s', flexShrink: 0,
        outline: 'none',
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, insetInlineEnd: checked ? 2 : 20,
        transition: 'inset-inline-end .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, width = 540 }) {
  const panelRef = useRef(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // دسترس‌پذیری کیبورد: Escape می‌بنده، Tab داخل مودال قفل می‌مونه (focus trap ساده)
  // تا کاربر با کیبورد به عناصر پشت مودال (که از دید بصری پنهانن) گیر نکنه.
  // فوکوس اولیه هم روی خود پنل قرار می‌گیره تا screen reader بلافاصله عنوان رو اعلام کنه.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{

        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--t-card-bg)',
          border: '0.5px solid var(--t-card-border)',
          borderRadius: 14, width, maxWidth: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          outline: 'none',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '0.5px solid var(--t-card-border)',
        }}>
          <h2 id={titleId} style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-txt)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="بستن"><X size={16} /></button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ── FormField ── */
export function FormField({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-txt-muted)' }}>
        {label}{required && <span style={{ color: '#ef4444', marginRight: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

/* ── EmptyState ── */
export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'var(--t-accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px', color: 'var(--t-accent)',
      }}>
        <Icon size={22} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-txt)', margin: '0 0 4px' }}>{title}</p>
      {desc && <p style={{ fontSize: 13, color: 'var(--t-txt-muted)', margin: '0 0 16px' }}>{desc}</p>}
      {action}
    </div>
  )
}

/* ── Pagination ── */
export function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '0.5px solid var(--t-card-border)', marginTop: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--t-txt-muted)' }}>
        نمایش {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} از {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              width: 30, height: 30, borderRadius: 6, border: 'none',
              fontSize: 12, cursor: 'pointer',
              background: p === page ? 'var(--t-accent)' : 'var(--t-search-bg)',
              color: p === page ? 'var(--t-nav-active-txt)' : 'var(--t-txt)',
              fontWeight: p === page ? 600 : 400,
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
