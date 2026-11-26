import { LogoMark } from '@/components/brand/logo'
import { DownloadButton } from './download-button'
import { ThemeSwitch } from './theme-switch'
import { APP_STORE_URL, CONTACT_EMAIL, LEGAL_LINKS, LOCATION, PLAY_STORE_URL } from './site'
import s from './landing.module.css'

export function Wordmark() {
  return (
    <span className={s.wordmark}>
      <LogoMark size={26} />
      <span>Osho</span>
    </span>
  )
}

/**
 * En-tête des pages publiques. Sur la page d'accueil, les liens pointent vers
 * les sections ; ailleurs (`home={false}`), ils ramènent à l'accueil.
 */
export function SiteHeader({ home = true }: { home?: boolean }) {
  const base = home ? '' : '/'
  return (
    <header className={s.header}>
      <div className={`${s.container} ${s.headerInner}`}>
        <a href={home ? '#content' : '/'} className={s.brandLink} aria-label={home ? 'Osho, back to top' : 'Osho, home'}>
          <Wordmark />
        </a>
        <nav aria-label="Sections" className={s.nav}>
          <a href={`${base}#how-it-works`}>How it works</a>
          <a href={`${base}#looks`}>Looks</a>
          <a href={`${base}#fabrics`}>Fabrics</a>
          <a href={`${base}#faq`}>FAQ</a>
        </nav>
        <div className={s.headerActions}>
          <ThemeSwitch />
          <DownloadButton
            appStoreUrl={APP_STORE_URL}
            playStoreUrl={PLAY_STORE_URL}
            fallback={`${base}#download`}
            className={s.btnSecondary}
          >
            Get the app
          </DownloadButton>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={`${s.container} ${s.footerGrid}`}>
        <div className={s.footerBrand}>
          <Wordmark />
          <p className={s.bodyMuted}>Made-to-measure West African fashion · {LOCATION}</p>
        </div>
        <div>
          <h2 className={s.footerTitle}>Contact</h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className={s.footerLink}>{CONTACT_EMAIL}</a>
        </div>
        <div>
          <h2 className={s.footerTitle}>Legal</h2>
          <ul className={s.footerList}>
            {LEGAL_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className={s.footerLink}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={s.container}>
        <p className={s.copyright}>
          © {new Date().getFullYear()} Osho · Photos for illustration, from Unsplash
        </p>
      </div>
    </footer>
  )
}
