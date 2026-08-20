import { create } from 'zustand'
import i18n from '@/i18n'
import { THEMES, DEFAULT_THEME } from './themes'

const STORAGE_KEY = 'hesabyar_theme'
const FONT_SCALE_KEY = 'hesabyar_font_scale'

function applyThemeVars(themeId) {
  const theme = THEMES[themeId]
  if (!theme) return
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val)
  })
  root.setAttribute('data-theme', themeId)
}

const savedTheme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
const savedFontScale = Number(localStorage.getItem(FONT_SCALE_KEY)) || 1

export const useAppStore = create((set) => ({
  language: 'fa',
  dir: 'rtl',
  sidebarOpen: true,
  themeId: savedTheme,
  fontScale: savedFontScale,

  setFontScale: (scale) => {
    localStorage.setItem(FONT_SCALE_KEY, String(scale))
    set({ fontScale: scale })
  },

  setLanguage: (lang) => {
    i18n.changeLanguage(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'
    set({ language: lang, dir: lang === 'fa' ? 'rtl' : 'ltr' })
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTheme: (themeId) => {
    if (!THEMES[themeId]) return
    applyThemeVars(themeId)
    localStorage.setItem(STORAGE_KEY, themeId)
    set({ themeId })
  },

  initTheme: () => {
    applyThemeVars(savedTheme)
  },
}))
