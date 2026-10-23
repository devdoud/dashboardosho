'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  onRemove?: () => void
  bucket?: string
  folder?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  bucket = 'products',
  folder = 'images',
  className,
  size = 'md',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Portrait, comme un vêtement.
  const sizeClass = { sm: 'h-20 w-16', md: 'h-28 w-24', lg: 'h-40 w-32' }[size]

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Fichier invalide'); return }
    if (file.size > 8 * 1024 * 1024)    { setError('Image trop lourde (8 Mo au plus)'); return }

    setUploading(true)
    setError('')

    const fd = new FormData()
    fd.append('file',   file)
    fd.append('folder', folder)
    fd.append('bucket', bucket)

    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Erreur lors du téléversement')
      setUploading(false)
      return
    }

    onChange(json.url)
    setUploading(false)
  }

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={value ? 'Remplacer l\'image' : 'Téléverser une image'}
        className={cn(
          'relative overflow-hidden rounded-sm border border-dashed border-hairline bg-placeholder transition-colors hover:border-ink disabled:cursor-wait',
          value && 'border-solid',
          sizeClass,
        )}
      >
        {value ? (
          <Image src={value} alt="" fill className="object-cover" sizes="128px" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              : <><Upload className="h-5 w-5" strokeWidth={1.75} aria-hidden />{size !== 'sm' && <span className="text-xs">Téléverser</span>}</>
            }
          </span>
        )}
        {uploading && value && (
          <span className="absolute inset-0 flex items-center justify-center bg-scrim">
            <Loader2 className="h-5 w-5 animate-spin text-primary-ink" aria-hidden />
          </span>
        )}
      </button>

      {value && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 text-sm font-medium text-danger-ink underline-offset-4 hover:underline"
        >
          Retirer
        </button>
      )}

      {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}

// ── Galerie multi-images ──────────────────────────────────────────────────────

interface MultiImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  bucket?: string
  folder?: string
  max?: number
}

export function MultiImageUpload({ value, onChange, bucket = 'products', folder = 'gallery', max = 8 }: MultiImageUploadProps) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <ImageUpload
            key={i}
            value={url}
            onChange={(newUrl) => { const next = [...value]; next[i] = newUrl; onChange(next) }}
            onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
            bucket={bucket}
            folder={folder}
            size="sm"
          />
        ))}
        {value.length < max && (
          <ImageUpload value={null} onChange={(url) => onChange([...value, url])} bucket={bucket} folder={folder} size="sm" />
        )}
      </div>
      <p className="text-xs tabular-nums text-muted">{value.length} / {max}</p>
    </div>
  )
}

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-sm bg-placeholder text-placeholder-ink', className)}>
      <ImageIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
    </div>
  )
}
