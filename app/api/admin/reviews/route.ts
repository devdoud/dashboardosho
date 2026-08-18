import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, parsePage, escapeLike, listAllUsers } from '@/lib/supabase/admin'
import type { TailorReview } from '@/types/database'

const PAGE_SIZE = 12

/** GET /api/admin/reviews?page=0&rating=all&search=
 *  Retourne { reviews (enrichis des noms), total, stats }
 */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const page   = parsePage(searchParams.get('page'))
  const rating = searchParams.get('rating') ?? 'all'
  const search = (searchParams.get('search') ?? '').trim()

  const sa = adminClient()

  let query = sa
    .from('tailor_reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  const ratingNum = Number.parseInt(rating, 10)
  if (rating !== 'all' && ratingNum >= 1 && ratingNum <= 5) query = query.eq('rating', ratingNum)
  if (search)           query = query.ilike('review_text', `%${escapeLike(search)}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviewData = (data ?? []) as TailorReview[]

  // ── Résolution des noms (adresse par défaut → métadonnées auth → email) ──────
  const ids = [...new Set([
    ...reviewData.map((r) => r.tailor_id),
    ...reviewData.map((r) => r.customer_id),
  ].filter(Boolean))]

  const addrMap: Record<string, string> = {}
  const authMap: Record<string, string> = {}
  if (ids.length > 0) {
    const [addrRes, authRes] = await Promise.all([
      sa.from('addresses').select('user_id, full_name').in('user_id', ids).eq('is_default', true),
      listAllUsers(sa),
    ])
    for (const a of addrRes.data ?? []) if (a.full_name) addrMap[a.user_id] = a.full_name
    for (const u of authRes) {
      if (ids.includes(u.id)) {
        const meta = u.user_metadata as Record<string, string> | undefined
        authMap[u.id] = meta?.full_name || meta?.name || u.email?.split('@')[0] || ''
      }
    }
  }

  const resolveName = (id: string): string | null =>
    addrMap[id] || authMap[id] || null

  const reviews = reviewData.map((r) => ({
    ...r,
    tailor_name:   resolveName(r.tailor_id),
    customer_name: resolveName(r.customer_id),
  }))

  // ── Stats globales (toutes les notes, sans filtre) ───────────────────────────
  // Un COUNT par note plutôt qu'un chargement intégral de la table à chaque
  // changement de page : cinq compteurs indexés suffisent à la distribution
  // comme à la moyenne.
  const counts = await Promise.all(
    [1, 2, 3, 4, 5].map(async (rating) => {
      const { count } = await sa
        .from('tailor_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('rating', rating)
      return [rating, count ?? 0] as const
    }),
  )

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  let globalTotal = 0
  for (const [rating, n] of counts) {
    dist[rating] = n
    sum += rating * n
    globalTotal += n
  }
  const avg = globalTotal > 0 ? sum / globalTotal : 0

  return NextResponse.json({
    reviews,
    total: count ?? 0,
    stats: { avg, total: globalTotal, dist },
  })
}

/** DELETE /api/admin/reviews?id=xxx — supprimer un avis */
export async function DELETE(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()
  const { error } = await sa.from('tailor_reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
