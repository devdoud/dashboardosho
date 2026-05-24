'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Mariages', 'Baptêmes', 'Cérémonies', 'Fêtes', 'Bureau',
  'Casual', 'Sorties', 'Funérailles', 'Remises de diplômes', 'Fiançailles',
]

interface PerfectForEditorProps {
  value: string[]
  onChange: (values: string[]) => void
}

export function PerfectForEditor({ value, onChange }: PerfectForEditorProps) {
  const [input, setInput] = useState('')

  function add(item: string) {
    const trimmed = item.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item))
  }

  return (
    <div className="space-y-2">
      {/* Tags actifs */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
            >
              {v}
              <button type="button" onClick={() => remove(v)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Saisie libre */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Cérémonies traditionnelles…"
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={() => add(input)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className={cn(
              'rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground',
              'hover:border-primary hover:text-primary transition-colors'
            )}
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  )
}
