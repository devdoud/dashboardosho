import type { Metadata } from 'next'
import { LogoMark } from '@/components/brand/logo'
import { DownloadButton } from '@/components/landing/download-button'
import { Phone } from '@/components/landing/phone'
import { Photo, type PhotoName } from '@/components/landing/photo'
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome'
import { TapeDemo } from '@/components/landing/tape-demo'
import { LandingShell } from '@/components/landing/shell'
import { APP_STORE_URL, CONTACT_EMAIL, LOCATION, PLAY_STORE_URL } from '@/components/landing/site'
import s from '@/components/landing/landing.module.css'

export const metadata: Metadata = {
  title: { absolute: 'Osho · Cut to your body, not a size' },
  description:
    'Bazin, Vlisco and wax, sewn to your measurements by West African tailors and delivered to your door. ' +
    'Your height and weight are enough for 13 measurements. Based in Sioux City, Iowa.',
  openGraph: {
    type: 'website',
    siteName: 'Osho',
    locale: 'en_US',
    title: 'Osho · Cut to your body, not a size',
    description: 'Made-to-measure West African fashion, sewn to your measurements. Based in Sioux City, Iowa.',
  },
  twitter: { card: 'summary_large_image' },
}

export default function LandingPage() {
  return (
    <LandingShell>
      <SiteHeader />

      <main id="content">
        <Hero />
        <Facts />
        <HowItWorks />
        <Lookbook />
        <Fabrics />
        <Story />
        <Faq />
        <Download />
      </main>

      <SiteFooter />
    </LandingShell>
  )
}

// ─── 1. Visuel principal ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={`${s.container} ${s.heroGrid}`}>
        <div className={s.heroText}>
          <p className={s.label}>Made to measure · {LOCATION}</p>
          <h1 id="hero-title" className={s.h1}>
            Cut to{' '}
            <span className={s.nowrap}>
              <span className={s.keyword}>
                your body
                <svg className={s.chalkStroke} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 9 L197 4" pathLength={1} />
                </svg>
              </span>
              ,
            </span>{' '}
            not a size
          </h1>
          <p className={s.lead}>
            Bazin, Vlisco and wax, sewn to your measurements by West African tailors, then
            delivered to your door. No tape measure, no fitting room.
          </p>
          <div className={s.heroActions}>
            <DownloadButton appStoreUrl={APP_STORE_URL} playStoreUrl={PLAY_STORE_URL} className={s.btnPrimary}>
              Get the app
            </DownloadButton>
            <a href="#how-it-works" className={s.textLink}>See how it works</a>
          </div>
        </div>

        <div className={s.heroVisual}>
          <div className={s.heroPhotoFrame}>
            <Photo
              name="hero-couple"
              priority
              sizes="(min-width: 900px) 520px, 92vw"
              alt="A couple in matching olive-green traditional outfits with gold embroidery, standing in a dark studio."
              className={s.heroPhoto}
            />
          </div>
          {/* Écran recadré : on montre le profil de mesures et les nouveautés,
              pas l'accroche, déjà en titre à gauche. */}
          <Phone
            name="01_home"
            priority
            crop="bottom"
            sizes="(min-width: 900px) 190px, 150px"
            className={s.heroPhone}
            alt="The Osho app: the measurement profile card, the Couple, Woman and Man filters, and new arrivals."
          />
        </div>
      </div>
    </section>
  )
}

// ─── Repères ──────────────────────────────────────────────────────────────────

function Facts() {
  const facts = [
    { value: '13', text: 'measurements from your height and weight' },
    { value: '±1–2 cm', text: 'accuracy with one front photo' },
    { value: '1 min', text: 'to rescan when your body changes' },
    { value: '3', text: 'collections: couple, women, men' },
  ]
  return (
    <section className={s.facts} aria-label="Osho in numbers">
      <ul className={`${s.container} ${s.factsList}`}>
        {facts.map((f) => (
          <li key={f.text}>
            <span className={s.factValue}>{f.value}</span>
            <span className={s.factText}>{f.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── 2. Comment ça marche ─────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Enter your height and weight',
    text: (
      <>
        You get all <span className={s.mono}>13</span> measurements at once, accurate to{' '}
        <span className={s.mono}>±3–4&nbsp;cm</span>.
      </>
    ),
  },
  {
    title: 'Add a front photo',
    text: (
      <>
        One photo sharpens them to <span className={s.mono}>±1–2&nbsp;cm</span>. No one needs to
        help you.
      </>
    ),
  },
  {
    title: 'Order, again and again',
    text: <>Your profile is saved once and used for every order. Add a second one for someone close.</>,
  },
] as const

function HowItWorks() {
  return (
    <section id="how-it-works" className={s.section} aria-labelledby="how-title">
      <div className={`${s.container} ${s.howGrid}`}>
        <div data-reveal>
          <p className={s.label}>How it works</p>
          <h2 id="how-title" className={s.h2}>Your measurements, without a tape measure</h2>
          <ol className={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={s.step}>
                <span className={s.stepIndex}>
                  <span className={s.mono}>{String(i + 1).padStart(2, '0')}</span>
                </span>
                <div>
                  <h3 className={s.h3}>{step.title}</h3>
                  <p className={s.body}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className={s.howVisual} data-reveal>
          <TapeDemo />
        </div>
      </div>
    </section>
  )
}

// ─── 3. Inspiration ───────────────────────────────────────────────────────────

const LOOKS: { name: PhotoName; tag: string; alt: string }[] = [
  { name: 'look-women', tag: 'Women', alt: 'A woman in an olive-green fitted gown with long flared sleeves and a matching gele.' },
  { name: 'look-men', tag: 'Men', alt: 'A man in a flowing olive-green agbada and cap, holding a carved cane.' },
  { name: 'look-ceremony', tag: 'Ceremony', alt: 'A woman in an orange and gold ceremony outfit with coral beads, holding a clutch.' },
  { name: 'look-evening', tag: 'Evening', alt: 'A woman in a fitted bronze sequined gown and a gold gele, on a warm brown backdrop.' },
]

function Lookbook() {
  return (
    <section id="looks" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="looks-title">
      <div className={s.container}>
        <div className={s.sectionHeadRow} data-reveal>
          <div className={s.sectionHead}>
            <p className={s.label}>Inspiration</p>
            <h2 id="looks-title" className={s.h2}>Looks for every occasion</h2>
          </div>
          <p className={s.body}>
            The full catalogue (couple, women, men) is in the app. Every design shows its tailoring
            time before you order, for example <span className={s.mono}>14&nbsp;days</span>.
          </p>
        </div>
        <ul className={s.looks} data-reveal>
          {LOOKS.map((look) => (
            <li key={look.name} className={s.look}>
              <Photo name={look.name} alt={look.alt} sizes="(min-width: 900px) 280px, 46vw" />
              <span className={s.lookTag}>{look.tag}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─── 4. Tissus ────────────────────────────────────────────────────────────────

const FABRICS: { name: PhotoName; title: string; text: string; alt: string }[] = [
  {
    name: 'fabric-bazin',
    title: 'Bazin',
    text: 'A polished cotton damask with a deep sheen, often finished with embroidery.',
    alt: 'Close-up of a draped damask fabric with a woven floral pattern and a soft sheen.',
  },
  {
    name: 'fabric-vlisco',
    title: 'Vlisco',
    text: 'Premium wax prints known for bold colors and storytelling patterns.',
    alt: 'Close-up of a wax print with gold and orange medallions outlined in navy.',
  },
  {
    name: 'fabric-wax',
    title: 'Wax',
    text: 'Classic West African prints, crisp and colorful, for every day and every party.',
    alt: 'Folded wax-print fabrics stacked in bright patterns.',
  },
]

function Fabrics() {
  return (
    <section id="fabrics" className={s.section} aria-labelledby="fabrics-title">
      <div className={s.container}>
        <div className={s.sectionHead} data-reveal>
          <p className={s.label}>Fabrics</p>
          <h2 id="fabrics-title" className={s.h2}>Choose the fabric, we cut it to you</h2>
        </div>
        <ul className={s.fabrics} data-reveal>
          {FABRICS.map((f) => (
            <li key={f.name} className={s.fabric}>
              <Photo name={f.name} alt={f.alt} sizes="(min-width: 760px) 360px, 92vw" className={s.fabricPhoto} />
              <h3 className={s.h3}>{f.title}</h3>
              <p className={s.body}>{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─── 5. Histoire et livraison ─────────────────────────────────────────────────
// Aucun prix ni frais de livraison sur cette page.

function Story() {
  const stages = [
    { title: 'Order', text: 'Pay by card, securely, with Stripe.' },
    { title: 'Tailoring', text: 'Sewn to your measurements, within the time shown on the design.' },
    { title: 'Shipping', text: 'Checked, folded and packed with care.' },
    { title: 'Delivery', text: 'At the address of your choice.' },
  ]
  return (
    <section id="story" className={`${s.section} ${s.sectionInk}`} aria-labelledby="story-title">
      <div className={`${s.container} ${s.storyGrid}`}>
        <div className={s.storyPhotoWrap} data-reveal>
          <Photo
            name="story-tailor"
            alt="A tailor at his sewing machine in a workshop, garments hanging behind him."
            sizes="(min-width: 900px) 480px, 92vw"
            className={s.storyPhoto}
          />
        </div>
        <div data-reveal>
          <p className={s.labelOnInk}>Our story</p>
          <h2 id="story-title" className={s.h2}>Based in Sioux City. Sewn by West African tailors.</h2>
          <p className={s.bodyOnInk}>
            Osho brings the craft of West African tailoring to your door. You choose the design and
            the fabric, your profile carries your measurements, and a tailor sews your outfit for you
            alone.
          </p>
          <ol className={s.stages}>
            {stages.map((stage, i) => (
              <li key={stage.title}>
                <span className={s.mono}>{String(i + 1).padStart(2, '0')}</span>
                <span className={s.stageTitle}>{stage.title}</span>
                <span className={s.stageText}>{stage.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

// ─── 6. Questions fréquentes ──────────────────────────────────────────────────
// Réponses limitées à ce que l'app fait vraiment : aucune promesse de délai de
// retouche ni de durée de conservation qui ne soit pas écrite ailleurs.

function Faq() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: 'How accurate are measurements without a tape measure?',
      a: (
        <>
          With your height and weight, to <span className={s.mono}>±3–4&nbsp;cm</span>. A front
          photo sharpens them to <span className={s.mono}>±1–2&nbsp;cm</span>. You can rescan at
          any time.
        </>
      ),
    },
    {
      q: 'How long until I receive my outfit?',
      a: (
        <>
          The tailoring time is shown on each design (for example{' '}
          <span className={s.mono}>14&nbsp;days</span>). Delivery comes on top of that.
        </>
      ),
    },
    {
      q: 'Where are you based?',
      a: <>In {LOCATION}. Orders are delivered to the address of your choice.</>,
    },
    { q: 'How do I pay?', a: <>By card, securely, with Stripe. Osho never sees or stores your card number.</> },
    {
      q: "What if the outfit doesn't fit perfectly?",
      a: (
        <>
          Write to us at <a href={`mailto:${CONTACT_EMAIL}`} className={s.inlineLink}>{CONTACT_EMAIL}</a>{' '}
          with a few photos. We look at it with your tailor and find a solution with you.
        </>
      ),
    },
    {
      q: 'Can I order for someone else?',
      a: <>Yes: create a second measurement profile for a relative, or for matching couple outfits.</>,
    },
    {
      q: 'What happens to my front photo?',
      a: (
        <>
          It is used only to estimate your measurements. Read how we handle it in our{' '}
          <a href="/legal/privacy" className={s.inlineLink}>privacy policy</a>.
        </>
      ),
    },
  ]

  return (
    <section id="faq" className={s.section} aria-labelledby="faq-title">
      <div className={`${s.container} ${s.faqGrid}`}>
        <div className={s.faqSide} data-reveal>
          <p className={s.label}>FAQ</p>
          <h2 id="faq-title" className={s.h2}>Before you order</h2>
          <div className={s.contactCard}>
            <p className={s.contactTitle}>Still have a question?</p>
            <p className={s.body}>Write to us, we&apos;re happy to help.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={s.textLink}>{CONTACT_EMAIL}</a>
          </div>
        </div>
        <div className={s.faq} data-reveal>
          {items.map(({ q, a }) => (
            <details key={q} className={s.faqItem}>
              <summary>
                <span>{q}</span>
                <svg className={s.faqIcon} viewBox="0 0 16 16" aria-hidden>
                  <path d="M8 2v12M2 8h12" />
                </svg>
              </summary>
              <p className={s.body}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 7. Téléchargement ────────────────────────────────────────────────────────

/**
 * Badges officiels des magasins (public/badges/). Apple et Google imposent
 * leurs couleurs : exception assumée à la palette.
 */
function StoreBadge({ src, alt, href, store }: { src: string; alt: string; href: string | null; store: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG vectoriel
  const img = <img src={src} alt={href ? alt : ''} width={169} height={50} loading="lazy" className={s.badgeImg} />
  if (href) {
    return (
      <a href={href} className={s.badge} target="_blank" rel="noopener noreferrer">
        {img}
      </a>
    )
  }
  return (
    <span className={s.badgePending}>
      {img}
      <span className={s.badgeNote}>{store} · coming soon</span>
    </span>
  )
}

function Download() {
  const live = Boolean(APP_STORE_URL || PLAY_STORE_URL)
  return (
    <section id="download" className={`${s.section} ${s.sectionTight}`} aria-labelledby="download-title">
      <div className={s.container}>
        <div className={s.downloadCard} data-reveal>
          <div className={`${s.tape} ${s.downloadTape}`} aria-hidden />
          <div className={s.downloadText}>
            <LogoMark size={40} />
            <h2 id="download-title" className={s.h2}>
              Your next outfit starts with your measurements.
            </h2>
            <p className={s.body}>
              {live
                ? 'Download Osho, save your profile once, and choose your fabric. Your tailor does the rest.'
                : 'Osho is coming to the App Store and Google Play. Until then, we are happy to answer your questions or help with a special request.'}
            </p>
            {!live && (
              <a href={`mailto:${CONTACT_EMAIL}?subject=Osho`} className={`${s.btnPrimary} ${s.downloadAction}`}>
                Email us
              </a>
            )}
          </div>
          <div className={s.badges}>
            <StoreBadge src="/badges/app-store.svg" alt="Download on the App Store" href={APP_STORE_URL} store="App Store" />
            <StoreBadge src="/badges/google-play.svg" alt="Get it on Google Play" href={PLAY_STORE_URL} store="Google Play" />
          </div>
        </div>
      </div>
    </section>
  )
}
