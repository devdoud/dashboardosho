import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const sa = adminClient()
  const { data } = await sa.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single()
  return data ? user : null
}

/**
 * GET /api/admin/users
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sa = adminClient()
  const { data: authData, error } = await sa.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authUsers = authData.users
  const ids = authUsers.map((u) => u.id)
  if (ids.length === 0) return NextResponse.json([])

  const [rolesRes, addressesRes, ordersRes] = await Promise.all([
    sa.from('user_roles').select('user_id, role').in('user_id', ids),
    sa.from('addresses').select('user_id, full_name, phone, city').in('user_id', ids).eq('is_default', true),
    sa.from('orders').select('user_id, created_at').in('user_id', ids).order('created_at', { ascending: false }),
  ])

  const roleMap: Record<string, string> = {}
  for (const r of rolesRes.data ?? []) roleMap[r.user_id] = r.role

  const addrMap: Record<string, { full_name: string; phone: string; city: string }> = {}
  for (const a of addressesRes.data ?? []) addrMap[a.user_id] = a

  const orderCountMap: Record<string, number> = {}
  const lastOrderMap: Record<string, string> = {}
  for (const o of ordersRes.data ?? []) {
    orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1
    if (!lastOrderMap[o.user_id]) lastOrderMap[o.user_id] = o.created_at
  }

  const result = authUsers.map((u) => ({
    id:           u.id,
    email:        u.email ?? '',
    created_at:   u.created_at,
    last_sign_in: u.last_sign_in_at ?? null,
    role:         roleMap[u.id] ?? null,
    full_name:    addrMap[u.id]?.full_name ?? null,
    phone:        addrMap[u.id]?.phone ?? null,
    city:         addrMap[u.id]?.city ?? null,
    order_count:  orderCountMap[u.id] ?? 0,
    last_order:   lastOrderMap[u.id] ?? null,
  }))

  return NextResponse.json(result)
}

/**
 * PATCH /api/admin/users
 * Body: { userId, role?, full_name?, phone?, city? }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { userId, role, full_name, phone, city } = body as {
    userId: string
    role?: string | null
    full_name?: string
    phone?: string
    city?: string
  }

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sa = adminClient()
  const errors: string[] = []

  // ── Mise à jour du rôle ────────────────────────────────────────────────────
  if ('role' in body) {
    const { error: delError } = await sa.from('user_roles').delete().eq('user_id', userId)
    if (delError) errors.push(`role delete: ${delError.message}`)
    else if (role) {
      const { error } = await sa.from('user_roles').insert({ user_id: userId, role })
      if (error) errors.push(`role: ${error.message}`)
    }
  }

  // ── Mise à jour du profil (adresse par défaut) ────────────────────────────
  if (full_name !== undefined || phone !== undefined || city !== undefined) {
    const { data: existing } = await sa
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle()

    const patch: Record<string, unknown> = {}
    if (full_name !== undefined) patch.full_name = full_name
    if (phone !== undefined) patch.phone = phone
    if (city !== undefined) patch.city = city

    if (existing) {
      const { error } = await sa.from('addresses').update(patch).eq('id', existing.id)
      if (error) errors.push(`address update: ${error.message}`)
    } else {
      const { error } = await sa.from('addresses').insert({
        user_id: userId,
        is_default: true,
        full_name: full_name ?? '',
        phone: phone ?? '',
        city: city ?? '',
        address: '',
        country: '',
      })
      if (error) errors.push(`address insert: ${error.message}`)
    }
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join(' | ') }, { status: 500 })
  return NextResponse.json({ ok: true })
}
