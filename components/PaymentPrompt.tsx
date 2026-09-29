"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, Lock, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Razorpay flow: create order (server) → checkout modal → verify signature (server) → back to /upload. */
function useCheckout(onDone?: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const loaded = await loadCheckout();
      if (!loaded || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection.");

      const res = await fetch("/api/payment/create-order", { method: "POST" });
      const order = await res.json();
      if (!res.ok) {
        throw new Error(
          order.error === "payments_not_configured"
            ? "Payments are not set up yet. Please try again later."
            : "Could not start the payment. Please try again."
        );
      }

      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Astro Palm",
        description: "1 palm reading + unlimited questions",
        theme: { color: "#7C3AED" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          if (v.ok) {
            setSuccess(true);
            onDone?.();
            router.push("/upload");
            router.refresh();
          } else {
            setError("We couldn't verify the payment. If you were charged, contact support.");
            setBusy(false);
          }
        },
      });
      rzp.on("payment.failed", () => {
        setError("The payment didn't go through. You have not been charged.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return { pay, busy, error, success };
}

const INCLUDED = [
  { title: "A Fresh Palm Reading", text: "Love, career, wealth, health and growth, read from a new photo." },
  { title: "Unlimited Oracle Chat", text: "Ask as many follow-up questions as you like about that reading." },
  { title: "Saved To Your Readings", text: "Revisit every reading anytime from your dashboard." },
  { title: "Credits Never Expire", text: "Use your credit today or whenever the stars feel right." },
];

export function PaymentModal({
  open,
  onClose,
  title = "Your Free Reading Is Complete",
  eyebrow = "Complimentary reading concluded",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
}) {
  const { pay, busy, error, success } = useCheckout(onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-3xl bg-gradient-to-b from-accent-soft to-transparent" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-accent-soft text-gold shadow-soft">
                <Sparkles className="h-6 w-6" />
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                <CheckCircle2 className="h-3.5 w-3.5" /> {eyebrow}
              </span>
              <h2 id="pay-title" className="mt-3 text-2xl font-semibold sm:text-3xl">
                {success ? "Credit Added ✦" : title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Unlock another reading of your palm and unlimited conversation with the oracle about it.
              </p>
            </div>

            <div className="relative mt-6 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-mist p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-gold" />
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-gold">
                  <Sparkles className="h-3.5 w-3.5" /> Celestial credit
                </span>
                <span className="text-muted">One-time payment</span>
              </div>
              <p className="mt-2 font-serif text-5xl font-semibold text-ink">₹99</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Zap className="h-3.5 w-3.5 text-accent" /> Instant activation · 1 credit = 1 reading
              </p>
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted">Included with each credit</p>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {INCLUDED.map((i) => (
                <li key={i.title} className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{i.title}</span>
                    <span className="block text-xs leading-relaxed text-muted">{i.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <Button size="lg" shimmer className="mt-6 w-full" onClick={pay} disabled={busy || success}>
              <Sparkles className="h-4 w-4" />
              {busy ? "Opening secure checkout…" : "Buy Credit — ₹99"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-accent" /> Secure UPI, Cards & NetBanking via Razorpay
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-gold" /> Instant activation
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Inline banner (non-disruptive); its CTA opens the purchase modal. */
export function PaymentPrompt({
  message = "You have used your free reading. Get another for ₹99.",
  className,
  compact,
  autoOpen,
}: {
  message?: string;
  className?: string;
  compact?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <>
      <div
        role="status"
        className={cn(
          "rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-gold-soft",
          compact ? "p-4" : "p-5 sm:p-6",
          className
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-gold shadow-soft">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="font-serif text-lg leading-snug text-ink">{message}</p>
              <p className="mt-0.5 text-sm text-muted">1 credit = a new reading + unlimited questions about it.</p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} shimmer className="w-full shrink-0 sm:w-auto">
            Get Another Reading — ₹99
          </Button>
        </div>
      </div>
      <PaymentModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
