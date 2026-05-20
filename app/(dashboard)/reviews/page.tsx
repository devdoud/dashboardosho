'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate, formatDateTime, getInitials, truncate } from '@/lib/utils'
import type { TailorReview } from '@/types/database'
import { Star, Search, RefreshCw, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

interface ReviewWithDetails extends TailorReview {
  tailor_name?: string
  customer_name?: string
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const supabase = createClient()
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [avgRating, setAvgRating] = useState(0)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('tailor_reviews')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (ratingFilter !== 'all') query = query.eq('rating', parseInt(ratingFilter))

    const { data, count } = await query
    const reviewData = data ?? []

    // Enrich with names from addresses
    const tailorIds = [...new Set(reviewData.map((r) => r.tailor_id))]
    const customerIds = [...new Set(reviewData.map((r) => r.customer_id))]
    const allIds = [...new Set([...tailorIds, ...customerIds])]

    const { data: addresses } = await supabase
      .from('addresses')
      .select('user_id, full_name')
      .in('user_id', allIds)
      .eq('is_default', true)

    const nameMap: Record<string, string> = {}
    for (const a of addresses ?? []) nameMap[a.user_id] = a.full_name

    const enriched: ReviewWithDetails[] = reviewData
      .filter((r) => !search || (r.review_text ?? '').toLowerCase().includes(search.toLowerCase()))
      .map((r) => ({
        ...r,
        tailor_name: nameMap[r.tailor_id],
        customer_name: nameMap[r.customer_id],
      }))

    setReviews(enriched)
    setTotal(count ?? 0)

    // Average rating
    const { data: allRatings } = await supabase.from('tailor_reviews').select('rating')
    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
      setAvgRating(avg)
    }

    setLoading(false)
  }, [page, ratingFilter, search, supabase])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function handleDelete(id: string) {
    await supabase.from('tailor_reviews').delete().eq('id', id)
    setDeleteId(null)
    fetchReviews()
  }

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avis clients</h1>
          <p className="text-muted-foreground text-sm">{total} avis au total</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchReviews} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
                <StarRating rating={Math.round(avgRating)} size="lg" />
                <p className="text-xs text-muted-foreground mt-1">{total} avis</p>
              </div>
              <div className="flex-1 space-y-1">
                {ratingCounts.map(({ rating, count }) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs w-2">{rating}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtres rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter(ratingFilter === r.toString() ? 'all' : r.toString())}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                    ratingFilter === r.toString()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  <Star className={`h-3 w-3 ${ratingFilter === r.toString() ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                  {r} étoile{r > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les avis..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes notes</SelectItem>
            <SelectItem value="5">5 étoiles</SelectItem>
            <SelectItem value="4">4 étoiles</SelectItem>
            <SelectItem value="3">3 étoiles</SelectItem>
            <SelectItem value="2">2 étoiles</SelectItem>
            <SelectItem value="1">1 étoile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Tailleur</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucun avis trouvé
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{getInitials(review.customer_name ?? '?')}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{review.customer_name ?? review.customer_id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{getInitials(review.tailor_name ?? '?')}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{review.tailor_name ?? review.tailor_id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell><StarRating rating={review.rating} /></TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                      {review.review_text ? truncate(review.review_text, 60) : <span className="italic">Aucun commentaire</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(review.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedReview(review)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(review.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</p>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l&apos;avis</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StarRating rating={selectedReview.rating} size="lg" />
                <Badge variant={selectedReview.rating >= 4 ? 'success' : selectedReview.rating >= 3 ? 'warning' : 'destructive'}>
                  {selectedReview.rating}/5
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{getInitials(selectedReview.customer_name ?? '?')}</AvatarFallback>
                    </Avatar>
                    <span>{selectedReview.customer_name ?? selectedReview.customer_id.slice(0, 12)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tailleur</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{getInitials(selectedReview.tailor_name ?? '?')}</AvatarFallback>
                    </Avatar>
                    <span>{selectedReview.tailor_name ?? selectedReview.tailor_id.slice(0, 12)}</span>
                  </div>
                </div>
              </div>
              {selectedReview.review_text && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Commentaire</p>
                  <p className="text-sm rounded-lg border p-3 bg-muted/30">{selectedReview.review_text}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Publié le {formatDateTime(selectedReview.created_at)}
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => { setDeleteId(selectedReview.id); setSelectedReview(null) }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer cet avis
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer l&apos;avis ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
