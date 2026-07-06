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

/** GET /api/admin/orders?page=0&status=all&payment=all&search= */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page    = parseInt(searchParams.get('page') ?? '0')
  const status  = searchParams.get('status') ?? 'all'
  const payment = searchParams.get('payment') ?? 'all'
  const search  = searchParams.get('search') ?? ''
  const size    = 20

  const sa = adminClient()
  let query = sa
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1)

  if (status  !== 'all') query = query.eq('status', status)
  if (payment !== 'all') query = query.eq('payment_status', payment)
  if (search)            query = query.ilike('id', `%${search}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orders = (data ?? []) as Array<Record<string, any>>

  // ── Résoudre le tailleur responsable de chaque commande ──────────────────────
  // primary_tailor_id peut être vidé une fois la commande terminée ; on retombe
  // alors sur l'assignation active, puis sur celle qui a terminé la commande.
  const orderIds = orders.map((o) => o.id)
  const assignmentsByOrder: Record<string, Array<{ tailor_id: string; status: string }>> = {}
  if (orderIds.length > 0) {
    const { data: asg } = await sa
      .from('order_assignments')
      .select('order_id, tailor_id, status, assigned_at')
      .in('order_id', orderIds)
      .order('assigned_at', { ascending: false })
    for (const a of asg ?? []) {
      (assignmentsByOrder[a.order_id] ??= []).push({ tailor_id: a.tailor_id, status: a.status })
    }
  }

  const pickTailorId = (order: Record<string, any>): string | null => {
    if (order.primary_tailor_id) return order.primary_tailor_id
    const list = assignmentsByOrder[order.id] ?? []
    const active = list.find((a) => ['pending', 'accepted', 'in_progress'].includes(a.status))
    if (active) return active.tailor_id
    const completed = list.find((a) => a.status === 'completed')
    return completed?.tailor_id ?? null
  }

  const tailorIds = [...new Set(orders.map(pickTailorId).filter((id): id is string => !!id))]
  const nameMap: Record<string, string> = {}
  if (tailorIds.length > 0) {
    const [addrRes, authRes] = await Promise.all([
      sa.from('addresses').select('user_id, full_name').in('user_id', tailorIds).eq('is_default', true),
      sa.auth.admin.listUsers({ perPage: 1000 }),
    ])
    for (const a of addrRes.data ?? []) nameMap[a.user_id] = a.full_name
    for (const u of authRes.data?.users ?? []) {
      if (tailorIds.includes(u.id) && !nameMap[u.id]) {
        const meta = u.user_metadata as Record<string, string> | undefined
        nameMap[u.id] = meta?.full_name || meta?.name || u.email?.split('@')[0] || u.id.slice(0, 6)
      }
    }
  }

  const ordersOut = orders.map((o) => {
    const tid = pickTailorId(o)
    return { ...o, tailor_id: tid, tailor_name: tid ? nameMap[tid] ?? `Tailleur ${tid.slice(0, 6)}` : null }
  })

  return NextResponse.json({ orders: ordersOut, total: count ?? 0 })
}

/** PATCH /api/admin/orders — mettre à jour le statut */
export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, payment_status, primary_tailor_id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sa = adminClient()

  // Garde-fou : on ne peut expédier une commande que si le tailleur l'a terminée
  if (status === 'shipped') {
    const { data: completed } = await sa
      .from('order_assignments')
      .select('id')
      .eq('order_id', id)
      .eq('status', 'completed')
      .limit(1)
    if (!completed || completed.length === 0) {
      return NextResponse.json(
        { error: "La commande doit d'abord être terminée par le tailleur avant d'être expédiée." },
        { status: 409 },
      )
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined)           patch.status = status
  if (payment_status !== undefined)   patch.payment_status = payment_status
  if (primary_tailor_id !== undefined) patch.primary_tailor_id = primary_tailor_id

  const { error } = await sa.from('orders').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
