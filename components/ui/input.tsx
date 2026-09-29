import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-[44px] w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-muted/70",
        "transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10",
        "disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
