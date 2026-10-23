'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Notice, PageHeader, Price, SectionLabel, SpecRow } from '@/components/ui/atelier'
import { cn, formatCurrency, formatDateTime, getLabel } from '@/lib/utils'
import type { Order, OrderStatus, PaymentStatus, OrderAssignment, AssignmentStatus } from '@/types/database'
import {
  Search, Eye, RefreshCw, ChevronLeft, ChevronRight,
  Scissors, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Package, MessageSquare, Truck, X,
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

// Le tailleur responsable est résolu côté serveur (primary_tailor_id + assignations)
interface OrderRow extends Order {
  tailor_name?: string | null
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
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
  // Assignation enregistrée mais push non parti : avertissement non bloquant.
  const [assignWarning, setAssignWarning] = useState<string | null>(null)
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

  useEffect(() => {
    const t = setTimeout(fetchOrders, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchOrders, search])

  // ─── Fetch tailors (indépendant, chargé au montage) ───────────────────────────

  const fetchTailors = useCallback(async () => {
    const res = await fetch('/api/admin/orders/assign')
    if (res.ok) {
      const json = await res.json()
      setTailors(json.tailors ?? [])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchTailors, 0)
    return () => clearTimeout(t)
  }, [fetchTailors])

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
    setAssignWarning(null)

    const res = await fetch('/api/admin/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: selectedOrder.id,
        tailorId: selectedTailor,
        notes: assignmentNotes,
        currentStatus: selectedOrder.status,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setAssignWarning(json.error ?? "L'assignation a échoué.")
      setAssigning(false)
      return
    }

    // L'assignation est enregistrée ; seule la notification a pu échouer.
    if (json.notified === false) {
      setAssignWarning(
        "Tailleur assigné, mais la notification push n'a pas pu être envoyée.",
      )
    }

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
    <div className="space-y-8">
      <PageHeader
        title="Commandes"
        description={`${total} commandes au total`}
        actions={
          <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading} aria-label="Actualiser la liste">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <label htmlFor="orders-search" className="sr-only">Rechercher une commande par identifiant</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <Input
            id="orders-search"
            type="search"
            placeholder="Rechercher par identifiant"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as OrderStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as PaymentStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrer par paiement"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Identifiant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Paiement</TableHead>
            <TableHead>Méthode</TableHead>
            <TableHead>Tailleur</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="w-8"><span className="sr-only">Note client</span></TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j} className="py-4"><div className="h-4 animate-pulse rounded-sm bg-placeholder" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-muted">
                Aucune commande trouvée.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const os = ORDER_STATUS_BADGE[order.status]   ?? { label: order.status   ?? '—', variant: 'outline' as const }
              const ps = PAYMENT_STATUS_BADGE[order.payment_status] ?? { label: order.payment_status ?? '—', variant: 'outline' as const }
              const tailorName = order.tailor_name
                ?? (order.primary_tailor_id ? tailors.find((t) => t.id === order.primary_tailor_id)?.name : null)
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">{formatDateTime(order.created_at)}</TableCell>
                  <TableCell><Badge variant={os.variant}>{os.label}</Badge></TableCell>
                  <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                  <TableCell className="text-sm capitalize">{order.payment_method ?? ''}</TableCell>
                  <TableCell>
                    {tailorName ? (
                      <span className="text-md">{tailorName}</span>
                    ) : order.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warn-ink">
                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        À réassigner
                      </span>
                    ) : (
                      <span className="text-sm text-muted">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right"><Price>{formatCurrency(order.total_amount)}</Price></TableCell>
                  <TableCell>
                    {order.customer_note && (
                      <span title={order.customer_note} className="inline-flex text-warn-ink">
                        <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        <span className="sr-only">Le client a laissé une note</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openOrderDetail(order)} aria-label={`Voir la commande ${order.id.slice(0, 8)}`}>
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Page {page + 1} sur {totalPages} · {total} résultats</p>
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

      {/* ── Dialog détail commande ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Commande {selectedOrder ? `#${selectedOrder.id.slice(0, 8)}` : ''}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-7">

              {/* ── Client ── */}
              <section className="space-y-2">
                <SectionLabel>Client</SectionLabel>
                {customer ? (
                  <div className="min-w-0">
                    <p className="text-base font-medium">{customer.name}</p>
                    {customer.email && <p className="truncate text-sm text-muted">{customer.email}</p>}
                    {customer.phone && <p className="text-sm text-muted">{customer.phone}</p>}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 animate-pulse rounded-sm bg-placeholder" />
                    <div className="h-3.5 w-52 animate-pulse rounded-sm bg-placeholder" />
                  </div>
                )}
              </section>

              {/* ── Statut ── */}
              <section className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <SectionLabel id="order-status-label">Statut de la commande</SectionLabel>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="order-status-label">
                    {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => {
                      // « Expédié » est verrouillé tant que le tailleur n'a pas terminé la commande
                      const shipLocked = s === 'shipped' && !hasCompletedAssignment && selectedOrder.status !== 'shipped'
                      const active = selectedOrder.status === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateOrderStatus(selectedOrder.id, s)}
                          disabled={updatingId === selectedOrder.id || shipLocked}
                          aria-pressed={active}
                          title={shipLocked ? 'La commande doit être terminée par le tailleur' : undefined}
                          className={cn(
                            'min-h-11 rounded-sm border px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            active
                              ? 'border-primary-fill bg-primary-fill text-primary-ink'
                              : 'border-hairline bg-surface text-ink hover:border-ink'
                          )}
                        >
                          {ORDER_STATUS_BADGE[s].label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Paiement</SectionLabel>
                  <Badge variant={(PAYMENT_STATUS_BADGE[selectedOrder.payment_status] ?? { variant: 'outline' }).variant}>
                    {(PAYMENT_STATUS_BADGE[selectedOrder.payment_status] ?? { label: selectedOrder.payment_status ?? '—' }).label}
                  </Badge>
                </div>
              </section>

              {/* ── Action expédition ── */}
              {!['shipped', 'delivered', 'cancelled'].includes(selectedOrder.status) && (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={!hasCompletedAssignment || updatingId === selectedOrder.id}
                    onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                  >
                    {updatingId === selectedOrder.id
                      ? <Loader2 className="animate-spin" />
                      : <Truck />}
                    Marquer comme expédiée
                  </Button>
                  {!hasCompletedAssignment && (
                    <p className="text-sm text-muted">
                      Disponible une fois la commande terminée par le tailleur.
                    </p>
                  )}
                </div>
              )}

              {selectedOrder.status === 'shipped' && (
                <Notice tone="ok" icon={Truck}>Commande expédiée — visible dans le suivi du client.</Notice>
              )}

              {statusError && <Notice tone="danger">{statusError}</Notice>}

              {/* ── Note du client ── */}
              {selectedOrder.customer_note && (
                <Notice tone="warn" icon={MessageSquare} title="Note du client">
                  <p className="whitespace-pre-wrap leading-relaxed">{selectedOrder.customer_note}</p>
                </Notice>
              )}

              {/* ── Articles commandés ── */}
              <section className="space-y-2">
                <SectionLabel>
                  Articles commandés{orderItems.length > 0 && ` · ${orderItems.length}`}
                </SectionLabel>

                {loadingItems ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-sm bg-placeholder" />
                    ))}
                  </div>
                ) : orderItems.length === 0 ? (
                  <p className="text-md text-muted">Aucun article trouvé.</p>
                ) : (
                  <ul className="border-t border-hairline">
                    {orderItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-4 border-b border-hairline py-3">
                        {item.product?.thumbnail ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(item.product!.thumbnail)}
                            aria-label={`Agrandir l'image de ${getLabel(item.product.name, 'ce produit')}`}
                            className="relative h-14 w-14 shrink-0 cursor-zoom-in overflow-hidden rounded-sm border border-hairline transition-colors hover:border-ink"
                          >
                            <Image
                              src={item.product.thumbnail}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </button>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-placeholder">
                            <Package className="h-5 w-5 text-placeholder-ink" strokeWidth={1.75} aria-hidden />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-md font-medium">
                            {getLabel(item.product?.name, 'Produit supprimé')}
                          </p>
                          {item.product?.sku && (
                            <p className="font-mono text-sm text-muted">{item.product.sku}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Price>{formatCurrency(item.total_price)}</Price>
                          <p className="text-sm text-muted">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ── Section Assignation ── */}
              <section className="space-y-3">
                <SectionLabel>Tailleur</SectionLabel>

                {/* Assignment actif */}
                {loadingAssignments ? (
                  <p className="flex items-center gap-2 text-md text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Chargement…
                  </p>
                ) : currentAssignment ? (
                  <div className="space-y-2 border-y border-hairline py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-medium">{currentAssignment.tailor_name}</p>
                        <p className="text-sm text-muted">
                          Assigné le {formatDateTime(currentAssignment.assigned_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const s = ASSIGNMENT_STATUS_BADGE[currentAssignment.status] ?? { label: currentAssignment.status, variant: 'outline' as const, icon: Clock }
                          const Icon = s.icon
                          return (
                            <Badge variant={s.variant}>
                              <Icon strokeWidth={1.75} aria-hidden />
                              {s.label}
                            </Badge>
                          )
                        })()}
                        {canCancelAssignment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-ink"
                            onClick={() => cancelAssignment(currentAssignment.id)}
                          >
                            Retirer
                          </Button>
                        )}
                      </div>
                    </div>
                    {currentAssignment.notes && (
                      <p className="text-sm text-muted">{currentAssignment.notes}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments[0]?.status === 'rejected' && (
                      <Notice tone="danger" title="Assignation refusée">
                        <strong className="font-semibold">{assignments[0].tailor_name}</strong> a refusé cette commande.
                      </Notice>
                    )}
                    <p className="text-md text-muted">Aucun tailleur assigné à cette commande.</p>
                  </div>
                )}

                {/* Formulaire d'assignation */}
                <div className="space-y-4 rounded-sm border border-hairline bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p id="tailor-pick-label" className="text-md font-medium">
                      {activeAssignment ? 'Réassigner à un autre tailleur' : 'Choisir un tailleur'}
                    </p>
                    <Button type="button" variant="ghost" size="sm" onClick={fetchTailors} className="text-muted">
                      <RefreshCw />
                      Actualiser
                    </Button>
                  </div>

                  {tailors.length === 0 ? (
                    <p className="text-sm text-muted">
                      Aucun tailleur enregistré. Attribuez d&apos;abord le rôle « tailleur » à un utilisateur.
                    </p>
                  ) : (
                    <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2" role="group" aria-labelledby="tailor-pick-label">
                      {tailors.map((t) => {
                        const initials = t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        const selected = selectedTailor === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTailor(selected ? '' : t.id)}
                            aria-pressed={selected}
                            className={cn(
                              'flex min-h-12 items-center gap-3 rounded-sm border px-3 text-left transition-colors',
                              selected
                                ? 'border-ink bg-bg'
                                : 'border-hairline bg-bg hover:border-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-xs font-semibold',
                                selected ? 'bg-primary-fill text-primary-ink' : 'border border-hairline bg-placeholder text-ink'
                              )}
                              aria-hidden
                            >
                              {initials}
                            </span>
                            <span className="truncate text-md font-medium">{t.name}</span>
                            {selected && <CheckCircle className="ml-auto h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="assignment-notes">Instructions pour le tailleur <span className="font-normal text-muted">(facultatif)</span></Label>
                    <Textarea
                      id="assignment-notes"
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      rows={2}
                      className="resize-none bg-bg"
                    />
                  </div>

                  {assignWarning && <Notice tone="warn">{assignWarning}</Notice>}

                  <Button
                    className="w-full"
                    disabled={!selectedTailor || assigning}
                    onClick={assignTailor}
                  >
                    {assigning ? <Loader2 className="animate-spin" /> : <Scissors />}
                    {activeAssignment ? 'Réassigner' : 'Assigner'}
                  </Button>
                </div>

                {/* Historique des assignments */}
                {historyAssignments.length > 0 && (
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer select-none items-center text-md font-medium text-accent">
                      Historique · {historyAssignments.length}
                    </summary>
                    <ul className="border-t border-hairline">
                      {historyAssignments.map((a) => {
                        const s = ASSIGNMENT_STATUS_BADGE[a.status] ?? { label: a.status, variant: 'outline' as const, icon: Clock }
                        const Icon = s.icon
                        return (
                          <li key={a.id} className="flex items-center justify-between border-b border-hairline py-2.5">
                            <span className="text-md">{a.tailor_name}</span>
                            <Badge variant={s.variant}>
                              <Icon strokeWidth={1.75} aria-hidden />
                              {s.label}
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  </details>
                )}
              </section>

              {/* ── Montants ── */}
              <section className="space-y-1">
                <SectionLabel>Montants</SectionLabel>
                <dl>
                  <SpecRow
                    label="Sous-total"
                    value={formatCurrency((selectedOrder.total_amount ?? 0) - (selectedOrder.tax_amount ?? 0))}
                    valueClassName="serif-sm text-base tabular-nums"
                  />
                  {(selectedOrder.tax_amount ?? 0) > 0 && (
                    <SpecRow
                      label={`${selectedOrder.tax_label ?? 'Taxes'} (${((selectedOrder.tax_rate ?? 0) * 100).toFixed(0)} %)`}
                      value={formatCurrency(selectedOrder.tax_amount ?? 0)}
                      valueClassName="serif-sm text-base tabular-nums"
                    />
                  )}
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-base font-medium">Total</dt>
                    <dd><Price size="md">{formatCurrency(selectedOrder.total_amount)}</Price></dd>
                  </div>
                </dl>
              </section>

              {/* ── Adresse livraison ── */}
              {selectedOrder.shipping_address && (
                <section className="space-y-2">
                  <SectionLabel>Adresse de livraison</SectionLabel>
                  <address className="space-y-0.5 text-md not-italic">
                    {selectedOrder.shipping_address.full_name && <p className="font-medium">{selectedOrder.shipping_address.full_name}</p>}
                    {selectedOrder.shipping_address.phone && <p className="text-muted">{selectedOrder.shipping_address.phone}</p>}
                    {selectedOrder.shipping_address.address && <p className="text-muted">{selectedOrder.shipping_address.address}</p>}
                    <p className="text-muted">
                      {selectedOrder.shipping_address.quartier && `${selectedOrder.shipping_address.quartier}, `}
                      {selectedOrder.shipping_address.city}
                    </p>
                    {selectedOrder.shipping_address.country && <p className="text-muted">{selectedOrder.shipping_address.country}</p>}
                  </address>
                </section>
              )}

              {/* ── Méta ── */}
              <dl className="border-t border-hairline">
                <SpecRow label="Créée le" value={formatDateTime(selectedOrder.created_at)} />
                <SpecRow label="Payée le" value={formatDateTime(selectedOrder.paid_at)} />
                <SpecRow
                  label="Stripe PI"
                  value={selectedOrder.stripe_payment_intent_id}
                  valueClassName="break-all font-mono text-sm"
                />
              </dl>
            </div>
          )}

          {/* ── Aperçu image (dans la boîte de dialogue, au-dessus du reste) ── */}
          {previewImage && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-scrim"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative mx-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  aria-label="Fermer l'aperçu"
                  className="absolute -top-12 right-0 z-10 flex size-11 items-center justify-center rounded-sm border border-hairline bg-surface text-ink hover:border-ink"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
                <div className="relative w-full overflow-hidden rounded-sm border border-hairline bg-surface" style={{ aspectRatio: '1' }}>
                  <Image
                    src={previewImage}
                    alt="Aperçu du produit"
                    fill
                    className="object-contain"
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
