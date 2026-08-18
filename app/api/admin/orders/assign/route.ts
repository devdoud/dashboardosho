import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, listAllUsers } from '@/lib/supabase/admin'
import { parseBody, orderAssignSchema } from '@/lib/validation'
import type { OrderUpdate } from '@/types/database'

/** GET /api/admin/orders/assign — liste des tailleurs disponibles */
export async function GET() {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const sa = adminClient()
  const { data: roles } = await sa.from('user_roles').select('user_id').eq('role', 'tailor')
  const ids = (roles ?? []).map((r) => r.user_id)

  if (ids.length === 0) return NextResponse.json({ tailors: [] })

  const [addrRes, authRes] = await Promise.all([
    sa.from('addresses').select('user_id, full_name').in('user_id', ids).eq('is_default', true),
    listAllUsers(sa),
  ])

  const nameMap: Record<string, string> = {}
  for (const a of addrRes.data ?? []) nameMap[a.user_id] = a.full_name
  for (const u of authRes) {
    if (ids.includes(u.id) && !nameMap[u.id]) {
      const meta = u.user_metadata as Record<string, string> | undefined
      nameMap[u.id] = meta?.full_name || meta?.name || u.email?.split('@')[0] || u.id.slice(0, 6)
    }
  }

  const tailors = ids.map((id) => ({ id, name: nameMap[id] ?? id.slice(0, 8) }))

  return NextResponse.json({ tailors })
}

/** POST /api/admin/orders/assign — assigner un tailleur */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, orderAssignSchema)
  if (response) return response
  const { orderId, tailorId, notes, currentStatus } = body

  const sa = adminClient()
  const now = new Date().toISOString()

  // Annuler les assignments actifs des autres tailleurs
  await sa.from('order_assignments')
    .update({ status: 'cancelled', updated_at: now })
    .eq('order_id', orderId)
    .neq('tailor_id', tailorId)
    .in('status', ['pending', 'accepted', 'in_progress'])

  // Supprimer tout ancien assignment (refusé, annulé…) pour ce tailleur spécifique
  // afin d'éviter un conflit de contrainte unique (order_id, tailor_id)
  await sa.from('order_assignments')
    .delete()
    .eq('order_id', orderId)
    .eq('tailor_id', tailorId)

  // Créer le nouvel assignment
  const { error } = await sa.from('order_assignments').insert({
    order_id: orderId,
    tailor_id: tailorId,
    status: 'pending',
    assigned_at: now,
    notes: notes || null,
  })
  if (error) {
    console.error('[assign] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // `primary_tailor_id` n'est PAS écrit ici : le trigger `sync_order_primary_tailor`
  // (migrations/006) est la source de vérité unique et l'a déjà recalculé sur l'INSERT
  // ci-dessus. L'écrire aussi depuis la route créait deux écritures concurrentes.
  // Seule la transition pending → processing reste du ressort de l'application.
  if (currentStatus === 'pending') {
    const patch: OrderUpdate = { status: 'processing', updated_at: now }
    await sa.from('orders').update(patch).eq('id', orderId)
  }

  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/orders/assign?id=xxx — annuler un assignment */
export async function DELETE(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()

  // Annuler l'assignment — le trigger `sync_order_primary_tailor` remet
  // `orders.primary_tailor_id` à jour tout seul.
  const { error } = await sa.from('order_assignments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
