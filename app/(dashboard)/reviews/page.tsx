'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import type { TailorReview } from '@/types/database'
import {
  Star, Search, RefreshCw, Trash2, ChevronLeft, ChevronRight,
  Quote, MessageSquare,
} from 'lucide-react'

const PAGE_SIZE = 12

interface ReviewWithDetails extends TailorReview {
  tailor_name?: string | null
  customer_name?: string | null
}

/** Nom lisible, avec repli propre sur un identifiant court plutôt que l'UUID brut */
function displayName(name: string | null | undefined, id: string, role: 'Tailleur' | 'Client') {
  return name || `${role} ${id.slice(0, 6)}`
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${cls} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  )
}

function ratingConfig(rating: number) {
  if (rating === 5) return { cardBg: 'bg-emerald-50 dark:bg-emerald-950/20', barBg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
  if (rating === 4) return { cardBg: 'bg-sky-50 dark:bg-sky-950/20', barBg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' }
  if (rating === 3) return { cardBg: 'bg-amber-50 dark:bg-amber-950/20', barBg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  if (rating === 2) return { cardBg: 'bg-orange-50 dark:bg-orange-950/20', barBg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' }
  return { cardBg: 'bg-red-50 dark:bg-red-950/20', barBg: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-600',
]

function avatarGradient(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function GradientAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white font-semibold shrink-0`}>
      {getInitials(name || '?')}
    </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avis clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Suivez et gérez les retours de vos clients</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchReviews} disabled={loading} className="shrink-0 mt-0.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        {/* Note moyenne */}
        <Card className="sm:w-48">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-center h-full">
            <p className="text-6xl font-bold tracking-tight tabular-nums leading-none">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </p>
            <StarRating rating={Math.round(avgRating)} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              {globalTotal > 0 ? `${globalTotal} avis` : 'Aucun avis'}
            </p>
          </CardContent>
        </Card>

        {/* Distribution + filtres */}
        <Card>
          <CardContent className="p-5 space-y-2">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = ratingDist[r] ?? 0
              const pct = globalTotal > 0 ? (count / globalTotal) * 100 : 0
              const cfg = ratingConfig(r)
              const active = ratingFilter === r.toString()
              return (
                <button
                  key={r}
                  onClick={() => { setRatingFilter(active ? 'all' : r.toString()); setPage(0) }}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-1 w-[88px] shrink-0">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className={`text-xs font-medium ${active ? cfg.text : 'text-muted-foreground'}`}>
                      {r} étoile{r > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cfg.barBg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{count}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans les avis…"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        />
      </div>

      {/* Grille d'avis */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="h-3.5 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
                <div className="space-y-2 pt-1">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-muted rounded w-20" />
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium">Aucun avis trouvé</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || ratingFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Les avis de vos clients apparaîtront ici'}
          </p>
          {(search || ratingFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(''); setRatingFilter('all') }}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => {
              const cfg = ratingConfig(review.rating)
              return (
                <Card
                  key={review.id}
                  className="group cursor-pointer overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => setSelectedReview(review)}
                >
                  <div className={`h-1 w-full ${cfg.barBg}`} />
                  <CardContent className="p-5 flex flex-col gap-3">
                    {/* Top: étoiles + date */}
                    <div className="flex items-center justify-between">
                      <StarRating rating={review.rating} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDate(review.created_at)}
                      </span>
                    </div>

                    {/* Commentaire */}
                    <div className="relative flex-1 min-h-[64px]">
                      <Quote className="absolute -top-0.5 -left-0.5 h-4 w-4 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground leading-relaxed pl-4 line-clamp-3">
                        {review.review_text || <span className="italic">Aucun commentaire</span>}
                      </p>
                    </div>

                    {/* Footer: client → tailleur */}
                    {(() => {
                      const customer = displayName(review.customer_name, review.customer_id, 'Client')
                      const tailor = displayName(review.tailor_name, review.tailor_id, 'Tailleur')
                      return (
                        <div className="flex items-center justify-between gap-2 pt-3 border-t">
                          <div className="flex items-center gap-2 min-w-0">
                            <GradientAvatar name={customer} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate leading-tight">{customer}</p>
                              <p className="text-[10px] text-muted-foreground">Client</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0 text-right">
                              <p className="text-xs font-medium truncate leading-tight">{tailor}</p>
                              <p className="text-[10px] text-muted-foreground">Tailleur</p>
                            </div>
                            <GradientAvatar name={tailor} size="sm" />
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium">{page + 1}</span> sur <span className="font-medium">{totalPages}</span>
                <span className="text-muted-foreground/60"> · {total} résultat{total > 1 ? 's' : ''}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
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
            <DialogTitle>Détail de l&apos;avis</DialogTitle>
          </DialogHeader>
          {selectedReview && (() => {
            const cfg = ratingConfig(selectedReview.rating)
            return (
              <div className="space-y-4 pt-1">
                {/* Note */}
                <div className={`rounded-xl p-4 ${cfg.cardBg} flex items-center justify-between`}>
                  <StarRating rating={selectedReview.rating} size="lg" />
                  <span className={`text-2xl font-bold tabular-nums ${cfg.text}`}>
                    {selectedReview.rating}<span className="text-base font-normal text-muted-foreground">/5</span>
                  </span>
                </div>

                {/* Personnes */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Client' as const, name: displayName(selectedReview.customer_name, selectedReview.customer_id, 'Client') },
                    { label: 'Tailleur' as const, name: displayName(selectedReview.tailor_name, selectedReview.tailor_id, 'Tailleur') },
                  ].map(({ label, name }) => (
                    <div key={label} className="rounded-xl border bg-muted/30 p-3 flex items-center gap-3 min-w-0">
                      <GradientAvatar name={name} size="md" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-medium truncate" title={name}>{name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commentaire */}
                {selectedReview.review_text ? (
                  <div className="relative rounded-xl border bg-muted/20 p-4">
                    <Quote className="absolute top-3 right-3 h-5 w-5 text-muted-foreground/20" />
                    <p className="text-sm leading-relaxed pr-6">{selectedReview.review_text}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed py-6 text-center">
                    <p className="text-sm text-muted-foreground italic">Aucun commentaire laissé</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Publié le {formatDateTime(selectedReview.created_at)}
                </p>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => { setDeleteId(selectedReview.id); setSelectedReview(null) }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer cet avis
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;avis ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}