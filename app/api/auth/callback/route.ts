import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * N'accepte qu'un chemin relatif à cette application.
 * Sans ce garde, `?next=@evil.com` produisait `https://<origin>@evil.com`,
 * que le navigateur résout vers evil.com (open redirect).
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return '/'
  // `//host` et `/\host` sont des URLs protocol-relative, pas des chemins.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_error', origin))
}
