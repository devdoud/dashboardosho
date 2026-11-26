import { LandingShell } from './shell'
import { SiteFooter, SiteHeader } from './site-chrome'
import s from './landing.module.css'

/**
 * Gabarit des pages légales (/legal/*) : même en-tête, même pied de page et
 * mêmes thèmes que la landing, colonne de lecture étroite.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  /** Date de dernière mise à jour, affichée telle quelle. */
  updated: string
  children: React.ReactNode
}) {
  return (
    <LandingShell>
      <SiteHeader home={false} />
      <main id="content" className={s.legal}>
        <div className={s.container}>
          <article className={s.legalBody}>
            <p className={s.label}>Legal</p>
            <h1 className={s.h1}>{title}</h1>
            <p className={s.legalUpdated}>Last updated: {updated}</p>
            {children}
          </article>
        </div>
      </main>
      <SiteFooter />
    </LandingShell>
  )
}
