'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageHeader, SectionLabel, SpecRow } from '@/components/ui/atelier'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import type { TailorReview } from '@/types/database'
import { Star, Search, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 12

interface ReviewWithDetails extends TailorReview {
  tailor_name?: string | null
  customer_name?: string | null
}

/** Nom lisible, avec repli propre sur un identifiant court plutôt que l'UUID brut */
function displayName(name: string | null | undefined, id: string, role: 'Tailleur' | 'Client') {
  return name || `${role} ${id.slice(0, 6)}`
}

/** Étoiles d'encre : la note se lit à la forme pleine/vide, pas à la couleur. */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(cls, i < rating ? 'fill-ink text-ink' : 'text-muted')}
          strokeWidth={1.75}
          aria-hidden
        />
      ))}
    </span>
  )
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [avgRating, setAvgRating] = useState(0)
  const [globalTotal, setGlobalTotal] = useState(0)
  const [ratingDist, setRatingDist] = useState<Record<number, number>>({})

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      rating: ratingFilter,
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/admin/reviews?${params}`)
    if (res.ok) {
      const json = await res.json()
      setReviews(json.reviews ?? [])
      setTotal(json.total ?? 0)
      setAvgRating(json.stats?.avg ?? 0)
      setGlobalTotal(json.stats?.total ?? 0)
      setRatingDist(json.stats?.dist ?? {})
    }
    setLoading(false)
  }, [page, ratingFilter, search])

  useEffect(() => {
    const t = setTimeout(fetchReviews, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchReviews, search])

  async function handleDelete(id: string) {
    await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchReviews()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Avis clients"
        description="Les retours des clients sur leurs tailleurs"
        actions={
          <Button variant="outline" size="icon" onClick={fetchReviews} disabled={loading} aria-label="Actualiser la liste">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        }
      />

      {/* Note moyenne + distribution (qui sert aussi de filtre) */}
      <div className="grid gap-8 border-y border-hairline py-6 sm:grid-cols-[200px_1fr]">
        <div>
          <p className="eyebrow">Note moyenne</p>
          <p className="mt-2 serif-lg text-5xl font-normal tabular-nums leading-none">
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
          </p>
          <div className="mt-3"><StarRating rating={Math.round(avgRating)} size="lg" /></div>
          <p className="mt-2 text-sm text-muted">
            {globalTotal > 0 ? `${globalTotal} avis` : 'Aucun avis'}
          </p>
        </div>

        <div>
          <p id="dist-label" className="eyebrow mb-1">Filtrer par note</p>
          <div role="group" aria-labelledby="dist-label">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = ratingDist[r] ?? 0
              const pct = globalTotal > 0 ? (count / globalTotal) * 100 : 0
              const active = ratingFilter === r.toString()
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setRatingFilter(active ? 'all' : r.toString()); setPage(0) }}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-4 rounded-sm px-2 transition-colors',
                    active ? 'bg-surface outline outline-1 outline-ink' : 'hover:bg-surface'
                  )}
                >
                  <span className={cn('w-20 shrink-0 text-left text-md', active ? 'font-semibold text-ink' : 'text-ink')}>
                    {r} étoile{r > 1 ? 's' : ''}
                  </span>
                  <span className="h-1.5 flex-1 bg-placeholder" aria-hidden>
                    <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-10 text-right text-sm tabular-nums text-muted">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <label htmlFor="reviews-search" className="sr-only">Rechercher dans les avis</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
        <Input
          id="reviews-search"
          type="search"
          placeholder="Rechercher dans les avis"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        />
      </div>

      {/* Liste d'avis : des lignes séparées par des filets */}
      {loading ? (
        <ul className="border-t border-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="space-y-2 border-b border-hairline py-4">
              <div className="h-3.5 w-28 animate-pulse rounded-sm bg-placeholder" />
              <div className="h-3.5 w-full animate-pulse rounded-sm bg-placeholder" />
              <div className="h-3.5 w-2/3 animate-pulse rounded-sm bg-placeholder" />
            </li>
          ))}
        </ul>
      ) : reviews.length === 0 ? (
        <div className="border-y border-hairline py-16 text-center">
          <p className="text-base font-medium">Aucun avis trouvé</p>
          <p className="mt-1 text-md text-muted">
            {search || ratingFilter !== 'all'
              ? 'Essayez de modifier vos filtres.'
              : 'Les avis de vos clients apparaîtront ici.'}
          </p>
          {(search || ratingFilter !== 'all') && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setRatingFilter('all') }}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="border-t border-hairline">
            {reviews.map((review) => {
              const customer = displayName(review.customer_name, review.customer_id, 'Client')
              const tailor = displayName(review.tailor_name, review.tailor_id, 'Tailleur')
              return (
                <li key={review.id} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => setSelectedReview(review)}
                    className="grid w-full gap-x-6 gap-y-2 px-2 py-4 text-left transition-colors hover:bg-surface md:grid-cols-[140px_1fr_220px]"
                  >
                    <div className="flex items-center gap-3 md:block">
                      <StarRating rating={review.rating} />
                      <p className="text-sm tabular-nums text-muted md:mt-1">{formatDate(review.created_at)}</p>
                    </div>
                    <p className={cn('line-clamp-2 text-md leading-relaxed', review.review_text ? 'text-ink' : 'text-muted')}>
                      {review.review_text || 'Aucun commentaire'}
                    </p>
                    <p className="text-sm text-muted md:text-right">
                      <span className="text-ink">{customer}</span>
                      <span aria-hidden> → </span>
                      <span className="sr-only"> pour </span>
                      <span className="text-ink">{tailor}</span>
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                Page {page + 1} sur {totalPages} · {total} résultat{total > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Page précédente">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Page suivante">
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog détail */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Avis</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <StarRating rating={selectedReview.rating} size="lg" />
                <span className="serif-lg text-3xl tabular-nums">
                  {selectedReview.rating}<span className="text-xl text-muted"> / 5</span>
                </span>
              </div>

              <section className="space-y-2">
                <SectionLabel>Commentaire</SectionLabel>
                {selectedReview.review_text
                  ? <p className="text-base leading-relaxed">{selectedReview.review_text}</p>
                  : <p className="text-md text-muted">Aucun commentaire laissé.</p>}
              </section>

              <dl className="border-t border-hairline">
                <SpecRow label="Client" value={displayName(selectedReview.customer_name, selectedReview.customer_id, 'Client')} />
                <SpecRow label="Tailleur" value={displayName(selectedReview.tailor_name, selectedReview.tailor_id, 'Tailleur')} />
                <SpecRow label="Publié le" value={formatDateTime(selectedReview.created_at)} />
              </dl>
            </div>
          )}
          {selectedReview && (
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => { setDeleteId(selectedReview.id); setSelectedReview(null) }}
              >
                <Trash2 />
                Supprimer cet avis
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;avis ?</DialogTitle>
          </DialogHeader>
          <p className="text-md text-muted">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
