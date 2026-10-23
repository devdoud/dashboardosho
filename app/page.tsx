import Image from 'next/image'
import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ArrowRight, Mail, MapPin } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { formatUsdFromXof, getXofPerUsd } from '@/lib/currency'
import { AtelierTour } from '@/components/landing/atelier-tour'
import type { Database } from '@/types/database'

// Le catalogue change peu : on régénère la page au plus toutes les heures.
export const revalidate = 3600

// Liens magasins : à remplacer par les fiches de l'app une fois publiées.
const APP_STORE_URL = 'https://apps.apple.com'
const PLAY_STORE_URL = 'https://play.google.com/store'

// ─── Données ──────────────────────────────────────────────────────────────────

interface Piece {
  id: string
  name: string
  image: string
  price: string | null
}

/** Nom lisible, anglais d'abord (langue par défaut de la landing). */
function labelEn(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try { return labelEn(JSON.parse(value)) } catch { /* texte brut */ }
    }
    return value
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    return String(v.en ?? v.fr ?? '')
  }
  return ''
}

/**
 * Pièces mises en avant, lues avec la clé anon (policy `products_public_read`).
 * Client sans cookies : la page reste statique et régénérée périodiquement.
 * En cas d'erreur ou d'absence de configuration, la page tient sans photos.
 */
async function getFeaturedPieces(): Promise<Piece[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  try {
    const supabase = createSupabaseClient<Database>(url, key, { auth: { persistSession: false } })
    const { data } = await supabase
      .from('products')
      .select('id, name, price, thumbnail, images, is_featured, created_at')
      .not('thumbnail', 'is', null)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(7)

    const rate = getXofPerUsd()
    return (data ?? [])
      .map((p) => ({
        id: p.id,
        name: labelEn(p.name),
        image: p.thumbnail ?? (p.images ?? [])[0] ?? '',
        price: formatUsdFromXof(p.price, rate),
      }))
      .filter((p) => p.image && p.name)
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const pieces = await getFeaturedPieces()
  const [hero, ...collection] = pieces

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader hasCollection={collection.length > 0} />

      <main>
        {/* ════ Héros : une pièce, un titre ════ */}
        <section className="border-b border-hairline">
          <div className={`mx-auto grid max-w-[1360px] gap-10 px-4 py-12 sm:px-8 md:py-20 ${hero ? 'lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16' : ''}`}>
            <div className="max-w-xl">
              <p className="eyebrow">Made-to-measure · West Africa</p>
              <h1 className="mt-5 serif-lg text-4xl font-semibold md:text-5xl">
                Cut to your measurements. Sewn by hand in West&nbsp;Africa.
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted">
                Boubou, agbada and kaftan in bazin, Vlisco and wax — made by a tailor
                for you alone. Save your measurements once; every order is cut from them.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <StoreLink href={APP_STORE_URL} primary>Download for iPhone</StoreLink>
                <StoreLink href={PLAY_STORE_URL}>Get it on Android</StoreLink>
              </div>
              <p className="mt-4 text-sm text-muted">Priced at the atelier, charged in US dollars.</p>
            </div>

            {hero && (
              <figure className="w-full">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-placeholder">
                  <Image
                    src={hero.image}
                    alt={hero.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
                  <span className="text-base font-medium">{hero.name}</span>
                  {hero.price && <PriceTag value={hero.price} />}
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        {/* ════ La collection : les photos portent la page ════ */}
        {collection.length > 0 && (
          <section id="collection" className="border-b border-hairline">
            <div className="mx-auto max-w-[1360px] px-4 py-16 sm:px-8 md:py-24">
              <SectionHeading eyebrow="The collection" title="Pieces our tailors are cutting now" />
              <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8">
                {collection.map((p) => (
                  <li key={p.id}>
                    <figure>
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-placeholder">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(min-width: 768px) 33vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                      <figcaption className="mt-3 space-y-0.5">
                        <p className="text-base font-medium leading-snug">{p.name}</p>
                        {p.price && <PriceTag value={p.price} prefix="From" />}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-md text-muted">
                Every piece is ordered and tracked in the Osho app.{' '}
                <a href="#download" className="inline-flex min-h-11 items-center gap-1 font-medium text-accent underline-offset-4 hover:underline">
                  Get the app <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </a>
              </p>
            </div>
          </section>
        )}

        {/* ════ L'app, écran par écran — en 3D ════ */}
        <AtelierTour />

        {/* ════ Mesures : un tableau de valeurs, pas des cartes ════ */}
        <section id="measurements" className="border-b border-hairline">
          <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-16 sm:px-8 md:py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow="Your measurements" title="Measured once. Every order cut from it." />
              <p className="mt-5 max-w-md text-base text-muted">
                A guided tutorial walks you through each measurement. Your profile is kept in the app
                and sent with every order, so your tailor cuts to your body — not to a size chart.
              </p>
            </div>
            <dl className="grid border-t border-hairline sm:grid-cols-2 sm:gap-x-10">
              {MEASUREMENTS.map(([label, detail]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-hairline py-[11px]">
                  <dt className="text-base">{label}</dt>
                  <dd className="text-sm text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ════ Témoignages ════ */}
        <section className="border-b border-hairline">
          <div className="mx-auto max-w-[1360px] px-4 py-16 sm:px-8 md:py-24">
            <SectionHeading eyebrow="Testimonials" title="They wear Osho" />
            <ul className="mt-10 grid border-t border-hairline md:grid-cols-3">
              {REVIEWS.map(({ name, city, text }, i) => (
                <li
                  key={name}
                  className={`border-b border-hairline py-8 md:pr-8 ${i > 0 ? 'md:border-l md:pl-8' : ''}`}
                >
                  <figure>
                    <blockquote className="serif-md text-xl leading-snug">
                      &ldquo;{text}&rdquo;
                    </blockquote>
                    <figcaption className="mt-5 text-md">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted"> · {city}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════ Téléchargement ════ */}
        <section id="download" className="border-b border-hairline">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start gap-6 px-4 py-16 sm:px-8 md:items-center md:py-24 md:text-center">
            <LogoMark size={40} />
            <h2 className="max-w-2xl serif-lg text-3xl font-semibold md:text-4xl">
              Your first piece, cut for you.
            </h2>
            <p className="max-w-md text-base text-muted">
              Download Osho, save your measurements, and choose your fabric. Free on iPhone and Android.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <StoreLink href={APP_STORE_URL} primary>Download for iPhone</StoreLink>
              <StoreLink href={PLAY_STORE_URL}>Get it on Android</StoreLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

// ─── Morceaux ─────────────────────────────────────────────────────────────────

function SiteHeader({ hasCollection }: { hasCollection: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-bg">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="Osho — home" className="flex min-h-11 items-center">
          <Logo size={24} />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {[
            ...(hasCollection ? [['#collection', 'Collection']] : []),
            ['#tour', 'The app'],
            ['#measurements', 'Measurements'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-11 items-center rounded-sm px-3 text-md text-muted transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#download"
          className="flex h-11 items-center rounded-sm border border-ink px-4 text-md font-medium transition-colors hover:bg-surface"
        >
          Get the app
        </a>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Logo size={24} />
          <p className="max-w-sm text-md text-muted">
            Made-to-measure West African tailoring, for the diaspora in the United States.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="eyebrow">Contact</h2>
          <ul className="space-y-1 text-md">
            <li>
              <a href="mailto:contact@osho.app" className="inline-flex min-h-11 items-center gap-2.5 underline-offset-4 hover:underline">
                <Mail className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden />
                contact@osho.app
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-2.5">
              <MapPin className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden />
              Sioux City, Iowa, United States
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hairline">
        <p className="mx-auto max-w-[1360px] px-4 py-5 text-sm text-muted sm:px-8">
          © {new Date().getFullYear()} Osho. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 max-w-xl serif-lg text-3xl font-semibold">{title}</h2>
    </div>
  )
}

/** Les prix sont en Fraunces. 17 px → interlettrage de la plage < 20 px. */
function PriceTag({ value, prefix }: { value: string; prefix?: string }) {
  return (
    <p className="text-sm text-muted">
      {prefix && <span>{prefix} </span>}
      <span className="serif-sm text-lg tabular-nums text-ink">{value}</span>
    </p>
  )
}

function StoreLink({ href, primary = false, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        primary
          ? 'flex h-12 items-center justify-center rounded-sm bg-primary-fill px-6 text-base font-medium text-primary-ink transition-colors hover:bg-primary-fill/88'
          : 'flex h-12 items-center justify-center rounded-sm border border-ink px-6 text-base font-medium text-ink transition-colors hover:bg-surface'
      }
    >
      {children}
    </a>
  )
}

// ─── Contenu ──────────────────────────────────────────────────────────────────


const MEASUREMENTS: [string, string][] = [
  ['Chest', 'around the fullest part'],
  ['Waist', 'at the natural waist'],
  ['Hips', 'around the widest part'],
  ['Shoulders', 'seam to seam'],
  ['Sleeve', 'shoulder to wrist'],
  ['Neck', 'at the base'],
  ['Upper arm', 'around the fullest part'],
  ['Back length', 'neck to waist'],
  ['Thigh', 'around the fullest part'],
  ['Inseam', 'crotch to ankle'],
  ['Trouser length', 'waist to ankle'],
  ['Dress length', 'shoulder to hem'],
]

const REVIEWS = [
  { name: 'Aminata D.',  city: 'Dakar, Senegal',         text: 'My wedding boubou was absolutely perfect. The tailor followed my instructions to the letter.' },
  { name: 'Kofi Mensah', city: 'Accra, Ghana',           text: 'Watching my outfit being made step by step from my phone was incredible. Top quality.' },
  { name: 'Fatou Baldé', city: "Abidjan, Côte d'Ivoire", text: 'Finally an app that truly celebrates African fashion. My kaftan is exactly what I imagined.' },
]
