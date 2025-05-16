"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Only show the toggle after hydration to avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            >
                <Sun className="h-4 w-4 rotate-0 scale-100 text-slate-500 dark:text-slate-400" />
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-300" />
            ) : (
                <Moon className="h-4 w-4 text-slate-700" />
            )}
        </Button>
    )
}
