import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage est déjà un CDN — laisser Next.js re-télécharger et
    // re-compresser les images côté serveur ajoute de la latence et provoque
    // des timeouts. On les sert directement.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://localhost').hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ],
    unoptimized: true,
  },
}

export default nextConfig
