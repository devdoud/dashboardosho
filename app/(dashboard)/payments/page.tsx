'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, Price, StatRow } from '@/components/ui/atelier'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { PaymentAttempt, PaymentAttemptStatus } from '@/types/database'
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_BADGE: Record<PaymentAttemptStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending:    { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours',   variant: 'info' },
  succeeded:  { label: 'Réussi',     variant: 'success' },
  failed:     { label: 'Échoué',     variant: 'destructive' },
  cancelled:  { label: 'Annulé',     variant: 'outline' },
}

const PAGE_SIZE = 20

export default function PaymentsPage() {
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
    const params = new URLSearchParams({
      page: String(page),
      status: statusFilter,
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/admin/payments?${params}`)
    if (res.ok) {
      const json = await res.json()
      setPayments(json.payments ?? [])
      setTotal(json.total ?? 0)
      if (json.stats) setStats(json.stats)
    }
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => {
    const t = setTimeout(fetchPayments, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchPayments, search])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paiements"
        description={`${total} tentatives de paiement`}
        actions={
          <Button variant="outline" size="icon" onClick={fetchPayments} disabled={loading} aria-label="Actualiser la liste">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        }
      />

      <StatRow
        items={[
          { label: 'Réussis', value: stats.totalSucceeded },
          { label: 'Échoués', value: stats.totalFailed },
          { label: 'En attente', value: stats.totalPending },
          { label: 'Encaissé ce mois', value: formatCurrency(stats.revenueMonth) },
        ]}
      />

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <label htmlFor="payments-search" className="sr-only">Rechercher un Payment Intent</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <Input
            id="payments-search"
            type="search"
            placeholder="Rechercher un Payment Intent"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as PaymentAttemptStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrer par statut">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment Intent</TableHead>
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
                  <TableCell key={j} className="py-4"><div className="h-4 animate-pulse rounded-sm bg-placeholder" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted">
                Aucun paiement trouvé.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => {
              const s = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'outline' as const }
              return (
                <TableRow key={p.id}>
                  <TableCell className="py-3 font-mono text-sm">{p.stripe_payment_intent_id?.slice(0, 20)}…</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">{formatDateTime(p.created_at)}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-sm uppercase">{p.currency}</TableCell>
                  <TableCell className="text-right">
                    <Price>{formatCurrency(p.amount, p.currency?.toUpperCase())}</Price>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">{p.paid_at ? formatDateTime(p.paid_at) : ''}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-danger-ink" title={p.error_message ?? undefined}>
                    {p.error_message ?? ''}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Page {page + 1} sur {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Page précédente">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Page suivante">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
