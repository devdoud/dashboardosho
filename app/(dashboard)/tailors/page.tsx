'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatDateTime, formatCurrency, getInitials } from '@/lib/utils'
import {
  Scissors, Star, RefreshCw, Eye, Search,
  CheckCircle, Clock, XCircle, TrendingUp, Package,
  Phone, MapPin, UserPlus, Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TailorStats {
  id: string
  name: string
  phone: string
  city: string
  created_at: string
  total_assignments: number
  pending: number
  in_progress: number
  completed: number
  rejected: number
  avg_rating: number
  review_count: number
  total_earned: number
}

interface AssignmentDetail {
  id: string
  order_id: string
  status: string
  assigned_at: string
  completed_at: string | null
  notes: string | null
  order_total: number
}

// ─── Statuts ──────────────────────────────────────────────────────────────────

const ASSIGNMENT_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  pending:    { label: 'En attente',  variant: 'warning' },
  accepted:   { label: 'Accepté',     variant: 'info' },
  in_progress:{ label: 'En cours',    variant: 'info' },
  completed:  { label: 'Terminé',     variant: 'success' },
  rejected:   { label: 'Refusé',      variant: 'destructive' },
  cancelled:  { label: 'Annulé',      variant: 'outline' },
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TailorsPage() {
  const [tailors, setTailors] = useState<TailorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTailor, setSelectedTailor] = useState<TailorStats | null>(null)
  const [assignments, setAssignments] = useState<AssignmentDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [addingRole, setAddingRole] = useState(false)
  const [newTailorEmail, setNewTailorEmail] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addError, setAddError] = useState('')

  // ─── Chargement des tailleurs ─────────────────────────────────────────────

  const fetchTailors = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/tailors')
    if (res.ok) {
      const json = await res.json()
      setTailors(json.tailors ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchTailors, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchTailors, search])

  // ─── Détail tailleur ──────────────────────────────────────────────────────

  async function openDetail(tailor: TailorStats) {
    setSelectedTailor(tailor)
    setLoadingDetail(true)
    const res = await fetch(`/api/admin/tailors/detail?tailorId=${tailor.id}`)
    if (res.ok) {
      const json = await res.json()
      setAssignments(json.assignments ?? [])
    }
    setLoadingDetail(false)
  }

  // ─── Ajouter tailleur par email ───────────────────────────────────────────

  async function promoteToTailor() {
    if (!newTailorEmail.trim()) return
    setAddingRole(true)
    setAddError('')

    const res = await fetch('/api/admin/tailors/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newTailorEmail.trim() }),
    })

    if (!res.ok) {
      const d = await res.json()
      setAddError(d.error ?? 'Erreur lors de l\'attribution du rôle')
    } else {
      setNewTailorEmail('')
      setAddDialogOpen(false)
      fetchTailors()
    }
    setAddingRole(false)
  }

  // ─── Révoquer le rôle tailleur ────────────────────────────────────────────

  async function revokeTailor(id: string) {
    await fetch(`/api/admin/tailors/promote?userId=${id}`, { method: 'DELETE' })
    setSelectedTailor(null)
    fetchTailors()
  }

  // ─── Filtre ───────────────────────────────────────────────────────────────

  const filtered = tailors.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.city.toLowerCase().includes(search.toLowerCase())
  )

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  const totalCompleted = tailors.reduce((s, t) => s + t.completed, 0)
  const totalInProgress = tailors.reduce((s, t) => s + t.in_progress, 0)
  const avgRating = tailors.filter((t) => t.review_count > 0).reduce((s, t, _, arr) => s + t.avg_rating / arr.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tailleurs</h1>
          <p className="text-muted-foreground text-sm">{tailors.length} tailleurs enregistrés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchTailors} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Ajouter un tailleur
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
              <Scissors className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tailors.length}</p>
              <p className="text-xs text-muted-foreground">Tailleurs actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInProgress}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Commandes terminées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
              <p className="text-xs text-muted-foreground">Note moyenne</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou ville…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tailleur</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-center">En cours</TableHead>
                <TableHead className="text-center">Terminées</TableHead>
                <TableHead className="text-center">Note</TableHead>
                <TableHead className="text-right">Revenus</TableHead>
                <TableHead>Depuis</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Scissors className="h-8 w-8" />
                      <p className="text-sm">Aucun tailleur enregistré</p>
                      <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                        <UserPlus className="h-4 w-4" />
                        Ajouter le premier tailleur
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => openDetail(t)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                            {getInitials(t.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          {t.phone !== '—' && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />{t.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.city !== '—' && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{t.city}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.in_progress > 0 ? (
                        <Badge variant="info">{t.in_progress}</Badge>
                      ) : <span className="text-muted-foreground text-xs">0</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">{t.completed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.review_count > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">{t.avg_rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({t.review_count})</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {t.total_earned > 0 ? formatCurrency(t.total_earned) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(t.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(t) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog détail tailleur ── */}
      <Dialog open={!!selectedTailor} onOpenChange={(open) => !open && setSelectedTailor(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Fiche tailleur</DialogTitle>
          </DialogHeader>
          {selectedTailor && (
            <div className="space-y-5">
              {/* Identité */}
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg bg-violet-100 text-violet-700">
                    {getInitials(selectedTailor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{selectedTailor.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {selectedTailor.phone !== '—' && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedTailor.phone}</span>
                    )}
                    {selectedTailor.city !== '—' && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedTailor.city}</span>
                    )}
                    <span className="flex items-center gap-1"><Scissors className="h-3 w-3" />Tailleur depuis {formatDate(selectedTailor.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: selectedTailor.total_assignments, icon: Package, color: 'text-primary' },
                  { label: 'En cours', value: selectedTailor.in_progress, icon: Clock, color: 'text-blue-600' },
                  { label: 'Terminées', value: selectedTailor.completed, icon: CheckCircle, color: 'text-emerald-600' },
                  { label: 'Refusées', value: selectedTailor.rejected, icon: XCircle, color: 'text-red-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-lg border p-3 text-center">
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Note + revenus */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">Note moyenne</span>
                  </div>
                  {selectedTailor.review_count > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold">{selectedTailor.avg_rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">/ 5 ({selectedTailor.review_count} avis)</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pas encore évalué</p>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Revenus générés</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {selectedTailor.total_earned > 0 ? formatCurrency(selectedTailor.total_earned) : '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Historique assignments */}
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Historique des commandes
                </p>
                {loadingDetail ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Aucune commande assignée</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {assignments.map((a) => {
                      const s = ASSIGNMENT_BADGE[a.status] ?? { label: a.status, variant: 'outline' as const }
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">#{a.order_id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(a.assigned_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{formatCurrency(a.order_total)}</span>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeTailor(selectedTailor.id)}
                >
                  <XCircle className="h-4 w-4" />
                  Révoquer le rôle tailleur
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog ajouter tailleur ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ajouter un tailleur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Entrez l&apos;adresse email d&apos;un utilisateur existant pour lui attribuer le rôle tailleur.
            </p>
            <Input
              placeholder="email@exemple.com"
              value={newTailorEmail}
              onChange={(e) => setNewTailorEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && promoteToTailor()}
              type="email"
            />
            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
            <Button className="w-full" onClick={promoteToTailor} disabled={addingRole || !newTailorEmail}>
              {addingRole && <Loader2 className="h-4 w-4 animate-spin" />}
              <UserPlus className="h-4 w-4" />
              Attribuer le rôle tailleur
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
