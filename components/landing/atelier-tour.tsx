'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

/**
 * Visite de l'app en 3D.
 *
 * Les écrans flottent comme des feuilles de papier sur un arc ; le défilement
 * fait tourner l'arc pour amener chaque écran face au lecteur, pendant qu'un
 * mètre ruban gradué tourne au sol et que le repère de craie (le rouge du
 * logo) reste fixe, à l'endroit « où passe la coupe ».
 *
 * Fidèle à la direction Atelier : matériaux non éclairés (aucune ombre, aucun
 * reflet), traits d'1 px, pas de halo ni de dégradé. Toutes les couleurs sont
 * lues dans les jetons CSS et suivent le thème. Mouvement réduit ou WebGL
 * indisponible → les mêmes écrans en images fixes.
 */

const SCREENS = [
  {
    src: '/screens/collection.webp',
    title: 'Tailored to your measurements',
    body: 'Bazin, vlisco and wax, sewn by West African tailors.',
    alt: 'The Osho app home screen: new pieces from the workshop, with prices in dollars and making time.',
  },
  {
    src: '/screens/product.webp',
    title: 'The fabric, the embroidery, the finish',
    body: 'Settled before you order, making time included.',
    alt: 'A product screen: the Sunburst Ankara Couple Set, $336, six days to make, with fabric and origin.',
  },
  {
    src: '/screens/measurements.webp',
    title: 'Your measurements, once',
    body: 'No tape measure, no fitting. Kept for every order you place.',
    alt: 'The measurements screen: one profile per person, with chest, waist, hips and more as a table of values.',
  },
  {
    src: '/screens/basket.webp',
    title: 'Every piece on the right profile',
    body: 'Order for yourself and for family back home, in one basket.',
    alt: 'The basket: two pieces, each cut to a different profile, shipped to one US address.',
  },
  {
    src: '/screens/payment.webp',
    title: 'Paid in dollars, shipped to you',
    body: 'Card handled by Stripe. Osho never sees your card.',
    alt: 'The payment screen: the amount due in dollars, the price in FCFA at the workshop, and card payment by Stripe.',
  },
] as const

const N = SCREENS.length
const SCREEN_ASPECT = 900 / 1899 // largeur / hauteur des captures

// ─── Mouvement réduit ─────────────────────────────────────────────────────────

const REDUCED = '(prefers-reduced-motion: reduce)'
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false)

// ─── Composant ────────────────────────────────────────────────────────────────

export function AtelierTour() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0) // 0 → N-1, lu par la boucle de rendu
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()
  const useGl = !reduced && !failed

  // ── Progression au défilement ──────────────────────────────────────────────
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const range = rect.height - window.innerHeight
      const t = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0
      progressRef.current = t * (N - 1)
      setActive(Math.round(progressRef.current))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    raf = requestAnimationFrame(update)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  /** Les repères de progression sont de vrais boutons : ils mènent à l'écran. */
  const goTo = useCallback((i: number) => {
    const el = sectionRef.current
    if (!el) return
    const range = el.offsetHeight - window.innerHeight
    const top = el.getBoundingClientRect().top + window.scrollY + (range * i) / (N - 1)
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  // ── Scène three.js ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!useGl) return
    const stage = stageRef.current
    const section = sectionRef.current
    if (!stage || !section) return

    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const THREE = await import('three')
      if (disposed) return

      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      } catch {
        setFailed(true)
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      const canvas = renderer.domElement
      canvas.setAttribute('aria-hidden', 'true')
      canvas.className = 'absolute inset-0 h-full w-full'
      // Les bords latéraux s'effacent dans le papier (un masque, pas une couleur).
      const edgeMask = 'linear-gradient(to right, transparent 0, black 9%, black 91%, transparent 100%)'
      canvas.style.maskImage = edgeMask
      canvas.style.webkitMaskImage = edgeMask
      stage.appendChild(canvas)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)

      // Couleurs lues dans les jetons CSS (aucune valeur en dur ici).
      const token = (name: string) =>
        new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined)

      // Géométrie de l'arc
      const H = 3.2
      const W = H * SCREEN_ASPECT
      const R = 3.4                  // rayon de l'arc des écrans
      const STEP = 0.6               // écart angulaire entre deux écrans (rad)
      const FLOOR = -H / 2 - 0.32    // niveau du sol
      const center = new THREE.Vector3(0, 0, -R)

      // ── Écrans : plans non éclairés, la capture telle quelle ──
      const loader = new THREE.TextureLoader()
      const maxAniso = renderer.capabilities.getMaxAnisotropy()
      const planeGeo = new THREE.PlaneGeometry(W, H)
      const planes = SCREENS.map((s) => {
        const tex = loader.load(s.src)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = maxAniso
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false })
        const mesh = new THREE.Mesh(planeGeo, mat)
        scene.add(mesh)
        return mesh
      })

      // ── Fil du papier : cadre d'1 px autour de chaque écran ──
      const frameGeo = new THREE.EdgesGeometry(planeGeo)
      const frameMats = planes.map((p) => {
        const m = new THREE.LineBasicMaterial({ transparent: true, fog: false })
        p.add(new THREE.LineSegments(frameGeo, m))
        return m
      })

      // ── Sol : un tapis de coupe borné, quadrillé de filets ──
      // Fini plutôt qu'infini : ses bords restent dans le cadre au lieu d'être
      // tranchés par le canvas. Le mètre ruban tient à l'intérieur.
      const MAT_X = R + 1.3
      const MAT_Z0 = -2 * R - 1.2 // fond
      const MAT_Z1 = 1.3          // devant
      const CELL = 0.4
      const gridPts: number[] = []
      for (let x = -MAT_X; x <= MAT_X + 1e-6; x += CELL) gridPts.push(x, 0, MAT_Z0, x, 0, MAT_Z1)
      for (let z = MAT_Z0; z <= MAT_Z1 + 1e-6; z += CELL) gridPts.push(-MAT_X, 0, z, MAT_X, 0, z)
      const gridGeo = new THREE.BufferGeometry()
      gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3))
      const gridMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 })
      const grid = new THREE.LineSegments(gridGeo, gridMat)
      grid.position.set(0, FLOOR - 0.002, 0)
      scene.add(grid)

      // ── Mètre ruban : anneau gradué au millimètre près du sol ──
      const tape = new THREE.Group()
      tape.position.set(center.x, FLOOR, center.z)
      scene.add(tape)
      const RT = R + 0.55
      const minor: number[] = []
      const major: number[] = []
      const TICKS = 720
      for (let k = 0; k < TICKS; k++) {
        const a = (k / TICKS) * Math.PI * 2
        const len = k % 20 === 0 ? 0.26 : k % 10 === 0 ? 0.16 : 0.07
        const target = k % 10 === 0 ? major : minor
        const s = Math.sin(a), c = Math.cos(a)
        target.push(s * RT, 0, c * RT, s * (RT + len), 0, c * (RT + len))
      }
      const ringPts: number[] = []
      for (let k = 0; k <= 360; k++) {
        const a = (k / 360) * Math.PI * 2
        ringPts.push(Math.sin(a) * RT, 0, Math.cos(a) * RT)
      }
      const mkLines = (pts: number[]) => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
        return g
      }
      const minorMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 })
      const majorMat = new THREE.LineBasicMaterial({ transparent: true })
      const ringMat = new THREE.LineBasicMaterial({ transparent: true })
      tape.add(new THREE.LineSegments(mkLines(minor), minorMat))
      tape.add(new THREE.LineSegments(mkLines(major), majorMat))
      tape.add(new THREE.Line(mkLines(ringPts), ringMat))

      // ── Repère de craie : fixe, face au lecteur, là où passe la coupe ──
      const markMat = new THREE.MeshBasicMaterial({ fog: false })
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.42), markMat)
      mark.position.set(0, FLOOR + 0.003, RT - R + 0.18)
      scene.add(mark)

      // ── Thème ──
      const fog = new THREE.Fog(0, 6, 17)
      scene.fog = fog
      const applyTheme = () => {
        fog.color = token('--bg')
        gridMat.color = token('--hairline')
        frameMats.forEach((m) => { m.color = token('--hairline') })
        minorMat.color = token('--muted')
        majorMat.color = token('--ink')
        ringMat.color = token('--ink')
        markMat.color = token('--logo-mark')
      }
      applyTheme()
      const themeObs = new MutationObserver(applyTheme)
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
      const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
      darkMq.addEventListener('change', applyTheme)

      // ── Taille ──
      let narrow = false
      const resize = () => {
        const w = stage.clientWidth
        const h = stage.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        narrow = camera.aspect < 0.9
        // Sur écran étroit, on recule pour garder l'écran actif entier.
        camera.position.z = narrow ? 10.4 : 8.8
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(stage)

      // ── Parallaxe au pointeur (souris uniquement) ──
      const finePointer = window.matchMedia('(pointer: fine)').matches
      const pointer = { x: 0, y: 0 }
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      }
      if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true })

      // ── Boucle, active seulement à l'écran ──
      let visible = false
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop() }, { rootMargin: '100px' })
      io.observe(section)

      let p = progressRef.current
      const cam = { x: 0, y: 0.55 }
      const timer = new THREE.Timer()
      let raf = 0
      let first = true

      function frame(now: number) {
        timer.update(now)
        const dt = Math.min(timer.getDelta(), 0.05)
        const t = timer.getElapsed()
        const k = 1 - Math.exp(-dt * 5)
        p += (progressRef.current - p) * k

        planes.forEach((mesh, i) => {
          const d = i - p
          const a = d * STEP
          mesh.position.set(
            center.x + Math.sin(a) * R,
            Math.sin(t * 0.7 + i * 1.3) * 0.035,
            center.z + Math.cos(a) * R,
          )
          mesh.rotation.y = a
          const mat = mesh.material as InstanceType<typeof THREE.MeshBasicMaterial>
          mat.opacity = Math.min(1, Math.max(0, 1 - Math.max(0, Math.abs(d) - 1.15) / 1.4))
          frameMats[i].opacity = mat.opacity
          mesh.visible = mat.opacity > 0.01
        })
        tape.rotation.y = -p * STEP

        cam.x += ((finePointer ? pointer.x * 0.45 : 0) - cam.x) * k
        cam.y += ((finePointer ? 0.55 - pointer.y * 0.25 : 0.55) - cam.y) * k
        camera.position.x = cam.x
        camera.position.y = cam.y + (narrow ? 0.15 : 0)
        camera.lookAt(0, -0.15, -0.4)

        renderer.render(scene, camera)
        if (first) { first = false; setReady(true) }
      }

      function loop() {
        if (raf || disposed) return
        const tick = (now: number) => {
          raf = 0
          if (!visible || disposed || document.hidden) return
          frame(now)
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      }
      const onVisibility = () => { if (!document.hidden) loop() }
      document.addEventListener('visibilitychange', onVisibility)

      cleanup = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        ro.disconnect()
        themeObs.disconnect()
        darkMq.removeEventListener('change', applyTheme)
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('pointermove', onPointer)
        scene.traverse((o) => {
          const m = o as { geometry?: { dispose(): void }; material?: { dispose(): void; map?: { dispose(): void } | null } }
          m.geometry?.dispose()
          m.material?.map?.dispose()
          m.material?.dispose()
        })
        renderer.dispose()
        canvas.remove()
      }
    })()

    return () => { disposed = true; cleanup() }
  }, [useGl])

  return (
    <section
      id="tour"
      ref={sectionRef}
      aria-labelledby="tour-title"
      className="relative border-b border-hairline"
      style={{ height: `${N * 90 + 10}svh` }}
    >
      <h2 id="tour-title" className="sr-only">The Osho app, screen by screen</h2>

      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1360px] grid-rows-[minmax(0,1fr)_auto] px-4 sm:px-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-12">

          {/* Texte : un bloc par écran, en fondu */}
          <div className="relative order-2 h-[188px] lg:order-1 lg:h-auto lg:self-center">
            <div className="relative h-[136px] lg:h-[260px]">
              {SCREENS.map((s, i) => (
                <div
                  key={s.src}
                  aria-hidden={i !== active}
                  className={cn(
                    'absolute inset-x-0 top-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
                    i === active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
                  )}
                >
                  <p className="eyebrow">The app · {String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</p>
                  <h3 className="mt-2 serif-lg text-2xl font-semibold lg:mt-4 lg:text-4xl">{s.title}</h3>
                  <p className="mt-2 text-base text-muted lg:mt-4 lg:text-lg">{s.body}</p>
                </div>
              ))}
            </div>

            {/* Repères de progression — l'écho du stepper de l'app */}
            <div className="mt-2 flex gap-1.5 lg:mt-6" role="group" aria-label="Screens">
              {SCREENS.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Screen ${i + 1}: ${s.title}`}
                  aria-current={i === active ? 'step' : undefined}
                  className="group flex min-h-11 flex-1 items-center"
                >
                  <span
                    className={cn(
                      'block h-0.5 w-full transition-colors duration-300',
                      i === active ? 'bg-ink' : 'bg-hairline group-hover:bg-muted'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Scène */}
          <div ref={stageRef} className="relative order-1 min-h-0 lg:order-2">
            {/* Images fixes : avant que la scène soit prête, ou à sa place */}
            {SCREENS.map((s, i) => (
              <div
                key={s.src}
                className={cn(
                  'absolute inset-0 flex items-center justify-center py-6 transition-opacity duration-500 motion-reduce:transition-none',
                  (useGl ? !ready && i === 0 : i === active) ? 'opacity-100' : 'opacity-0'
                )}
              >
                <div className="relative h-full max-h-[680px] border border-hairline" style={{ aspectRatio: SCREEN_ASPECT }}>
                  <Image src={s.src} alt={s.alt} fill sizes="(min-width: 1024px) 340px, 60vw" className="object-cover" priority={i === 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
