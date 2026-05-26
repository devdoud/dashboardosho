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

/** GET /api/admin/tailors/detail?tailorId=xxx */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tailorId = new URL(request.url).searchParams.get('tailorId')
  if (!tailorId) return NextResponse.json({ error: 'tailorId required' }, { status: 400 })

  const sa = adminClient()

  const { data } = await sa
    .from('order_assignments')
    .select('id, order_id, status, assigned_at, completed_at, notes')
    .eq('tailor_id', tailorId)
    .order('assigned_at', { ascending: false })
    .limit(20)

  const list = data ?? []
  const orderIds = list.map((a) => a.order_id)

  const totalsMap: Record<string, number> = {}
  if (orderIds.length > 0) {
    const { data: orders } = await sa
      .from('orders')
      .select('id, total_amount')
      .in('id', orderIds)
    for (const o of orders ?? []) totalsMap[o.id] = o.total_amount ?? 0
  }

  const assignments = list.map((a) => ({
    id:          a.id,
    order_id:    a.order_id,
    status:      a.status,
    assigned_at: a.assigned_at,
    completed_at:a.completed_at,
    notes:       a.notes,
    order_total: totalsMap[a.order_id] ?? 0,
  }))

  return NextResponse.json({ assignments })
}
