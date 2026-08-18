import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin } from '@/lib/supabase/admin'
import { parseBody, categoryInsertSchema, categoryPatchSchema } from '@/lib/validation'
import type { CategoryInsert, CategoryUpdate } from '@/types/database'

export async function POST(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, categoryInsertSchema)
  if (response) return response

  const { data, error } = await adminClient()
    .from('categories')
    .insert(body as unknown as CategoryInsert)
    .select()
    .single()

  if (error) {
    console.error('[categories.POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, categoryPatchSchema)
  if (response) return response

  const { id, ...patch } = body
  const { error } = await adminClient()
    .from('categories')
    .update(patch as unknown as CategoryUpdate)
    .eq('id', id)

  if (error) {
    console.error('[categories.PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient().from('categories').delete().eq('id', id)
  if (error) {
    console.error('[categories.DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
