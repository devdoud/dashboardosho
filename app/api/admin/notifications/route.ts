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
    let query = sa.from('user_roles').select('user_id')
    if (target === 'all_customers') query = query.eq('role', 'customer')
    if (target === 'all_tailors')   query = query.eq('role', 'tailor')
    // all_users: no filter

    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userIds = (rows ?? []).map((r) => r.user_id)
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'Aucun utilisateur trouvé pour cette cible.' }, { status: 404 })
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
