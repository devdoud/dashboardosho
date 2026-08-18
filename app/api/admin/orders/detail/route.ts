import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, listAllUsers } from '@/lib/supabase/admin'

/** GET /api/admin/orders/detail?orderId=xxx&userId=yyy
 *  Retourne { items, assignments, tailors, customer }
 */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const url = new URL(request.url)
  const orderId = url.searchParams.get('orderId')
  const userId  = url.searchParams.get('userId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const sa = adminClient()

  // Fetch order (for embedded items fallback), items, assignments, tailor roles in parallel
  const [orderRes, itemsRes, assignmentsRes, tailorRolesRes] = await Promise.all([
    sa.from('orders').select('*').eq('id', orderId).single(),

    sa.from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, total_price, measurements_snapshot, customization_details, configuration_snapshot')
      .eq('order_id', orderId),

    sa.from('order_assignments')
      .select('*')
      .eq('order_id', orderId)
      .order('assigned_at', { ascending: false }),

    sa.from('user_roles').select('user_id').eq('role', 'tailor'),
  ])


  // Some mobile apps embed items directly on the order as a JSON array
  const rawOrder = (orderRes.data ?? {}) as Record<string, unknown>
  type RawItem = { product_id?: string; quantity?: number; unit_price?: number; total_price?: number; [k: string]: unknown }
  const embeddedItems: RawItem[] = Array.isArray(rawOrder.items)
    ? (rawOrder.items as RawItem[])
    : Array.isArray(rawOrder.cart_items)
      ? (rawOrder.cart_items as RawItem[])
      : []

  // Build normalized items list from order_items table OR embedded fallback
  let rawItems: Array<{ product_id: string; quantity: number; unit_price: number; total_price: number; id: string; order_id: string; measurements_snapshot: unknown; customization_details: unknown; configuration_snapshot: unknown }> = []

  if ((itemsRes.data ?? []).length > 0) {
    rawItems = itemsRes.data as typeof rawItems
  } else if (embeddedItems.length > 0) {
    rawItems = embeddedItems.map((e, idx) => ({
      id: `embedded-${idx}`,
      order_id: orderId,
      product_id: String(e.product_id ?? ''),
      quantity: Number(e.quantity ?? 1),
      unit_price: Number(e.unit_price ?? e.price ?? 0),
      total_price: Number(e.total_price ?? (Number(e.unit_price ?? e.price ?? 0) * Number(e.quantity ?? 1))),
      measurements_snapshot: e.measurements_snapshot ?? null,
      customization_details: e.customization_details ?? null,
      configuration_snapshot: e.configuration_snapshot ?? null,
    }))
  }

  // Fetch products separately to avoid FK join issues
  const productIds = rawItems.map((i) => i.product_id).filter(Boolean)
  const productsRes = productIds.length > 0
    ? await sa.from('products').select('id, name, thumbnail, sku').in('id', productIds)
    : { data: [] }

  const productMap: Record<string, { id: string; name: unknown; thumbnail: string | null; sku: string }> = {}
  for (const p of productsRes.data ?? []) productMap[p.id] = p

  const items = rawItems.map((i) => ({
    ...i,
    product: productMap[i.product_id] ?? null,
  }))


  // Resolve tailor names
  const allTailorIds = [
    ...new Set([
      ...(assignmentsRes.data ?? []).map((a) => a.tailor_id),
      ...(tailorRolesRes.data ?? []).map((r) => r.user_id),
    ]),
  ]

  const addressMap: Record<string, string> = {}
  const authEmailMap: Record<string, string> = {}

  if (allTailorIds.length > 0) {
    const [addrRes, authRes] = await Promise.all([
      sa.from('addresses').select('user_id, full_name').in('user_id', allTailorIds).eq('is_default', true),
      listAllUsers(sa),
    ])
    for (const a of addrRes.data ?? []) addressMap[a.user_id] = a.full_name
    for (const u of authRes) {
      if (allTailorIds.includes(u.id)) {
        const meta = u.user_metadata as Record<string, string> | undefined
        authEmailMap[u.id] = meta?.full_name || meta?.name || u.email?.split('@')[0] || u.id.slice(0, 6)
      }
    }
  }

  function resolveName(id: string) {
    return addressMap[id] || authEmailMap[id] || `Tailleur ${id.slice(0, 6)}`
  }

  const assignments = (assignmentsRes.data ?? []).map((a) => ({
    ...a,
    tailor_name: resolveName(a.tailor_id),
  }))

  const tailors = (tailorRolesRes.data ?? []).map((r) => ({
    id: r.user_id,
    name: resolveName(r.user_id),
  }))

  // Resolve customer info
  let customer: { id: string; name: string; email: string; phone: string } | null = null
  if (userId) {
    const [custAddrRes, custAuthRes] = await Promise.all([
      sa.from('addresses').select('full_name, phone').eq('user_id', userId).eq('is_default', true).maybeSingle(),
      sa.auth.admin.getUserById(userId),
    ])
    const authUser = custAuthRes.data?.user
    const meta = authUser?.user_metadata as Record<string, string> | undefined
    const name =
      custAddrRes.data?.full_name ||
      meta?.full_name ||
      meta?.name ||
      authUser?.email?.split('@')[0] ||
      userId.slice(0, 8)
    customer = {
      id: userId,
      name,
      email: authUser?.email ?? '',
      phone: custAddrRes.data?.phone ?? '',
    }
  }

  return NextResponse.json({ items, assignments, tailors, customer })
}
