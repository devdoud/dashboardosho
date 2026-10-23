import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// Une seule serif, pour les titres et les prix — 400 et 600 uniquement.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-fraunces',
  display: 'swap',
})

// Tout le reste.
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
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
