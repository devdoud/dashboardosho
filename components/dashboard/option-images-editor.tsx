'use client'

import { ImageUpload } from '@/components/ui/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { FabricOption } from '@/types/database'

interface OptionImagesEditorProps {
  value: FabricOption[]
  onChange: (options: FabricOption[]) => void
  bucket?: string
  folder?: string
  placeholder?: string
}

export function OptionImagesEditor({
  value,
  onChange,
  bucket = 'products',
  folder = 'options',
  placeholder = 'Nom de l\'option',
}: OptionImagesEditorProps) {
  function addOption() {
    onChange([...value, { name: '', image_url: '' }])
  }

  function updateName(index: number, name: string) {
    const next = [...value]
    next[index] = { ...next[index], name }
    onChange(next)
  }

  function updateImage(index: number, image_url: string) {
    const next = [...value]
    next[index] = { ...next[index], image_url }
    onChange(next)
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucune option ajoutée</p>
      )}
      {value.map((opt, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
          <ImageUpload
            value={opt.image_url || null}
            onChange={(url) => updateImage(i, url)}
            onRemove={() => updateImage(i, '')}
            bucket={bucket}
            folder={folder}
            size="sm"
          />
          <Input
            value={opt.name}
            onChange={(e) => updateName(i, e.target.value)}
            placeholder={placeholder}
            className="h-8 text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={addOption}
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une option
      </Button>
    </div>
  )
}
