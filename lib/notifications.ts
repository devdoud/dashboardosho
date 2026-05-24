import type { NotificationPayload } from '@/types/database'

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`

interface SendResult {
  success: boolean
  sent: number
  failed: number
  error?: string
}

/**
 * Envoie une notification push à un utilisateur via l'Edge Function Supabase.
 * Appelé côté client — la clé service role est incluse via env public (anon suffit
 * si la fonction est accessible en public, sinon passer via une Route API).
 */
export async function sendPushNotification(
  payload: NotificationPayload,
  serviceRoleKey: string
): Promise<SendResult> {
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, sent: 0, failed: 1, error: text }
    }

    const json = await res.json().catch(() => ({}))
    return { success: true, sent: json.sent ?? 1, failed: json.failed ?? 0 }
  } catch (err) {
    return { success: false, sent: 0, failed: 1, error: String(err) }
  }
}

/**
 * Envoie une notification à plusieurs utilisateurs en séquence.
 * Retourne le nombre de succès et d'échecs.
 */
export async function sendBulkNotifications(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  serviceRoleKey: string
): Promise<SendResult> {
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    userIds.map(async (user_id) => {
      const result = await sendPushNotification({ user_id, title, body, data }, serviceRoleKey)
      if (result.success) sent += result.sent
      else failed++
    })
  )

  return { success: failed === 0, sent, failed }
}
