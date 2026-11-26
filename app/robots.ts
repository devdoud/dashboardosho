import type { MetadataRoute } from 'next'

/** Seules la landing et ses pages légales sont publiques ; le dashboard ne doit pas être indexé. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/'],
      disallow: [
        '/api/',
        '/login',
        '/dashboard',
        '/orders',
        '/products',
        '/categories',
        '/users',
        '/tailors',
        '/payments',
        '/reviews',
        '/notifications',
      ],
    },
  }
}
