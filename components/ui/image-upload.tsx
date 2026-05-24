'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload, X, ImageIcon } from 'lucide-react'
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

  const sizeClass = { sm: 'h-16 w-16', md: 'h-24 w-24', lg: 'h-32 w-32' }[size]

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Fichier invalide'); return }
    if (file.size > 8 * 1024 * 1024)    { setError('Image trop lourde (max 8 Mo)'); return }

    setUploading(true)
    setError('')

    const fd = new FormData()
    fd.append('file',   file)
    fd.append('folder', folder)
    fd.append('bucket', bucket)

    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Erreur upload')
      setUploading(false)
      return
    }

    onChange(json.url)
    setUploading(false)
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed border-input bg-muted/30 overflow-hidden cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50',
          sizeClass,
          uploading && 'pointer-events-none'
        )}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <Image src={value} alt="Aperçu" fill className="object-cover" sizes="128px" />
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 z-10"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><Upload className="h-5 w-5" />{size !== 'sm' && <span className="text-xs">Upload</span>}</>
            }
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
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
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">{value.length}/{max}</span>
      </div>
    </div>
  )
}

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-muted text-muted-foreground', className)}>
      <ImageIcon className="h-6 w-6" />
    </div>
  )
}
