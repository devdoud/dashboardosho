'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Notice, PageHeader, SectionLabel, SpecRow, StatRow } from '@/components/ui/atelier'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { UserRoleType } from '@/types/database'
import { Search, RefreshCw, Pencil, Loader2 } from 'lucide-react'

interface AuthUser {
  id: string
  email: string
  created_at: string
  last_sign_in: string | null
  role: UserRoleType | null
  full_name: string | null
  phone: string | null
  city: string | null
  order_count: number
  last_order: string | null
}

const ROLE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  admin:    { label: 'Admin',    variant: 'default' },
  tailor:   { label: 'Tailleur', variant: 'info' },
  customer: { label: 'Client',   variant: 'secondary' },
}

export default function UsersPage() {
  const [allUsers, setAllUsers]         = useState<AuthUser[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [roleFilter, setRoleFilter]     = useState<UserRoleType | 'all' | 'no_role'>('all')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)

  // form state
  const [editName,  setEditName]  = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity,  setEditCity]  = useState('')
  const [editRole,  setEditRole]  = useState<UserRoleType | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erreur lors du chargement')
        setAllUsers([])
      } else {
        const json = await res.json()
        setAllUsers(json.users ?? [])
        setIsSuperAdmin(json.isSuperAdmin ?? false)
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchUsers, search])

  // ─── Ouvrir le dialog ─────────────────────────────────────────────────────
  function openUser(user: AuthUser) {
    setSelectedUser(user)
    setEditName(user.full_name ?? '')
    setEditPhone(user.phone ?? '')
    setEditCity(user.city ?? '')
    setEditRole(user.role)
    setSaveError(null)
  }

  // ─── Sauvegarder ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedUser) return
    setSaving(true)
    setSaveError(null)

    const body: Record<string, unknown> = { userId: selectedUser.id }

    // N'envoyer que ce qui a changé
    if (editName  !== (selectedUser.full_name ?? '')) body.full_name = editName
    if (editPhone !== (selectedUser.phone ?? ''))     body.phone     = editPhone
    if (editCity  !== (selectedUser.city ?? ''))      body.city      = editCity
    if (editRole  !== selectedUser.role)              body.role      = editRole

    if (Object.keys(body).length === 1) { setSaving(false); return } // rien à changer

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      const d = await res.json()
      setSaveError(d.error ?? 'Erreur lors de la sauvegarde')
      return
    }

    // Mettre à jour localement
    const updated: AuthUser = {
      ...selectedUser,
      full_name: editName  || null,
      phone:     editPhone || null,
      city:      editCity  || null,
      role:      editRole,
    }
    setAllUsers((prev) => prev.map((u) => u.id === selectedUser.id ? updated : u))
    setSelectedUser(null)
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────
  const filtered = allUsers.filter((u) => {
    const matchRole =
      roleFilter === 'all'     ? true :
      roleFilter === 'no_role' ? !u.role :
      u.role === roleFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [u.email, u.full_name, u.city, u.id].some((v) => v?.toLowerCase().includes(q))
    return matchRole && matchSearch
  })

  const counts = {
    total:     allUsers.length,
    admins:    allUsers.filter((u) => u.role === 'admin').length,
    tailors:   allUsers.filter((u) => u.role === 'tailor').length,
    customers: allUsers.filter((u) => u.role === 'customer').length,
    no_role:   allUsers.filter((u) => !u.role).length,
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Utilisateurs"
        description={`${counts.total} comptes`}
        actions={
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading} aria-label="Actualiser la liste">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        }
      />

      <StatRow
        items={[
          { label: 'Clients',   value: counts.customers },
          { label: 'Tailleurs', value: counts.tailors },
          { label: 'Admins',    value: counts.admins },
          { label: 'Sans rôle', value: counts.no_role },
        ]}
      />

      {error && <Notice tone="danger">{error}</Notice>}

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <label htmlFor="users-search" className="sr-only">Rechercher par nom, email ou ville</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <Input
            id="users-search"
            type="search"
            placeholder="Nom, email, ville"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrer par rôle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous ({counts.total})</SelectItem>
            <SelectItem value="customer">Clients ({counts.customers})</SelectItem>
            <SelectItem value="tailor">Tailleurs ({counts.tailors})</SelectItem>
            <SelectItem value="admin">Admins ({counts.admins})</SelectItem>
            <SelectItem value="no_role">Sans rôle ({counts.no_role})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="text-right">Commandes</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead>Inscrit le</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j} className="py-4"><div className="h-4 animate-pulse rounded-sm bg-placeholder" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted">
                {error ? 'Impossible de charger les utilisateurs.' : 'Aucun utilisateur trouvé.'}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((user) => {
              const rb = user.role ? ROLE_BADGE[user.role] : { label: 'Aucun', variant: 'outline' as const }
              const displayName = user.full_name ?? user.email.split('@')[0]
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-md font-medium">{displayName}</p>
                        {user.city && <p className="text-sm text-muted">{user.city}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted">{user.email}</TableCell>
                  <TableCell><Badge variant={rb.variant}>{rb.label}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{user.order_count}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">
                    {user.last_sign_in ? formatDate(user.last_sign_in) : ''}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openUser(user)} aria-label={`Modifier ${displayName}`}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Dialog édition */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Identité (non modifiable) */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-sm">{getInitials(editName || selectedUser.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{editName || selectedUser.email.split('@')[0]}</p>
                  <p className="truncate text-sm text-muted">{selectedUser.email}</p>
                </div>
              </div>

              {/* Champs éditables — ni icône décorative, ni valeur d'exemple à recopier */}
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Nom complet</Label>
                  <Input id="edit-name" autoComplete="off" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input id="edit-phone" type="tel" autoComplete="off" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city">Ville</Label>
                  <Input id="edit-city" autoComplete="off" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </div>
              </div>

              {/* Rôle */}
              <div className="space-y-2">
                <SectionLabel id="role-label">Rôle</SectionLabel>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="role-label">
                  {(['customer', 'tailor', ...(isSuperAdmin ? ['admin'] : []), null] as (UserRoleType | null)[]).map((r) => {
                    const active = editRole === r
                    return (
                      <button
                        key={r ?? 'none'}
                        type="button"
                        onClick={() => setEditRole(r)}
                        aria-pressed={active}
                        className={cn(
                          'min-h-11 rounded-sm border px-3.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-primary-fill bg-primary-fill text-primary-ink'
                            : 'border-hairline bg-surface text-ink hover:border-ink'
                        )}
                      >
                        {r === null ? 'Aucun rôle' : ROLE_BADGE[r]?.label ?? r}
                      </button>
                    )
                  })}
                </div>
                {!isSuperAdmin && editRole === 'admin' && (
                  <p className="text-sm text-warn-ink">Seul le super admin peut modifier ce rôle.</p>
                )}
              </div>

              {/* Lecture seule */}
              <dl className="border-t border-hairline">
                <SpecRow label="Commandes" value={String(selectedUser.order_count)} valueClassName="tabular-nums" />
                <SpecRow label="Inscrit le" value={formatDate(selectedUser.created_at)} />
                <SpecRow label="UUID" value={selectedUser.id} valueClassName="select-all break-all font-mono text-sm" />
              </dl>

              {saveError && <Notice tone="danger">{saveError}</Notice>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
