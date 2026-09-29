"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, AtSign, Eye, EyeOff, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Field({
  label,
  icon,
  right,
  children,
}: {
  label: React.ReactNode;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">{label}</span>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-muted">{icon}</span>
        {children}
        {right && <span className="absolute right-1">{right}</span>}
      </span>
    </label>
  );
}

/** Turns raw Supabase auth errors into guidance the user can act on. */
function friendlyError(message: string, isSignup: boolean) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email or password is incorrect. New here? Tap “Begin free journey” below to create an account first.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first. Open the link we sent to your inbox, then sign in.";
  if (m.includes("sending") || m.includes("not authorized") || m.includes("smtp"))
    return "We couldn't send the confirmation email right now. Please try again shortly.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("already registered"))
    return "An account with this email already exists. Please sign in instead.";
  return isSignup ? `Sign-up failed: ${message}` : `Sign-in failed: ${message}`;
}

const inputCls =
  "min-h-[48px] w-full rounded-xl border border-transparent bg-mist pl-10 pr-12 text-[15px] text-ink placeholder:text-muted/60 transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/10";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "That sign-in link was invalid or has expired. Please try again." : null
  );
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const callback = (next = "/upload") => `${window.location.origin}/auth/callback?next=${next}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback() },
      });
      if (error) setError(friendlyError(error.message, true));
      else if (data.user && data.user.identities?.length === 0)
        setError(friendlyError("already registered", true));
      else if (data.session) {
        router.push("/upload");
        router.refresh();
        return;
      } else setNotice(`We've sent a confirmation link to ${email}. Open it to begin your journey.`);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyError(error.message, false));
      else {
        router.push("/upload");
        router.refresh();
        return;
      }
    }
    setBusy(false);
  }

  async function forgot() {
    setError(null);
    if (!email) return setError("Enter your email address first, then tap “Forgot password?”.");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callback("/reset-password"),
    });
    if (error) setError(error.message);
    else setNotice(`If an account exists for ${email}, a password reset link is on its way.`);
  }

  async function google() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) setError(error.message);
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="relative">
          <LogoMark className="h-14 w-14 rounded-2xl [&_svg]:h-7 [&_svg]:w-7" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-gold" />
        </span>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          <Sparkles className="h-3.5 w-3.5" /> AI-Powered Divination
        </span>
        <h1 className="mt-3 text-3xl font-semibold">Astro Palm</h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup ? "Your first reading and question are on us" : "Reveal your destiny written in the stars and lines"}
        </p>
      </div>

      <button
        type="button"
        onClick={google}
        className="mt-7 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-accent/15 bg-mist text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-soft"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        <span className="h-px flex-1 bg-line" /> or {isSignup ? "sign up" : "sign in"} with email
        <span className="h-px flex-1 bg-line" />
      </div>

      {notice ? (
        <div className="rounded-2xl border border-accent/20 bg-accent-soft px-5 py-4 text-sm text-ink">
          <p className="font-serif text-lg">Check your inbox ✦</p>
          <p className="mt-1 text-muted">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="mt-3 min-h-[44px] font-medium text-accent">
            Back to {isSignup ? "sign up" : "sign in"}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email address" icon={<AtSign className="h-4 w-4" />}>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="astral.seeker@cosmos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label={
              <>
                Password
                {!isSignup && (
                  <button
                    type="button"
                    onClick={forgot}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </>
            }
            icon={<Lock className="h-4 w-4" />}
            right={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="grid h-11 w-11 place-items-center text-muted hover:text-ink"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          >
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "••••••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-[#92400E]">
              <ShieldCheck className="h-3.5 w-3.5" /> Encrypted
            </span>
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <Button type="submit" size="lg" className={cn("w-full shadow-lift")} disabled={busy} shimmer>
            {busy ? "Aligning the stars…" : isSignup ? "Begin My Free Journey" : "Step Into The Astral Realm"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="inline-flex items-center gap-0.5 font-semibold text-accent hover:underline"
        >
          {isSignup ? "Sign in" : "Begin free journey"} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
