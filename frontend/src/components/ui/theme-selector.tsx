"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette } from "lucide-react"

/* ─── Full CSS-variable set per theme variant ─────────────────────────────── */
type ThemeVars = Record<string, string>
type ThemeDef = { name: string; accent: string; light: ThemeVars; dark: ThemeVars }

const mk = (
  name: string,
  accent: string,          // HSL for the accent swatch / palette button color
  lightPrimary: string,    // HSL primary for light
  darkPrimary: string,     // HSL primary for dark
  extras: { lightSecondary?: string; darkSecondary?: string } = {}
): ThemeDef => {
  const ls = extras.lightSecondary ?? `${lightPrimary.split(' ')[0]} 30% 94%`
  const ds = extras.darkSecondary  ?? `${darkPrimary.split(' ')[0]} 20% 22%`
  return {
    name, accent,
    light: {
      primary: lightPrimary, "primary-foreground": "0 0% 100%",
      secondary: ls, "secondary-foreground": "0 0% 15%",
      accent: ls,   "accent-foreground": "0 0% 12%",
      muted: ls,    "muted-foreground": "0 0% 40%",
      background: "0 0% 100%", foreground: "240 10% 6%",
      card: "0 0% 100%", "card-foreground": "240 10% 8%",
      popover: "0 0% 100%", "popover-foreground": "240 10% 8%",
      border: "0 0% 82%", input: "0 0% 90%", ring: lightPrimary,
      destructive: "0 84% 60%", "destructive-foreground": "0 0% 98%",
      text: lightPrimary,          // palette button / accent text = primary
      "surface-text": "240 10% 8%",
      "form-text": "240 10% 6%",
      dropdown: "0 0% 100%", "dropdown-text": "240 10% 6%", "dropdown-hover": "0 0% 94%",
      placeholder: "0 0% 55%",
    },
    dark: {
      primary: darkPrimary, "primary-foreground": "0 0% 100%",
      secondary: ds, "secondary-foreground": "210 20% 88%",
      accent: ds,   "accent-foreground": "210 20% 90%",
      muted: "222 14% 18%", "muted-foreground": "215 16% 58%",
      background: "222 18% 8%", foreground: "210 20% 92%",
      card: "222 16% 13%", "card-foreground": "210 20% 90%",
      popover: "222 16% 13%", "popover-foreground": "210 20% 90%",
      border: "222 14% 22%", input: "222 14% 16%", ring: darkPrimary,
      destructive: "0 72% 42%", "destructive-foreground": "0 0% 98%",
      text: darkPrimary,           // palette button / accent text = primary
      "surface-text": "210 20% 88%",
      "form-text": "210 20% 92%",
      dropdown: "222 16% 16%", "dropdown-text": "210 20% 92%", "dropdown-hover": "222 14% 22%",
      placeholder: "215 16% 55%",
    },
  }
}

const themes: Record<string, ThemeDef> = {
  /* Mono — special: text is white (dark) or black (light), never the accent */
  monochrome: {
    name: "Mono",
    accent: "0 0% 50%",
    light: {
      primary: "0 0% 8%", "primary-foreground": "0 0% 100%",
      secondary: "0 0% 93%", "secondary-foreground": "0 0% 10%",
      accent: "0 0% 90%", "accent-foreground": "0 0% 10%",
      muted: "0 0% 93%", "muted-foreground": "0 0% 38%",
      background: "0 0% 100%", foreground: "0 0% 6%",
      card: "0 0% 100%", "card-foreground": "0 0% 8%",
      popover: "0 0% 100%", "popover-foreground": "0 0% 8%",
      border: "0 0% 80%", input: "0 0% 92%", ring: "0 0% 8%",
      destructive: "0 84% 60%", "destructive-foreground": "0 0% 98%",
      text: "0 0% 6%",           // BLACK text for light mono
      "surface-text": "0 0% 8%",
      "form-text": "0 0% 6%",
      dropdown: "0 0% 100%", "dropdown-text": "0 0% 6%", "dropdown-hover": "0 0% 92%",
      placeholder: "0 0% 55%",
    },
    dark: {
      primary: "0 0% 96%", "primary-foreground": "0 0% 8%",
      secondary: "0 0% 20%", "secondary-foreground": "0 0% 90%",
      accent: "0 0% 22%", "accent-foreground": "0 0% 90%",
      muted: "0 0% 18%", "muted-foreground": "0 0% 58%",
      background: "0 0% 7%", foreground: "0 0% 94%",
      card: "0 0% 12%", "card-foreground": "0 0% 90%",
      popover: "0 0% 12%", "popover-foreground": "0 0% 90%",
      border: "0 0% 22%", input: "0 0% 15%", ring: "0 0% 94%",
      destructive: "0 72% 42%", "destructive-foreground": "0 0% 98%",
      text: "0 0% 94%",          // WHITE text for dark mono
      "surface-text": "0 0% 90%",
      "form-text": "0 0% 92%",
      dropdown: "0 0% 14%", "dropdown-text": "0 0% 92%", "dropdown-hover": "0 0% 20%",
      placeholder: "0 0% 55%",
    },
  },

  blue:   mk("Ocean Blue",  "217 91% 60%", "221 83% 52%", "217 91% 60%"),
  green:  mk("Forest",      "142 71% 42%", "142 76% 36%", "142 71% 45%"),
  purple: mk("Royal",       "262 83% 62%", "262 83% 52%", "263 70% 62%"),
  orange: mk("Sunset",      "25 100% 55%", "25 100% 46%", "25 100% 58%"),
  red:    mk("Ruby",        "0 75% 56%",   "0 72% 46%",   "0 75% 56%"),
  pink:   mk("Neon Pink",   "328 86% 64%", "330 81% 55%", "328 80% 64%"),
  teal:   mk("Cyan",        "183 74% 46%", "180 70% 38%", "183 74% 50%"),
  amber:  mk("Gold",        "43 96% 52%",  "45 93% 42%",  "43 96% 55%"),
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = React.useState<string>(() => {
    if (typeof window === 'undefined') return 'monochrome'
    const saved = localStorage.getItem('color-theme') ?? ''
    return saved in themes ? saved : 'monochrome'
  })

  const applyTheme = React.useCallback((themeKey: string) => {
    const key = themeKey in themes ? themeKey : 'monochrome'
    const theme = themes[key]
    const isDark = document.documentElement.classList.contains('dark')
    const vars = isDark ? theme.dark : theme.light

    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(`--${k}`, v)
    }

    setCurrentTheme(key)
    localStorage.setItem('color-theme', key)
    document.body.setAttribute('data-theme', key)
    window.dispatchEvent(new CustomEvent('color-theme-changed', { detail: { theme: key } }))
  }, [])

  React.useEffect(() => {
    applyTheme(currentTheme)
    const onDarkChange = () => applyTheme(currentTheme)
    window.addEventListener('dark-mode-changed', onDarkChange)
    return () => window.removeEventListener('dark-mode-changed', onDarkChange)
  }, [currentTheme, applyTheme])

  /* Palette button swatch color:
     - mono-light: black swatch  (white bg → opposite = black)
     - mono-dark:  white swatch  (black bg → opposite = white)
     - all others: their accent color */
  const swatchHsl = (key: string): string => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    if (key === 'monochrome') return isDark ? '0 0% 96%' : '0 0% 6%'
    return themes[key]?.accent ?? '0 0% 50%'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="theme-toggle"
          style={{ zIndex: 99999, position: 'relative' }}
          title="Color palette"
        >
          <Palette
            className="h-4 w-4"
            style={{ color: `hsl(${swatchHsl(currentTheme)})` }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999] min-w-[160px]" sideOffset={5}>
        {Object.entries(themes).map(([key, theme]) => {
          const swatch = swatchHsl(key)
          const isActive = currentTheme === key
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => applyTheme(key)}
              className={isActive ? 'bg-secondary font-semibold' : ''}
            >
              <div className="flex items-center gap-2.5 w-full">
                <span
                  className="inline-block w-3 h-3 rounded-full ring-1 ring-inset ring-black/10 flex-shrink-0"
                  style={{ backgroundColor: `hsl(${swatch})` }}
                />
                <span style={{ color: `hsl(${swatch})` }}>{theme.name}</span>
                {isActive && <span className="ml-auto text-[10px] opacity-60">✓</span>}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
