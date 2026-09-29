import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Usage } from "@/types";

/** Session-aware client (respects RLS) for server components and route handlers. */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/** Service-role client. Server-only; bypasses RLS. Never import from client code. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Returns the verified user from the session cookie, or null. */
export async function getUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Fetches (and lazily creates) the usage row for a user. Always fresh from the DB. */
export async function getUsage(userId: string): Promise<Usage> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_usage")
    .select("free_predictions_used, free_chat_questions_used, paid_credits")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  await admin.from("user_usage").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  return { free_predictions_used: 0, free_chat_questions_used: 0, paid_credits: 0 };
}
