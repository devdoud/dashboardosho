'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package, Tag,
  Users, CreditCard, Star, Scissors, Bell,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Logo, LogoMark } from '@/components/brand/logo'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/orders',        label: 'Commandes',     icon: ShoppingBag },
  { href: '/products',      label: 'Produits',      icon: Package },
  { href: '/categories',    label: 'Catégories',    icon: Tag },
  { href: '/tailors',       label: 'Tailleurs',     icon: Scissors },
  { href: '/users',         label: 'Utilisateurs',  icon: Users },
  { href: '/payments',      label: 'Paiements',     icon: CreditCard },
  { href: '/reviews',       label: 'Avis',          icon: Star },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

/**
 * Navigation posée sur le papier, séparée du contenu par un filet.
 * Sous 768 px, elle se réduit d'office aux icônes pour laisser la place au contenu.
 */
export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-hairline bg-bg text-ink select-none',
        'w-16',
        !collapsed && 'md:w-[232px]'
      )}
    >
      {/* Marque — vide de protection ≥ ½ hauteur de marque */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-hairline px-4">
        <Link
          href="/dashboard"
          aria-label="Osho — tableau de bord"
          className={cn('flex min-h-11 items-center rounded-sm', !collapsed && 'md:w-full')}
        >
          <span className={cn('flex', !collapsed && 'md:hidden')}><LogoMark size={24} /></span>
          {!collapsed && <span className="hidden md:flex"><Logo size={22} /></span>}
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-2 py-4">
        <p className={cn('eyebrow mb-2 hidden px-3', !collapsed && 'md:block')}>Atelier</p>
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-3 rounded-sm border px-3 text-md transition-colors',
                    !collapsed && 'md:justify-start',
                    isActive
                      ? 'border-hairline bg-surface font-medium text-ink'
                      : 'border-transparent text-muted hover:bg-surface hover:text-ink'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className={cn('hidden', !collapsed && 'md:inline')}>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="hidden border-t border-hairline p-2 md:block">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Déplier la navigation' : 'Réduire la navigation'}
          aria-expanded={!collapsed}
          className={cn(
            'flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-ink',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            : <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />}
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  )
}
