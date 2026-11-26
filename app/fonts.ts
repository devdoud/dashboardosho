import localFont from 'next/font/local'

// Polices du site entier (landing, pages légales, dashboard), direction
// « Indigo & craie ». Auto-hébergées (app/fonts, licence OFL, fichiers
// Fontsource, sous-ensemble latin) : `next/font/google` faisait échouer le
// build Turbopack sur Vercel et dépendait du réseau.

// Archivo variable (graisse 100–900, largeur 62–125 %). Un seul fichier sert
// le texte (largeur 100 %) et les titres en SemiCondensed (largeur 87,5 %).
export const archivo = localFont({
  src: './fonts/archivo-latin-wdth-wght.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-archivo',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  fallback: ['system-ui', 'sans-serif'],
})

// Tout ce qui se mesure : centimètres, prix, délais, ±.
export const martianMono = localFont({
  src: [
    { path: './fonts/martian-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/martian-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-martian',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
})
