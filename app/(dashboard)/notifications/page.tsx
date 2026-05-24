'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell, Send, Users, User, Scissors,
  CheckCircle, XCircle, Loader2, ShoppingBag, Zap,
} from 'lucide-react'
import type { NotificationTarget } from '@/types/database'

// ─── Templates de notifications rapides ──────────────────────────────────────
const TEMPLATES = [
  {
    label: 'Commande acceptée',
    icon: ShoppingBag,
    title: 'Votre commande a été acceptée !',
    body: 'Un tailleur certifié prend en charge votre commande. Suivez l\'avancement en temps réel.',
    data: { screen: 'orders' },
  },
  {
    label: 'Commande expédiée',
    icon: Send,
    title: 'Votre commande est en route !',
    body: 'Votre création est en cours d\'expédition. Vous la recevrez très bientôt.',
    data: { screen: 'orders' },
  },
  {
    label: 'Commande livrée',
    icon: CheckCircle,
    title: 'Votre commande est arrivée !',
    body: 'Confirmez la réception pour finaliser votre commande et laisser un avis.',
    data: { screen: 'orders' },
  },
  {
    label: 'Promotion',
    icon: Zap,
    title: '✨ Offre spéciale Osho',
    body: 'Découvrez nos nouvelles collections de mode africaine sur-mesure. Commandez dès maintenant !',
    data: { screen: 'home' },
  },
]

const TARGET_OPTIONS: { value: NotificationTarget; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'user',          label: 'Utilisateur spécifique', icon: User,    description: 'Envoyer à un seul utilisateur' },
  { value: 'all_customers', label: 'Tous les clients',       icon: Users,   description: 'Tous les utilisateurs rôle client' },
  { value: 'all_tailors',   label: 'Tous les tailleurs',     icon: Scissors,description: 'Tous les utilisateurs rôle tailleur' },
  { value: 'all_users',     label: 'Tous les utilisateurs',  icon: Bell,    description: 'Toute la base utilisateurs' },
]

// ─── Résultat d'envoi ─────────────────────────────────────────────────────────
interface SendResult {
  success: boolean
  sent: number
  failed: number
  error?: string
}

export default function NotificationsPage() {
  const supabase = createClient()

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
  const [userSuggestions, setUserSuggestions] = useState<{ id: string; name: string }[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Stats tokens
  useEffect(() => {
    supabase.from('fcm_tokens').select('*', { count: 'exact', head: true }).then(({ count }) => setTokenCount(count ?? 0))
  }, [supabase])

  // Recherche utilisateur
  useEffect(() => {
    if (!userSearch || userSearch.length < 2) { setUserSuggestions([]); return }
    setLoadingUsers(true)
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('addresses')
        .select('user_id, full_name')
        .ilike('full_name', `%${userSearch}%`)
        .eq('is_default', true)
        .limit(5)
      setUserSuggestions((data ?? []).map((a) => ({ id: a.user_id, name: a.full_name })))
      setLoadingUsers(false)
    }, 350)
    return () => clearTimeout(timeout)
  }, [userSearch, supabase])

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
  const targetOption = TARGET_OPTIONS.find((t) => t.value === target)!

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications Push</h1>
        <p className="text-muted-foreground text-sm">
          Envoyez des notifications directement sur l&apos;app mobile des utilisateurs.
          {tokenCount !== null && (
            <span className="ml-2 font-medium text-foreground">{tokenCount} appareils enregistrés.</span>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Formulaire ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Cible */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Destinataires</CardTitle>
              <CardDescription>Qui recevra cette notification ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {TARGET_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    onClick={() => { setTarget(value); setResult(null) }}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      target === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      target === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Champ user_id si cible = user */}
              {target === 'user' && (
                <div className="space-y-2">
                  <Label className="text-xs">Rechercher un utilisateur</Label>
                  <div className="relative">
                    <Input
                      placeholder="Nom du client..."
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserId('') }}
                      className="text-sm"
                    />
                    {loadingUsers && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {userSuggestions.length > 0 && (
                    <div className="rounded-lg border bg-background divide-y shadow-sm">
                      {userSuggestions.map((u) => (
                        <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => { setUserId(u.id); setUserSearch(u.name); setUserSuggestions([]) }}>
                          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 12)}…</p>
                          </div>
                          {userId === u.id && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                  {userId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Sélectionné : <span className="font-mono">{userId.slice(0, 16)}…</span>
                    </p>
                  )}
                  {!userId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Ou entrer l&apos;UUID directement</Label>
                      <Input
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contenu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contenu de la notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Titre *</Label>
                <Input
                  placeholder="ex: Votre commande est prête !"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground text-right">{title.length}/60</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message *</Label>
                <Textarea
                  placeholder="ex: Votre tenue est en cours d'expédition."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  maxLength={180}
                />
                <p className="text-xs text-muted-foreground text-right">{body.length}/180</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Écran de destination</Label>
                  <Select value={screen} onValueChange={setScreen}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs">Order ID (optionnel)</Label>
                  <Input
                    placeholder="uuid…"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résultat + bouton d'envoi */}
          {result && (
            <div className={`flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 ${
              result.success
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-red-400 bg-red-50 text-red-800'
            }`}>
              {result.success
                ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                : <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
              }
              <div>
                {result.success
                  ? <p className="text-sm font-semibold">{result.sent} notification{result.sent > 1 ? 's' : ''} envoyée{result.sent > 1 ? 's' : ''} avec succès.</p>
                  : <p className="text-sm font-semibold">Échec de l&apos;envoi</p>
                }
                {result.failed > 0 && <p className="text-xs mt-0.5">{result.failed} échec{result.failed > 1 ? 's' : ''}.</p>}
                {result.error && <p className="text-xs mt-0.5 opacity-80">{result.error}</p>}
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            size="lg"
            disabled={!canSend || sending}
            onClick={handleSend}
          >
            {sending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              : <><Send className="h-4 w-4" /> Envoyer la notification</>
            }
          </Button>
        </div>

        {/* ── Templates rapides ── */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-0.5">Templates rapides</p>
            <p className="text-xs text-muted-foreground">Cliquez pour pré-remplir le formulaire</p>
          </div>

          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon
            return (
              <button
                key={tpl.label}
                onClick={() => applyTemplate(tpl)}
                className="w-full rounded-lg border bg-card p-3.5 text-left hover:bg-muted/40 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold">{tpl.label}</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-tight">{tpl.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{tpl.body}</p>
              </button>
            )
          })}

          <Separator />

          {/* Aperçu notification */}
          {(title || body) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aperçu</p>
              <div className="rounded-xl bg-foreground p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="h-5 w-5 rounded bg-white/20 flex items-center justify-center">
                    <Bell className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60 font-medium">OSHO</span>
                  <span className="text-[10px] text-white/40 ml-auto">maintenant</span>
                </div>
                <p className="text-xs font-semibold text-white leading-tight">{title || 'Titre…'}</p>
                <p className="text-[11px] text-white/70 leading-relaxed">{body || 'Message…'}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
            <p className="text-xs font-semibold">À savoir</p>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li>• L&apos;utilisateur doit avoir autorisé les notifications</li>
              <li>• Un token FCM doit être enregistré dans la table <code className="bg-muted px-1 rounded">fcm_tokens</code></li>
              <li>• Les envois en masse sont traités en parallèle</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
