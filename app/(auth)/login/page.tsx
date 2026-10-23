'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/atelier'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Loader2 } from 'lucide-react'

/**
 * Messages associés au paramètre `?error=` posé par le proxy.
 *
 * Les deux motifs de fin de session partagent volontairement le même texte :
 * annoncer les durées exactes (borne absolue, délai d'inactivité) exposerait la
 * configuration de sécurité sans rien apporter à l'utilisateur, qui n'a qu'à se
 * reconnecter. Les valeurs restent dans `lib/session.ts`.
 */
const SESSION_ENDED = 'Votre session a expiré. Veuillez vous reconnecter.'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized:        "Vous n'avez pas les droits d'accès à cette interface.",
  session_expired:     SESSION_ENDED,
  session_idle:        SESSION_ENDED,
  auth_callback_error: 'La connexion a échoué. Réessayez.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div lang="fr" className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo size={32} />
        </div>

        <div className="rounded-sm border border-hairline bg-surface p-6 sm:p-8">
          <h1 className="serif-lg text-3xl font-semibold">Connexion</h1>
          <p className="mt-1 text-md text-muted">Accès réservé à l&apos;administration de l&apos;atelier.</p>

          {error && ERROR_MESSAGES[error] && (
            <Notice tone="danger" className="mt-6">{ERROR_MESSAGES[error]}</Notice>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {loginError && <Notice tone="danger">{loginError}</Notice>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
