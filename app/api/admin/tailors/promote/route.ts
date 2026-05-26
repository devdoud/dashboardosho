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

/** POST /api/admin/tailors/promote — attribuer le rôle tailleur par email */
export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const sa = adminClient()

  // Chercher l'utilisateur par email dans auth.users
  const { data: authData, error: authError } = await sa.auth.admin.listUsers({ perPage: 1000 })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const user = authData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable. Vérifiez l\'email.' }, { status: 404 })

  // Supprimer l'ancien rôle s'il existe, puis insérer tailor
  await sa.from('user_roles').delete().eq('user_id', user.id)
  const { error } = await sa.from('user_roles').insert({ user_id: user.id, role: 'tailor' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, userId: user.id })
}

/** DELETE /api/admin/tailors/promote?userId=xxx — révoquer le rôle tailleur */
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sa = adminClient()
  const { error } = await sa.from('user_roles').delete().eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
