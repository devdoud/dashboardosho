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

/** GET /api/admin/orders/detail?orderId=xxx
 *  Retourne { items, assignments, tailors }
 */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orderId = new URL(request.url).searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const sa = adminClient()

  const [itemsRes, assignmentsRes, tailorRolesRes] = await Promise.all([
    sa.from('order_items')
      .select('*, product:products(id, name, thumbnail, sku)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),

    sa.from('order_assignments')
      .select('*')
      .eq('order_id', orderId)
      .order('assigned_at', { ascending: false }),

    sa.from('user_roles').select('user_id').eq('role', 'tailor'),
  ])

  // Enrichir assignments avec les noms des tailleurs
  const allTailorIds = [
    ...new Set([
      ...(assignmentsRes.data ?? []).map((a) => a.tailor_id),
      ...(tailorRolesRes.data ?? []).map((r) => r.user_id),
    ]),
  ]

  const addressMap: Record<string, string> = {}
  if (allTailorIds.length > 0) {
    const { data: addresses } = await sa
      .from('addresses')
      .select('user_id, full_name')
      .in('user_id', allTailorIds)
      .eq('is_default', true)
    for (const a of addresses ?? []) addressMap[a.user_id] = a.full_name
  }

  const assignments = (assignmentsRes.data ?? []).map((a) => ({
    ...a,
    tailor_name: addressMap[a.tailor_id] ?? `Tailleur ${a.tailor_id.slice(0, 6)}`,
  }))

  const tailors = (tailorRolesRes.data ?? []).map((r) => ({
    id: r.user_id,
    name: addressMap[r.user_id] ?? `Tailleur ${r.user_id.slice(0, 6)}`,
  }))

  return NextResponse.json({
    items: itemsRes.data ?? [],
    assignments,
    tailors,
  })
}
