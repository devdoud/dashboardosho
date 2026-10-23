'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { orIlike } from '@/lib/supabase/query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/image-upload'
import { BilingualInput, parseI18n, serializeI18n, type I18nValue } from '@/components/ui/bilingual-input'
import { Notice, PageHeader } from '@/components/ui/atelier'
import { formatDate, getLabel } from '@/lib/utils'
import type { Category } from '@/types/database'
import { Plus, Edit, Trash2, RefreshCw, Search, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories,   setCategories]   = useState<Category[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [nameI18n,     setNameI18n]     = useState<I18nValue>({ fr: '', en: '' })
  const [slug,         setSlug]         = useState('')
  const [image,        setImage]        = useState<string | null>(null)
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('categories').select('*').order('name')
    if (search) query = query.or(orIlike(['name->>fr', 'name->>en'], search))
    const { data } = await query
    const cats = data ?? []
    setCategories(cats)

    if (cats.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .in('category_id', cats.map((c) => c.id))
      const counts: Record<string, number> = {}
      for (const p of products ?? []) {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
      }
      setProductCounts(counts)
    }
    setLoading(false)
  }, [search, supabase])

  useEffect(() => {
    const t = setTimeout(fetchCategories, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchCategories, search])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function slugify(str: string) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function openCreate() {
    setEditCategory(null)
    setNameI18n({ fr: '', en: '' })
    setSlug('')
    setImage(null)
    setSaveError(null)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditCategory(cat)
    setNameI18n(parseI18n(cat.name))
    setSlug(cat.slug)
    setImage(cat.image ?? null)
    setSaveError(null)
    setDialogOpen(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!nameI18n.fr.trim()) { setSaveError('Le nom (FR) est obligatoire'); return }
    if (!slug.trim())         { setSaveError('Le slug est obligatoire'); return }

    setSaving(true)
    setSaveError(null)

    const payload = {
      name:  serializeI18n(nameI18n) ?? nameI18n,
      slug:  slug.trim(),
      image: image ?? null,
    }

    const res = editCategory
      ? await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editCategory.id, ...payload }),
        })
      : await fetch('/api/admin/categories', {
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
    fetchCategories()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchCategories()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catégories"
        description={`${categories.length} catégories`}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={fetchCategories} disabled={loading} aria-label="Actualiser la liste">
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              Nouvelle catégorie
            </Button>
          </>
        }
      />

      <div className="relative max-w-xs">
        <label htmlFor="categories-search" className="sr-only">Rechercher une catégorie</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
        <Input id="categories-search" type="search" placeholder="Rechercher" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16"><span className="sr-only">Image</span></TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead className="text-right">Produits</TableHead>
            <TableHead>Créée le</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j} className="py-4"><div className="h-4 animate-pulse rounded-sm bg-placeholder" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted">Aucune catégorie trouvée.</TableCell>
            </TableRow>
          ) : (
            categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>
                  {cat.image ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-placeholder">
                      <Image src={cat.image} alt="" width={40} height={40} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-placeholder">
                      <ImageIcon className="h-4 w-4 text-placeholder-ink" strokeWidth={1.75} aria-hidden />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{getLabel(cat.name)}</TableCell>
                <TableCell className="font-mono text-sm text-muted">{cat.slug}</TableCell>
                <TableCell className="text-right tabular-nums">{productCounts[cat.id] ?? 0}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted">{formatDate(cat.created_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} aria-label={`Modifier ${getLabel(cat.name)}`}><Edit /></Button>
                    <Button variant="ghost" size="icon" className="text-danger-ink" onClick={() => setDeleteId(cat.id)} aria-label={`Supprimer ${getLabel(cat.name)}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Nom bilingue */}
            <div className="space-y-1.5">
              <Label htmlFor="category-name">Nom <span className="text-danger-ink" aria-hidden>*</span></Label>
              <BilingualInput
                id="category-name"
                value={nameI18n}
                onChange={(val) => {
                  setNameI18n(val)
                  if (!editCategory) setSlug(slugify(val.fr))
                }}
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="category-slug">
                Slug <span className="text-danger-ink" aria-hidden>*</span>
              </Label>
              <Input
                id="category-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                aria-describedby="category-slug-hint"
                className="font-mono"
              />
              <p id="category-slug-hint" className="text-xs text-muted">Généré à partir du nom français.</p>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Image de la catégorie</Label>
              <div className="flex items-center gap-4">
                <ImageUpload
                  value={image}
                  onChange={setImage}
                  onRemove={() => setImage(null)}
                  bucket="categories"
                  folder="categories"
                  size="lg"
                />
                <p className="text-sm leading-relaxed text-muted">
                  JPG ou PNG.<br />
                  Ratio carré ou portrait (ex.&nbsp;400×500&nbsp;px).
                </p>
              </div>
            </div>

            {saveError && <Notice tone="danger">{saveError}</Notice>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editCategory ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Supprimer la catégorie ?</DialogTitle></DialogHeader>
          <p className="text-md text-muted">Les produits liés perdront leur catégorie.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
