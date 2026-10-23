'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Notice, PageHeader, SectionLabel } from '@/components/ui/atelier'
import { Bell, Send, Users, User, Scissors, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationTarget } from '@/types/database'

// ─── Templates de notifications rapides ──────────────────────────────────────
const TEMPLATES = [
  {
    label: 'Commande acceptée',
    title: 'Votre commande a été acceptée',
    body: 'Un tailleur certifié prend en charge votre commande. Suivez l\'avancement en temps réel.',
    data: { screen: 'orders' },
  },
  {
    label: 'Commande expédiée',
    title: 'Votre commande est en route',
    body: 'Votre création est en cours d\'expédition. Vous la recevrez très bientôt.',
    data: { screen: 'orders' },
  },
  {
    label: 'Commande livrée',
    title: 'Votre commande est arrivée',
    body: 'Confirmez la réception pour finaliser votre commande et laisser un avis.',
    data: { screen: 'orders' },
  },
  {
    label: 'Promotion',
    title: 'Offre spéciale Osho',
    body: 'Découvrez nos nouvelles collections de mode africaine sur-mesure. Commandez dès maintenant.',
    data: { screen: 'home' },
  },
]

const TARGET_OPTIONS: { value: NotificationTarget; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'user',          label: 'Un utilisateur',         icon: User,     description: 'Envoyer à une seule personne' },
  { value: 'all_customers', label: 'Tous les clients',       icon: Users,    description: 'Comptes au rôle client' },
  { value: 'all_tailors',   label: 'Tous les tailleurs',     icon: Scissors, description: 'Comptes au rôle tailleur' },
  { value: 'all_users',     label: 'Tous les utilisateurs',  icon: Bell,     description: 'Toute la base' },
]

// ─── Résultat d'envoi ─────────────────────────────────────────────────────────
interface SendResult {
  success: boolean
  sent: number
  failed: number
  error?: string
}

export default function NotificationsPage() {

  // Form state
  const [target, setTarget]     = useState<NotificationTarget>('user')
  const [userId, setUserId]     = useState('')
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [orderId, setOrderId]   = useState('')
  const [screen, setScreen]     = useState<string>('home')

  // UI state
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<SendResult | null>(null)
  const [tokenCount, setTokenCount] = useState<number | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userSuggestions, setUserSuggestions] = useState<{ id: string; name: string; email?: string }[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Stats tokens — résolu côté serveur, la table n'est plus lue depuis le navigateur.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/notifications')
      .then((res) => (res.ok ? res.json() : { tokenCount: 0 }))
      .then((json) => { if (!cancelled) setTokenCount(json.tokenCount ?? 0) })
      .catch(() => { if (!cancelled) setTokenCount(0) })
    return () => { cancelled = true }
  }, [])

  // Recherche utilisateur (nom ou email, résolus côté serveur).
  // Tous les setState sont dans le callback du timer : en appeler un
  // directement dans le corps de l'effet provoque un rendu en cascade.
  useEffect(() => {
    const tooShort = !userSearch || userSearch.length < 2
    let cancelled = false

    const timeout = setTimeout(async () => {
      if (tooShort) {
        setUserSuggestions([])
        setLoadingUsers(false)
        return
      }
      setLoadingUsers(true)
      try {
        const res = await fetch(`/api/admin/notifications?search=${encodeURIComponent(userSearch)}`)
        const json = res.ok ? await res.json() : { users: [] }
        if (!cancelled) setUserSuggestions(json.users ?? [])
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }, tooShort ? 0 : 350)

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [userSearch])

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setTitle(tpl.title)
    setBody(tpl.body)
    setScreen(tpl.data.screen)
    if ('order_id' in tpl.data) setOrderId(tpl.data.order_id as string)
    setResult(null)
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) return
    if (target === 'user' && !userId.trim()) return
    setSending(true)
    setResult(null)

    const data: Record<string, string> = { screen }
    if (orderId.trim()) data.order_id = orderId.trim()

    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, userId: userId.trim() || undefined, title, body, data }),
    })

    const json = await res.json()

    if (!res.ok) {
      setResult({ success: false, sent: 0, failed: 0, error: json.error ?? 'Erreur lors de l\'envoi' })
    } else {
      setResult({ success: json.failed === 0, sent: json.sent, failed: json.failed, error: json.error })
    }

    setSending(false)
  }

  const canSend = title.trim() && body.trim() && (target !== 'user' || userId.trim())

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        title="Notifications push"
        description={
          <>
            Envoyées directement sur l&apos;app mobile des utilisateurs.
            {tokenCount !== null && <span className="ml-1 font-medium text-ink">{tokenCount} appareils enregistrés.</span>}
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">

        {/* ── Formulaire ── */}
        <div className="space-y-8">

          {/* Destinataires */}
          <section className="space-y-3">
            <SectionLabel as="h2" id="target-label">Destinataires</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="target-label">
              {TARGET_OPTIONS.map(({ value, label, icon: Icon, description }) => {
                const active = target === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { setTarget(value); setResult(null) }}
                    className={cn(
                      'flex min-h-14 items-start gap-3 rounded-sm border p-3 text-left transition-colors',
                      active ? 'border-ink bg-surface' : 'border-hairline hover:border-muted hover:bg-surface'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    <span>
                      <span className="block text-md font-medium leading-tight">{label}</span>
                      <span className="mt-0.5 block text-sm text-muted">{description}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Champ user_id si cible = user */}
            {target === 'user' && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="notif-user-search">Rechercher un utilisateur</Label>
                  <div className="relative">
                    <Input
                      id="notif-user-search"
                      type="search"
                      autoComplete="off"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserId('') }}
                      aria-describedby="notif-user-search-hint"
                    />
                    {loadingUsers && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-hidden />
                    )}
                  </div>
                  <p id="notif-user-search-hint" className="text-xs text-muted">Nom ou email, deux caractères au moins.</p>
                </div>
                {userSuggestions.length > 0 && (
                  <ul className="rounded-sm border border-hairline bg-surface">
                    {userSuggestions.map((u) => (
                      <li key={u.id} className="border-b border-hairline last:border-b-0">
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bg"
                          onClick={() => { setUserId(u.id); setUserSearch(u.name); setUserSuggestions([]) }}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-hairline bg-placeholder text-xs font-semibold uppercase" aria-hidden>
                            {u.name[0]}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-md font-medium">{u.name}</span>
                            <span className="block truncate text-sm text-muted">
                              {u.email || `${u.id.slice(0, 12)}…`}
                            </span>
                          </span>
                          {userId === u.id && <CheckCircle className="ml-auto h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {userId && (
                  <p className="flex items-center gap-1.5 text-sm text-ok-ink">
                    <CheckCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    Sélectionné : <span className="font-mono">{userId.slice(0, 16)}…</span>
                  </p>
                )}
                {!userId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="notif-user-id" className="text-muted">Ou l&apos;UUID de l&apos;utilisateur</Label>
                    <Input
                      id="notif-user-id"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Contenu */}
          <section className="space-y-4 border-t border-hairline pt-8">
            <SectionLabel as="h2">Contenu</SectionLabel>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="notif-title">Titre <span className="text-danger-ink" aria-hidden>*</span></Label>
                <span className="text-xs tabular-nums text-muted">{title.length} / 60</span>
              </div>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="notif-body">Message <span className="text-danger-ink" aria-hidden>*</span></Label>
                <span className="text-xs tabular-nums text-muted">{body.length} / 180</span>
              </div>
              <Textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={180}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label id="notif-screen-label">Écran de destination</Label>
                <Select value={screen} onValueChange={setScreen}>
                  <SelectTrigger aria-labelledby="notif-screen-label"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Accueil</SelectItem>
                    <SelectItem value="orders">Commandes</SelectItem>
                    <SelectItem value="order_detail">Détail commande</SelectItem>
                    <SelectItem value="profile">Profil</SelectItem>
                    <SelectItem value="catalog">Catalogue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notif-order-id">Identifiant de commande <span className="font-normal text-muted">(facultatif)</span></Label>
                <Input
                  id="notif-order-id"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </section>

          {/* Résultat + envoi */}
          {result && (
            <Notice tone={result.success ? 'ok' : 'danger'} title={
              result.success
                ? `${result.sent} notification${result.sent > 1 ? 's' : ''} envoyée${result.sent > 1 ? 's' : ''}.`
                : 'Échec de l\'envoi'
            }>
              {result.failed > 0 && <p>{result.failed} échec{result.failed > 1 ? 's' : ''}.</p>}
              {result.error && <p>{result.error}</p>}
            </Notice>
          )}

          <Button className="w-full" size="lg" disabled={!canSend || sending} onClick={handleSend}>
            {sending
              ? <><Loader2 className="animate-spin" /> Envoi en cours…</>
              : <><Send /> Envoyer la notification</>
            }
          </Button>
        </div>

        {/* ── Modèles + aperçu ── */}
        <aside className="space-y-8">
          <section className="space-y-2">
            <SectionLabel as="h2">Modèles</SectionLabel>
            <p className="text-sm text-muted">Un clic pré-remplit le formulaire.</p>
            <ul className="border-t border-hairline">
              {TEMPLATES.map((tpl) => (
                <li key={tpl.label} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="block w-full px-2 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <span className="block text-md font-medium">{tpl.label}</span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{tpl.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {(title || body) && (
            <section className="space-y-2">
              <SectionLabel as="h2">Aperçu</SectionLabel>
              <div className="rounded-sm border border-hairline bg-surface p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-2xs text-muted">
                  <span className="font-semibold tracking-wide">OSHO</span>
                  <span className="ml-auto">maintenant</span>
                </div>
                <p className="text-md font-semibold leading-tight">{title || 'Titre'}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{body || 'Message'}</p>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
