'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { orIlike } from '@/lib/supabase/query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Notice, PageHeader, Price, SectionLabel, SpecRow } from '@/components/ui/atelier'
import { cn, formatCurrency, formatDate, truncate, getLabel } from '@/lib/utils'
import type { Product, ProductInsert, Category } from '@/types/database'
import { Search, Plus, Edit, Trash2, RefreshCw, Star, ChevronLeft, ChevronRight, Eye, Images } from 'lucide-react'
import Image from 'next/image'
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload'
import { BilingualInput, parseI18n, serializeI18n, parseI18nArray, serializeI18nArray, type I18nValue } from '@/components/ui/bilingual-input'
import { BilingualTagInput } from '@/components/ui/bilingual-tag-input'

const PAGE_SIZE = 20

const DIFFICULTY_LABELS = { easy: 'Facile', medium: 'Intermédiaire', hard: 'Difficile' }

const DIFFICULTY_VARIANT = { easy: 'success', medium: 'warning', hard: 'destructive' } as const

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
    if (search) query = query.or(orIlike(['name->>fr', 'name->>en'], search))

    const { data, count } = await query
    setProducts(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, categoryFilter, search, supabase])

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
  }, [supabase])

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
    <div className="space-y-8">
      <PageHeader
        title="Produits"
        description={`${total} produits au total`}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={fetchProducts} disabled={loading} aria-label="Actualiser la liste">
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              Nouveau produit
            </Button>
          </>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <label htmlFor="products-search" className="sr-only">Rechercher un produit</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <Input
            id="products-search"
            type="search"
            placeholder="Rechercher"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0) }}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrer par catégorie">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16"><span className="sr-only">Image</span></TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Difficulté</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="text-center">Vedette</TableHead>
            <TableHead>Créé le</TableHead>
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
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-muted">
                Aucun produit trouvé.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const name = getLabel(product.name)
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.thumbnail ? (
                      <div className="h-12 w-10 overflow-hidden rounded-sm bg-placeholder">
                        <Image
                          src={product.thumbnail}
                          alt=""
                          width={40}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-10 rounded-sm bg-placeholder" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{truncate(name, 40)}</TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    {product.category && <Badge variant="outline">{getLabel(product.category.name)}</Badge>}
                  </TableCell>
                  <TableCell>
                    {product.difficulty && (
                      <Badge variant={DIFFICULTY_VARIANT[product.difficulty]}>
                        {DIFFICULTY_LABELS[product.difficulty]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right"><Price>{formatCurrency(product.price)}</Price></TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(product)}
                      aria-pressed={!!product.is_featured}
                      aria-label={`Produit vedette : ${name}`}
                      className="inline-flex size-11 items-center justify-center rounded-sm transition-colors hover:bg-surface"
                    >
                      <Star
                        className={cn('h-4 w-4', product.is_featured ? 'fill-ink text-ink' : 'text-muted')}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted">{formatDate(product.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewProduct(product)} aria-label={`Voir ${name}`}>
                        <Eye />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label={`Modifier ${name}`}>
                        <Edit />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-danger-ink" onClick={() => setDeleteId(product.id)} aria-label={`Supprimer ${name}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Page {page + 1} sur {totalPages}</p>
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

      {/* ── Vue détail produit ── */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => !open && setViewProduct(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
          {viewProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{truncate(getLabel(viewProduct.name), 50)}</DialogTitle>
                {viewProduct.is_featured && <div><Badge variant="secondary">Produit vedette</Badge></div>}
              </DialogHeader>

              <div className="space-y-6">
                {/* Miniature + galerie */}
                <div className="flex gap-3">
                  {viewProduct.thumbnail ? (
                    <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-sm border border-hairline">
                      <Image src={viewProduct.thumbnail} alt={getLabel(viewProduct.name, 'Produit')} fill className="object-cover" sizes="112px" />
                    </div>
                  ) : (
                    <div className="flex h-36 w-28 shrink-0 items-center justify-center rounded-sm bg-placeholder">
                      <Images className="h-7 w-7 text-placeholder-ink" strokeWidth={1.75} aria-hidden />
                    </div>
                  )}
                  {((viewProduct.images as string[]) ?? []).length > 0 && (
                    <div className="flex flex-wrap content-start gap-2">
                      {(viewProduct.images as string[]).map((url, i) => (
                        <div key={i} className="relative h-20 w-16 overflow-hidden rounded-sm border border-hairline">
                          <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="64px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spécifications : une ligne vide disparaît */}
                <dl className="border-t border-hairline">
                  <SpecRow label="Prix" value={formatCurrency(viewProduct.price)} valueClassName="serif-sm text-base tabular-nums" />
                  <SpecRow label="SKU" value={viewProduct.sku} valueClassName="font-mono" />
                  <SpecRow label="Catégorie" value={viewProduct.category ? getLabel(viewProduct.category.name) : null} />
                  <SpecRow label="Difficulté" value={viewProduct.difficulty ? DIFFICULTY_LABELS[viewProduct.difficulty] : null} />
                  <SpecRow label="Délai" value={viewProduct.estimated_days ? `${viewProduct.estimated_days} jours` : null} />
                  <SpecRow label="Origine" value={viewProduct.traditional_origin ? getLabel(viewProduct.traditional_origin, '') : null} />
                </dl>

                {viewProduct.description && (
                  <section className="space-y-2">
                    <SectionLabel>Description</SectionLabel>
                    <p className="text-md leading-relaxed">{getLabel(viewProduct.description)}</p>
                  </section>
                )}

                {((viewProduct.tags as I18nValue[]) ?? []).length > 0 && (
                  <section className="space-y-2">
                    <SectionLabel>Tags</SectionLabel>
                    <ul className="flex flex-wrap gap-1.5">
                      {(viewProduct.tags as I18nValue[]).map((t, i) => (
                        <li key={i} className="rounded-sm border border-hairline bg-surface px-2.5 py-1 text-sm">{getLabel(t)}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {((viewProduct.perfect_for as I18nValue[]) ?? []).length > 0 && (
                  <section className="space-y-2">
                    <SectionLabel>Pour l&apos;occasion</SectionLabel>
                    <ul className="flex flex-wrap gap-1.5">
                      {(viewProduct.perfect_for as I18nValue[]).map((t, i) => (
                        <li key={i} className="rounded-sm border border-hairline bg-surface px-2.5 py-1 text-sm">{getLabel(t)}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewProduct(null)}>Fermer</Button>
                <Button onClick={() => { setViewProduct(null); openEdit(viewProduct) }}>
                  <Edit /> Modifier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">

            {/* ── Nom (bilingue) ── */}
            <div className="space-y-1.5">
              <Label htmlFor="product-name">
                Nom <span className="text-danger-ink" aria-hidden>*</span>
              </Label>
              <BilingualInput id="product-name" value={titleI18n} onChange={setTitleI18n} required />
            </div>

            {/* ── Description (bilingue) ── */}
            <div className="space-y-1.5">
              <Label htmlFor="product-desc">Description</Label>
              <BilingualInput id="product-desc" value={descI18n} onChange={setDescI18n} multiline rows={3} />
            </div>

            {/* ── Infos scalaires ── */}
            <div className="grid gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product-sku">SKU <span className="text-danger-ink" aria-hidden>*</span></Label>
                <Input
                  id="product-sku"
                  className="font-mono"
                  value={form.sku ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-price">Prix en FCFA <span className="text-danger-ink" aria-hidden>*</span></Label>
                <Input
                  id="product-price"
                  type="number"
                  inputMode="numeric"
                  value={form.price ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label id="product-category-label">Catégorie</Label>
                <Select value={form.category_id ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? undefined : v }))}>
                  <SelectTrigger aria-labelledby="product-category-label"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{getLabel(c.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label id="product-difficulty-label">Difficulté</Label>
                <Select value={form.difficulty ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v === 'none' ? undefined : v as Product['difficulty'] }))}>
                  <SelectTrigger aria-labelledby="product-difficulty-label"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non précisée</SelectItem>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Intermédiaire</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-days">Délai estimé, en jours</Label>
                <Input
                  id="product-days"
                  type="number"
                  inputMode="numeric"
                  value={form.estimated_days ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_days: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-origin">Origine traditionnelle</Label>
                <BilingualInput id="product-origin" value={originI18n} onChange={setOriginI18n} />
              </div>
              <label htmlFor="featured" className="flex min-h-11 cursor-pointer items-center gap-3 text-md">
                <input
                  type="checkbox"
                  id="featured"
                  className="h-5 w-5 accent-ink"
                  checked={form.is_featured ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                />
                Produit vedette
              </label>
              <label htmlFor="traditional" className="flex min-h-11 cursor-pointer items-center gap-3 text-md">
                <input
                  type="checkbox"
                  id="traditional"
                  className="h-5 w-5 accent-ink"
                  checked={form.is_traditional ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, is_traditional: e.target.checked }))}
                />
                Pièce traditionnelle
              </label>
            </div>

            {/* ── Tags ── */}
            <div className="space-y-1.5 border-t border-hairline pt-6">
              <Label>Tags</Label>
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
              />
            </div>

            {/* ── Perfect for ── */}
            <div className="space-y-1.5">
              <Label>Pour l&apos;occasion</Label>
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
              />
            </div>

            {/* ── Images ── */}
            <section className="space-y-4 border-t border-hairline pt-6">
              <SectionLabel>Images</SectionLabel>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Miniature principale</p>
                  <ImageUpload
                    value={form.thumbnail}
                    onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
                    onRemove={() => setForm((f) => ({ ...f, thumbnail: '' }))}
                    folder="thumbnails"
                    size="lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Galerie, 8 images au plus</p>
                  <MultiImageUpload
                    value={(form.images as string[]) ?? []}
                    onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
                    folder="gallery"
                  />
                </div>
              </div>
            </section>

            {saveError && <Notice tone="danger">{saveError}</Notice>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editProduct ? 'Enregistrer' : 'Créer'}
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
          <p className="text-md text-muted">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
