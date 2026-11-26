'use client'

import { useSyncExternalStore } from 'react'

/** Ancre du bloc de téléchargement, qui affiche les deux badges officiels. */
const DEFAULT_FALLBACK = '#download'

const subscribe = () => () => {}

/**
 * Le bouton principal ouvre directement le bon magasin : Google Play sur
 * Android, l'App Store sur iPhone et iPad. Sur ordinateur, ou tant qu'un lien
 * n'est pas renseigné, il descend au bloc de téléchargement.
 */
export function DownloadButton({
  appStoreUrl,
  playStoreUrl,
  fallback = DEFAULT_FALLBACK,
  className,
  children,
}: {
  appStoreUrl: string | null
  playStoreUrl: string | null
  /** Destination sur ordinateur ou tant qu'aucun lien n'est renseigné. */
  fallback?: string
  className?: string
  children: React.ReactNode
}) {
  const href = useSyncExternalStore(
    subscribe,
    () => {
      const ua = navigator.userAgent
      if (/android/i.test(ua)) return playStoreUrl ?? fallback
      // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
      const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      if (isIos) return appStoreUrl ?? fallback
      return fallback
    },
    () => fallback,
  )

  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}
