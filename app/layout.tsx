import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { archivo, martianMono } from './fonts'
import './globals.css'

// Une seule famille pour tout le site, landing et dashboard : Archivo (texte,
// titres en SemiCondensed) et Martian Mono (mesures, chiffres). Polices
// auto-hébergées (app/fonts, licence OFL), voir app/fonts.ts.

// Adresse publique, pour les liens absolus des images de partage. Sur Vercel,
// le domaine de production est fourni ; ailleurs, NEXT_PUBLIC_SITE_URL.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Osho', template: '%s | Osho' },
  description: 'Made-to-measure West African tailoring — boubou, agbada, kaftan — cut to your exact measurements.',
}

// La landing et ses pages légales sont en anglais ; le dashboard et la page
// de connexion déclarent `lang="fr"` sur leur propre conteneur.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${martianMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
