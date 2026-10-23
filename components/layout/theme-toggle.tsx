'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  // Le thème réel n'est connu qu'au client : rendu neutre côté serveur.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      className={cn(
        'flex size-11 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-ink',
        className
      )}
    >
      {isDark
        ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        : <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />}
    </button>
  )
}
