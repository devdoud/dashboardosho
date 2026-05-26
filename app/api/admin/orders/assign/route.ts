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

  // Passer la commande en "processing" si elle était encore "pending"
  if (currentStatus === 'pending') {
    await sa.from('orders').update({
      status: 'processing',
      primary_tailor_id: tailorId,
      updated_at: now,
    }).eq('id', orderId)
  }

  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/orders/assign?id=xxx — annuler un assignment */
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()
  const { error } = await sa.from('order_assignments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
