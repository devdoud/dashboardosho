'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface I18nValue {
  fr: string
  en: string
}

interface BilingualInputProps {
  value: I18nValue
  onChange: (value: I18nValue) => void
  placeholder?: { fr?: string; en?: string }
  multiline?: boolean
  rows?: number
  className?: string
  required?: boolean
}

const LANGS: { key: keyof I18nValue; flag: string; label: string }[] = [
  { key: 'fr', flag: '🇫🇷', label: 'FR' },
  { key: 'en', flag: '🇬🇧', label: 'EN' },
]

export function BilingualInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  className,
  required,
}: BilingualInputProps) {
  const [active, setActive] = useState<keyof I18nValue>('fr')

  const currentVal = value[active]
  const otherKey   = active === 'fr' ? 'en' : 'fr'
  const otherVal   = value[otherKey]
  const otherFilled = otherVal.trim().length > 0

  function handleChange(text: string) {
    onChange({ ...value, [active]: text })
  }

  const inputProps = {
    value: currentVal,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    placeholder: placeholder?.[active] ?? (active === 'fr' ? 'Version française…' : 'English version…'),
    required: required && active === 'fr',
    className: 'rounded-tl-none',
  }

  return (
    <div className={cn('', className)}>
      {/* Tab bar */}
      <div className="flex">
        {LANGS.map(({ key, flag, label }) => {
          const filled  = value[key].trim().length > 0
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-b-0 transition-colors select-none',
                key === 'fr' ? 'rounded-tl-md' : 'rounded-tr-md border-l-0',
                isActive
                  ? 'bg-background border-input text-foreground'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{flag}</span>
              <span>{label}</span>
              {/* Indicateur rempli */}
              {filled && !isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {required && key === 'fr' && !filled && (
                <span className="text-destructive">*</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Input / Textarea */}
      {multiline ? (
        <Textarea {...inputProps} rows={rows} className={cn('rounded-tl-none', className)} />
      ) : (
        <Input {...inputProps} className="rounded-tl-none" />
      )}

      {/* Hint si l'autre langue est vide */}
      {!otherFilled && currentVal.trim().length > 0 && (
        <p className="mt-1 text-[11px] text-amber-600">
          Version {otherKey === 'fr' ? 'française' : 'anglaise'} non remplie
        </p>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse une valeur DB (string ou {fr,en} ou null) → I18nValue */
export function parseI18n(val: unknown): I18nValue {
  if (!val) return { fr: '', en: '' }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (parsed && typeof parsed === 'object') {
        return { fr: String(parsed.fr ?? parsed.en ?? ''), en: String(parsed.en ?? parsed.fr ?? '') }
      }
    } catch { /* not JSON, treat as plain string */ }
    return { fr: val, en: val }
  }
  if (typeof val === 'object' && val !== null) {
    const v = val as Record<string, unknown>
    return { fr: String(v.fr ?? v.en ?? ''), en: String(v.en ?? v.fr ?? '') }
  }
  return { fr: '', en: '' }
}

/** Sérialise I18nValue → objet JSON pour Supabase (null si tout vide) */
export function serializeI18n(val: I18nValue): { fr: string; en: string } | null {
  if (!val.fr.trim() && !val.en.trim()) return null
  return { fr: val.fr.trim(), en: val.en.trim() }
}

/** Parse une liste DB (array de strings/objets/null) → I18nValue[] */
export function parseI18nArray(val: unknown): I18nValue[] {
  if (!Array.isArray(val)) return []
  return val.map(parseI18n).filter((v) => v.fr.trim() || v.en.trim())
}

/** Sérialise I18nValue[] → array d'objets JSON pour Supabase (null si vide) */
export function serializeI18nArray(val: I18nValue[]): { fr: string; en: string }[] | null {
  const out = val.map(serializeI18n).filter((v): v is { fr: string; en: string } => v !== null)
  return out.length > 0 ? out : null
}
