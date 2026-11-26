import s from './landing.module.css'

/** Largeurs générées dans public/landing/screens (scripts/landing-screens.py). */
const WIDTHS = [360, 540, 720] as const

/** Taille des captures après recadrage des barres système (1080 × 2044). */
const SHOT_W = 1080
const SHOT_H = 2044

export type ScreenName =
  | '01_home'

function srcSet(name: ScreenName, ext: 'avif' | 'webp') {
  return WIDTHS.map((w) => `/landing/screens/${name}-${w}.${ext} ${w}w`).join(', ')
}

/**
 * Capture de l'app dans un cadre de téléphone neutre, dessiné en CSS (aucun
 * appareil de marque), aux coins volontairement peu arrondis. AVIF, puis WebP,
 * en trois largeurs ; chargement différé sauf pour le visuel principal.
 */
export function Phone({
  name,
  alt,
  sizes,
  priority = false,
  crop,
  className,
}: {
  name: ScreenName
  alt: string
  /** Largeur d'affichage, au format de l'attribut `sizes`. */
  sizes: string
  priority?: boolean
  /** `bottom` : n'affiche que le bas de l'écran (masque l'en-tête et l'accroche). */
  crop?: 'bottom'
  className?: string
}) {
  return (
    <div className={className ? `${s.phone} ${className}` : s.phone}>
      <div className={crop === 'bottom' ? `${s.phoneScreen} ${s.phoneCropBottom}` : s.phoneScreen}>
        <picture>
          <source type="image/avif" srcSet={srcSet(name, 'avif')} sizes={sizes} />
          <source type="image/webp" srcSet={srcSet(name, 'webp')} sizes={sizes} />
          <img
            src={`/landing/screens/${name}-540.webp`}
            alt={alt}
            width={SHOT_W}
            height={SHOT_H}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        </picture>
      </div>
    </div>
  )
}
