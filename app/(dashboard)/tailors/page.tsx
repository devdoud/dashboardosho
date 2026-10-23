'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Notice, PageHeader, Price, SectionLabel, SpecRow, StatRow } from '@/components/ui/atelier'
import { formatDate, formatDateTime, formatCurrency, getInitials } from '@/lib/utils'
import { Star, RefreshCw, Eye, Search, XCircle, UserPlus, Loader2 } from 'lucide-react'

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

/** L'API renvoie « — » quand le champ est vide : on le traite comme absent. */
const present = (v: string | null | undefined) => (v && v !== '—' ? v : '')

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
    <div className="space-y-8">
      <PageHeader
        title="Tailleurs"
        description={`${tailors.length} tailleurs enregistrés`}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={fetchTailors} disabled={loading} aria-label="Actualiser la liste">
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus />
              Ajouter un tailleur
            </Button>
          </>
        }
      />

      <StatRow
        items={[
          { label: 'Tailleurs actifs', value: tailors.length },
          { label: 'En cours', value: totalInProgress },
          { label: 'Commandes terminées', value: totalCompleted },
          { label: 'Note moyenne', value: avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : 'Aucune' },
        ]}
      />

      <div className="relative max-w-xs">
        <label htmlFor="tailors-search" className="sr-only">Rechercher par nom ou ville</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
        <Input
          id="tailors-search"
          type="search"
          placeholder="Nom ou ville"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j} className="py-4"><div className="h-4 animate-pulse rounded-sm bg-placeholder" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center">
                <p className="text-md text-muted">Aucun tailleur enregistré.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <UserPlus />
                  Ajouter le premier tailleur
                </Button>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(t.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-md font-medium">{t.name}</p>
                      {present(t.phone) && <p className="text-sm text-muted">{t.phone}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted">{present(t.city)}</TableCell>
                <TableCell className="text-center">
                  {t.in_progress > 0
                    ? <Badge variant="info">{t.in_progress}</Badge>
                    : <span className="text-sm text-muted">0</span>}
                </TableCell>
                <TableCell className="text-center tabular-nums">{t.completed}</TableCell>
                <TableCell className="text-center">
                  {t.review_count > 0 ? (
                    <span className="inline-flex items-center justify-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-ink text-ink" strokeWidth={1.75} aria-hidden />
                      <span className="text-md font-medium tabular-nums">{t.avg_rating.toFixed(1)}</span>
                      <span className="text-sm text-muted">({t.review_count})</span>
                    </span>
                  ) : <span className="text-sm text-muted">Pas d&apos;avis</span>}
                </TableCell>
                <TableCell className="text-right">
                  {t.total_earned > 0 && <Price>{formatCurrency(t.total_earned)}</Price>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted">
                  {formatDate(t.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDetail(t)} aria-label={`Voir la fiche de ${t.name}`}>
                    <Eye />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* ── Dialog détail tailleur ── */}
      <Dialog open={!!selectedTailor} onOpenChange={(open) => !open && setSelectedTailor(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{selectedTailor?.name ?? 'Fiche tailleur'}</DialogTitle>
          </DialogHeader>
          {selectedTailor && (
            <div className="space-y-7">
              {/* Identité */}
              <dl className="border-t border-hairline">
                <SpecRow label="Téléphone" value={present(selectedTailor.phone)} />
                <SpecRow label="Ville" value={present(selectedTailor.city)} />
                <SpecRow label="Tailleur depuis" value={formatDate(selectedTailor.created_at)} />
              </dl>

              {/* Activité */}
              <StatRow
                items={[
                  { label: 'Total', value: selectedTailor.total_assignments },
                  { label: 'En cours', value: selectedTailor.in_progress },
                  { label: 'Terminées', value: selectedTailor.completed },
                  { label: 'Refusées', value: selectedTailor.rejected },
                ]}
              />

              <dl className="border-t border-hairline">
                <SpecRow
                  label="Note moyenne"
                  value={selectedTailor.review_count > 0
                    ? `${selectedTailor.avg_rating.toFixed(1)} / 5 · ${selectedTailor.review_count} avis`
                    : 'Pas encore évalué'}
                />
                <SpecRow
                  label="Revenus générés"
                  value={selectedTailor.total_earned > 0 ? formatCurrency(selectedTailor.total_earned) : ''}
                  valueClassName="serif-sm text-base tabular-nums"
                />
              </dl>

              {/* Historique assignments */}
              <section className="space-y-2">
                <SectionLabel>Historique des commandes</SectionLabel>
                {loadingDetail ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-sm bg-placeholder" />)}
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-md text-muted">Aucune commande assignée.</p>
                ) : (
                  <ul className="max-h-60 overflow-y-auto border-t border-hairline">
                    {assignments.map((a) => {
                      const s = ASSIGNMENT_BADGE[a.status] ?? { label: a.status, variant: 'outline' as const }
                      return (
                        <li key={a.id} className="flex items-center justify-between gap-3 border-b border-hairline py-2.5">
                          <div>
                            <p className="font-mono text-sm">#{a.order_id.slice(0, 8)}</p>
                            <p className="text-sm text-muted">{formatDateTime(a.assigned_at)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Price>{formatCurrency(a.order_total)}</Price>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
          {selectedTailor && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => revokeTailor(selectedTailor.id)}>
                <XCircle />
                Révoquer le rôle tailleur
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog ajouter tailleur ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby="add-tailor-help">
          <DialogHeader>
            <DialogTitle>Ajouter un tailleur</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); promoteToTailor() }}
          >
            <p id="add-tailor-help" className="text-md text-muted">
              L&apos;adresse email d&apos;un utilisateur existant, qui recevra le rôle tailleur.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-tailor-email">Email</Label>
              <Input
                id="new-tailor-email"
                type="email"
                autoComplete="off"
                value={newTailorEmail}
                onChange={(e) => setNewTailorEmail(e.target.value)}
              />
            </div>
            {addError && <Notice tone="danger">{addError}</Notice>}
            <Button type="submit" className="w-full" disabled={addingRole || !newTailorEmail}>
              {addingRole ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Attribuer le rôle tailleur
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
