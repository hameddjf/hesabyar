import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'
import { useTheme } from '@/theme/ThemeContext'

const THEME_COLORS = {
  light:   '#0f112e',
  dark:    '#6366f1',
  navy:    '#38bdf8',
  emerald: '#059669',
  violet:  '#7c3aed',
}

export default function ThemeSwitcher() {
  const { themeId, allThemes, changeTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="تغییر تم"
        title="تغییر تم"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            background: 'var(--t-card-bg)',
            border: '1px solid var(--t-card-border)',
            borderRadius: 12,
            padding: '12px',
            minWidth: 200,
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
          role="menu"
          aria-label="انتخاب تم"
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--t-txt-muted)',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid var(--t-card-border)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            انتخاب تم
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.values(allThemes).map((t) => {
              const isActive = t.id === themeId
              return (
                <button
                  key={t.id}
                  onClick={() => { changeTheme(t.id); setOpen(false) }}
                  role="menuitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--t-accent-light)' : 'transparent',
                    width: '100%',
                    textAlign: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--t-nav-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: THEME_COLORS[t.id] || t.sidebar?.logoBg,
                      flexShrink: 0,
                      border: '2px solid',
                      borderColor: isActive ? 'var(--t-accent)' : 'transparent',
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t-txt)', fontWeight: isActive ? 500 : 400 }}>
                    {t.nameFA}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--t-txt-muted)' }}>{t.name}</span>
                  {isActive && <Check size={13} style={{ color: 'var(--t-accent)', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
