import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  ACTIVITY_COOKIE,
  ACTIVITY_REFRESH_MS,
  evaluateSession,
  readActivity,
  signActivity,
  type SessionEndReason,
} from '@/lib/session'

/**
 * Cache mémoire du rôle admin.
 *
 * `checkAdminRole` déclenchait un aller-retour Supabase sur CHAQUE requête
 * traversant le proxy — soit deux appels réseau (getUser + rôle) par navigation.
 * Le rôle change rarement ; on le mémorise brièvement par utilisateur.
 */
const ROLE_TTL_MS = 60_000
const roleCache = new Map<string, { isAdmin: boolean; expiresAt: number }>()

/** Ferme la session : purge les cookies d'auth et renvoie vers /login. */
function endSession(request: NextRequest, reason: SessionEndReason | 'unauthorized') {
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url))
  for (const cookie of request.cookies.getAll()) {
    // Cookies de session Supabase (`sb-<ref>-auth-token`, `…-code-verifier`, …)
    if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
  }
  response.cookies.delete(ACTIVITY_COOKIE)
  return response
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // ── Routes entièrement publiques ──────────────────────────────────────────
  // Landing page, assets, etc.
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next')
  ) {
    // Si admin déjà connecté et arrive sur /login → rediriger vers le dashboard
    if (pathname.startsWith('/login')) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && await checkAdminRole(user.id)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return supabaseResponse
  }

  // ── Routes protégées (tout sauf / et /login) ─────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!await checkAdminRole(user.id)) {
    return endSession(request, 'unauthorized')
  }

  // ── Bornes de session ────────────────────────────────────────────────────
  // Supabase renouvelle le refresh token sans fin : sans ces gardes, une
  // session admin ne se ferme jamais.
  const now = new Date().getTime()
  const lastActivity = await readActivity(request.cookies.get(ACTIVITY_COOKIE)?.value, user.id)
  const verdict = evaluateSession(user.last_sign_in_at, lastActivity, now)

  if (verdict.expired) {
    await supabase.auth.signOut()
    roleCache.delete(user.id)
    return endSession(request, verdict.reason)
  }

  // Réécriture paresseuse : un Set-Cookie par minute, pas par requête.
  if (lastActivity === null || now - lastActivity > ACTIVITY_REFRESH_MS) {
    supabaseResponse.cookies.set(ACTIVITY_COOKIE, await signActivity(user.id, now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  return supabaseResponse
}

async function checkAdminRole(userId: string): Promise<boolean> {
  const cached = roleCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.isAdmin

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()

  if (error) {
    // En cas d'erreur on refuse l'accès sans la mettre en cache : un incident
    // transitoire ne doit pas verrouiller un admin pendant tout le TTL.
    console.error('[proxy] checkAdminRole error:', error.message)
    return false
  }

  const isAdmin = !!data
  roleCache.set(userId, { isAdmin, expiresAt: Date.now() + ROLE_TTL_MS })
  return isAdmin
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
