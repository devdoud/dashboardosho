'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Rectangle plein pour le principal, même rectangle transparent bordé d'encre
// pour le secondaire. Toutes les tailles tiennent une cible de 44 px minimum.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]',
  {
    variants: {
      variant: {
        default: 'bg-primary-fill text-primary-ink hover:bg-primary-fill/88',
        outline: 'border border-ink bg-transparent text-ink hover:bg-surface',
        secondary: 'border border-ink bg-transparent text-ink hover:bg-surface',
        ghost: 'bg-transparent text-ink hover:bg-surface',
        destructive: 'border border-danger-border bg-danger-bg text-danger-ink hover:border-danger-ink',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 text-md',
        sm: 'h-11 px-3.5 text-md',
        lg: 'h-[52px] px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
