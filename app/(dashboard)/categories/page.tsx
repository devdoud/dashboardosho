'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { orIlike } from '@/lib/supabase/query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/image-upload'
import { BilingualInput, parseI18n, serializeI18n, type I18nValue } from '@/components/ui/bilingual-input'
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
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Produits</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucune catégorie trouvée</TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      {cat.image ? (
                        <div className="h-9 w-9 rounded-lg overflow-hidden border bg-muted shrink-0">
                          <Image src={cat.image} alt={getLabel(cat.name)} width={36} height={36} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{getLabel(cat.name)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell className="text-right font-medium">{productCounts[cat.id] ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(cat.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Nom bilingue */}
            <div className="space-y-1.5">
              <Label>Nom <span className="text-destructive">*</span></Label>
              <BilingualInput
                value={nameI18n}
                onChange={(val) => {
                  setNameI18n(val)
                  if (!editCategory) setSlug(slugify(val.fr))
                }}
                placeholder={{ fr: 'Boubou homme, Kaftan femme…', en: 'Men Boubou, Women Kaftan…' }}
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label>
                Slug <span className="text-destructive">*</span>
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">généré automatiquement</span>
              </Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="boubou-homme"
                className="font-mono text-sm"
              />
            </div>

            {/* Image */}
            <div className="space-y-2 pt-1">
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
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Format JPG ou PNG recommandé.<br />
                  Ratio carré ou portrait (ex&nbsp;: 400×500&nbsp;px).
                </p>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                {saveError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editCategory ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
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
