import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--secondary))] text-[hsl(var(--surface-text))] shadow-sm",
        secondary: "bg-[hsl(var(--muted))] text-[hsl(var(--surface-text))]",
        muted: "bg-[hsl(var(--muted))] text-[hsl(var(--surface-text))]",
        solid: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow",
        destructive: "bg-destructive text-destructive-foreground shadow-sm",
        outline: "border border-[hsl(var(--border))] text-[hsl(var(--surface-text))] bg-[hsl(var(--card))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
