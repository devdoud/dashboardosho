import { NextResponse } from 'next/server'
import { adminClient, guardAdmin, listAllUsers } from '@/lib/supabase/admin'

/** GET /api/admin/tailors — liste des tailleurs avec stats */
export async function GET() {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const sa = adminClient()

  const { data: roles } = await sa
    .from('user_roles')
    .select('user_id, created_at')
    .eq('role', 'tailor')
    .order('created_at', { ascending: false })

  if (!roles || roles.length === 0) return NextResponse.json({ tailors: [] })

  const ids = roles.map((r) => r.user_id)
  const createdMap: Record<string, string> = {}
  for (const r of roles) createdMap[r.user_id] = r.created_at

  const [addressesRes, assignmentsRes, reviewsRes, authRes] = await Promise.all([
    sa.from('addresses').select('user_id, full_name, phone, city').in('user_id', ids).eq('is_default', true),
    sa.from('order_assignments').select('tailor_id, status, order_id').in('tailor_id', ids),
    sa.from('tailor_reviews').select('tailor_id, rating').in('tailor_id', ids),
    listAllUsers(sa),
  ])

  // Map email + user_metadata.full_name depuis auth
  const authMap: Record<string, { email: string; metaName?: string }> = {}
  for (const u of authRes) {
    if (ids.includes(u.id)) {
      const meta = u.user_metadata as Record<string, string> | undefined
      authMap[u.id] = {
        email: u.email ?? '',
        metaName: meta?.full_name || meta?.name || undefined,
      }
    }
  }

  const addrMap: Record<string, { name: string; phone: string; city: string }> = {}
  for (const a of addressesRes.data ?? []) {
    addrMap[a.user_id] = { name: a.full_name ?? '', phone: a.phone ?? '', city: a.city ?? '' }
  }

  function resolveName(id: string): string {
    if (addrMap[id]?.name)         return addrMap[id].name
    if (authMap[id]?.metaName)     return authMap[id].metaName!
    if (authMap[id]?.email)        return authMap[id].email.split('@')[0]
    return `Tailleur ${id.slice(0, 6)}`
  }

  const assignStats: Record<string, Record<string, number>> = {}
  for (const a of assignmentsRes.data ?? []) {
    if (!assignStats[a.tailor_id]) assignStats[a.tailor_id] = {}
    assignStats[a.tailor_id][a.status] = (assignStats[a.tailor_id][a.status] ?? 0) + 1
  }

  const reviewStats: Record<string, { total: number; count: number }> = {}
  for (const r of reviewsRes.data ?? []) {
    if (!reviewStats[r.tailor_id]) reviewStats[r.tailor_id] = { total: 0, count: 0 }
    reviewStats[r.tailor_id].total += r.rating
    reviewStats[r.tailor_id].count += 1
  }

  const completedOrderIds = (assignmentsRes.data ?? [])
    .filter((a) => a.status === 'completed')
    .map((a) => a.order_id)

  const earningsMap: Record<string, number> = {}
  if (completedOrderIds.length > 0) {
    const { data: orders } = await sa
      .from('orders')
      .select('id, total_amount, primary_tailor_id')
      .in('id', completedOrderIds)
    for (const o of orders ?? []) {
      if (o.primary_tailor_id) {
        earningsMap[o.primary_tailor_id] = (earningsMap[o.primary_tailor_id] ?? 0) + (o.total_amount ?? 0)
      }
    }
  }

  const tailors = ids.map((id) => {
    const stats = assignStats[id] ?? {}
    const rev = reviewStats[id] ?? { total: 0, count: 0 }
    return {
      id,
      name:               resolveName(id),
      phone:              addrMap[id]?.phone || '—',
      city:               addrMap[id]?.city  || '—',
      created_at:         createdMap[id] ?? '',
      total_assignments:  Object.values(stats).reduce((s, v) => s + v, 0),
      pending:            stats.pending ?? 0,
      in_progress:        (stats.in_progress ?? 0) + (stats.accepted ?? 0),
      completed:          stats.completed ?? 0,
      rejected:           (stats.rejected ?? 0) + (stats.cancelled ?? 0),
      avg_rating:         rev.count > 0 ? rev.total / rev.count : 0,
      review_count:       rev.count,
      total_earned:       earningsMap[id] ?? 0,
    }
  })

  return NextResponse.json({ tailors })
}
