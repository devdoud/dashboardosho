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

/**
 * POST /api/admin/upload
 * FormData: { file: File, folder?: string, bucket?: string }
 * Returns: { url: string }
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sa = adminClient()

  const { data: roleRow } = await sa
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()
  if (!roleRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 2. Parse body
  let formData: FormData
  try { formData = await request.formData() }
  catch { return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 }) }

  const file   = formData.get('file')   as File | null
  const folder = (formData.get('folder') as string | null) ?? 'images'
  const bucket = (formData.get('bucket') as string | null) ?? 'products'

  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/'))
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024)
    return NextResponse.json({ error: 'Image too large (max 8 MB)' }, { status: 400 })

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = await file.arrayBuffer()

  // 3. Upload — crée le bucket si absent, puis réessaie
  let { error: uploadError } = await sa.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    const msg = uploadError.message.toLowerCase()
    if (msg.includes('bucket') || msg.includes('not found')) {
      // Bucket absent : le créer puis réessayer
      const { error: createErr } = await sa.storage.createBucket(bucket, {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: '8MB',
      })
      if (createErr && !createErr.message.toLowerCase().includes('already exist')) {
        return NextResponse.json({ error: `Bucket creation: ${createErr.message}` }, { status: 500 })
      }

      const retry = await sa.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type, upsert: true })
      uploadError = retry.error
    }
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = sa.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
