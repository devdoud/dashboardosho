import { NextResponse, type NextRequest } from 'next/server'
import { adminClient, guardAdmin, parsePage, escapeLike } from '@/lib/supabase/admin'
import { parseFilter, paymentAttemptStatusSchema } from '@/lib/validation'

/** GET /api/admin/payments?page=0&status=all&search= */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin('read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const page   = parsePage(searchParams.get('page'))
  const status = parseFilter(searchParams.get('status'), paymentAttemptStatusSchema)
  const search = (searchParams.get('search') ?? '').trim()
  const size   = 20

  const sa = adminClient()

  // Payments list
  let query = sa
    .from('payment_attempts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('stripe_payment_intent_id', `%${escapeLike(search)}%`)

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
