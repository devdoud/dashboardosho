import { Reveal } from './reveal'
import s from './landing.module.css'

const ROOT_ID = 'osho-landing'

/** Racine des pages publiques : thème, apparition au défilement, lien d'évitement. */
export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div id={ROOT_ID} lang="en" className={s.root}>
      <a href="#content" className={s.skip}>Skip to content</a>
      <Reveal rootId={ROOT_ID} />
      {children}
    </div>
  )
}
