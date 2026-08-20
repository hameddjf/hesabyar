import { describe, it, expect } from 'vitest'
import { THEMES } from '@/theme/themes'

/* محاسبه‌ی نسبت کنتراست طبق فرمول WCAG 2.1 (همون فرمولی که برای پیدا کردن مقادیر
   فعلی توی themes.js استفاده شد) — این تست جلوی برگشت خاموش این باگ رو می‌گیره:
   قبلاً رنگ‌های muted/group-label توی همه‌ی تم‌ها نسبت کنتراست ۲ تا ۳ به ۱ داشتن
   (کمتر از حداقل ۴.۵ به ۱ استاندارد AA برای متن معمولی). */
function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

const AA_NORMAL_TEXT = 4.5

describe('کنتراست رنگ متن در تم‌ها (WCAG AA)', () => {
  for (const [themeKey, theme] of Object.entries(THEMES)) {
    it(`تم «${theme.nameFA}» — content.txtMuted روی content.cardBg باید حداقل ${AA_NORMAL_TEXT}:1 باشه`, () => {
      const ratio = contrastRatio(theme.content.txtMuted, theme.content.cardBg)
      expect(ratio, `contrast=${ratio.toFixed(2)} for theme "${themeKey}"`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })

    it(`تم «${theme.nameFA}» — sidebar.groupLabel روی sidebar.bg باید حداقل ${AA_NORMAL_TEXT}:1 باشه`, () => {
      const ratio = contrastRatio(theme.sidebar.groupLabel, theme.sidebar.bg)
      expect(ratio, `contrast=${ratio.toFixed(2)} for theme "${themeKey}"`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })

    it(`تم «${theme.nameFA}» — topbar.searchTxt روی topbar.searchBg باید حداقل ${AA_NORMAL_TEXT}:1 باشه`, () => {
      const ratio = contrastRatio(theme.topbar.searchTxt, theme.topbar.searchBg)
      expect(ratio, `contrast=${ratio.toFixed(2)} for theme "${themeKey}"`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  }
})
