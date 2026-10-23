import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// Polices auto-hébergées (app/fonts, licence OFL, fichiers Fontsource, sous-ensemble
// latin). `next/font/google` faisait échouer le build Turbopack sur Vercel
// (« next/font/google queries have exactly one entry ») et dépendait du réseau.

// Une seule serif, pour les titres et les prix — 400 et 600 uniquement.
const fraunces = localFont({
  src: [
    { path: './fonts/fraunces-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fraunces-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
})

// Tout le reste.
const dmSans = localFont({
  src: [
    { path: './fonts/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/dm-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-dm-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: { default: 'Osho', template: '%s | Osho' },
  description: 'Made-to-measure West African tailoring — boubou, agbada, kaftan — cut to your exact measurements.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
