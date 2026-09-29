import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Usage } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function canPredict(u: Usage | null) {
  return !!u && (u.free_predictions_used < 1 || u.paid_credits > 0);
}

export function palmPath(userId: string, readingId: string) {
  return `${userId}/${readingId}/palm.jpg`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
