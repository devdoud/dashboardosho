'use client'

import { LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { getInitials } from '@/lib/utils'

interface HeaderProps { userEmail: string }

/**
 * Barre haute : le titre de la page vit dans la page elle-même (h1 Fraunces),
 * la barre ne porte que le thème et le compte.
 */
export function Header({ userEmail }: HeaderProps) {
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-1 border-b border-hairline bg-bg px-4 md:px-6">
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Compte : ${userEmail}`}
            className="flex min-h-11 items-center gap-2.5 rounded-sm px-2 text-sm transition-colors hover:bg-surface"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(userEmail.split('@')[0])}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[180px] truncate text-md font-medium sm:block">
              {userEmail}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted sm:block" strokeWidth={1.75} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="truncate px-3 py-2 text-sm text-muted">{userEmail}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-danger-ink focus:text-danger-ink"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
