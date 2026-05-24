'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatDate, getInitials } from '@/lib/utils'
import type { UserRoleType } from '@/types/database'
import { Search, RefreshCw, Pencil, Users, Scissors, ShoppingBag, MapPin, Mail, Phone, Loader2 } from 'lucide-react'

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
  const [allUsers, setAllUsers]   = useState<AuthUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleType | 'all' | 'no_role'>('all')
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
        setAllUsers(await res.json())
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

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
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{counts.total} comptes</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Clients',   count: counts.customers, icon: ShoppingBag, color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Tailleurs', count: counts.tailors,   icon: Scissors,    color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Admins',    count: counts.admins,    icon: Users,       color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Sans rôle', count: counts.no_role,   icon: Users,       color: 'text-amber-600',  bg: 'bg-amber-50' },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nom, email, ville…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-44">
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

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-semibold bg-muted">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            {user.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />{user.city}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={rb.variant} className="text-xs">{rb.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{user.order_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.last_sign_in ? formatDate(user.last_sign_in) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openUser(user)}>
                          <Pencil className="h-4 w-4" />
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

      {/* Dialog édition */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              {/* Avatar + email (non modifiable) */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base font-bold bg-primary text-primary-foreground">
                    {getInitials(editName || selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{editName || '—'}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{selectedUser.email}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Champs éditables */}
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs font-medium">Nom complet</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="edit-name"
                      className="pl-8 h-9 text-sm"
                      placeholder="Nom complet"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs font-medium">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="edit-phone"
                      className="pl-8 h-9 text-sm"
                      placeholder="+221 77 000 00 00"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-city" className="text-xs font-medium">Ville</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="edit-city"
                      className="pl-8 h-9 text-sm"
                      placeholder="Dakar"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Rôle */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rôle</p>
                <div className="flex gap-2 flex-wrap">
                  {(['customer', 'tailor', 'admin', null] as (UserRoleType | null)[]).map((r) => (
                    <button
                      key={r ?? 'none'}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        editRole === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {r === null ? 'Aucun rôle' : ROLE_BADGE[r]?.label ?? r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats (lecture seule) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Commandes</p>
                  <p className="font-bold text-lg leading-tight">{selectedUser.order_count}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Inscrit le</p>
                  <p className="font-medium text-xs leading-tight mt-0.5">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              {/* UUID */}
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">UUID</p>
                <p className="text-xs font-mono break-all select-all">{selectedUser.id}</p>
              </div>

              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
