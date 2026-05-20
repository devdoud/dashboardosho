'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import type { UserRoleType } from '@/types/database'
import { Search, RefreshCw, Eye, Users, Scissors, ShoppingBag } from 'lucide-react'

interface UserWithRole {
  id: string
  email: string
  created_at: string
  role: UserRoleType | null
  order_count?: number
  last_order?: string | null
}

const ROLE_BADGE: Record<UserRoleType, { label: string; variant: 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  admin: { label: 'Admin', variant: 'default' },
  tailor: { label: 'Tailleur', variant: 'info' },
  customer: { label: 'Client', variant: 'secondary' },
}

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleType | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null)
  const [userDetails, setUserDetails] = useState<{
    measurements: number
    addresses: number
    reviews: number
    assignments: number
  } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)

    // Fetch user_roles with user info
    let query = supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false })

    if (roleFilter !== 'all') query = query.eq('role', roleFilter)

    const { data: roleData } = await query

    if (!roleData || roleData.length === 0) {
      setUsers([])
      setLoading(false)
      return
    }

    // Get user emails via auth.users (admin only)
    const userIds = roleData.map((r) => r.user_id)
    const { data: profiles } = await supabase
      .from('addresses')
      .select('user_id, full_name')
      .in('user_id', userIds)
      .eq('is_default', true)

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) profileMap[p.user_id] = p.full_name

    // Order counts per user
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    const orderCountMap: Record<string, number> = {}
    const lastOrderMap: Record<string, string> = {}
    for (const o of orders ?? []) {
      orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1
      if (!lastOrderMap[o.user_id]) lastOrderMap[o.user_id] = o.created_at
    }

    const enriched: UserWithRole[] = roleData
      .filter((r) => {
        if (!search) return true
        const name = profileMap[r.user_id] ?? ''
        return name.toLowerCase().includes(search.toLowerCase()) || r.user_id.includes(search)
      })
      .map((r) => ({
        id: r.user_id,
        email: profileMap[r.user_id] ?? r.user_id.slice(0, 8) + '…',
        created_at: r.created_at,
        role: r.role as UserRoleType,
        order_count: orderCountMap[r.user_id] ?? 0,
        last_order: lastOrderMap[r.user_id] ?? null,
      }))

    setUsers(enriched)
    setLoading(false)
  }, [search, roleFilter, supabase])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function loadUserDetails(userId: string) {
    const [
      { count: measurements },
      { count: addresses },
      { count: reviews },
      { count: assignments },
    ] = await Promise.all([
      supabase.from('measurement_profiles').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('tailor_reviews').select('*', { count: 'exact', head: true }).eq('tailor_id', userId),
      supabase.from('order_assignments').select('*', { count: 'exact', head: true }).eq('tailor_id', userId),
    ])
    setUserDetails({
      measurements: measurements ?? 0,
      addresses: addresses ?? 0,
      reviews: reviews ?? 0,
      assignments: assignments ?? 0,
    })
  }

  async function handleViewUser(user: UserWithRole) {
    setSelectedUser(user)
    setUserDetails(null)
    await loadUserDetails(user.id)
  }

  async function changeRole(userId: string, newRole: UserRoleType) {
    await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId)
    fetchUsers()
    if (selectedUser?.id === userId) {
      setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null)
    }
  }

  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    tailors: users.filter((u) => u.role === 'tailor').length,
    customers: users.filter((u) => u.role === 'customer').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{counts.total} utilisateurs enregistrés</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.customers}</p>
              <p className="text-xs text-muted-foreground">Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
              <Scissors className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.tailors}</p>
              <p className="text-xs text-muted-foreground">Tailleurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRoleType | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="customer">Clients</SelectItem>
            <SelectItem value="tailor">Tailleurs</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead>Dernière commande</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const rb = user.role ? ROLE_BADGE[user.role] : { label: '—', variant: 'outline' as const }
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(user.email)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.email}</p>
                            <p className="text-xs font-mono text-muted-foreground">{user.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={rb.variant}>{rb.label}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{user.order_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(user.last_order ?? null)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)}>
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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {getInitials(selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.email}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedUser.id}</p>
                  <p className="text-xs text-muted-foreground">Inscrit le {formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              {/* Role change */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Rôle</p>
                <div className="flex gap-2">
                  {(['customer', 'tailor', 'admin'] as UserRoleType[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => selectedUser.role !== r && changeRole(selectedUser.id, r)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        selectedUser.role === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {ROLE_BADGE[r].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Statistiques</p>
                {!userDetails ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Commandes" value={selectedUser.order_count ?? 0} />
                    <StatBox label="Adresses" value={userDetails.addresses} />
                    <StatBox label="Profils mesures" value={userDetails.measurements} />
                    {selectedUser.role === 'tailor' && (
                      <>
                        <StatBox label="Assignments" value={userDetails.assignments} />
                        <StatBox label="Avis reçus" value={userDetails.reviews} />
                      </>
                    )}
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

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
