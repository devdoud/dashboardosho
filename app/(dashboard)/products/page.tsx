'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awaitQuery } from '@/lib/supabase/query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, truncate, getLabel } from '@/lib/utils'
import type { Product, ProductInsert, Category } from '@/types/database'
import { Search, Plus, Edit, Trash2, RefreshCw, Star, ChevronLeft, ChevronRight, Eye, Images, MapPin, Clock } from 'lucide-react'
import Image from 'next/image'
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload'
import { BilingualInput, parseI18n, serializeI18n, parseI18nArray, serializeI18nArray, type I18nValue } from '@/components/ui/bilingual-input'
import { BilingualTagInput } from '@/components/ui/bilingual-tag-input'
import { Separator } from '@/components/ui/separator'

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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewProduct, setViewProduct] = useState<(Product & { category: Category | null }) | null>(null)

  // Champs scalaires
  const [form, setForm] = useState<Partial<Omit<ProductInsert, 'name' | 'description' | 'traditional_origin'>>>({})
  // Champs multilingues
  const [titleI18n,  setTitleI18n]  = useState<I18nValue>({ fr: '', en: '' })
  const [descI18n,   setDescI18n]   = useState<I18nValue>({ fr: '', en: '' })
  const [originI18n, setOriginI18n] = useState<I18nValue>({ fr: '', en: '' })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter)
    if (search) query = query.or(`name->>fr.ilike.%${search}%,name->>en.ilike.%${search}%`)

    const { data, count } = await awaitQuery<Product & { category: Category | null }>(query)
    setProducts(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, categoryFilter, search, supabase])

  useEffect(() => {
    fetchProducts()
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
  }, [fetchProducts, supabase])

  function resetI18n() {
    setTitleI18n({ fr: '', en: '' })
    setDescI18n({ fr: '', en: '' })
    setOriginI18n({ fr: '', en: '' })
    setSaveError(null)
  }

  function openCreate() {
    setEditProduct(null)
    setForm({ is_featured: false, is_traditional: false, tags: [], perfect_for: [] })
    resetI18n()
    setDialogOpen(true)
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      price:          product.price,
      sku:            product.sku,
      category_id:    product.category_id ?? undefined,
      is_featured:    product.is_featured ?? false,
      is_traditional: product.is_traditional ?? false,
      difficulty:     product.difficulty ?? undefined,
      estimated_days: product.estimated_days ?? undefined,
      thumbnail:      product.thumbnail ?? '',
      images:         (product.images as string[]) ?? [],
      tags:           parseI18nArray(product.tags),
      perfect_for:    parseI18nArray(product.perfect_for),
    })
    setTitleI18n(parseI18n(product.name))
    setDescI18n(parseI18n(product.description))
    setOriginI18n(parseI18n(product.traditional_origin))
    setSaveError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!titleI18n.fr.trim()) { setSaveError('Le nom (FR) est obligatoire'); return }
    if (!form.sku?.trim())     { setSaveError('Le SKU est obligatoire'); return }
    if (!form.price)           { setSaveError('Le prix est obligatoire'); return }

    setSaving(true)
    setSaveError(null)

    const payload = {
      ...form,
      name:               serializeI18n(titleI18n) ?? titleI18n,
      description:        serializeI18n(descI18n),
      traditional_origin: serializeI18n(originI18n),
      tags:               serializeI18nArray((form.tags as I18nValue[]) ?? []),
      perfect_for:        serializeI18nArray((form.perfect_for as I18nValue[]) ?? []),
    }

    const res = editProduct
      ? await fetch('/api/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editProduct.id, ...payload }),
        })
      : await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setSaveError(d.error ?? 'Erreur lors de la sauvegarde')
      return
    }
    setDialogOpen(false)
    fetchProducts()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchProducts()
  }

  async function toggleFeatured(product: Product) {
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product.id, is_featured: !product.is_featured }),
    })
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
              <SelectItem key={c.id} value={c.id}>{getLabel(c.name)}</SelectItem>
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
                            alt={getLabel(product.name, 'Produit')}
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
                        <p className="font-medium text-sm">{truncate(getLabel(product.name), 40)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{getLabel(product.category.name)}</Badge>
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
                        <Button variant="ghost" size="icon" onClick={() => setViewProduct(product)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {/* ── Vue détail produit ── */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => !open && setViewProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          {viewProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {truncate(getLabel(viewProduct.name), 50)}
                  {viewProduct.is_featured && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {/* Miniature + galerie */}
                <div className="flex gap-3">
                  {viewProduct.thumbnail ? (
                    <div className="relative h-28 w-28 shrink-0 rounded-xl overflow-hidden border">
                      <Image src={viewProduct.thumbnail} alt={getLabel(viewProduct.name, 'Produit')} fill className="object-cover" sizes="112px" />
                    </div>
                  ) : (
                    <div className="h-28 w-28 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                      <Images className="h-8 w-8" />
                    </div>
                  )}
                  {((viewProduct.images as string[]) ?? []).length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {(viewProduct.images as string[]).map((url, i) => (
                        <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border">
                          <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="64px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Infos principales */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">SKU</span> <span className="font-mono ml-2">{viewProduct.sku}</span></div>
                  <div><span className="text-muted-foreground">Prix</span> <span className="font-semibold ml-2">{formatCurrency(viewProduct.price)}</span></div>
                  {viewProduct.category && (
                    <div><span className="text-muted-foreground">Catégorie</span> <Badge variant="outline" className="ml-2">{getLabel(viewProduct.category.name)}</Badge></div>
                  )}
                  {viewProduct.difficulty && (
                    <div><span className="text-muted-foreground">Difficulté</span> <Badge className="ml-2" variant={viewProduct.difficulty === 'easy' ? 'success' : viewProduct.difficulty === 'medium' ? 'warning' : 'destructive'}>{DIFFICULTY_LABELS[viewProduct.difficulty]}</Badge></div>
                  )}
                  {viewProduct.estimated_days && (
                    <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Délai</span><span className="ml-1">{viewProduct.estimated_days} jours</span></div>
                  )}
                  {viewProduct.traditional_origin && (
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Origine</span><span className="ml-1">{getLabel(viewProduct.traditional_origin)}</span></div>
                  )}
                </div>

                {viewProduct.description && (
                  <p className="text-sm text-muted-foreground rounded-lg bg-muted/30 p-3">{getLabel(viewProduct.description)}</p>
                )}

                {/* Tags */}
                {((viewProduct.tags as I18nValue[]) ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(viewProduct.tags as I18nValue[]).map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium">{getLabel(t)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Perfect for */}
                {((viewProduct.perfect_for as I18nValue[]) ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perfect for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(viewProduct.perfect_for as I18nValue[]).map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md border border-border bg-muted/40 text-xs font-medium">{getLabel(t)}</span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewProduct(null)}>Fermer</Button>
                <Button onClick={() => { setViewProduct(null); openEdit(viewProduct) }}>
                  <Edit className="h-4 w-4" /> Modifier
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">

            {/* ── Nom (bilingue) ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Nom <span className="text-destructive">*</span>
              </Label>
              <BilingualInput
                value={titleI18n}
                onChange={setTitleI18n}
                placeholder={{ fr: 'Nom du produit en français', en: 'Product name in English' }}
                required
              />
            </div>

            {/* ── Description (bilingue) ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <BilingualInput
                value={descI18n}
                onChange={setDescI18n}
                placeholder={{ fr: 'Description en français…', en: 'Description in English…' }}
                multiline
                rows={3}
              />
            </div>

            <Separator />

            {/* ── Infos scalaires ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SKU <span className="text-destructive">*</span></Label>
                <Input
                  value={form.sku ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="OSH-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prix (FCFA) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={form.price ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) }))}
                  placeholder="25000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category_id ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune —</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{getLabel(c.name)}</SelectItem>)}
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
                <Label>Délai estimé (jours)</Label>
                <Input
                  type="number"
                  value={form.estimated_days ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_days: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Origine traditionnelle</Label>
                <BilingualInput
                  value={originI18n}
                  onChange={setOriginI18n}
                  placeholder={{ fr: 'ex: Sénégal, Mali', en: 'e.g. Senegal, Mali' }}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="featured" checked={form.is_featured ?? false} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
                <Label htmlFor="featured">Produit vedette</Label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="traditional" checked={form.is_traditional ?? false} onChange={(e) => setForm((f) => ({ ...f, is_traditional: e.target.checked }))} />
                <Label htmlFor="traditional">Traditionnel</Label>
              </div>
            </div>

            <Separator />

            {/* ── Tags ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tags</Label>
              <BilingualTagInput
                value={(form.tags as I18nValue[]) ?? []}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                suggestions={[
                  { fr: 'Mariage', en: 'Wedding' },
                  { fr: 'Cérémonie', en: 'Ceremony' },
                  { fr: 'Traditionnel', en: 'Traditional' },
                  { fr: 'Nouveauté', en: 'New' },
                  { fr: 'Promo', en: 'Sale' },
                  { fr: 'Exclusif', en: 'Exclusive' },
                  { fr: 'Limité', en: 'Limited' },
                  { fr: 'Tendance', en: 'Trending' },
                ]}
                placeholder={{ fr: 'Ajouter un tag…', en: 'Add a tag…' }}
              />
            </div>

            {/* ── Perfect for ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Perfect for</Label>
              <BilingualTagInput
                value={(form.perfect_for as I18nValue[]) ?? []}
                onChange={(perfect_for) => setForm((f) => ({ ...f, perfect_for }))}
                suggestions={[
                  { fr: 'Mariage', en: 'Wedding' },
                  { fr: 'Baptême', en: 'Christening' },
                  { fr: 'Cérémonie', en: 'Ceremony' },
                  { fr: 'Soirée', en: 'Evening' },
                  { fr: 'Bureau', en: 'Office' },
                  { fr: 'Fête', en: 'Party' },
                  { fr: 'Quotidien', en: 'Everyday' },
                  { fr: 'Ramadan', en: 'Ramadan' },
                  { fr: 'Noël', en: 'Christmas' },
                ]}
                placeholder={{ fr: 'Ajouter une occasion…', en: 'Add an occasion…' }}
              />
            </div>

            <Separator />

            {/* ── Images ── */}
            <div className="space-y-4">
              <p className="text-sm font-semibold">Images</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Miniature principale</Label>
                  <ImageUpload
                    value={form.thumbnail}
                    onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
                    onRemove={() => setForm((f) => ({ ...f, thumbnail: '' }))}
                    folder="thumbnails"
                    size="lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Galerie (max 8)</Label>
                  <MultiImageUpload
                    value={(form.images as string[]) ?? []}
                    onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
                    folder="gallery"
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                {saveError}
              </p>
            )}

          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : editProduct ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
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

// ── Sous-composant : grille d'options avec images ──────────────────────────

