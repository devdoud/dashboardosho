'use client'

import Image from 'next/image'
import { Star, Mail, Phone, MapPin, Instagram, Facebook, Ruler, Palette, Scissors, Radio, ShieldCheck, Package, Clock, CheckCircle, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'

// ─── Hook : détecte quand un élément entre dans le viewport ──────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── Composant d'animation au scroll ─────────────────────────────────────────
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ─── Compteur animé ───────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const { ref, visible } = useInView(0.3)
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!visible) return
    const duration = 1400
    const steps = 50
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [visible, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  ink:    '#0F0F0F',
  soft:   '#F6F6F4',
  muted:  '#7A7A7A',
  light:  '#EFEFED',
  border: '#E8E8E6',
  white:  '#FFFFFF',
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ width = 82, inverted = false }: { width?: number; inverted?: boolean }) {
  const h = Math.round(width * (95 / 284))
  return (
    <Image
      src="/logo_osho.png"
      alt="Osho"
      width={width}
      height={h}
      style={{ objectFit: 'contain', objectPosition: 'left center', filter: inverted ? 'brightness(0) invert(1)' : 'none' }}
      priority
    />
  )
}

// ─── Header (shadow au scroll) ────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header style={{
      position: 'fixed', top: 0, inset: 'auto 0 auto 0', zIndex: 200,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(18px)',
      borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
      boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
      transition: 'box-shadow .3s, border-color .3s',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo width={72} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StorePill href="https://apps.apple.com" icon="apple" />
          <StorePill href="https://play.google.com/store" icon="play" />
        </div>
      </div>
    </header>
  )
}

function StorePill({ href, icon }: { href: string; icon: 'apple' | 'play' }) {
  return <StoreBadge href={href} type={icon} compact />
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: C.white, color: C.ink, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 14, lineHeight: 1.6 }}>
      <Header />

      {/* ════ HERO ════ */}
      <section style={{
        paddingTop: 60, minHeight: '100svh', display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden',
      }}>
        {/* Fond grain très subtil */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(0,0,0,0.025) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.018,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px',
        }} />

        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center', position: 'relative', zIndex: 1 }} className="hero-grid">

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Badge pill */}
            <div className="hero-fade" style={{ animationDelay: '0ms' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                padding: '5px 12px', borderRadius: 100,
                background: C.ink, color: C.white,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                African fashion reimagined
              </span>
            </div>

            <div className="hero-fade" style={{ animationDelay: '80ms' }}>
              <h1 style={{ fontSize: 'clamp(32px,4vw,54px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', margin: 0 }}>
                African fashion
              </h1>
              <h1 style={{ fontSize: 'clamp(32px,4vw,54px)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.04em', margin: 0, color: '#C0C0C0' }}>
                custom-made,
              </h1>
              <h1 style={{ fontSize: 'clamp(32px,4vw,54px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', margin: 0 }}>
                simple and fast.
              </h1>
            </div>

            <p className="hero-fade" style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, maxWidth: 360, margin: 0, animationDelay: '160ms' }}>
              Order custom-made African clothing. Choose your fabric, embroidery and track the tailoring process in real time.
            </p>

            <div className="hero-fade" style={{ display: 'flex', gap: 8, animationDelay: '240ms' }}>
              <DlBtn href="https://play.google.com/store" icon="play" />
              <DlBtn href="https://apps.apple.com" icon="apple" />
            </div>

            {/* Social proof */}
            <div className="hero-fade" style={{ display: 'flex', alignItems: 'center', gap: 12, animationDelay: '320ms' }}>
              <AvatarRow />
              <div style={{ width: 1, height: 28, background: C.border }} />
              <div>
                <Stars n={5} size={11} />
                <p style={{ fontSize: 11, color: '#ABABAB', margin: '2px 0 0' }}>
                  <b style={{ color: '#444' }}>4.9/5</b> · 10,000+ customers
                </p>
              </div>
            </div>

            {/* Stats inline */}
            <div className="hero-fade" style={{ display: 'flex', gap: 24, paddingTop: 8, animationDelay: '400ms' }}>
              {[
                { n: '500+', l: 'Tailors' },
                { n: '50+',  l: 'Designs' },
                { n: '98%',  l: 'Satisfaction' },
              ].map(({ n, l }) => (
                <div key={l}>
                  <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{n}</p>
                  <p style={{ fontSize: 11, color: '#ABABAB', margin: '1px 0 0' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-fade phone-float" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', animationDelay: '150ms', paddingLeft: 32 }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ════ HOW ════ */}
      <Section bg={C.white}>
        <Reveal><Label>How it works</Label></Reveal>
        <Reveal delay={60}><Title>In 4 simple steps</Title></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginTop: 48, position: 'relative' }} className="steps-grid">
          {/* Ligne de connexion en pointillés */}
          <div style={{ position: 'absolute', top: 20, left: '12.5%', right: '12.5%', height: 1,
            backgroundImage: 'repeating-linear-gradient(90deg, #D1D5DB 0, #D1D5DB 6px, transparent 6px, transparent 14px)',
            zIndex: 0 }} className="steps-connector" />
          {STEPS.map(({ n, t, b }, i) => (
            <Reveal key={n} delay={i * 90}>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Numéro dans un cercle */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: i === 0 ? C.ink : C.white, border: `2px solid ${i === 0 ? C.ink : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, transition: 'background .2s' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? C.white : C.muted }}>{n}</span>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 6px' }}>{t}</p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: C.muted, margin: 0 }}>{b}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════ FEATURES ════ */}
      <Section bg={C.soft}>
        <Reveal><Label>Why Osho</Label></Reveal>
        <Reveal delay={60}><Title style={{ marginBottom: 40 }}>An experience designed for you</Title></Reveal>

        <FeaturesEditorial />
      </Section>

      {/* ════ AVIS ════ */}
      <Section bg={C.white}>
        <Reveal><Label>Testimonials</Label></Reveal>
        <Reveal delay={60}><Title style={{ marginBottom: 40 }}>They wear Osho</Title></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="reviews-grid">
          {REVIEWS.map(({ name, city, text, initials, avatarBg }, i) => (
            <Reveal key={name} delay={i * 100}>
              <div style={{ background: C.white, borderRadius: 16, padding: '28px 24px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* Guillemet décoratif */}
                <span style={{ position: 'absolute', top: 12, right: 20, fontSize: 80, lineHeight: 1, color: C.light, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none' }}>&ldquo;</span>
                <Stars n={5} size={12} />
                <p style={{ fontSize: 13, lineHeight: 1.8, color: '#555', margin: 0, flex: 1, position: 'relative' }}>{text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: `1px solid ${C.light}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 0 2px ${C.white}, 0 0 0 3px ${avatarBg}40` }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.white }}>{initials}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{name}</p>
                    <p style={{ fontSize: 11, color: '#ABABAB', margin: '1px 0 0' }}>{city}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════ DOWNLOAD ════ */}
      <section style={{ padding: '100px 24px', background: C.soft, borderBottom: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
        {/* Dégradé radial doux */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 70% at 50% 110%, rgba(0,0,0,0.04) 0%, transparent 70%)' }} />
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}>
          <Reveal><Logo width={88} /></Reveal>
          <Reveal delay={80}>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.08, margin: 0, maxWidth: 520, textAlign: 'center' }}>
              Wear African fashion<br />with pride
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: 0, maxWidth: 380, textAlign: 'center' }}>
              Download Osho for free. Your first custom-made outfit in just a few clicks.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <DlBtn href="https://play.google.com/store" icon="play" />
              <DlBtn href="https://apps.apple.com" icon="apple" />
            </div>
          </Reveal>
          <p style={{ fontSize: 11, color: '#C8C8C8', margin: 0 }}>Free · iOS &amp; Android · No ads</p>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer style={{ background: '#0A0A0A' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 72px', alignItems: 'start' }} className="footer-main-grid">

            {/* ── Gauche ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <Logo width={90} inverted />

              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.75, margin: 0, fontWeight: 400 }}>
                The first app dedicated to custom-made African fashion. Connect with the best tailors on the continent.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                  Follow us
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { label: 'Instagram', Icon: Instagram, hover: '#E1306C' },
                    { label: 'TikTok',    Icon: null,       hover: '#fff' },
                    { label: 'Facebook',  Icon: Facebook,   hover: '#1877F2' },
                  ].map(({ label, Icon, hover }) => (
                    <a key={label} href="#" aria-label={label}
                      style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', transition: 'background .2s, border-color .2s' }}
                      onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = hover; t.style.borderColor = hover; if (hover === '#fff') t.style.color = '#000' }}
                      onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'transparent'; t.style.borderColor = '#1E1E1E'; t.style.color = '#fff' }}>
                      {Icon ? <Icon size={17} /> : <TikTokIcon />}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Séparateur ── */}
            <div style={{ background: '#1A1A1A', width: 1, alignSelf: 'stretch' }} />

            {/* ── Droite : Contact ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                Contact
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <a href="mailto:contact@osho.app"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', transition: 'opacity .2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.6')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
                  <Mail size={15} color="#fff" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 400 }}>contact@osho.app</span>
                </a>

                <a href="tel:+12125551234"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', transition: 'opacity .2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.6')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
                  <Phone size={15} color="#fff" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 400 }}>+1 (212) 555-1234</span>
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MapPin size={15} color="#fff" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 400 }}>Sioux City, Iowa, United States</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Copyright ── */}
        <div style={{ borderTop: '1px solid #131313', padding: '20px 24px' }}>
          <p style={{ maxWidth: 1080, margin: '0 auto', fontSize: 12, color: '#333', textAlign: 'center' }}>
            © {new Date().getFullYear()} Osho — African Fashion Custom-Made. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ─── Responsive ─── */}
      <style>{`
        * { box-sizing: border-box; }

        /* ── Entrée hero au chargement ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-fade {
          opacity: 0;
          animation: fadeUp 0.65s ease forwards;
        }

        /* ── Flottement continu du téléphone ── */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .phone-float {
          animation: fadeUp 0.65s ease 150ms forwards,
                     float 5s ease-in-out 900ms infinite;
        }

        /* ── Pulse discret sur les badges flottants ── */
        @keyframes pulseShadow {
          0%, 100% { box-shadow: 0 4px 18px rgba(0,0,0,0.07); }
          50%       { box-shadow: 0 10px 32px rgba(0,0,0,0.14); }
        }
        .badge-pulse {
          animation: pulseShadow 3.5s ease-in-out infinite;
        }
        @media (max-width: 900px) {
          .hero-grid           { grid-template-columns: 1fr !important; gap: 48px !important; }
          .stats-grid          { grid-template-columns: 1fr 1fr !important; }
          .stats-grid > div    { border-right: none !important; border-bottom: 1px solid #E8E8E6 !important; }
          .steps-grid          { grid-template-columns: 1fr 1fr !important; }
          .products-grid       { grid-template-columns: 1fr 1fr !important; }
          .features-grid       { grid-template-columns: 1fr 1fr !important; }
          .features-editorial  { grid-template-columns: 1fr !important; }
          .steps-connector     { display: none !important; }
          .reviews-grid        { grid-template-columns: 1fr !important; }
          .footer-main-grid    { grid-template-columns: 1fr !important; gap: 40px !important; }
          .footer-main-grid > div:nth-child(2) { display: none !important; }
          .footer-contact-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .steps-grid    { grid-template-columns: 1fr !important; }
          .products-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .footer-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Section({ children, bg, center }: { children: React.ReactNode; bg: string; center?: boolean }) {
  return (
    <section style={{ padding: '80px 24px', background: bg, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', ...(center ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : {}) }}>
        {children}
      </div>
    </section>
  )
}

function Label({ children }: { children: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#BEBEBE', margin: '0 0 8px' }}>{children}</p>
}

function Title({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, margin: 0, ...style }}>{children}</h2>
}

function Stars({ n, size }: { n: number; size: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => <Star key={i} size={size} fill={C.ink} color={C.ink} />)}
    </div>
  )
}

function AvatarRow() {
  return (
    <div style={{ display: 'flex' }}>
      {['#3A3A3A','#4A3020','#1E3A4A','#2A3E20','#3A2A40'].map((bg, i) => (
        <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: bg, border: `2px solid ${C.white}`, marginLeft: i > 0 ? -7 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: C.white }}>
          {['A','F','K','M','S'][i]}
        </div>
      ))}
    </div>
  )
}

function DlBtn({ href, icon }: { href: string; icon: 'apple' | 'play' }) {
  return <StoreBadge href={href} type={icon} />
}


function PhoneFrame({ scale = 1, shadow = '0 32px 80px rgba(0,0,0,0.22)', src = '/app-screenshot.png', reflection = false }: { scale?: number; shadow?: string; src?: string; reflection?: boolean }) {
  const w      = Math.round(238 * scale)
  const frame  = Math.round(256 * scale)
  const pad    = Math.round(11 * scale)
  const padH   = Math.round(9 * scale)
  const br     = Math.round(44 * scale)
  const brInner = Math.round(34 * scale)
  const notchW = Math.round(68 * scale)
  const notchH = Math.round(19 * scale)
  return (
    <div style={{ width: frame, borderRadius: br, background: 'linear-gradient(160deg,#1c1c1c 0%,#0e0e0e 100%)', padding: `${pad}px ${padH}px`, boxShadow: `${shadow}, 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)`, position: 'relative', flexShrink: 0 }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: pad, left: '50%', transform: 'translateX(-50%)', width: notchW, height: notchH, background: '#0e0e0e', borderRadius: `0 0 ${Math.round(11 * scale)}px ${Math.round(11 * scale)}px`, zIndex: 10 }} />
      {/* Boutons physiques */}
      <div style={{ position: 'absolute', left: -2, top: Math.round(88  * scale), width: 2, height: Math.round(24 * scale), background: '#2a2a2a', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: -2, top: Math.round(122 * scale), width: 2, height: Math.round(44 * scale), background: '#2a2a2a', borderRadius: 2 }} />
      <div style={{ position: 'absolute', right:-2, top: Math.round(108 * scale), width: 2, height: Math.round(54 * scale), background: '#2a2a2a', borderRadius: 2 }} />
      {/* Écran */}
      <div style={{ borderRadius: brInner, overflow: 'hidden', lineHeight: 0, position: 'relative' }}>
        <Image src={src} alt="App Osho" width={w} height={Math.round(516 * scale)} style={{ width: '100%', height: 'auto', display: 'block' }} priority />
        {/* Reflet écran */}
        {reflection && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, transparent 65%)', pointerEvents: 'none', borderRadius: brInner }} />
        )}
      </div>
    </div>
  )
}

/* Badge glass partagé */
function FloatingBadge({ style, delay, children }: { style?: CSSProperties; delay?: string; children: ReactNode }) {
  return (
    <div
      className="badge-pulse"
      style={{
        position: 'absolute', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 13px', borderRadius: 14,
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 6px 28px rgba(0,0,0,0.09), 0 0 0 1px rgba(255,255,255,0.95)',
        animationDelay: delay,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 380, height: 620 }}>

      {/* ── Blob de lumière dorée derrière tout ── */}
      <div style={{
        position: 'absolute',
        width: 420, height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(217,169,99,0.20) 0%, rgba(217,169,99,0.06) 50%, transparent 72%)',
        filter: 'blur(32px)',
        top: '50%', left: '50%',
        transform: 'translate(-46%, -50%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* ── Téléphone arrière — perspective 3D ── */}
      <div style={{
        position: 'absolute', top: 50, left: 0,
        transform: 'perspective(900px) rotateY(16deg) rotateZ(-3deg) translateX(-8px)',
        transformOrigin: 'bottom center',
        zIndex: 1, opacity: 0.68,
        filter: 'brightness(0.62) saturate(0.85)',
      }}>
        <PhoneFrame scale={0.83} shadow="0 24px 60px rgba(0,0,0,0.28)" src="/screenshot2.png" />
      </div>

      {/* ── Téléphone principal — devant ── */}
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
        <PhoneFrame scale={0.97} reflection />
      </div>

      {/* Badge haut-gauche — Live tracking */}
      <FloatingBadge style={{ left: -24, top: 64, width: 162 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={15} color="#D97706" />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#1A1818' }}>Live tracking</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', margin: '1px 0 0' }}>In production...</p>
        </div>
      </FloatingBadge>

      {/* Badge bas-droit — Delivered */}
      <FloatingBadge style={{ right: -24, bottom: 100, width: 156 }} delay="2.5s">
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle size={15} color="#059669" />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#1A1818' }}>Delivered!</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', margin: '1px 0 0' }}>Custom Boubou</p>
        </div>
      </FloatingBadge>

      {/* Badge bas-gauche — Note app */}
      <FloatingBadge style={{ left: -10, bottom: 72, width: 128 }} delay="1.2s">
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={15} color="#F59E0B" fill="#F59E0B" />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#1A1818' }}>4.9 / 5.0</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', margin: '1px 0 0' }}>2 400+ avis</p>
        </div>
      </FloatingBadge>
    </div>
  )
}

// ─── TikTok icon ─────────────────────────────────────────────────────────────
// ─── Features editorial layout ───────────────────────────────────────────────
function FeaturesEditorial() {
  const f0 = FEATURES[0]
  const HeroIcon = f0.icon
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="features-editorial">
      {/* Grande carte sombre — feature principale */}
      <Reveal>
        <div style={{ padding: '36px 32px', background: C.ink, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', transition: 'transform .2s', cursor: 'default' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: f0.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeroIcon size={22} color={f0.iconColor} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.white }}>{f0.title}</p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{f0.body}</p>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Core feature</span>
        </div>
      </Reveal>

      {/* 5 petites cartes en grille 2×3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {FEATURES.slice(1).map(({ icon: Icon, iconBg, iconColor, title, body }, i) => (
          <Reveal key={title} delay={i * 60}>
            <div style={{ padding: '22px 18px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', transition: 'box-shadow .2s, transform .2s', cursor: 'default' }}
              onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'; t.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.boxShadow = 'none'; t.style.transform = 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={iconColor} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>{title}</p>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: C.muted, margin: 0 }}>{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  )
}

// ─── Badges stores officiels ──────────────────────────────────────────────────

function StoreBadge({ href, type, compact = false }: { href: string; type: 'apple' | 'play'; compact?: boolean }) {
  const h = compact ? 34 : 44
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', lineHeight: 0, borderRadius: compact ? 7 : 10, overflow: 'hidden', transition: 'opacity .15s, transform .15s', boxShadow: compact ? 'none' : '0 2px 10px rgba(0,0,0,0.15)' }}
      onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.opacity = '0.85'; if (!compact) t.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.opacity = '1'; t.style.transform = 'none' }}>
      {type === 'apple' ? <AppleBadgeSvg height={h} /> : <PlayBadgeSvg height={h} />}
    </a>
  )
}

// Badge App Store — SVG officiel Apple
function AppleBadgeSvg({ height }: { height: number }) {
  const w = Math.round(height * 2.98)
  return (
    <svg width={w} height={height} viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" rx="7" fill="#000"/>
      <rect width="119" height="39" rx="6.5" x="0.5" y="0.5" fill="none" stroke="#A6A6A6" strokeWidth="1"/>
      {/* Apple logo */}
      <path d="M24.77 20.3a4.96 4.96 0 0 1 2.37-4.17 5.1 5.1 0 0 0-4.02-2.17c-1.7-.18-3.33 1.01-4.2 1.01-.87 0-2.2-.99-3.62-.96a5.35 5.35 0 0 0-4.51 2.75c-1.95 3.38-.5 8.35 1.38 11.08.93 1.34 2.03 2.83 3.47 2.78 1.4-.06 1.93-.9 3.62-.9 1.68 0 2.18.9 3.65.87 1.5-.03 2.46-1.34 3.36-2.7a11.1 11.1 0 0 0 1.53-3.13 4.8 4.8 0 0 1-2.93-4.46z" fill="#fff"/>
      <path d="M22.1 12.21a4.9 4.9 0 0 0 1.12-3.51 4.99 4.99 0 0 0-3.23 1.67 4.67 4.67 0 0 0-1.15 3.38 4.13 4.13 0 0 0 3.26-1.54z" fill="#fff"/>
      {/* Texte */}
      <text x="35" y="14" fill="#fff" fontSize="7" fontFamily="Arial,sans-serif" letterSpacing="0.2">Download on the</text>
      <text x="35" y="26" fill="#fff" fontSize="13.5" fontFamily="Arial,sans-serif" fontWeight="bold" letterSpacing="-0.3">App Store</text>
    </svg>
  )
}

// Badge Google Play — SVG officiel Google
function PlayBadgeSvg({ height }: { height: number }) {
  const w = Math.round(height * 3.35)
  return (
    <svg width={w} height={height} viewBox="0 0 134 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="134" height="40" rx="7" fill="#000"/>
      <rect width="133" height="39" rx="6.5" x="0.5" y="0.5" fill="none" stroke="#A6A6A6" strokeWidth="1"/>
      {/* Icône Google Play — triangle 4 couleurs */}
      <g transform="translate(11, 8)">
        {/* Vert — bas gauche */}
        <path d="M0.5 22.5 L11.5 12 L0.5 1.5 C0 2 0 22 0.5 22.5Z" fill="#32BBFF"/>
        {/* Bleu — gauche */}
        <path d="M0.5 1.5 L11.5 12 L15.5 8 L3 0.5 C2 0 1 0.5 0.5 1.5Z" fill="#32BBFF"/>
        {/* Jaune — haut */}
        <path d="M11.5 12 L20 16.5 L16.5 15 L15.5 8 Z" fill="#FFD900"/>
        {/* Vert foncé */}
        <path d="M0.5 22.5 C1 23.5 2 24 3 23.5 L15.5 16 L11.5 12 Z" fill="#00D8FF"/>
        {/* Rouge */}
        <path d="M15.5 16 L20 16.5 L20 15.5 L16.5 15 Z" fill="#FF3333"/>
        {/* Vrai rendu 4 couleurs net */}
        <path d="M1.5 1.2 C0.7 1.6 0 2.4 0 3.5 L0 20.5 C0 21.6 0.7 22.4 1.5 22.8 L13 12 Z" fill="#00B0FF"/>
        <path d="M21.5 11 L16.5 8.2 L13 12 L16.5 15.8 L21.5 13 C22.5 12.5 22.5 11.5 21.5 11Z" fill="#FFCC00"/>
        <path d="M1.5 22.8 C2 23.1 2.6 23.1 3.2 22.8 L16.5 15.8 L13 12 Z" fill="#00F076"/>
        <path d="M3.2 1.2 L16.5 8.2 L13 12 L1.5 1.2 C2 0.9 2.7 0.9 3.2 1.2Z" fill="#FF3D00"/>
      </g>
      {/* Texte */}
      <text x="42" y="14" fill="#fff" fontSize="7" fontFamily="Arial,sans-serif" letterSpacing="0.2">GET IT ON</text>
      <text x="42" y="26" fill="#fff" fontSize="13.5" fontFamily="Arial,sans-serif" fontWeight="bold" letterSpacing="-0.3">Google Play</text>
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', t: 'Choose',      b: 'Browse the collection and pick your favorite African design.' },
  { n: '02', t: 'Customize',   b: 'Select fabric, embroidery and finishes. Add your measurements for a perfect fit.' },
  { n: '03', t: 'Tailoring',   b: 'A certified tailor handles your order in real time, step by step.' },
  { n: '04', t: 'Receive',     b: 'Your creation is delivered to your door, carefully and securely packaged.' },
]

const PRODUCTS = [
  { name: 'Thiop Royal Prestige', price: '$358', category: 'Couple', bg: '#EDE0D4', badge: '⭐ Vedette' },
  { name: 'Royale Kaftan VIP',    price: '$390', category: 'Woman',  bg: '#EDE8DC', badge: null },
  { name: 'Grand Boubou Bazin',   price: '$275', category: 'Man',    bg: '#D8E4ED', badge: 'Nouveau' },
  { name: 'Ensemble Wax Couple',  price: '$520', category: 'Couple', bg: '#E8E0D4', badge: '🔥 Top vente' },
  { name: 'Caftan Brodé Premium', price: '$445', category: 'Woman',  bg: '#EDE0DC', badge: null },
  { name: 'Agbada Prestige',      price: '$310', category: 'Man',    bg: '#D8EDE4', badge: null },
]

const FEATURES = [
  { icon: Ruler,      iconBg: '#EFF6FF', iconColor: '#3B82F6', title: 'Precise measurements',   body: 'Save your profile once. Every garment tailored exactly to your body dimensions.' },
  { icon: Palette,    iconBg: '#FFF7ED', iconColor: '#F97316', title: 'Full customization',      body: 'Fabric, embroidery, finishes — endless combinations for a 100% unique outfit.' },
  { icon: Scissors,   iconBg: '#F5F3FF', iconColor: '#8B5CF6', title: 'Certified tailors',       body: 'Every craftsman is carefully selected and rated. Authentic African expertise guaranteed.' },
  { icon: Radio,      iconBg: '#ECFDF5', iconColor: '#10B981', title: 'Real-time tracking',      body: 'Instant notifications at every step of the tailoring. Stay informed throughout.' },
  { icon: ShieldCheck,iconBg: '#FFF1F2', iconColor: '#F43F5E', title: 'Secure payment',          body: 'Card or mobile money. Funds released only upon your delivery confirmation.' },
  { icon: Package,    iconBg: '#FFFBEB', iconColor: '#D97706', title: 'Careful delivery',        body: 'Premium packaging for every shipment. Your creation deserves to arrive perfectly.' },
]

const REVIEWS = [
  { name: 'Aminata D.',  city: 'Dakar, Senegal',       initials: 'AD', avatarBg: '#8B5CF6', text: 'My wedding boubou was absolutely perfect. The tailor followed my instructions to the letter. The live tracking was truly reassuring.' },
  { name: 'Kofi Mensah', city: 'Accra, Ghana',          initials: 'KM', avatarBg: '#0EA5E9', text: 'Incredible to watch your Kente outfit being made step by step from your phone. Top quality. Flawless service throughout.' },
  { name: 'Fatou Baldé', city: "Abidjan, Côte d'Ivoire",initials: 'FB', avatarBg: '#F59E0B', text: 'Finally an app that truly celebrates African fashion. The customization options are endless. My kaftan is exactly what I imagined.' },
]
