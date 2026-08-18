import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, listAllUsers } from '@/lib/supabase/admin'
import { parseBody, promoteTailorSchema } from '@/lib/validation'

/** POST /api/admin/tailors/promote — attribuer le rôle tailleur par email */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, promoteTailorSchema)
  if (response) return response
  const { email } = body

  const sa = adminClient()

  // Chercher l'utilisateur par email dans auth.users
  const authUsers = await listAllUsers(sa)

  const user = authUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable. Vérifiez l\'email.' }, { status: 404 })

  // Supprimer l'ancien rôle s'il existe, puis insérer tailor
  await sa.from('user_roles').delete().eq('user_id', user.id)
  const { error } = await sa.from('user_roles').insert({ user_id: user.id, role: 'tailor' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, userId: user.id })
}

/** DELETE /api/admin/tailors/promote?userId=xxx — révoquer le rôle tailleur */
export async function DELETE(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sa = adminClient()
  const { error } = await sa.from('user_roles').delete().eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
