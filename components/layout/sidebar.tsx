'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package, Tag,
  Users, CreditCard, Star, Scissors, Bell,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/orders',    label: 'Commandes',    icon: ShoppingBag },
  { href: '/products',  label: 'Produits',     icon: Package },
  { href: '/categories',label: 'Catégories',   icon: Tag },
  { href: '/tailors',   label: 'Tailleurs',    icon: Scissors },
  { href: '/users',     label: 'Utilisateurs', icon: Users },
  { href: '/payments',  label: 'Paiements',    icon: CreditCard },
  { href: '/reviews',        label: 'Avis',          icon: Star },
  { href: '/notifications',  label: 'Notifications', icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 select-none',
      collapsed ? 'w-[60px]' : 'w-[220px]'
    )}>

      {/* Logo */}
      <div className={cn(
        'flex h-[60px] shrink-0 items-center border-b border-sidebar-border px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Scissors className="h-4 w-4 text-sidebar-foreground" />
          </div>
        ) : (
          <Image
            src="/logo_osho.png"
            alt="Osho"
            width={72}
            height={26}
            style={{ objectFit: 'contain', objectPosition: 'left', filter: 'brightness(0) invert(1)' }}
            priority
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* Label section */}
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/30">
            Menu
          </p>
        )}
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-white/12 text-sidebar-foreground'
                      : 'text-sidebar-foreground/50 hover:bg-white/7 hover:text-sidebar-foreground/80'
                  )}
                >
                  <Icon className={cn('shrink-0', collapsed ? 'h-4.5 w-4.5' : 'h-4 w-4')} />
                  {!collapsed && <span>{label}</span>}
                  {/* Pill indicateur actif */}
                  {isActive && !collapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-foreground/60" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer sidebar */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-[10px] text-sidebar-foreground/25 leading-relaxed">
            Osho Admin<br />
            <span className="text-sidebar-foreground/15">v1.0.0</span>
          </p>
        </div>
      )}

      {/* Bouton collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent transition-colors"
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        }
      </button>
    </aside>
  )
}
