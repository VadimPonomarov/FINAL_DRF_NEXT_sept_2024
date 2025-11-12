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

const themes = {
  monochrome: {
    name: "Monochrome",
    light: {
      // СВЕТЛАЯ ТЕМА: белый фон → черный текст
      primary: "0 0% 0%", // черный
      "primary-foreground": "0 0% 100%",
      secondary: "0 0% 95%", // светло-серый фон
      accent: "0 0% 92%", // серый фон для hover
      destructive: "0 84.2% 60.2%",
      foreground: "0 0% 0%",
      text: "0 0% 0%", // черный текст на белом фоне
      "form-text": "0 0% 0%", // черный текст в формах
      "surface-text": "0 0% 15%",
      "secondary-foreground": "0 0% 18%",
      "accent-foreground": "0 0% 18%",
      muted: "0 0% 94%",
      "muted-foreground": "0 0% 30%",
      dropdown: "0 0% 100%", // белый фон выпадающих списков
      "dropdown-text": "0 0% 0%", // черный текст в выпадающих списках
      "dropdown-hover": "0 0% 88%", // серый фон при hover
      border: "0 0% 70%", // темно-серые границы
      placeholder: "0 0% 55%", // серый placeholder
      background: "0 0% 100%", // белый фон страницы
      card: "0 0% 100%",
      "card-foreground": "0 0% 12%",
    },
    dark: {
      // ТЕМНАЯ ТЕМА: глубокий фон, светлый общий текст, светлые поверхности с тёмным контентом
      primary: "0 0% 98%", // белый акцент для темной темы
      "primary-foreground": "0 0% 8%",
      secondary: "0 0% 92%", // светлая поверхность для бейджей
      accent: "0 0% 88%", // светлый серый для hover на светлых поверхностях
      destructive: "0 62.8% 30.6%",
      foreground: "0 0% 96%",
      text: "0 0% 96%", // светлый текст на темном фоне
      "surface-text": "0 0% 12%", // тёмный текст на светлых картах/формах
      "form-text": "0 0% 12%", // текст в светлых формах
      "secondary-foreground": "0 0% 12%",
      "accent-foreground": "0 0% 18%",
      muted: "0 0% 92%",
      "muted-foreground": "0 0% 25%",
      placeholder: "0 0% 55%",
      dropdown: "0 0% 94%",
      "dropdown-text": "0 0% 12%",
      "dropdown-hover": "0 0% 88%",
      border: "0 0% 35%",
      background: "0 0% 6%", // глубокий почти черный фон страницы
      card: "0 0% 98%",
      "card-foreground": "0 0% 12%",
    }
  },
  orange: {
    name: "Orange",
    light: {
      primary: "25 100% 50%", // оранжевый
      secondary: "25 30% 95%", // светло-оранжевый
      accent: "25 100% 50%", // оранжевый
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "25 100% 50%", // оранжевый
      secondary: "25 30% 25%", // темно-оранжевый
      accent: "25 100% 50%", // оранжевый
      destructive: "0 62.8% 30.6%",
    }
  },
  blue: {
    name: "Blue",
    light: {
      primary: "221 83% 53%",
      secondary: "210 40% 96.1%",
      accent: "217 91% 60%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "217 91% 60%",
      secondary: "215 25% 27%",
      accent: "217 91% 60%",
      destructive: "0 62.8% 30.6%",
    }
  },
  green: {
    name: "Green",
    light: {
      primary: "142 76% 36%",
      secondary: "138 69% 97%",
      accent: "142 71% 45%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "142 71% 45%",
      secondary: "143 64% 24%",
      accent: "142 71% 45%",
      destructive: "0 62.8% 30.6%",
    }
  },
  purple: {
    name: "Purple",
    light: {
      primary: "262 83% 58%",
      secondary: "260 40% 96%",
      accent: "262 83% 58%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "262 83% 58%",
      secondary: "261 25% 27%",
      accent: "262 83% 58%",
      destructive: "0 62.8% 30.6%",
    }
  },
  red: {
    name: "Red",
    light: {
      primary: "0 72% 51%",
      secondary: "0 20% 96%",
      accent: "0 72% 51%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "0 72% 51%",
      secondary: "0 30% 25%",
      accent: "0 72% 51%",
      destructive: "0 62.8% 30.6%",
    }
  },
  pink: {
    name: "Pink",
    light: {
      primary: "330 81% 60%",
      secondary: "330 40% 96%",
      accent: "330 81% 60%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "330 81% 60%",
      secondary: "330 30% 25%",
      accent: "330 81% 60%",
      destructive: "0 62.8% 30.6%",
    }
  },
  teal: {
    name: "Teal",
    light: {
      primary: "180 70% 40%",
      secondary: "180 40% 96%",
      accent: "180 70% 40%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "180 70% 40%",
      secondary: "180 30% 25%",
      accent: "180 70% 40%",
      destructive: "0 62.8% 30.6%",
    }
  },
  amber: {
    name: "Amber",
    light: {
      primary: "45 93% 47%",
      secondary: "45 40% 96%",
      accent: "45 93% 47%",
      destructive: "0 84.2% 60.2%",
    },
    dark: {
      primary: "45 93% 47%",
      secondary: "45 30% 25%",
      accent: "45 93% 47%",
      destructive: "0 62.8% 30.6%",
    }
  }
}

export function ThemeSelector() {

  const [currentTheme, setCurrentTheme] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('color-theme');
      // Проверяем, существует ли тема в объекте themes
      if (savedTheme && Object.keys(themes).includes(savedTheme)) {
        return savedTheme;
      }
      // Если сохраненная тема 'default' или 'orange', заменяем ее на 'monochrome'
      if (savedTheme === 'default' || savedTheme === 'orange') {
        localStorage.setItem('color-theme', 'monochrome');
        return 'monochrome';
      }
      return 'monochrome';
    }
    return 'monochrome';
  })

  const applyTheme = (themeKey: string) => {
    // Проверяем, существует ли тема в объекте themes
    if (!Object.keys(themes).includes(themeKey)) {
      console.warn(`Theme "${themeKey}" not found, using monochrome theme`);
      themeKey = 'monochrome'; // Используем тему по умолчанию
    }

    const theme = themes[themeKey as keyof typeof themes];
    if (!theme) {
      console.error(`Theme "${themeKey}" is undefined`);
      return;
    }

    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark ? (theme.dark || theme.light) : theme.light;

    if (!colors) {
      console.error(`Colors for theme "${themeKey}" in ${isDark ? 'dark' : 'light'} mode are undefined`);
      return;
    }

    for (const [key, value] of Object.entries(colors)) {
      // Для CSS-переменных, которые используют HSL
      if (key !== "dropdown-text" && key !== "dropdown-hover") {
        document.documentElement.style.setProperty(`--${key}`, value)
      }
      // Для CSS-переменных, которые используют прямые значения цвета
      else {
        document.documentElement.style.setProperty(`--${key}`, value)
      }
    }

    setCurrentTheme(themeKey);
    localStorage.setItem('color-theme', themeKey);

    // Добавляем атрибут data-theme к body
    document.body.setAttribute('data-theme', themeKey);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('color-theme-changed', { detail: { theme: themeKey } }))
  }

  // Apply theme on mount and when dark mode changes
  React.useEffect(() => {
    // Устанавливаем атрибут data-theme при инициализации
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', currentTheme);
    }

    applyTheme(currentTheme)

    const handleDarkModeChange = () => {
      applyTheme(currentTheme)
    }

    window.addEventListener('dark-mode-changed', handleDarkModeChange)
    return () => window.removeEventListener('dark-mode-changed', handleDarkModeChange)
  }, [currentTheme])

  // Функция для получения цвета текста для каждой палитры
  const getThemeColor = (key: string, theme: {
    name: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  }) => {
    try {
      if (!theme || !theme.light || !theme.dark) {
        console.warn(`Theme data for "${key}" is incomplete`);
        return '0 0% 0%'; // Черный по умолчанию
      }

      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains("dark");
      const colors = isDark ? theme.dark : theme.light;

      if (!colors || !colors.text) {
        console.warn(`Text color for theme "${key}" in ${isDark ? 'dark' : 'light'} mode is undefined`);
        return isDark ? '0 0% 100%' : '0 0% 0%'; // Белый для темной темы, черный для светлой
      }

      return colors.text;
    } catch (error) {
      console.error(`Error getting theme color for "${key}": ${error}`);
      return '0 0% 0%'; // Черный по умолчанию
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="theme-toggle"
          style={{zIndex: 99999, position: 'relative'}}
        >
          <Palette data-theme-icon="inactive" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[9999]"
        sideOffset={5}
      >
        {Object.entries(themes).map(([key, theme]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => applyTheme(key)}
            className={currentTheme === key ? "bg-secondary" : ""}
            style={{
              color: `hsl(${getThemeColor(key, theme)})`,
              fontWeight: currentTheme === key ? 'bold' : 'normal'
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(${getThemeColor(key, theme)})` }}
              />
              {theme.name}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
