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

const LANGS: { key: keyof I18nValue; flag: string; label: string }[] = [
  { key: 'fr', flag: '🇫🇷', label: 'FR' },
  { key: 'en', flag: '🇬🇧', label: 'EN' },
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
      <div className="flex w-fit">
        {LANGS.map(({ key, flag, label }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors select-none',
                key === 'fr' ? 'rounded-l-md' : 'rounded-r-md border-l-0',
                isActive
                  ? 'bg-background border-input text-foreground'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Zone de saisie + tags existants (langue active) */}
      <div
        className="flex flex-wrap gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => {
          const current = tag[active]
          const missing = !current.trim()
          return (
            <span
              key={i}
              title={tag[otherKey].trim() ? `${otherKey.toUpperCase()}: ${tag[otherKey]}` : `Traduction ${otherKey.toUpperCase()} manquante`}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                missing
                  ? 'border border-dashed border-amber-400 text-amber-600 bg-amber-50'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              <input
                value={current}
                onChange={(e) => editTag(i, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={missing ? `${active.toUpperCase()}…` : ''}
                size={Math.max(current.length, missing ? 4 : 1)}
                className="bg-transparent outline-none placeholder:text-amber-500"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={
            value.length === 0
              ? (placeholder?.[active] ?? (active === 'fr' ? 'Ajouter…' : 'Add…'))
              : ''
          }
          className="flex-1 min-w-[100px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
              className="px-2.5 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + {s[active] || s[otherKey]}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {value.length} élément{value.length > 1 ? 's' : ''} · Entrée ou virgule pour ajouter ·
          basculez 🇫🇷/🇬🇧 pour traduire chaque élément
        </p>
      )}
    </div>
  )
}
