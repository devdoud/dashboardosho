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

/** GET /api/admin/orders/assign — liste des tailleurs disponibles */
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sa = adminClient()
  const { data: roles } = await sa.from('user_roles').select('user_id').eq('role', 'tailor')
  const ids = (roles ?? []).map((r) => r.user_id)

  if (ids.length === 0) return NextResponse.json({ tailors: [] })

  const [addrRes, authRes] = await Promise.all([
    sa.from('addresses').select('user_id, full_name').in('user_id', ids).eq('is_default', true),
    sa.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const nameMap: Record<string, string> = {}
  for (const a of addrRes.data ?? []) nameMap[a.user_id] = a.full_name
  for (const u of authRes.data?.users ?? []) {
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
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orderId, tailorId, notes, currentStatus } = await request.json()
  if (!orderId || !tailorId) return NextResponse.json({ error: 'orderId and tailorId required' }, { status: 400 })

  const sa = adminClient()
  const now = new Date().toISOString()

  // Annuler les assignments actifs
  await sa.from('order_assignments')
    .update({ status: 'cancelled', updated_at: now })
    .eq('order_id', orderId)
    .in('status', ['pending', 'accepted', 'in_progress'])

  // Créer le nouvel assignment
  const { error } = await sa.from('order_assignments').insert({
    order_id: orderId,
    tailor_id: tailorId,
    status: 'pending',
    assigned_at: now,
    notes: notes || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Toujours mettre à jour le tailleur principal (primary_tailor_id) sur la commande.
  // Passer la commande en "processing" si elle était encore "pending".
  const orderUpdate: Record<string, any> = {
    primary_tailor_id: tailorId,
    updated_at: now,
  }
  if (currentStatus === 'pending') {
    orderUpdate.status = 'processing'
  }

  await sa.from('orders').update(orderUpdate).eq('id', orderId)

  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/orders/assign?id=xxx — annuler un assignment */
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()

  // 1. Récupérer l'assignment pour connaître l'order_id
  const { data: assignment } = await sa.from('order_assignments')
    .select('order_id')
    .eq('id', id)
    .single()

  // 2. Annuler l'assignment
  const { error } = await sa.from('order_assignments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3. Mettre à jour la commande pour vider primary_tailor_id
  if (assignment?.order_id) {
    await sa.from('orders')
      .update({ primary_tailor_id: null, updated_at: new Date().toISOString() })
      .eq('id', assignment.order_id)
  }

  return NextResponse.json({ ok: true })
}
