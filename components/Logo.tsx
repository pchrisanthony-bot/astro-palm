import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/15 bg-gradient-to-br from-accent-soft to-surface text-accent",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v8M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14M8 13V9.5a1.5 1.5 0 0 0-3 0v4.5a7 7 0 0 0 7 7h1a6 6 0 0 0 6-6v-3.5a1.5 1.5 0 0 0-3 0" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 3.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#D97706" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/upload", sub = true }: { className?: string; href?: string; sub?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-[44px] items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block font-serif text-xl font-semibold tracking-tight text-ink">Astro Palm</span>
        {sub && (
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            Celestial AI Palmistry
          </span>
        )}
      </span>
    </Link>
  );
}
