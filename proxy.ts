import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes: login and auth callback
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (user) {
      const isAdmin = await checkAdminRole(supabase, user.id)
      if (isAdmin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return supabaseResponse
  }

  // Protected routes: require authenticated admin
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isAdmin = await checkAdminRole(supabase, user.id)
  if (!isAdmin) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  return supabaseResponse
}

async function checkAdminRole(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single()
  return !!data
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
