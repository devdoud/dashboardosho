import * as React from 'react'
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── En-tête de page ──────────────────────────────────────────────────────────
// Titre Fraunces 32 px (serif-lg), une ligne de contexte, les actions à droite.

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="serif-lg text-3xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Intitulé de section ─────────────────────────────────────────────────────
// Petites capitales 12 px / 600 / 1.44 px / muted.

export function SectionLabel({
  as: Tag = 'h3',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' | 'p' }) {
  return (
    <Tag className={cn('eyebrow', className)} {...props}>
      {children}
    </Tag>
  )
}

// ─── Chiffres clés ───────────────────────────────────────────────────────────
// Pas de tuiles colorées : un chiffre en Fraunces, son libellé en petites
// capitales, des filets. La tendance porte un signe et une flèche, jamais la
// seule couleur.

export interface StatItem {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  pct?: number
}

export function StatRow({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 border-t border-hairline',
        items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : '',
        className
      )}
    >
      {items.map(({ label, value, sub, pct }, i) => (
        <div
          key={label}
          className={cn(
            'min-w-0 border-b border-hairline py-5 pr-4',
            i % 2 === 1 && 'border-l pl-4',
            i % 2 === 0 && i > 0 && 'lg:border-l lg:pl-4'
          )}
        >
          <dt className="eyebrow">{label}</dt>
          <dd className="mt-2 serif-lg text-3xl font-normal tabular-nums text-ink break-words">{value}</dd>
          {(sub || pct !== undefined) && (
            <dd className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              {pct !== undefined && <Trend pct={pct} />}
              {sub}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

function Trend({ pct }: { pct: number }) {
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium', up ? 'text-ok-ink' : 'text-danger-ink')}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      {up ? '+' : '−'}{Math.abs(pct).toFixed(1)} %
    </span>
  )
}

// ─── Encart ──────────────────────────────────────────────────────────────────
// Un message posé sur le papier, teinté par son jeton. Jamais de bordure
// colorée à gauche.

const NOTICE_TONE = {
  ok:      { box: 'border-ok-border bg-ok-bg text-ok-ink',             icon: CheckCircle },
  warn:    { box: 'border-warn-border bg-warn-bg text-warn-ink',       icon: AlertCircle },
  danger:  { box: 'border-danger-border bg-danger-bg text-danger-ink', icon: XCircle },
  accent:  { box: 'border-accent-border bg-accent-bg text-accent-ink', icon: Info },
  neutral: { box: 'border-hairline bg-surface text-ink',               icon: Info },
} as const

export function Notice({
  tone = 'neutral',
  title,
  icon,
  children,
  className,
}: {
  tone?: keyof typeof NOTICE_TONE
  title?: React.ReactNode
  icon?: React.ElementType | null
  children?: React.ReactNode
  className?: string
}) {
  const t = NOTICE_TONE[tone]
  const Icon = icon === null ? null : (icon ?? t.icon)
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-sm', t.box, className)}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}

// ─── Ligne de spécification ──────────────────────────────────────────────────
// Libellé muted à gauche, valeur ink à droite, 11 px de padding vertical, filet
// en dessous. Si la valeur est vide, la ligne entière disparaît.

export function isEmptyValue(v: unknown) {
  return v === null || v === undefined || v === false || (typeof v === 'string' && (v.trim() === '' || v.trim() === '—'))
}

export function SpecRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
  valueClassName?: string
}) {
  if (isEmptyValue(value)) return null
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b border-hairline py-[11px]', className)}>
      <dt className="shrink-0 text-md text-muted">{label}</dt>
      <dd className={cn('min-w-0 text-right text-md text-ink', valueClassName)}>{value}</dd>
    </div>
  )
}

// ─── Prix ────────────────────────────────────────────────────────────────────
// Les totaux et les prix sont en Fraunces. `size` choisit l'interlettrage de la
// bonne plage (cf. globals.css).

export function Price({
  children,
  size = 'sm',
  className,
}: {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const cls = {
    sm: 'serif-sm text-base',
    md: 'serif-md text-xl',
    lg: 'serif-lg text-3xl',
  }[size]
  return <span className={cn(cls, 'tabular-nums text-ink', className)}>{children}</span>
}
