'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { I18nValue } from '@/components/ui/bilingual-input'

interface BilingualTagInputProps {
  value: I18nValue[]
  onChange: (tags: I18nValue[]) => void
  /** Suggestions bilingues proposées en ajout rapide */
  suggestions?: I18nValue[]
  placeholder?: { fr?: string; en?: string }
  className?: string
  max?: number
}

const LANGS: { key: keyof I18nValue; label: string; name: string }[] = [
  { key: 'fr', label: 'FR', name: 'Français' },
  { key: 'en', label: 'EN', name: 'English' },
]

export function BilingualTagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  className,
  max = 20,
}: BilingualTagInputProps) {
  const [active, setActive] = useState<keyof I18nValue>('fr')
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const otherKey: keyof I18nValue = active === 'fr' ? 'en' : 'fr'

  function addTag(text: string) {
    const clean = text.trim()
    if (!clean || value.length >= max) return
    // Évite les doublons sur la langue active
    if (value.some((t) => t[active].trim().toLowerCase() === clean.toLowerCase())) {
      setInput('')
      return
    }
    onChange([...value, { fr: '', en: '', [active]: clean }])
    setInput('')
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  /** Édite la valeur de la langue active pour un tag existant */
  function editTag(index: number, text: string) {
    onChange(value.map((t, i) => (i === index ? { ...t, [active]: text } : t)))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((t) => t[active].trim().toLowerCase() === s[active].trim().toLowerCase()),
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Sélecteur de langue */}
      <div className="flex w-fit" role="group" aria-label="Langue des éléments">
        {LANGS.map(({ key, label, name }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              aria-pressed={isActive}
              aria-label={name}
              className={cn(
                'flex min-h-11 select-none items-center border px-4 text-sm font-medium transition-colors',
                key === 'fr' ? 'rounded-l-sm' : 'rounded-r-sm border-l-0',
                isActive
                  ? 'border-ink bg-surface text-ink'
                  : 'border-hairline text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Zone de saisie + tags existants (langue active) */}
      <div
        className="flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-sm border border-hairline bg-surface px-2 py-1.5 transition-colors focus-within:border-ink"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => {
          const current = tag[active]
          const missing = !current.trim()
          return (
            <span
              key={i}
              title={tag[otherKey].trim() ? `${otherKey.toUpperCase()} : ${tag[otherKey]}` : `Traduction ${otherKey.toUpperCase()} manquante`}
              className={cn(
                'inline-flex h-8 items-center gap-0.5 rounded-sm pl-2 text-sm font-medium',
                missing
                  ? 'border border-dashed border-warn-border bg-warn-bg text-warn-ink'
                  : 'bg-primary-fill text-primary-ink',
              )}
            >
              <input
                lang={active}
                value={current}
                onChange={(e) => editTag(i, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={missing ? `Traduction ${active.toUpperCase()} manquante` : `Élément ${i + 1}`}
                placeholder={missing ? `${active.toUpperCase()}…` : ''}
                size={Math.max(current.length, missing ? 4 : 1)}
                className="bg-transparent outline-none placeholder:text-warn-ink"
              />
              {/* Cible de 44 px, débordant discrètement de la pastille */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                aria-label={`Retirer ${current || tag[otherKey] || 'cet élément'}`}
                className="-my-1.5 flex size-11 items-center justify-center opacity-80 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          lang={active}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input) addTag(input) }}
          aria-label="Nouvel élément"
          placeholder={
            value.length === 0
              ? (placeholder?.[active] ?? (active === 'fr' ? 'Ajouter…' : 'Add…'))
              : ''
          }
          className="h-8 min-w-[100px] flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted"
        />
      </div>

      {/* Suggestions (langue active) */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (value.length >= max) return
                onChange([...value, { fr: s.fr, en: s.en }])
              }}
              className="min-h-11 rounded-sm border border-dashed border-hairline px-3 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
            >
              + {s[active] || s[otherKey]}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted">
          {value.length} élément{value.length > 1 ? 's' : ''} · Entrée ou virgule pour ajouter ·
          basculez FR / EN pour traduire chaque élément
        </p>
      )}
    </div>
  )
}
