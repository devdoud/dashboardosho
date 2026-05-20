'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Order, OrderStatus, PaymentStatus } from '@/types/database'
import { Search, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const ORDER_STATUSES: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En cours' },
  { value: 'shipped', label: 'Expédié' },
  { value: 'delivered', label: 'Livré' },
  { value: 'cancelled', label: 'Annulé' },
]

const PAYMENT_STATUSES: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous paiements' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payé' },
  { value: 'failed', label: 'Échoué' },
  { value: 'refunded', label: 'Remboursé' },
]

const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours', variant: 'info' },
  shipped: { label: 'Expédié', variant: 'secondary' },
  delivered: { label: 'Livré', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
}

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  paid: { label: 'Payé', variant: 'success' },
  failed: { label: 'Échoué', variant: 'destructive' },
  refunded: { label: 'Remboursé', variant: 'secondary' },
}

const PAGE_SIZE = 20

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (paymentFilter !== 'all') query = query.eq('payment_status', paymentFilter)
    if (search) query = query.ilike('id', `%${search}%`)

    const { data, count } = await query
    setOrders(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, statusFilter, paymentFilter, search, supabase])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
    await fetchOrders()
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status } : null)
    }
    setUpdatingId(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground text-sm">{total} commandes au total</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ID..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as OrderStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as PaymentStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const os = ORDER_STATUS_BADGE[order.status]
                  const ps = PAYMENT_STATUS_BADGE[order.payment_status]
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                      <TableCell><Badge variant={os.variant}>{os.label}</Badge></TableCell>
                      <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{order.payment_method ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} sur {totalPages} ({total} résultats)
          </p>
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

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commande #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Statut + Actions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statut commande</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(selectedOrder.id, s)}
                        disabled={updatingId === selectedOrder.id}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          selectedOrder.status === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {ORDER_STATUS_BADGE[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statut paiement</p>
                  <Badge variant={PAYMENT_STATUS_BADGE[selectedOrder.payment_status].variant}>
                    {PAYMENT_STATUS_BADGE[selectedOrder.payment_status].label}
                  </Badge>
                </div>
              </div>

              {/* Montants */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatCurrency((selectedOrder.total_amount ?? 0) - (selectedOrder.tax_amount ?? 0))}</span>
                </div>
                {selectedOrder.tax_amount != null && selectedOrder.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{selectedOrder.tax_label ?? 'Taxes'} ({((selectedOrder.tax_rate ?? 0) * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Adresse */}
              {selectedOrder.shipping_address && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Adresse de livraison</p>
                  <div className="rounded-lg border p-3 text-sm space-y-0.5">
                    <p className="font-medium">{selectedOrder.shipping_address.full_name}</p>
                    <p className="text-muted-foreground">{selectedOrder.shipping_address.phone}</p>
                    <p className="text-muted-foreground">{selectedOrder.shipping_address.address}</p>
                    <p className="text-muted-foreground">
                      {selectedOrder.shipping_address.quartier && `${selectedOrder.shipping_address.quartier}, `}
                      {selectedOrder.shipping_address.city}
                    </p>
                    <p className="text-muted-foreground">{selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {/* Méta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Créée le</p>
                  <p>{formatDateTime(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payée le</p>
                  <p>{formatDateTime(selectedOrder.paid_at)}</p>
                </div>
                {selectedOrder.stripe_payment_intent_id && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Stripe PI</p>
                    <p className="font-mono text-xs">{selectedOrder.stripe_payment_intent_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
