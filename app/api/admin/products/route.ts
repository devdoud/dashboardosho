import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin } from '@/lib/supabase/admin'
import { parseBody, productInsertSchema, productPatchSchema } from '@/lib/validation'
import type { ProductInsert, ProductUpdate } from '@/types/database'

/** POST /api/admin/products — créer un produit */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, productInsertSchema)
  if (response) return response

  const { data, error } = await adminClient()
    .from('products')
    .insert(body as unknown as ProductInsert)
    .select()
    .single()

  if (error) {
    console.error('[products.POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

/** PATCH /api/admin/products — modifier ou toggle vedette */
export async function PATCH(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const { data: body, response } = await parseBody(request, productPatchSchema)
  if (response) return response

  const { id, ...patch } = body
  const { error } = await adminClient()
    .from('products')
    .update(patch as unknown as ProductUpdate)
    .eq('id', id)

  if (error) {
    console.error('[products.PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/products?id=xxx — supprimer un produit */
export async function DELETE(request: NextRequest) {
  const guard = await guardAdmin('write')
  if (!guard.ok) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient().from('products').delete().eq('id', id)
  if (error) {
    console.error('[products.DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
