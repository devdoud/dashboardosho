'use client'

import { useEffect, useRef, useState } from 'react'
import s from './landing.module.css'

const FROM = 66.0
const TO = 74.0
const DURATION_MS = 1600

/** Le ruban dessiné va de 50 à 100 cm ; un centimètre = 40 px. */
const START_CM = 50
const END_CM = 100
const PX_PER_CM = 40
const LABELS = Array.from({ length: END_CM - START_CM + 1 }, (_, i) => START_CM + i)

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Démonstration de lecture d'une mesure : quand la carte entre à l'écran, le
 * ruban défile sous le repère jusqu'au tour de taille, et la valeur suit. Sans
 * JavaScript ou avec prefers-reduced-motion, la valeur finale s'affiche
 * directement.
 */
export function TapeDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(TO)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS)
        setValue(FROM + (TO - FROM) * easeOut(t))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    // Repartir de la valeur de départ seulement si la carte est hors écran.
    if (el.getBoundingClientRect().top > window.innerHeight) setValue(FROM)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        run()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const inches = value / 2.54

  return (
    <div
      ref={ref}
      className={s.demo}
      role="img"
      aria-label={`Waist measurement read on a tape: ${TO.toFixed(1)} cm, or ${(TO / 2.54).toFixed(1)} inches.`}
    >
      <div className={s.demoHead} aria-hidden>
        <span className={s.demoLabel}>Waist</span>
        <span className={s.demoBadge}>±1–2 cm with a photo</span>
      </div>
      <p className={s.demoValue} aria-hidden>
        <span className={s.mono}>{value.toFixed(1)}</span>
        <span className={s.demoUnit}>cm</span>
      </p>
      <p className={s.demoSub} aria-hidden>
        <span className={s.mono}>{inches.toFixed(1)}</span> in
      </p>
      <div className={s.demoTapeWrap} aria-hidden>
        <div
          className={s.demoStrip}
          style={{
            width: (END_CM - START_CM) * PX_PER_CM,
            transform: `translateX(${-(value - START_CM) * PX_PER_CM}px)`,
          }}
        >
          {LABELS.map((n) => (
            <span key={n} className={s.demoNumber} style={{ left: (n - START_CM) * PX_PER_CM }}>
              {n}
            </span>
          ))}
        </div>
        <span className={s.demoMark} />
      </div>
    </div>
  )
}
