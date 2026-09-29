"use client";

import { motion } from "framer-motion";
import { Briefcase, Coins, Heart, Leaf, Sparkle, Sprout, type LucideIcon } from "lucide-react";
import type { CategoryKey, ReadingSection } from "@/types";

export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  love: Heart,
  career: Briefcase,
  wealth: Coins,
  health: Leaf,
  growth: Sprout,
};

export function PredictionCard({
  category,
  label,
  aspect,
  section,
  index,
}: {
  category: CategoryKey;
  label: string;
  aspect: string;
  section: ReadingSection;
  index: number;
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.09, ease: "easeOut" }}
      className="break-inside-avoid rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Vedic {aspect}</p>
            <h3 className="text-xl font-semibold sm:text-2xl">{label}</h3>
          </div>
        </div>
        {section.feature && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{section.feature}</span>
        )}
      </div>

      <p className="mt-5 font-serif text-lg italic leading-snug text-accent sm:text-xl">“{section.headline}”</p>
      {section.summary && <p className="mt-2 text-[15px] leading-[1.6] text-muted">{section.summary}</p>}

      {section.insights.length > 0 && (
        <ul className="mt-5 space-y-4 rounded-2xl bg-mist/70 p-4 sm:p-5">
          {section.insights.map((insight, i) => {
            const it = typeof insight === "string" ? { title: "", text: insight } : insight;
            return (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-accent shadow-soft">
                  <Sparkle className="h-3 w-3" />
                </span>
                <div>
                  {it.title && <p className="font-semibold text-ink">{it.title}</p>}
                  <p className="text-[15px] leading-[1.6] text-ink/75">{it.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.article>
  );
}
