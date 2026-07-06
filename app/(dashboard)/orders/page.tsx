'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDateTime, getLabel } from '@/lib/utils'
import type { Order, OrderStatus, PaymentStatus, OrderAssignment, AssignmentStatus } from '@/types/database'
import {
  Search, Eye, RefreshCw, ChevronLeft, ChevronRight,
  Scissors, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Package, MessageSquare, User, Truck,
} from 'lucide-react'
import Image from 'next/image'

// ─── Constantes ───────────────────────────────────────────────────────────────

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
  pending:    { label: 'En attente', variant: 'warning' },
  processing: { label: 'En cours',   variant: 'info' },
  shipped:    { label: 'Expédié',    variant: 'secondary' },
  delivered:  { label: 'Livré',      variant: 'success' },
  cancelled:  { label: 'Annulé',     variant: 'destructive' },
}

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending:  { label: 'En attente', variant: 'warning' },
  paid:     { label: 'Payé',       variant: 'success' },
  failed:   { label: 'Échoué',     variant: 'destructive' },
  refunded: { label: 'Remboursé',  variant: 'secondary' },
}

const ASSIGNMENT_STATUS_BADGE: Record<AssignmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'; icon: React.ElementType }> = {
  pending:    { label: 'En attente',  variant: 'warning',     icon: Clock },
  accepted:   { label: 'Accepté',     variant: 'info',        icon: CheckCircle },
  in_progress:{ label: 'En cours',    variant: 'info',        icon: Scissors },
  completed:  { label: 'Terminé',     variant: 'success',     icon: CheckCircle },
  rejected:   { label: 'Refusé',      variant: 'destructive', icon: XCircle },
  cancelled:  { label: 'Annulé',      variant: 'outline',     icon: XCircle },
}

const PAGE_SIZE = 20

// ─── Types enrichis ───────────────────────────────────────────────────────────

interface AssignmentWithTailor extends OrderAssignment {
  tailor_name?: string
}

interface TailorOption {
  id: string
  name: string
}

interface OrderItemWithProduct {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  measurements_snapshot: Record<string, unknown> | null
  product: {
    id: string
    name: unknown
    thumbnail: string | null
    sku: string
  } | null
}

interface CustomerInfo {
  id: string
  name: string
  email: string
  phone: string
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  // Order items state
  const [orderItems, setOrderItems] = useState<OrderItemWithProduct[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Assignment state
  const [assignments, setAssignments] = useState<AssignmentWithTailor[]>([])
  const [tailors, setTailors] = useState<TailorOption[]>([])
  const [selectedTailor, setSelectedTailor] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // ─── Fetch orders via API (service role — bypass RLS) ────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      status: statusFilter,
      payment: paymentFilter,
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/admin/orders?${params}`)
    if (res.ok) {
      const json = await res.json()
      setOrders(json.orders ?? [])
      setTotal(json.total ?? 0)
    }
    setLoading(false)
  }, [page, statusFilter, paymentFilter, search])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ─── Fetch tailors (indépendant, chargé au montage) ───────────────────────────

  const fetchTailors = useCallback(async () => {
    const res = await fetch('/api/admin/orders/assign')
    if (res.ok) {
      const json = await res.json()
      setTailors(json.tailors ?? [])
    }
  }, [])

  useEffect(() => { fetchTailors() }, [fetchTailors])

  // ─── Fetch detail (items + assignments) ──────────────────────────────────────

  const fetchDetail = useCallback(async (orderId: string, userId?: string) => {
    setLoadingItems(true)
    setLoadingAssignments(true)
    const params = new URLSearchParams({ orderId })
    if (userId) params.set('userId', userId)
    const res = await fetch(`/api/admin/orders/detail?${params}`)
    if (res.ok) {
      const json = await res.json()
      setOrderItems(json.items ?? [])
      setAssignments(json.assignments ?? [])
      setCustomer(json.customer ?? null)
    }
    setLoadingItems(false)
    setLoadingAssignments(false)
  }, [])

  const fetchAssignments = useCallback(async (orderId: string) => {
    setLoadingAssignments(true)
    const res = await fetch(`/api/admin/orders/detail?orderId=${orderId}`)
    if (res.ok) {
      const json = await res.json()
      setAssignments(json.assignments ?? [])
    }
    setLoadingAssignments(false)
  }, [])

  function openOrderDetail(order: Order) {
    setSelectedOrder(order)
    setSelectedTailor('')
    setAssignmentNotes('')
    setStatusError(null)
    setOrderItems([])
    setCustomer(null)
    fetchDetail(order.id, order.user_id)
    fetchTailors()
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    setStatusError(null)
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setStatusError(d.error ?? 'Erreur lors de la mise à jour du statut')
      setUpdatingId(null)
      return
    }
    await fetchOrders()
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status } : null)
    }
    setUpdatingId(null)
  }

  async function assignTailor() {
    if (!selectedOrder || !selectedTailor) return
    setAssigning(true)
    await fetch('/api/admin/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: selectedOrder.id,
        tailorId: selectedTailor,
        notes: assignmentNotes,
        currentStatus: selectedOrder.status,
      }),
    })
    if (selectedOrder.status === 'pending') {
      setSelectedOrder((prev) => prev ? { ...prev, status: 'processing' } : null)
    }
    setSelectedTailor('')
    setAssignmentNotes('')
    await fetchAssignments(selectedOrder.id)
    await fetchOrders()
    setAssigning(false)
  }

  async function cancelAssignment(assignmentId: string) {
    await fetch(`/api/admin/orders/assign?id=${assignmentId}`, { method: 'DELETE' })
    if (selectedOrder) await fetchAssignments(selectedOrder.id)
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeAssignment = assignments.find((a) => ['pending', 'accepted', 'in_progress'].includes(a.status))
  const completedAssignment = assignments.find((a) => a.status === 'completed')
  // La commande a été terminée par un tailleur → elle peut être expédiée
  const hasCompletedAssignment = !!completedAssignment
  // Tailleur à afficher : celui en cours, sinon celui qui a terminé la commande
  const currentAssignment = activeAssignment ?? completedAssignment
  const canCancelAssignment = !!activeAssignment
  // Historique : les assignments terminés/refusés/annulés, hors celui déjà affiché en tête
  const historyAssignments = assignments.filter(
    (a) => ['rejected', 'cancelled', 'completed'].includes(a.status) && a.id !== currentAssignment?.id,
  )

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

      {/* Filtres */}
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
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as PaymentStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
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
                <TableHead>Tailleur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="w-8" />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const os = ORDER_STATUS_BADGE[order.status]   ?? { label: order.status   ?? '—', variant: 'outline' as const }
                  const ps = PAYMENT_STATUS_BADGE[order.payment_status] ?? { label: order.payment_status ?? '—', variant: 'outline' as const }
                  const tailorName = order.primary_tailor_id
                    ? tailors.find((t) => t.id === order.primary_tailor_id)?.name
                    : null
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                      <TableCell><Badge variant={os.variant}>{os.label}</Badge></TableCell>
                      <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{order.payment_method ?? '—'}</TableCell>
                      <TableCell>
                        {tailorName ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Scissors className="h-3 w-3 text-muted-foreground" />
                            <span>{tailorName}</span>
                          </div>
                        ) : order.status === 'processing' ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                            <AlertCircle className="h-3 w-3" />
                            <span>À réassigner</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        {order.customer_note && (
                          <span title={order.customer_note}>
                            <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openOrderDetail(order)}>
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
          <p className="text-sm text-muted-foreground">Page {page + 1} / {totalPages} ({total} résultats)</p>
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

      {/* ── Dialog détail commande ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Détail de la commande</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5">

              {/* ── Informations client ── */}
              <div className="rounded-lg border p-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {customer ? (
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{customer.name}</p>
                    {customer.email && (
                      <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                  </div>
                )}
                <span className="ml-auto font-mono text-xs text-muted-foreground shrink-0">
                  #{selectedOrder.id.slice(0, 8)}
                </span>
              </div>

              {/* Statut commande */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Statut commande</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => {
                      // « Expédié » est verrouillé tant que le tailleur n'a pas terminé la commande
                      const shipLocked = s === 'shipped' && !hasCompletedAssignment && selectedOrder.status !== 'shipped'
                      return (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(selectedOrder.id, s)}
                          disabled={updatingId === selectedOrder.id || shipLocked}
                          title={shipLocked ? 'La commande doit être terminée par le tailleur' : undefined}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                            selectedOrder.status === s
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          } ${shipLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {ORDER_STATUS_BADGE[s].label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Paiement</p>
                  <Badge variant={(PAYMENT_STATUS_BADGE[selectedOrder.payment_status] ?? { variant: 'outline' }).variant}>
                    {(PAYMENT_STATUS_BADGE[selectedOrder.payment_status] ?? { label: selectedOrder.payment_status ?? '—' }).label}
                  </Badge>
                </div>
              </div>

              {/* ── Action expédition ── */}
              {!['shipped', 'delivered', 'cancelled'].includes(selectedOrder.status) && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <Button
                    className="w-full"
                    disabled={!hasCompletedAssignment || updatingId === selectedOrder.id}
                    onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                  >
                    {updatingId === selectedOrder.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Truck className="h-4 w-4" />}
                    Marquer comme expédié
                  </Button>
                  {!hasCompletedAssignment && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Disponible une fois la commande terminée par le tailleur.
                    </p>
                  )}
                </div>
              )}

              {selectedOrder.status === 'shipped' && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Truck className="h-4 w-4 shrink-0" />
                  Commande expédiée — visible dans le suivi du client.
                </div>
              )}

              {statusError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {statusError}
                </div>
              )}

              {/* ── Note du client ── */}
              {selectedOrder.customer_note && (
                <div className="flex gap-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                  <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Note du client</p>
                    <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{selectedOrder.customer_note}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* ── Articles commandés ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Articles commandés
                    {orderItems.length > 0 && (
                      <span className="ml-1.5 text-muted-foreground font-normal">({orderItems.length})</span>
                    )}
                  </h3>
                </div>

                {loadingItems ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : orderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Aucun article trouvé.</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="rounded-xl border overflow-hidden">
                        {/* En-tête article */}
                        <div className="flex items-center gap-3 p-3 bg-muted/20">
                          {item.product?.thumbnail ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(item.product!.thumbnail)}
                              className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all cursor-zoom-in"
                            >
                              <Image
                                src={item.product.thumbnail}
                                alt={getLabel(item.product.name, 'Produit')}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </button>
                          ) : (
                            <div className="h-14 w-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {getLabel(item.product?.name, 'Produit supprimé')}
                            </p>
                            {item.product?.sku && (
                              <p className="text-xs font-mono text-muted-foreground">{item.product.sku}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatCurrency(item.total_price)}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Section Assignation ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Assignation tailleur</h3>
                </div>

                {/* Assignment actif */}
                {loadingAssignments ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </div>
                ) : currentAssignment ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Scissors className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{currentAssignment.tailor_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Assigné le {formatDateTime(currentAssignment.assigned_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const s = ASSIGNMENT_STATUS_BADGE[currentAssignment.status] ?? { label: currentAssignment.status, variant: 'outline' as const, icon: Clock }
                          const Icon = s.icon
                          return (
                            <Badge variant={s.variant} className="flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              {s.label}
                            </Badge>
                          )
                        })()}
                        {canCancelAssignment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                            onClick={() => cancelAssignment(currentAssignment.id)}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>
                    {currentAssignment.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {currentAssignment.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments[0]?.status === 'rejected' && (
                      <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-xs uppercase tracking-wide">Assignation refusée</p>
                          <p className="text-xs text-destructive/95 mt-0.5">
                            Le tailleur <strong>{assignments[0].tailor_name}</strong> a refusé cette commande.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed p-3">
                      <AlertCircle className="h-4 w-4" />
                      Aucun tailleur assigné à cette commande
                    </div>
                  </div>
                )}

                {/* Formulaire d'assignation */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {activeAssignment ? 'Réassigner à un autre tailleur' : 'Choisir un tailleur'}
                    </p>
                    <button type="button" onClick={fetchTailors} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <RefreshCw className="h-3 w-3" />
                      Actualiser
                    </button>
                  </div>

                  {tailors.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun tailleur enregistré. Ajoutez des utilisateurs avec le rôle &quot;tailleur&quot; d&apos;abord.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {tailors.map((t) => {
                        const initials = t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        const selected = selectedTailor === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTailor(selected ? '' : t.id)}
                            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                              selected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-background hover:bg-muted/50'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {initials}
                            </div>
                            <span className="text-xs font-medium truncate">{t.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">Note (optionnel)</Label>
                    <Textarea
                      placeholder="Instructions spécifiques pour le tailleur…"
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      rows={2}
                      className="text-sm resize-none bg-background"
                    />
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!selectedTailor || assigning}
                    onClick={assignTailor}
                  >
                    {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Scissors className="h-4 w-4" />
                    {activeAssignment ? 'Réassigner' : 'Assigner'}
                  </Button>
                </div>

                {/* Historique des assignments */}
                {historyAssignments.length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                      Voir l&apos;historique ({historyAssignments.length})
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {historyAssignments
                        .map((a) => {
                          const s = ASSIGNMENT_STATUS_BADGE[a.status] ?? { label: a.status, variant: 'outline' as const, icon: Clock }
                          const Icon = s.icon
                          return (
                            <div key={a.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
                              <span className="text-muted-foreground">{a.tailor_name}</span>
                              <Badge variant={s.variant} className="flex items-center gap-1 text-xs">
                                <Icon className="h-3 w-3" />
                                {s.label}
                              </Badge>
                            </div>
                          )
                        })}
                    </div>
                  </details>
                )}
              </div>

              <Separator />

              {/* Montants */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatCurrency((selectedOrder.total_amount ?? 0) - (selectedOrder.tax_amount ?? 0))}</span>
                </div>
                {(selectedOrder.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedOrder.tax_label ?? 'Taxes'} ({((selectedOrder.tax_rate ?? 0) * 100).toFixed(0)}%)
                    </span>
                    <span>{formatCurrency(selectedOrder.tax_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Adresse livraison */}
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
                    <p className="font-mono text-xs break-all">{selectedOrder.stripe_payment_intent_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ── Image preview (inside dialog, above everything) ── */}
          {previewImage && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-sm w-full mx-6" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-3 -right-3 z-10 h-7 w-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-sm font-bold hover:bg-gray-100"
                >
                  ✕
                </button>
                <div className="relative w-full rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '1' }}>
                  <Image
                    src={previewImage}
                    alt="Aperçu produit"
                    fill
                    className="object-contain bg-white"
                    sizes="480px"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
