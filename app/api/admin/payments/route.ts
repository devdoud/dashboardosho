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

/** GET /api/admin/payments?page=0&status=all&search= */
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page   = parseInt(searchParams.get('page') ?? '0')
  const status = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const size   = 20

  const sa = adminClient()

  // Payments list
  let query = sa
    .from('payment_attempts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1)

  if (status !== 'all') query = query.eq('status', status)
  if (search) query = query.ilike('stripe_payment_intent_id', `%${search}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stats (parallel)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [succeededRes, failedRes, pendingRes, monthRes] = await Promise.all([
    sa.from('payment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'succeeded'),
    sa.from('payment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    sa.from('payment_attempts').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    sa.from('payment_attempts').select('amount').eq('status', 'succeeded').gte('created_at', startOfMonth),
  ])

  const revenueMonth = (monthRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)

  return NextResponse.json({
    payments: data ?? [],
    total: count ?? 0,
    stats: {
      totalSucceeded: succeededRes.count ?? 0,
      totalFailed:    failedRes.count ?? 0,
      totalPending:   pendingRes.count ?? 0,
      revenueMonth,
    },
  })
}
