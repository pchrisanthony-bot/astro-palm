import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Usage } from "@/types";

export function usageLabel(u: Usage) {
  if (u.free_predictions_used < 1) return "1 Free Reading Active";
  if (u.paid_credits > 0) return `${u.paid_credits} Credit${u.paid_credits === 1 ? "" : "s"} Available`;
  return "No Credits Left";
}

export function UsageBadge({ usage, className }: { usage: Usage; className?: string }) {
  const empty = usage.free_predictions_used >= 1 && usage.paid_credits === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        empty ? "bg-mist text-muted" : "bg-gold-soft text-[#92400E]",
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {usageLabel(usage)}
    </span>
  );
}
