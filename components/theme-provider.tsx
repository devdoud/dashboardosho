'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Pose `data-theme="light|dark"` sur <html>. Les jetons de globals.css lisent
 * cet attribut ; sans JavaScript, ils suivent `prefers-color-scheme`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
