'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import type { Category, CategoryInsert, CategoryType, CategoryStyle } from '@/types/database'
import { Plus, Edit, Trash2, RefreshCw, Search } from 'lucide-react'

const TYPE_LABELS: Record<CategoryType, string> = { homme: 'Homme', femme: 'Femme', enfant: 'Enfant' }
const STYLE_LABELS: Record<CategoryStyle, string> = { traditionnel: 'Traditionnel', moderne: 'Moderne', mixte: 'Mixte' }

const TYPE_BADGE_VARIANT: Record<CategoryType, 'info' | 'warning' | 'success'> = {
  homme: 'info',
  femme: 'warning',
  enfant: 'success',
}

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CategoryType | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<CategoryInsert>>({})
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('categories').select('*').order('name')
    if (typeFilter !== 'all') query = query.eq('type', typeFilter)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data } = await query
    setCategories(data ?? [])

    // Count products per category
    const counts: Record<string, number> = {}
    if (data && data.length > 0) {
      const ids = data.map((c) => c.id)
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .in('category_id', ids)
      for (const p of products ?? []) {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
      }
    }
    setProductCounts(counts)
    setLoading(false)
  }, [search, typeFilter, supabase])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  function openCreate() {
    setEditCategory(null)
    setForm({ type: 'homme', style: 'moderne' })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditCategory(cat)
    setForm({ name: cat.name, slug: cat.slug, type: cat.type, style: cat.style, image: cat.image ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.type || !form.style) return
    setSaving(true)
    if (editCategory) {
      await supabase.from('categories').update(form).eq('id', editCategory.id)
    } else {
      await supabase.from('categories').insert(form as CategoryInsert)
    }
    setSaving(false)
    setDialogOpen(false)
    fetchCategories()
  }

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setDeleteId(null)
    fetchCategories()
  }

  function slugify(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground text-sm">{categories.length} catégories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchCategories} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CategoryType | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="homme">Homme</SelectItem>
            <SelectItem value="femme">Femme</SelectItem>
            <SelectItem value="enfant">Enfant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Style</TableHead>
                <TableHead className="text-right">Produits</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucune catégorie trouvée
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell><Badge variant={TYPE_BADGE_VARIANT[cat.type]}>{TYPE_LABELS[cat.type]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{STYLE_LABELS[cat.style]}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{productCounts[cat.id] ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(cat.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: f.slug || slugify(e.target.value),
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input
                value={form.slug ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="ex: boubou-homme"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CategoryType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homme">Homme</SelectItem>
                    <SelectItem value="femme">Femme</SelectItem>
                    <SelectItem value="enfant">Enfant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Style *</Label>
                <Select value={form.style} onValueChange={(v) => setForm((f) => ({ ...f, style: v as CategoryStyle }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditionnel">Traditionnel</SelectItem>
                    <SelectItem value="moderne">Moderne</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL Image</Label>
              <Input
                value={form.image ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? 'Enregistrement...' : editCategory ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer la catégorie ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Les produits liés perdront leur catégorie.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
