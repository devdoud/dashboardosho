'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
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
  /** Rattache le champ à son <Label htmlFor>. */
  id?: string
  placeholder?: { fr?: string; en?: string }
  multiline?: boolean
  rows?: number
  className?: string
  required?: boolean
}

const LANGS: { key: keyof I18nValue; label: string; name: string }[] = [
  { key: 'fr', label: 'FR', name: 'Français' },
  { key: 'en', label: 'EN', name: 'English' },
]

export function BilingualInput({
  value,
  onChange,
  id,
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
    id,
    lang: active,
    value: currentVal,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    placeholder: placeholder?.[active],
    required: required && active === 'fr',
  }

  return (
    <div className={className}>
      {/* Bascule de langue */}
      <div className="flex" role="group" aria-label="Langue du champ">
        {LANGS.map(({ key, label, name }) => {
          const filled  = value[key].trim().length > 0
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              aria-pressed={isActive}
              aria-label={`${name}${filled ? ', rempli' : ''}`}
              className={cn(
                'flex min-h-11 select-none items-center gap-1.5 border border-b-0 px-4 text-sm font-medium transition-colors',
                key === 'fr' ? 'rounded-tl-sm' : 'rounded-tr-sm border-l-0',
                isActive
                  ? 'border-hairline bg-surface text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              {label}
              {filled && !isActive && <Check className="h-3.5 w-3.5 text-ok-ink" strokeWidth={2} aria-hidden />}
              {required && key === 'fr' && !filled && <span className="text-danger-ink" aria-hidden>*</span>}
            </button>
          )
        })}
      </div>

      {multiline ? (
        <Textarea {...inputProps} rows={rows} className="rounded-tl-none" />
      ) : (
        <Input {...inputProps} className="rounded-tl-none" />
      )}

      {/* Rappel si l'autre langue est vide */}
      {!otherFilled && currentVal.trim().length > 0 && (
        <p className="mt-1.5 text-xs text-warn-ink">
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
