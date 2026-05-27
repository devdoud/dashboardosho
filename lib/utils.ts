import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncate(str: string | null | undefined, length: number): string {
  if (!str) return '—'
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

/**
 * Extrait un nom lisible depuis un champ qui peut être soit une string,
 * soit un objet multilingue { fr: "...", en: "..." }.
 */
export function getLabel(value: unknown, fallback = '—'): string {
  if (!value) return fallback
  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object') {
          return String(parsed.fr ?? parsed.en ?? parsed.name ?? Object.values(parsed)[0] ?? fallback) || fallback
        }
      } catch { /* not JSON, return as-is */ }
    }
    return value || fallback
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return String(obj.fr ?? obj.en ?? obj.name ?? Object.values(obj)[0] ?? fallback) || fallback
  }
  return String(value) || fallback
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
