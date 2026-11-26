'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import s from './landing.module.css'

const subscribe = () => () => {}

/**
 * Bascule clair / sombre de la landing. next-themes pose `data-theme` sur
 * <html> ; landing.module.css lit cet attribut, et sans lui suit le système.
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  // Le thème réel n'est connu qu'au client : rendu neutre côté serveur.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      className={s.themeSwitch}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  )
}
