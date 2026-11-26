import { cn } from '@/lib/utils'

/**
 * Marque Osho : un anneau ouvert traversé d'un repère.
 * L'anneau est le O, le repère la craie du tailleur, l'ouverture l'endroit
 * où passe la coupe. Champ 100 × 100 :
 *   anneau  centre (50,50), r 36, ép. 11, bouts francs, arc −27° → 297°
 *   repère  segment à −45°, du rayon 24 au rayon 48, ép. 11, bouts francs
 * Ne pas pivoter, ne pas recolorer le repère.
 */
export function LogoMark({ size = 24, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M 82.08 33.65 A 36 36 0 1 1 66.35 17.92"
        fill="none"
        stroke="var(--logo-ring)"
        strokeWidth={11}
        strokeLinecap="butt"
      />
      <line
        x1="66.97" y1="33.03" x2="83.94" y2="16.06"
        stroke="var(--logo-mark)"
        strokeWidth={11}
        strokeLinecap="butt"
      />
    </svg>
  )
}

/**
 * Marque + nom. Le nom est en Archivo SemiCondensed 700 (comme le mot-symbole
 * de la landing), corps ≈ 1,18 × la hauteur de la
 * marque, séparé de 0,42 × cette hauteur. Sous 20 px, la marque seule.
 * Le vide de protection (½ hauteur de marque) est la marge `padding` du
 * conteneur : `withClearance` l'applique quand le parent ne la garantit pas.
 */
export function Logo({
  size = 28,
  className,
  withClearance = false,
}: {
  size?: number
  className?: string
  withClearance?: boolean
}) {
  const showName = size >= 20
  const nameSize = Math.round(size * 1.18 * 10) / 10
  return (
    <span
      className={cn('inline-flex items-center text-ink', className)}
      style={{
        gap: Math.round(size * 0.42 * 10) / 10,
        padding: withClearance ? size / 2 : undefined,
      }}
    >
      <LogoMark size={size} title={showName ? undefined : 'Osho'} />
      {showName && (
        <span
          className="leading-none"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStretch: '87.5%',
            fontWeight: 700,
            fontSize: nameSize,
            letterSpacing: '-0.01em',
          }}
        >
          Osho
        </span>
      )}
    </span>
  )
}
