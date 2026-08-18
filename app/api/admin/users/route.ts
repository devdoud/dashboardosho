import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, isSuperAdmin, listAllUsers } from '@/lib/supabase/admin'
import { parseBody, userPatchSchema } from '@/lib/validation'
import type { AddressInsert, AddressUpdate } from '@/types/database'

/**
 * GET /api/admin/users
 * Retourne { users, isSuperAdmin }
 * Le super admin voit tout. Les autres admins ne voient pas le super admin.
 */
export async function GET() {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response
  const admin = guard.user

  const currentIsSuperAdmin = isSuperAdmin(admin.email)
  const sa = adminClient()

  const authUsers = await listAllUsers(sa)
  const ids = authUsers.map((u) => u.id)
  if (ids.length === 0) return NextResponse.json({ users: [], isSuperAdmin: currentIsSuperAdmin })

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

  let users = authUsers.map((u) => ({
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

  // Les admins normaux ne voient pas le super admin
  if (!currentIsSuperAdmin) {
    users = users.filter((u) => !isSuperAdmin(u.email))
  }

  return NextResponse.json({ users, isSuperAdmin: currentIsSuperAdmin })
}

/**
 * PATCH /api/admin/users
 * Seul le super admin peut : promouvoir en admin, modifier un autre admin
 */
export async function PATCH(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response
  const admin = guard.user

  const currentIsSuperAdmin = isSuperAdmin(admin.email)

  const { data: body, response } = await parseBody(request, userPatchSchema)
  if (response) return response
  const { userId, role, full_name, phone, city } = body

  const sa = adminClient()

  // Récupérer l'email de la cible
  const { data: targetAuth } = await sa.auth.admin.getUserById(userId)
  const targetEmail = targetAuth?.user?.email ?? ''

  // Personne ne peut modifier le super admin, sauf lui-même
  if (isSuperAdmin(targetEmail) && !currentIsSuperAdmin) {
    return NextResponse.json({ error: 'Vous ne pouvez pas modifier ce compte.' }, { status: 403 })
  }

  // Seul le super admin peut promouvoir/rétrograder un admin
  if (role === 'admin' && !currentIsSuperAdmin) {
    return NextResponse.json({ error: 'Seul le super admin peut créer des administrateurs.' }, { status: 403 })
  }

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

    const patch: AddressUpdate = {}
    if (full_name !== undefined) patch.full_name = full_name
    if (phone !== undefined) patch.phone = phone
    if (city !== undefined) patch.city = city

    if (existing) {
      const { error } = await sa.from('addresses').update(patch).eq('id', existing.id)
      if (error) errors.push(`address update: ${error.message}`)
    } else {
      const newAddress = {
        user_id: userId,
        is_default: true,
        full_name: full_name ?? '',
        phone: phone ?? '',
        city: city ?? '',
        address: '',
        country: '',
      } as unknown as AddressInsert
      const { error } = await sa.from('addresses').insert(newAddress)
      if (error) errors.push(`address insert: ${error.message}`)
    }
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join(' | ') }, { status: 500 })
  return NextResponse.json({ ok: true })
}
