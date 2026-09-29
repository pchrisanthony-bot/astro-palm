import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavLinks, UserMenu } from "@/components/HeaderClient";
import { UsageBadge } from "@/components/UsageBadge";
import type { Usage } from "@/types";

export function Header({ usage, email }: { usage: Usage; email: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Logo />
        <NavLinks className="hidden md:flex" />
        <div className="flex items-center gap-2 sm:gap-3">
          <UsageBadge usage={usage} className="hidden lg:inline-flex" />
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Scan Palm</span>
          </Link>
          <UserMenu email={email} usage={usage} />
        </div>
      </div>
      <NavLinks className="flex border-t border-line/60 px-2 md:hidden" />
    </header>
  );
}
