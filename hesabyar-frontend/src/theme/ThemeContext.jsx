import { createContext, useContext, useEffect, useState } from 'react'
import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from './themes'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      return saved && THEMES[saved] ? saved : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  const theme = THEMES[themeId]

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    } catch {
      // ذخیره‌ی تم در localStorage اختیاریه (مثلاً حالت خصوصی مرورگر) — عمداً بی‌صدا رد می‌شیم
    }

    const root = document.documentElement
    const s = theme.sidebar
    const tb = theme.topbar
    const c = theme.content

    root.style.setProperty('--t-sidebar-bg',         s.bg)
    root.style.setProperty('--t-sidebar-border',     s.border)
    root.style.setProperty('--t-logo-bg',            s.logoBg)
    root.style.setProperty('--t-logo-color',         s.logoColor)
    root.style.setProperty('--t-nav-active',         s.navActive)
    root.style.setProperty('--t-nav-active-txt',     s.navActiveTxt)
    root.style.setProperty('--t-nav-hover',          s.navHover)
    root.style.setProperty('--t-nav-txt',            s.navTxt)
    root.style.setProperty('--t-group-label',        s.groupLabel)
    root.style.setProperty('--t-topbar-bg',          tb.bg)
    root.style.setProperty('--t-topbar-border',      tb.border)
    root.style.setProperty('--t-topbar-txt',         tb.txt)
    root.style.setProperty('--t-search-bg',          tb.searchBg)
    root.style.setProperty('--t-search-txt',         tb.searchTxt)
    root.style.setProperty('--t-icon-color',         tb.iconColor)
    root.style.setProperty('--t-content-bg',         c.bg)
    root.style.setProperty('--t-card-bg',            c.cardBg)
    root.style.setProperty('--t-card-border',        c.cardBorder)
    root.style.setProperty('--t-txt',                c.txt)
    root.style.setProperty('--t-txt-muted',          c.txtMuted)
    root.style.setProperty('--t-bar-main',           c.barMain)
    root.style.setProperty('--t-bar-sub',            c.barSub)
    root.style.setProperty('--t-accent',             c.accent)
    root.style.setProperty('--t-accent-light',       c.accentLight)
  }, [themeId, theme])

  const changeTheme = (id) => {
    if (THEMES[id]) setThemeId(id)
  }

  return (
    <ThemeContext.Provider value={{ themeId, theme, changeTheme, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
