import { Clock3, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative w-full max-w-[440px]">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(26,26,46,0.25)]">
          <div className="h-1 bg-gradient-to-r from-accent via-accent to-gold" />
          <div className="px-6 pb-8 pt-7 sm:px-8">{children}</div>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-xs text-muted sm:flex-row sm:gap-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gold" /> Private, encrypted palm storage
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-accent" /> Your reading in under three minutes
          </span>
        </div>
      </div>
    </main>
  );
}
