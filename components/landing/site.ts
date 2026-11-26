// Réglages partagés par la landing et ses pages légales.

// Fiches des magasins. Tant qu'un lien vaut null, le badge affiche « coming
// soon », les boutons « Get the app » descendent au bloc de téléchargement et
// ce bloc propose d'écrire à l'équipe.
export const APP_STORE_URL: string | null = null
export const PLAY_STORE_URL: string | null = null

// Adresse affichée partout (pied de page, FAQ, pages légales) : elle doit
// exister et être relevée.
export const CONTACT_EMAIL = 'contact@osho.app'

export const LOCATION = 'Sioux City, Iowa'

export const LEGAL_LINKS = [
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Terms of sale', href: '/legal/terms' },
  { label: 'Legal notice', href: '/legal/notice' },
] as const
