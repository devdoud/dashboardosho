import { NextResponse } from 'next/server'

/**
 * Limitation de débit des routes admin.
 *
 * Les routes /api/admin/* travaillent en service_role : elles contournent RLS
 * et lisent l'intégralité des tables. Sans quota, une boucle d'interface ou un
 * script authentifié peut marteler la base sans borne.
 *
 * ⚠️ Le compteur est EN MÉMOIRE, donc par instance : sur un déploiement
 * multi-instance (Vercel, conteneurs répliqués), la limite effective est
 * `quota × nombre d'instances`. C'est un garde-fou contre les emballements,
 * pas une défense contre un attaquant déterminé. Pour une limite stricte,
 * remplacer le Map par un compteur partagé (Upstash Redis, Supabase, …) :
 * seule l'implémentation de `hit()` est à changer.
 */

export type RateBucket = 'read' | 'write' | 'upload' | 'notify'

/** Quotas par fenêtre glissante, exprimés par utilisateur. */
const QUOTAS: Record<RateBucket, { limit: number; windowMs: number }> = {
  read:   { limit: 120, windowMs: 60_000 },
  write:  { limit: 30,  windowMs: 60_000 },
  upload: { limit: 10,  windowMs: 60_000 },
  notify: { limit: 3,   windowMs: 60_000 },
}

type Entry = { count: number; resetAt: number }

const counters = new Map<string, Entry>()

/** Purge les entrées échues — borne la taille du Map sur un processus long. */
function sweep(now: number) {
  if (counters.size < 1000) return
  for (const [key, entry] of counters) {
    if (entry.resetAt <= now) counters.delete(key)
  }
}

function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  sweep(now)

  const entry = counters.get(key)
  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  entry.count += 1
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterSec: 0 }
}

/**
 * Consomme un jeton pour `userId` sur `bucket`.
 * Retourne une réponse 429 prête à renvoyer si le quota est dépassé, sinon `null`.
 */
export function checkRateLimit(userId: string, bucket: RateBucket): NextResponse | null {
  const { limit, windowMs } = QUOTAS[bucket]
  const result = hit(`${bucket}:${userId}`, limit, windowMs)
  if (result.allowed) return null

  return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez dans un instant.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSec),
        'RateLimit-Limit': String(limit),
        'RateLimit-Remaining': '0',
      },
    },
  )
}

/**
 * Verrou de fréquence pour une action ponctuelle (campagne de notifications…).
 * Retourne le nombre de secondes restantes si l'action est encore verrouillée.
 */
const cooldowns = new Map<string, number>()

export function checkCooldown(key: string, cooldownMs: number): number {
  const now = Date.now()
  const until = cooldowns.get(key)
  if (until && until > now) return Math.ceil((until - now) / 1000)
  cooldowns.set(key, now + cooldownMs)
  return 0
}
