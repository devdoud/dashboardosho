import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Osho Admin', template: '%s | Osho Admin' },
  description: "Dashboard d'administration Osho — Mode Africaine",
  icons: {
    icon: '/logo_osho.png',
    shortcut: '/logo_osho.png',
    apple: '/logo_osho.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
