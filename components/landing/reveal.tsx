'use client'

import { useEffect } from 'react'

/**
 * Apparition au défilement, sans bibliothèque.
 *
 * Les éléments `[data-reveal]` ne sont masqués qu'une fois ce script exécuté
 * (`data-js` sur la racine) : sans JavaScript, tout reste visible. Ce qui est
 * déjà à l'écran au chargement est marqué visible tout de suite, pour ne
 * jamais faire clignoter le haut de page. Avec prefers-reduced-motion, rien
 * n'est masqué ni animé (voir landing.module.css).
 */
export function Reveal({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId)
    if (!root || !('IntersectionObserver' in window)) return

    const pending: Element[] = []
    for (const el of root.querySelectorAll('[data-reveal]')) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute('data-revealed', '')
      else pending.push(el)
    }
    root.setAttribute('data-js', '')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    pending.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [rootId])

  return null
}
