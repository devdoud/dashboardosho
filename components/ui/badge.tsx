import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Statuts lisibles d'un coup d'œil : jetons ok / warn / accent / danger.
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary-fill bg-primary-fill text-primary-ink',
        secondary: 'border-hairline bg-surface text-ink',
        outline: 'border-hairline bg-transparent text-muted',
        destructive: 'border-danger-border bg-danger-bg text-danger-ink',
        success: 'border-ok-border bg-ok-bg text-ok-ink',
        warning: 'border-warn-border bg-warn-bg text-warn-ink',
        info: 'border-accent-border bg-accent-bg text-accent-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
