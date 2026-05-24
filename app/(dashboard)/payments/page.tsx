'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awaitQuery } from '@/lib/supabase/query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { PaymentAttempt, PaymentAttemptStatus } from '@/types/database'
import { Search, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_BADGE: Record<PaymentAttemptStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours', variant: 'info' },
  succeeded: { label: 'Réussi', variant: 'success' },
  failed: { label: 'Échoué', variant: 'destructive' },
  cancelled: { label: 'Annulé', variant: 'outline' },
}

const PAGE_SIZE = 20

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<PaymentAttempt[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentAttemptStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSucceeded: 0,
    totalFailed: 0,
    totalPending: 0,
    revenueMonth: 0,
  })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('payment_attempts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (search) query = query.ilike('stripe_payment_intent_id', `%${search}%`)

    const { data, count } = await awaitQuery<PaymentAttempt>(query)
    setPayments(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, statusFilter, search, supabase])

  const fetchStats = useCallback(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: succeeded },
      { count: failed },
      { count: pending },
      { data: monthPayments },
    ] = await Promise.all([
      supabase.from('payment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'succeeded'),
      supabase.from('payment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('payment_attempts').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      supabase.from('payment_attempts').select('amount').eq('status', 'succeeded').gte('created_at', startOfMonth),
    ])

    setStats({
      totalSucceeded: succeeded ?? 0,
      totalFailed: failed ?? 0,
      totalPending: pending ?? 0,
      revenueMonth: monthPayments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0,
    })
  }, [supabase])

  useEffect(() => {
    fetchPayments()
    fetchStats()
  }, [fetchPayments, fetchStats])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
          <p className="text-muted-foreground text-sm">{total} tentatives de paiement</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => { fetchPayments(); fetchStats() }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalSucceeded}</p>
              <p className="text-xs text-muted-foreground">Réussis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalFailed}</p>
              <p className="text-xs text-muted-foreground">Échoués</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatCurrency(stats.revenueMonth)}</p>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher PI..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as PaymentAttemptStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="succeeded">Réussi</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="processing">En cours</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Intent ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Payé le</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucun paiement trouvé
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const s = STATUS_BADGE[p.status]
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.stripe_payment_intent_id?.slice(0, 20)}…</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="uppercase text-xs">{p.currency}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.amount, p.currency.toUpperCase())}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.paid_at)}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {p.error_message ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
