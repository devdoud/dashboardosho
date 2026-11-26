import s from './landing.module.css'

/**
 * Photos de la landing, hébergées dans public/landing/photos en WebP, en deux
 * largeurs (640 et 1200 px).
 *
 * Provenance : Unsplash (licence Unsplash, usage commercial autorisé). Elles
 * illustrent une ambiance, pas des articles du catalogue : à remplacer par les
 * photos des modèles Osho dès qu'elles existent.
 */
export type PhotoName =
  | 'hero-couple'
  | 'look-women'
  | 'look-men'
  | 'look-ceremony'
  | 'look-evening'
  | 'fabric-bazin'
  | 'fabric-vlisco'
  | 'fabric-wax'
  | 'story-tailor'

const WIDTHS = [640, 1200] as const

export function Photo({
  name,
  alt,
  sizes,
  priority = false,
  className,
}: {
  name: PhotoName
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fichiers déjà redimensionnés (images non optimisées)
    <img
      src={`/landing/photos/${name}-1200.webp`}
      srcSet={WIDTHS.map((w) => `/landing/photos/${name}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className ? `${s.photo} ${className}` : s.photo}
    />
  )
}
