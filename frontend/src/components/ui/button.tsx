import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 form-button",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow hover:translate-y-[1px] active:translate-y-[2px] hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:translate-y-[1px] active:translate-y-[2px] hover:shadow-md",
        outline:
          "border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--surface-text))] shadow-sm hover:translate-y-[1px] active:translate-y-[2px] hover:shadow-md",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--surface-text))] shadow-sm hover:translate-y-[1px] active:translate-y-[2px] hover:shadow-md",
        ghost:
          "bg-transparent text-[hsl(var(--text))] hover:bg-[hsl(var(--accent))]/40 hover:translate-y-[1px] active:translate-y-[2px] hover:shadow-sm",
        link:
          "text-[hsl(var(--primary))] underline-offset-4 hover:translate-y-[1px] active:translate-y-[2px]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
