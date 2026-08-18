/**
 * Bornes de session du dashboard.
 *
 * Supabase renouvelle indéfiniment le refresh token : sans ces gardes, une
 * session admin restait valide pour toujours. Deux limites indépendantes :
 *
 *   * ABSOLUE   — âge maximal depuis la connexion, quelle que soit l'activité.
 *   * INACTIVITÉ — délai maximal entre deux requêtes.
 *
 * Le horodatage d'activité vit dans un cookie signé (HMAC-SHA256) : le modifier
 * sans la clé serveur invalide la signature. Ces fonctions n'utilisent que la
 * Web Crypto API, donc restent compatibles avec le runtime edge du proxy.
 */

/** Âge maximal d'une session, même active en permanence. */
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 h

/** Délai d'inactivité au-delà duquel la session est fermée. */
export const SESSION_IDLE_MS = 15 * 60 * 1000 // 15 min

/** Le cookie n'est réécrit que passé ce délai, pour éviter un Set-Cookie par requête. */
export const ACTIVITY_REFRESH_MS = 60 * 1000 // 1 min

export const ACTIVITY_COOKIE = 'osho_activity'

/** Motif de fermeture, transmis à /login pour afficher le bon message. */
export type SessionEndReason = 'session_expired' | 'session_idle'

function secret(): string {
  const value = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY doit être défini')
  return value
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Comparaison à temps constant — évite de divulguer la signature octet par octet. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Produit la valeur signée du cookie d'activité pour l'instant `now`. */
export async function signActivity(userId: string, now: number): Promise<string> {
  const payload = `${userId}.${now}`
  return `${payload}.${await hmac(payload)}`
}

/**
 * Vérifie le cookie d'activité et renvoie son horodatage.
 * `null` si absent, malformé, signé pour un autre utilisateur, ou falsifié.
 */
export async function readActivity(raw: string | undefined, userId: string): Promise<number | null> {
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null

  const [cookieUserId, rawTs, signature] = parts
  if (cookieUserId !== userId) return null

  const timestamp = Number(rawTs)
  if (!Number.isFinite(timestamp)) return null

  const expected = await hmac(`${cookieUserId}.${rawTs}`)
  if (!timingSafeEqual(signature, expected)) return null

  return timestamp
}

/**
 * Décide du sort d'une session à partir de sa date de connexion et de sa
 * dernière activité connue.
 */
export function evaluateSession(
  lastSignInAt: string | undefined,
  lastActivity: number | null,
  now: number,
): { expired: true; reason: SessionEndReason } | { expired: false } {
  if (lastSignInAt) {
    const signedInAt = Date.parse(lastSignInAt)
    if (Number.isFinite(signedInAt) && now - signedInAt > SESSION_MAX_AGE_MS) {
      return { expired: true, reason: 'session_expired' }
    }
  }

  // Pas de cookie d'activité : première requête de la session, ou cookie
  // falsifié/expiré par le navigateur. On repart d'une activité neuve — la
  // borne absolue ci-dessus reste, elle, infranchissable.
  if (lastActivity !== null && now - lastActivity > SESSION_IDLE_MS) {
    return { expired: true, reason: 'session_idle' }
  }

  return { expired: false }
}
