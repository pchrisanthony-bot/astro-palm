"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hand } from "lucide-react";

const MICRO_COPY = [
  "Consulting the lines of fate...",
  "Tracing your heart line...",
  "Listening to the mount of Venus...",
  "Measuring the reach of your head line...",
  "Asking the stars for a second opinion...",
  "Weaving your reading together...",
];

export function PalmScanOverlay({ stage }: { stage: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MICRO_COPY.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="starfield fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas/95 px-6 backdrop-blur-sm"
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative h-56 w-44 overflow-hidden rounded-[2rem] border border-accent/15 bg-surface shadow-glow">
        <Hand className="absolute inset-0 m-auto h-40 w-40 text-accent/70" strokeWidth={0.8} />
        {[
          "left-5 top-6",
          "right-6 top-12",
          "left-8 bottom-10",
          "right-5 bottom-6",
        ].map((pos, k) => (
          <span
            key={pos}
            className={`absolute ${pos} animate-twinkle text-xs text-gold`}
            style={{ animationDelay: `${k * 0.7}s` }}
          >
            ✦
          </span>
        ))}
        <div className="absolute inset-x-0 h-12 -translate-y-1/2 animate-scan">
          <div className="h-full w-full bg-gradient-to-b from-transparent via-accent/15 to-transparent" />
          <div className="absolute inset-x-3 top-1/2 h-px bg-accent shadow-[0_0_12px_2px_rgba(124,58,237,0.6)]" />
        </div>
      </div>

      <h2 className="mt-8 font-serif text-2xl text-ink">Reading your palm...</h2>
      <div className="mt-2 h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-serif italic text-muted"
          >
            {MICRO_COPY[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted/70">{stage}</p>
    </motion.div>
  );
}
