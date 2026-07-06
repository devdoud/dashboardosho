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

/** GET /api/admin/notifications?search=xxx — recherche d'utilisateurs par nom ou email
 *  Résout les noms via l'adresse par défaut, puis les métadonnées auth (full_name/name), puis l'email.
 */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const search = (new URL(request.url).searchParams.get('search') ?? '').trim().toLowerCase()
  if (search.length < 2) return NextResponse.json({ users: [] })

  const sa = adminClient()

  // Noms depuis les adresses par défaut (correspondance sur le nom)
  const { data: addrs } = await sa
    .from('addresses')
    .select('user_id, full_name')
    .ilike('full_name', `%${search}%`)
    .eq('is_default', true)
    .limit(50)

  const nameMap: Record<string, string> = {}
  for (const a of addrs ?? []) if (a.full_name) nameMap[a.user_id] = a.full_name

  // Utilisateurs auth (nom via métadonnées + email)
  const { data: authData } = await sa.auth.admin.listUsers({ perPage: 1000 })

  const results: { id: string; name: string; email: string }[] = []
  const seen = new Set<string>()

  for (const u of authData?.users ?? []) {
    const meta = u.user_metadata as Record<string, string> | undefined
    const metaName = meta?.full_name || meta?.name || ''
    const addrName = nameMap[u.id] || ''
    const email = u.email ?? ''
    const haystack = `${addrName} ${metaName} ${email}`.toLowerCase()
    if (!haystack.includes(search)) continue
    results.push({
      id: u.id,
      name: addrName || metaName || email.split('@')[0] || `Utilisateur ${u.id.slice(0, 6)}`,
      email,
    })
    seen.add(u.id)
  }

  // Adresses trouvées hors des 1000 premiers comptes auth (repli)
  for (const [id, name] of Object.entries(nameMap)) {
    if (!seen.has(id)) results.push({ id, name, email: '' })
  }

  return NextResponse.json({ users: results.slice(0, 8) })
}

async function sendToUser(userId: string, title: string, body: string, data: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const sa = adminClient()
    const { error } = await sa.functions.invoke('send-notification', {
      body: { user_id: userId, title, body, data },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { target, userId, title, body, data } = await request.json() as {
    target: 'user' | 'all_customers' | 'all_tailors' | 'all_users'
    userId?: string
    title: string
    body: string
    data: Record<string, string>
  }

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const sa = adminClient()
  let userIds: string[] = []

  if (target === 'user') {
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    userIds = [userId]
  } else {
    // Univers des destinataires joignables = utilisateurs ayant un appareil (token FCM).
    // Les clients n'ont pas toujours de ligne dans user_roles (rôle null) : on ne peut
    // donc pas filtrer sur role = 'customer'. On part des tokens, puis on exclut par rôle.
    const { data: tokenRows, error: tokErr } = await sa.from('fcm_tokens').select('user_id')
    if (tokErr) return NextResponse.json({ error: tokErr.message }, { status: 500 })
    const reachable = [...new Set((tokenRows ?? []).map((t) => t.user_id))]

    if (target === 'all_users') {
      userIds = reachable
    } else {
      const { data: roles, error: rolesErr } = await sa.from('user_roles').select('user_id, role')
      if (rolesErr) return NextResponse.json({ error: rolesErr.message }, { status: 500 })
      const tailorIds = new Set((roles ?? []).filter((r) => r.role === 'tailor').map((r) => r.user_id))
      const adminIds  = new Set((roles ?? []).filter((r) => r.role === 'admin').map((r) => r.user_id))

      userIds = target === 'all_tailors'
        ? reachable.filter((id) => tailorIds.has(id))
        // all_customers : joignables qui ne sont ni tailleurs ni admins
        : reachable.filter((id) => !tailorIds.has(id) && !adminIds.has(id))
    }
  }

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: 'Aucun destinataire joignable pour cette cible (aucun appareil enregistré).' },
      { status: 404 },
    )
  }

  const results = await Promise.allSettled(
    userIds.map((id) => sendToUser(id, title, body, data))
  )

  const sent   = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length
  const failed = results.length - sent
  const errors = results
    .filter((r): r is PromiseFulfilledResult<{ ok: boolean; error?: string }> => r.status === 'fulfilled' && !r.value.ok)
    .map((r) => r.value.error)
    .filter(Boolean)

  const firstError = errors[0]

  return NextResponse.json({ sent, failed, total: userIds.length, ...(firstError ? { error: firstError } : {}) })
}
