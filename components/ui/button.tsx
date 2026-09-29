import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shimmer?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover hover:shadow-lift",
  secondary: "bg-surface text-ink border border-line hover:border-accent/40 hover:shadow-soft",
  ghost: "text-muted hover:text-ink hover:bg-ink/5",
};

const sizes: Record<Size, string> = {
  md: "min-h-[44px] px-4 text-sm",
  lg: "min-h-[52px] px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", shimmer, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium",
        "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {shimmer && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  )
);
Button.displayName = "Button";
