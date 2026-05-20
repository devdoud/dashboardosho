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
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, truncate } from '@/lib/utils'
import type { Product, ProductInsert, Category } from '@/types/database'
import { Search, Plus, Edit, Trash2, RefreshCw, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

const PAGE_SIZE = 20

const DIFFICULTY_LABELS = { easy: 'Facile', medium: 'Intermédiaire', hard: 'Difficile' }

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<(Product & { category: Category | null })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<ProductInsert>>({})

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter)
    if (search) query = query.ilike('title', `%${search}%`)

    const { data, count } = await query
    setProducts((data as (Product & { category: Category | null })[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, categoryFilter, search, supabase])

  useEffect(() => {
    fetchProducts()
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
  }, [fetchProducts, supabase])

  function openCreate() {
    setEditProduct(null)
    setForm({ is_featured: false, is_traditional: false })
    setDialogOpen(true)
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      title: product.title,
      price: product.price,
      sku: product.sku,
      description: product.description ?? '',
      category_id: product.category_id ?? undefined,
      fabric: product.fabric ?? '',
      embroidery: product.embroidery ?? '',
      accessory: product.accessory ?? '',
      is_featured: product.is_featured ?? false,
      is_traditional: product.is_traditional ?? false,
      traditional_origin: product.traditional_origin ?? '',
      difficulty: product.difficulty ?? undefined,
      estimated_days: product.estimated_days ?? undefined,
      thumbnail: product.thumbnail ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    if (editProduct) {
      await supabase.from('products').update(form).eq('id', editProduct.id)
    } else {
      await supabase.from('products').insert(form as ProductInsert)
    }
    setSaving(false)
    setDialogOpen(false)
    fetchProducts()
  }

  async function handleDelete(id: string) {
    await supabase.from('products').delete().eq('id', id)
    setDeleteId(null)
    fetchProducts()
  }

  async function toggleFeatured(product: Product) {
    await supabase.from('products').update({ is_featured: !product.is_featured }).eq('id', product.id)
    fetchProducts()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground text-sm">{total} produits au total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau produit
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
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Produit</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Difficulté</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead>Vedette</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.thumbnail ? (
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{truncate(product.title, 40)}</p>
                        {product.fabric && <p className="text-xs text-muted-foreground">{product.fabric}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{product.category.name}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {product.difficulty ? (
                        <Badge variant={product.difficulty === 'easy' ? 'success' : product.difficulty === 'medium' ? 'warning' : 'destructive'}>
                          {DIFFICULTY_LABELS[product.difficulty]}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleFeatured(product)}>
                        <Star className={`h-4 w-4 ${product.is_featured ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(product.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(product.id)}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</p>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>SKU *</Label>
              <Input value={form.sku ?? ''} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prix (FCFA) *</Label>
              <Input type="number" value={form.price ?? ''} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category_id ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulté</Label>
              <Select value={form.difficulty ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v === 'none' ? undefined : v as Product['difficulty'] }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  <SelectItem value="easy">Facile</SelectItem>
                  <SelectItem value="medium">Intermédiaire</SelectItem>
                  <SelectItem value="hard">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tissu</Label>
              <Input value={form.fabric ?? ''} onChange={(e) => setForm((f) => ({ ...f, fabric: e.target.value }))} placeholder="ex: Bazin Riche" />
            </div>
            <div className="space-y-1.5">
              <Label>Délai estimé (jours)</Label>
              <Input type="number" value={form.estimated_days ?? ''} onChange={(e) => setForm((f) => ({ ...f, estimated_days: parseInt(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>URL Miniature</Label>
              <Input value={form.thumbnail ?? ''} onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Origine traditionnelle</Label>
              <Input value={form.traditional_origin ?? ''} onChange={(e) => setForm((f) => ({ ...f, traditional_origin: e.target.value }))} placeholder="ex: Ghana" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" checked={form.is_featured ?? false} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
              <Label htmlFor="featured">Produit vedette</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="traditional" checked={form.is_traditional ?? false} onChange={(e) => setForm((f) => ({ ...f, is_traditional: e.target.checked }))} />
              <Label htmlFor="traditional">Traditionnel</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.sku || !form.price}>
              {saving ? 'Enregistrement...' : editProduct ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le produit ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
