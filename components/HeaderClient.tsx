"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { usageLabel } from "@/components/UsageBadge";
import { cn } from "@/lib/utils";
import type { Usage } from "@/types";

const LINKS = [
  { href: "/upload", label: "New Reading", match: (p: string) => p.startsWith("/upload") },
  {
    href: "/dashboard",
    label: "My Readings",
    match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/reading"),
  },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("items-center gap-1", className)}>
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-4 text-sm font-medium transition md:flex-none",
              active ? "text-accent" : "text-muted hover:text-ink"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu({ email, usage }: { email: string; usage: Usage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white">
          <User className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 rounded-2xl border border-line bg-surface p-2 shadow-soft">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{email}</p>
            <p className="mt-0.5 text-xs text-muted">{usageLabel(usage)}</p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex min-h-[44px] items-center rounded-xl px-3 text-sm text-ink hover:bg-mist"
          >
            Dashboard & credits
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-sm text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
