import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { OrdersStatusChart } from '@/components/dashboard/orders-status-chart'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  ShoppingBag,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard' }

async function getStats() {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [
    { count: totalOrders },
    { count: monthOrders },
    { count: lastMonthOrders },
    { data: revenueData },
    { data: lastMonthRevenue },
    { count: totalUsers },
    { data: ordersByStatus },
    { data: recentOrders },
    { data: paymentStats },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startOfMonth),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('orders').select('status'),
    supabase.from('orders').select('id, status, total_amount, payment_status, created_at, user_id').order('created_at', { ascending: false }).limit(5),
    supabase.from('payment_attempts').select('amount, status').eq('status', 'succeeded').gte('created_at', startOfMonth),
  ])

  const monthRevenue = revenueData?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
  const lastRevenue = lastMonthRevenue?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
  const revenuePct = lastRevenue > 0 ? ((monthRevenue - lastRevenue) / lastRevenue) * 100 : 0

  const ordersPct = (lastMonthOrders ?? 0) > 0
    ? (((monthOrders ?? 0) - (lastMonthOrders ?? 0)) / (lastMonthOrders ?? 0)) * 100
    : 0

  // Status counts
  const statusCounts: Record<string, number> = {}
  for (const o of ordersByStatus ?? []) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444',
  }

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] ?? '#6b7280',
  }))

  // Monthly revenue for chart (last 6 months)
  type MonthEntry = { month: string; revenue: number; start: string; end: string }
  const months: MonthEntry[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    const month = d.toLocaleString('fr-FR', { month: 'short' })
    months.push({ month, revenue: 0, start, end })
  }

  const { data: allPaidOrders } = await supabase
    .from('orders')
    .select('total_amount, paid_at')
    .eq('payment_status', 'paid')
    .gte('paid_at', months[0]?.start ?? '')
    .order('paid_at', { ascending: true })

  for (const order of allPaidOrders ?? []) {
    if (!order.paid_at) continue
    const d = new Date(order.paid_at)
    const label = d.toLocaleString('fr-FR', { month: 'short' })
    const m = months.find((x) => x.month === label)
    if (m) m.revenue += order.total_amount ?? 0
  }

  return {
    totalOrders: totalOrders ?? 0,
    monthOrders: monthOrders ?? 0,
    ordersPct,
    monthRevenue,
    revenuePct,
    totalUsers: totalUsers ?? 0,
    pieData,
    revenueChart: months.map(({ month, revenue }) => ({ month, revenue })),
    recentOrders: recentOrders ?? [],
    totalPayments: paymentStats?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0,
  }
}

const ORDER_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours', variant: 'info' },
  shipped: { label: 'Expédié', variant: 'secondary' },
  delivered: { label: 'Livré', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Vue d&apos;ensemble de votre boutique</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Commandes ce mois"
          value={stats.monthOrders.toString()}
          sub={`${stats.totalOrders} au total`}
          pct={stats.ordersPct}
          icon={ShoppingBag}
        />
        <KpiCard
          title="Revenus ce mois"
          value={formatCurrency(stats.monthRevenue)}
          sub="Commandes payées"
          pct={stats.revenuePct}
          icon={TrendingUp}
        />
        <KpiCard
          title="Clients"
          value={stats.totalUsers.toString()}
          sub="Utilisateurs enregistrés"
          icon={Users}
        />
        <KpiCard
          title="Paiements (mois)"
          value={formatCurrency(stats.totalPayments)}
          sub="Via Stripe"
          icon={CreditCard}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus mensuels</CardTitle>
            <CardDescription>6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={stats.revenueChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut des commandes</CardTitle>
            <CardDescription>Répartition globale</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersStatusChart data={stats.pieData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>Les 5 dernières commandes</CardDescription>
          </div>
          <Link href="/orders" className="text-sm text-primary hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucune commande pour l&apos;instant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => {
                const s = ORDER_STATUS_BADGE[order.status] ?? { label: order.status, variant: 'outline' as const }
                return (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  pct,
  icon: Icon,
}: {
  title: string
  value: string
  sub: string
  pct?: number
  icon: React.ElementType
}) {
  const isPositive = (pct ?? 0) >= 0
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-1.5">
            {pct !== undefined && (
              <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(pct).toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-muted-foreground">{sub}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
