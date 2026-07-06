import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sa = adminClient()
  const { data } = await sa.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single()
  return data ? user : null
}

const PAGE_SIZE = 12

/** GET /api/admin/reviews?page=0&rating=all&search=
 *  Retourne { reviews (enrichis des noms), total, stats }
 */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page   = parseInt(searchParams.get('page') ?? '0')
  const rating = searchParams.get('rating') ?? 'all'
  const search = (searchParams.get('search') ?? '').trim()

  const sa = adminClient()

  let query = sa
    .from('tailor_reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (rating !== 'all') query = query.eq('rating', parseInt(rating))
  if (search)           query = query.ilike('review_text', `%${search}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviewData = (data ?? []) as Array<Record<string, any>>

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
      sa.auth.admin.listUsers({ perPage: 1000 }),
    ])
    for (const a of addrRes.data ?? []) if (a.full_name) addrMap[a.user_id] = a.full_name
    for (const u of authRes.data?.users ?? []) {
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
  const { data: allRatings } = await sa.from('tailor_reviews').select('rating')
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const r of allRatings ?? []) {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1
    sum += r.rating
  }
  const globalTotal = allRatings?.length ?? 0
  const avg = globalTotal > 0 ? sum / globalTotal : 0

  return NextResponse.json({
    reviews,
    total: count ?? 0,
    stats: { avg, total: globalTotal, dist },
  })
}

/** DELETE /api/admin/reviews?id=xxx — supprimer un avis */
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()
  const { error } = await sa.from('tailor_reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
