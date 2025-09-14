"use client"
import { MoonIcon, SunIcon } from "@heroicons/react/16/solid"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

function ThemeToggle() {

    // Используем состояние для отслеживания загрузки клиента
    const [mounted, setMounted] = useState(false)
    // Инициализируем состояние темы как 'light' для серверного рендеринга
    const [theme, setTheme] = useState('light')

    // Инициализируем тему на клиенте
    useEffect(() => {
        // Помечаем, что компонент загружен на клиенте
        setMounted(true)
        // Загружаем тему из localStorage
        const savedTheme = localStorage.getItem('dark-mode') || 'light'
        setTheme(savedTheme)
    }, [])

    // Обновляем тему при изменении
    useEffect(() => {
        if (!mounted) return // Не выполняем на сервере

        if (theme === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
        localStorage.setItem('dark-mode', theme)
        window.dispatchEvent(new CustomEvent('dark-mode-changed'))
    }, [theme, mounted])

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light")
    }

    // Если компонент не загружен на клиенте, рендерим пустой плейсхолдер
    if (!mounted) {
        return (
            <Button
                data-testid="theme-toggle-button"
                variant="outline"
                size="icon"
                className="bg-transparent border-0"
            >
                <div className="h-4 w-4" />
            </Button>
        )
    }

    return (
        <Button
            data-testid="theme-toggle-button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="bg-transparent border-0"
            style={{zIndex: 99999, position: 'relative'}}
        >
            {theme === "light" ? (
                <MoonIcon data-testid="moon-icon" className="h-4 w-4 text-foreground" />
            ) : (
                <SunIcon data-testid="sun-icon" className="h-4 w-4 text-foreground" />
            )}
        </Button>
    )
}

export default ThemeToggle
export { ThemeToggle }
