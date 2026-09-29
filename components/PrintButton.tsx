"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-accent-hover"
    >
      <Download className="h-4 w-4" /> Download PDF
    </button>
  );
}
