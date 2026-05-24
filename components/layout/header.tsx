'use client'

import { LogOut, User, ChevronDown } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

// Titre de page par route
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/orders':     'Commandes',
  '/products':   'Produits',
  '/categories': 'Catégories',
  '/tailors':    'Tailleurs',
  '/users':      'Utilisateurs',
  '/payments':   'Paiements',
  '/reviews':        'Avis',
  '/notifications':  'Notifications Push',
}

interface HeaderProps { userEmail: string }

export function Header({ userEmail }: HeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([key]) => pathname === key || (key !== '/dashboard' && pathname.startsWith(key))
  )?.[1] ?? 'Dashboard'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b bg-background px-5">
      {/* Titre de la page courante */}
      <h1 className="text-[15px] font-semibold tracking-tight">{pageTitle}</h1>

      {/* Compte */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                {getInitials(userEmail.split('@')[0])}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-[13px] font-medium max-w-[140px] truncate">
              {userEmail}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{userEmail}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 cursor-pointer text-[13px]">
            <User className="h-3.5 w-3.5" /> Profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-[13px] text-destructive focus:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
