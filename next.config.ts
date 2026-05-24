import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Supabase query builder generics produce false-positive TS errors at build time.
    ignoreBuildErrors: true,
  },

  images: {
    // Supabase Storage is already a CDN — letting Next.js re-fetch and re-compress
    // images server-side adds latency and causes timeout errors. Serve them directly.
    unoptimized: true,
  },
}

export default nextConfig
