import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, parsePage, escapeLike, listAllUsers } from '@/lib/supabase/admin'
import { parseBody, parseFilter, orderPatchSchema, orderStatusSchema, paymentStatusSchema } from '@/lib/validation'
import type { Order, OrderUpdate } from '@/types/database'

/** GET /api/admin/orders?page=0&status=all&payment=all&search= */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const page    = parsePage(searchParams.get('page'))
  const status  = parseFilter(searchParams.get('status'), orderStatusSchema)
  const payment = parseFilter(searchParams.get('payment'), paymentStatusSchema)
  const search  = (searchParams.get('search') ?? '').trim()
  const size    = 20

  const sa = adminClient()
  let query = sa
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1)

  if (status)  query = query.eq('status', status)
  if (payment) query = query.eq('payment_status', payment)
  // `id` est un uuid : le cast en texte est nécessaire pour un ILIKE.
  if (search)            query = query.ilike('id::text', `%${escapeLike(search)}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type OrderRow = Order & Record<string, unknown>
  const orders = (data ?? []) as OrderRow[]

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

  const pickTailorId = (order: OrderRow): string | null => {
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
      listAllUsers(sa),
    ])
    for (const a of addrRes.data ?? []) nameMap[a.user_id] = a.full_name
    for (const u of authRes) {
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
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, orderPatchSchema)
  if (response) return response
  const { id, status, payment_status, primary_tailor_id } = body

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

  const patch: OrderUpdate = { updated_at: new Date().toISOString() }
  if (status !== undefined)            patch.status = status
  if (payment_status !== undefined)    patch.payment_status = payment_status
  if (primary_tailor_id !== undefined) patch.primary_tailor_id = primary_tailor_id

  const { error } = await sa.from('orders').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
