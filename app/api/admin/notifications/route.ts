import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, listAllUsers, escapeLike } from '@/lib/supabase/admin'
import { parseBody, notificationSchema } from '@/lib/validation'
import { checkCooldown } from '@/lib/rate-limit'

/** GET /api/admin/notifications?search=xxx — recherche d'utilisateurs par nom ou email
 *  Sans `search` : renvoie seulement le nombre d'appareils joignables.
 *  Résout les noms via l'adresse par défaut, puis les métadonnées auth (full_name/name), puis l'email.
 */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const search = (new URL(request.url).searchParams.get('search') ?? '').trim().toLowerCase()
  const sa = adminClient()

  // Le décompte de `fcm_tokens` était lu depuis le navigateur avec la clé anon.
  const { count: tokenCount } = await sa
    .from('fcm_tokens')
    .select('*', { count: 'exact', head: true })

  if (search.length < 2) return NextResponse.json({ users: [], tokenCount: tokenCount ?? 0 })

  // Noms depuis les adresses par défaut (correspondance sur le nom)
  const { data: addrs } = await sa
    .from('addresses')
    .select('user_id, full_name')
    .ilike('full_name', `%${escapeLike(search)}%`)
    .eq('is_default', true)
    .limit(50)

  const nameMap: Record<string, string> = {}
  for (const a of addrs ?? []) if (a.full_name) nameMap[a.user_id] = a.full_name

  // Utilisateurs auth (nom via métadonnées + email)
  const authUsers = await listAllUsers(sa)

  const results: { id: string; name: string; email: string }[] = []
  const seen = new Set<string>()

  for (const u of authUsers) {
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

  return NextResponse.json({ users: results.slice(0, 8), tokenCount: tokenCount ?? 0 })
}

/** Destinataires maximum pour un seul envoi. */
const MAX_RECIPIENTS = 5000

/** Délai minimal entre deux campagnes de masse (envoi individuel non concerné). */
const BROADCAST_COOLDOWN_MS = 60_000

/** Envois simultanés vers l'Edge Function — au-delà, elle est saturée. */
const SEND_CONCURRENCY = 25

type SendOutcome = { ok: boolean; error?: string }

async function sendToUser(userId: string, title: string, body: string, data: Record<string, string>): Promise<SendOutcome> {
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
  const guard = await guardAdmin('notify')
  if (!guard.ok) return guard.response

  const { data: payload, response } = await parseBody(request, notificationSchema)
  if (response) return response
  const { target, userId, title, body, data } = payload

  const sa = adminClient()
  let userIds: string[] = []

  if (target === 'user') {
    userIds = [userId!]
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

  if (userIds.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      {
        error:
          `Cet envoi viserait ${userIds.length} destinataires, au-delà du plafond ` +
          `de ${MAX_RECIPIENTS}. Segmentez la campagne.`,
      },
      { status: 413 },
    )
  }

  // Une campagne de masse est verrouillée une minute : sans ce délai, deux clics
  // sur « Envoyer » partaient en double vers tous les appareils.
  if (target !== 'user') {
    const wait = checkCooldown(`broadcast:${guard.user.id}`, BROADCAST_COOLDOWN_MS)
    if (wait > 0) {
      return NextResponse.json(
        { error: `Campagne déjà envoyée. Réessayez dans ${wait} s.` },
        { status: 429, headers: { 'Retry-After': String(wait) } },
      )
    }
  }

  // Envoi par lots : `Promise.allSettled` sur la liste entière ouvrait autant de
  // requêtes simultanées que de destinataires.
  const outcomes: SendOutcome[] = []
  for (let i = 0; i < userIds.length; i += SEND_CONCURRENCY) {
    const batch = userIds.slice(i, i + SEND_CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map((id) => sendToUser(id, title, body, data)),
    )
    for (const r of settled) {
      outcomes.push(r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) })
    }
  }

  const sent   = outcomes.filter((o) => o.ok).length
  const failed = outcomes.length - sent
  const firstError = outcomes.find((o) => !o.ok && o.error)?.error

  return NextResponse.json({ sent, failed, total: userIds.length, ...(firstError ? { error: firstError } : {}) })
}
