import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow hover:opacity-90 hover:shadow-lg hover:translate-y-[-1px] transition-all dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 dark:hover:text-white",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 hover:shadow-md hover:translate-y-[-1px] transition-all dark:bg-red-600 dark:text-white dark:hover:bg-red-700 dark:hover:text-white",
        outline:
          "border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--surface-text))] shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] hover:border-[hsl(var(--primary))]/50 transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:hover:border-gray-500 dark:hover:text-white",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--surface-text))] shadow-sm hover:bg-[hsl(var(--secondary))]/80 hover:shadow-md hover:translate-y-[-1px] transition-all dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:hover:text-white",
        // Ensure high contrast on hover so icons don't disappear on dark/light backgrounds
        ghost:
          "bg-transparent text-[hsl(var(--text))] hover:bg-[hsl(var(--accent))]/80 hover:text-[hsl(var(--accent-foreground))] hover:shadow-sm transition-all dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white",
        link:
          "text-[hsl(var(--primary))] underline-offset-4 hover:underline hover:opacity-80 transition-all dark:text-blue-400 dark:hover:text-blue-300 dark:hover:underline",
        // Navigation-specific variant for header/menu buttons: stable colors, only light motion on hover
        nav:
          "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--surface-text))] shadow-sm hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--surface-text))] hover:-translate-y-[1px] hover:shadow-md",
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
