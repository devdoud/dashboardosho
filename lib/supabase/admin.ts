import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, type RateBucket } from '@/lib/rate-limit'
import type { Database } from '@/types/database'

/**
 * Client service_role — contourne entièrement RLS.
 * À n'utiliser que derrière `requireAdmin()`, jamais dans un composant client.
 */
export function adminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Retourne l'utilisateur courant s'il est admin, sinon null. */
export async function requireAdmin(): Promise<User | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await adminClient()
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  return data ? user : null
}

/** Réponse 403 standard. */
export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** `true` si l'email correspond au super admin configuré. */
export function isSuperAdmin(email: string | undefined | null): boolean {
  const superAdmin = process.env.SUPER_ADMIN_EMAIL
  if (!superAdmin) return false
  return !!email && email.toLowerCase() === superAdmin.toLowerCase()
}

/**
 * Résultat d'un garde de route : soit l'admin authentifié, soit la réponse
 * d'erreur (403 ou 429) à renvoyer telle quelle.
 */
export type Guard =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }

/**
 * Garde unique des routes admin : authentification + quota de débit.
 *
 *   const guard = await guardAdmin('read')
 *   if (!guard.ok) return guard.response
 */
export async function guardAdmin(bucket: RateBucket): Promise<Guard> {
  const user = await requireAdmin()
  if (!user) return { ok: false, response: forbidden() }

  const limited = checkRateLimit(user.id, bucket)
  if (limited) return { ok: false, response: limited }

  return { ok: true, user }
}

/**
 * Page maximale acceptée. Au-delà, PostgREST parcourt un décalage énorme pour
 * ne rien renvoyer : autant refuser la requête tout de suite.
 */
export const MAX_PAGE = 5000

/**
 * Parse un paramètre de pagination en entier dans [0, MAX_PAGE].
 * `?page=abc` ou `?page=-1` retombent sur 0 au lieu de produire un NaN.
 */
export function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? '0', 10)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(n, MAX_PAGE)
}

export { escapeLike } from '@/lib/supabase/query'

const AUTH_PAGE_SIZE = 1000

/**
 * Plafond de sécurité sur le nombre de comptes chargés en mémoire.
 * `listUsers` pagine sans fin : sans borne, une base à 500 000 comptes ferait
 * exploser la mémoire et le temps de réponse de chaque page du dashboard.
 */
export const MAX_USERS_LOADED = 10_000

/**
 * Liste les comptes auth en paginant, jusqu'à `MAX_USERS_LOADED`.
 * `listUsers({ perPage: 1000 })` plafonnait silencieusement à 1000 utilisateurs.
 */
export async function listAllUsers(sa: SupabaseClient<Database>): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await sa.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE })
    if (error) {
      console.error('[listAllUsers]', error.message)
      break
    }
    const batch = data?.users ?? []
    users.push(...batch)

    if (batch.length < AUTH_PAGE_SIZE) break

    if (users.length >= MAX_USERS_LOADED) {
      console.warn(
        `[listAllUsers] plafond de ${MAX_USERS_LOADED} comptes atteint — ` +
        'la résolution des noms sera partielle. Passer à une recherche côté base.',
      )
      break
    }
  }
  return users
}
