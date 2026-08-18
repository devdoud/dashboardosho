import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin } from '@/lib/supabase/admin'

/** Buckets autorisés à l'upload. Ils doivent exister (cf. migrations/002, 005). */
const ALLOWED_BUCKETS = new Set(['products', 'categories'])

/** Dossiers autorisés — évite toute construction de chemin arbitraire. */
const FOLDER_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

const MAX_BYTES = 8 * 1024 * 1024

/** Extension déduite du type MIME, jamais du nom de fichier fourni par le client. */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

/**
 * POST /api/admin/upload
 * FormData: { file: File, folder?: string, bucket?: string }
 * Returns: { url: string }
 */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin('upload')
  if (!guard.ok) return guard.response

  let formData: FormData
  try { formData = await request.formData() }
  catch { return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 }) }

  const file   = formData.get('file')
  const folder = (formData.get('folder') as string | null) ?? 'images'
  const bucket = (formData.get('bucket') as string | null) ?? 'products'

  if (!(file instanceof File))
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = EXT_BY_MIME[file.type]
  if (!ext)
    return NextResponse.json({ error: 'Format accepté : JPEG, PNG, WebP ou GIF' }, { status: 400 })

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'Image trop lourde (max 8 Mo)' }, { status: 400 })

  if (!ALLOWED_BUCKETS.has(bucket))
    return NextResponse.json({ error: 'Bucket non autorisé' }, { status: 400 })

  if (!FOLDER_RE.test(folder))
    return NextResponse.json({ error: 'Nom de dossier invalide' }, { status: 400 })

  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const sa   = adminClient()

  const { error } = await sa.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })

  if (error) {
    console.error('[upload]', error.message)
    return NextResponse.json({ error: "L'upload a échoué." }, { status: 500 })
  }

  const { data } = sa.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
