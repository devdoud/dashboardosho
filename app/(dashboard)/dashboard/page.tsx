import { redirect } from 'next/navigation'
import { adminClient, requireAdmin, listAllUsers } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { PageHeader, SectionLabel, StatRow, Price } from '@/components/ui/atelier'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { OrdersStatusChart } from '@/components/dashboard/orders-status-chart'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard' }

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const

const ORDER_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours', variant: 'info' },
  shipped: { label: 'Expédié', variant: 'secondary' },
  delivered: { label: 'Livré', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
}

/**
 * Lectures en service_role, derrière `requireAdmin()`.
 * Auparavant cette page interrogeait `orders` et `payment_attempts` avec la clé
 * anon : les données n'étaient protégées que par des policies RLS non versionnées.
 */
async function getStats() {
  const sa = adminClient()
  const now = new Date()
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [
    { count: totalOrders },
    { count: monthOrders },
    { count: lastMonthOrders },
    { data: revenueData },
    { data: lastMonthRevenue },
    { data: recentOrders },
    { data: paymentStats },
    { data: roleRows },
    authUsers,
    statusCountEntries,
  ] = await Promise.all([
    sa.from('orders').select('*', { count: 'exact', head: true }),
    sa.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    sa.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
    sa.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startOfMonth),
    sa.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
    sa.from('orders').select('id, status, total_amount, payment_status, created_at, user_id').order('created_at', { ascending: false }).limit(5),
    sa.from('payment_attempts').select('amount').eq('status', 'succeeded').gte('created_at', startOfMonth),
    sa.from('user_roles').select('role'),
    listAllUsers(sa),
    // Un COUNT par statut plutôt qu'un chargement de toutes les commandes.
    Promise.all(
      ORDER_STATUSES.map(async (status) => {
        const { count } = await sa.from('orders').select('*', { count: 'exact', head: true }).eq('status', status)
        return [status, count ?? 0] as const
      }),
    ),
  ])

  const monthRevenue = revenueData?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
  const lastRevenue  = lastMonthRevenue?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
  const revenuePct   = lastRevenue > 0 ? ((monthRevenue - lastRevenue) / lastRevenue) * 100 : 0

  const ordersPct = (lastMonthOrders ?? 0) > 0
    ? (((monthOrders ?? 0) - (lastMonthOrders ?? 0)) / (lastMonthOrders ?? 0)) * 100
    : 0

  // Les clients n'ont pas de ligne dans `user_roles` (rôle null) : compter
  // `role = 'customer'` renvoyait systématiquement 0. On déduit donc les
  // comptes staff du total des comptes auth.
  const staffCount = (roleRows ?? []).filter((r) => r.role === 'admin' || r.role === 'tailor').length
  const totalCustomers = Math.max(authUsers.length - staffCount, 0)

  // Tous les statuts, y compris à zéro : une barre absente ne se lit pas.
  const statusData = statusCountEntries.map(([name, value]) => ({
    label: ORDER_STATUS_BADGE[name]?.label ?? name,
    value,
  }))

  // Revenus des 6 derniers mois — regroupés sur (année, mois) et non sur le
  // libellé court, qui se répète d'une année sur l'autre.
  type MonthEntry = { key: string; month: string; revenue: number }
  const months: MonthEntry[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('fr-FR', { month: 'short' }),
      revenue: 0,
    })
  }
  const byKey = new Map(months.map((m) => [m.key, m]))

  const { data: allPaidOrders } = await sa
    .from('orders')
    .select('total_amount, paid_at')
    .eq('payment_status', 'paid')
    .gte('paid_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
    .order('paid_at', { ascending: true })

  for (const order of allPaidOrders ?? []) {
    if (!order.paid_at) continue
    const d = new Date(order.paid_at)
    const m = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (m) m.revenue += order.total_amount ?? 0
  }

  return {
    totalOrders:   totalOrders ?? 0,
    monthOrders:   monthOrders ?? 0,
    ordersPct,
    monthRevenue,
    revenuePct,
    totalUsers:    totalCustomers,
    statusData,
    revenueChart:  months.map(({ month, revenue }) => ({ month, revenue })),
    recentOrders:  recentOrders ?? [],
    totalPayments: paymentStats?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0,
  }
}

export default async function DashboardPage() {
  if (!await requireAdmin()) redirect('/login?error=unauthorized')

  const stats = await getStats()

  return (
    <div className="space-y-10">
      <PageHeader title="Dashboard" description="Vue d'ensemble de l'atelier" />

      <StatRow
        items={[
          { label: 'Commandes ce mois', value: stats.monthOrders, pct: stats.ordersPct, sub: `${stats.totalOrders} au total` },
          { label: 'Revenus ce mois', value: formatCurrency(stats.monthRevenue), pct: stats.revenuePct, sub: 'Commandes payées' },
          { label: 'Clients', value: stats.totalUsers, sub: 'Comptes enregistrés' },
          { label: 'Paiements du mois', value: formatCurrency(stats.totalPayments), sub: 'Via Stripe' },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="revenue-title">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="revenue-title" className="serif-md text-xl font-semibold">Revenus mensuels</h2>
            <span className="text-sm text-muted">6 derniers mois</span>
          </div>
          <RevenueChart data={stats.revenueChart} />
        </section>

        <section aria-labelledby="status-title">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="status-title" className="serif-md text-xl font-semibold">Statut des commandes</h2>
            <span className="text-sm text-muted">Toutes</span>
          </div>
          <OrdersStatusChart data={stats.statusData} />
        </section>
      </div>

      <section aria-labelledby="recent-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <SectionLabel as="h2" id="recent-title">Commandes récentes</SectionLabel>
          </div>
          <Link
            href="/orders"
            className="inline-flex min-h-11 items-center gap-1.5 text-md font-medium text-accent underline-offset-4 hover:underline"
          >
            Toutes les commandes <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <p className="border-y border-hairline py-10 text-center text-md text-muted">
            Aucune commande pour l&apos;instant.
          </p>
        ) : (
          <ul className="border-t border-hairline">
            {stats.recentOrders.map((order) => {
              const s = ORDER_STATUS_BADGE[order.status] ?? { label: order.status, variant: 'outline' as const }
              return (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-md">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Price className="min-w-[110px] text-right">{formatCurrency(order.total_amount)}</Price>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
