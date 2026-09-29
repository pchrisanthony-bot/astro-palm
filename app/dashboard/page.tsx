import Link from "next/link";
import { redirect } from "next/navigation";
import { Hand } from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { Card } from "@/components/ui/card";
import { createAdminClient, createClient, getUsage, getUser } from "@/lib/supabase/server";
import { BUCKET, type ReadingJSON } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Astro Palm" };

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const [usage, { data: readings }, { count: questions }] = await Promise.all([
    getUsage(user.id),
    supabase
      .from("readings")
      .select("id, palm_image_path, prediction, is_paid, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
  ]);

  const list = readings ?? [];
  const thumbs = new Map<string, string>();
  if (list.length) {
    const { data } = await createAdminClient()
      .storage.from(BUCKET)
      .createSignedUrls(
        list.map((r) => r.palm_image_path),
        60 * 60
      );
    data?.forEach((d) => d.path && d.signedUrl && thumbs.set(d.path, d.signedUrl));
  }

  const stats = [
    { label: "Credits remaining", value: usage.paid_credits, accent: true },
    { label: "Readings taken", value: list.length },
    { label: "Questions asked", value: questions ?? 0 },
    { label: "Free reading", value: usage.free_predictions_used >= 1 ? "Used" : "Available" },
    { label: "Free question", value: usage.free_chat_questions_used >= 1 ? "Used" : "Available" },
  ];

  return (
    <>
      <Header usage={usage} email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">✦ My Readings</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Your Celestial Archive</h1>
        <p className="mt-1 truncate text-sm text-muted">{user.email}</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label} className="p-4 sm:p-5">
              <p className="text-xs text-muted">{s.label}</p>
              <p className={`mt-1 font-serif text-3xl ${s.accent ? "text-accent" : "text-ink"}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        <PaymentPrompt className="mt-6" message="Want another glimpse of your future? Get a reading for ₹99." />

        <h2 className="mt-12 text-2xl">Past readings</h2>
        {list.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center p-10 text-center">
            <Hand className="h-10 w-10 text-accent" strokeWidth={1.25} />
            <p className="mt-3 font-serif text-lg">No readings yet</p>
            <Link
              href="/upload"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-accent px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              Read my palm
            </Link>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const p = r.prediction as ReadingJSON;
              return (
                <Link
                  key={r.id}
                  href={`/reading/${r.id}`}
                  className="group flex gap-4 rounded-2xl border border-line bg-surface p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lift"
                >
                  {thumbs.get(r.palm_image_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbs.get(r.palm_image_path)}
                      alt=""
                      className="h-24 w-20 shrink-0 rounded-xl bg-ink/5 object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-accent-soft">
                      <Hand className="h-6 w-6 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0 py-1">
                    <p className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {r.is_paid && <span className="ml-2 text-gold">✦ Paid</span>}
                    </p>
                    <p className="mt-1 line-clamp-3 font-serif italic leading-snug text-ink group-hover:text-accent">
                      {p?.extra?.feature ?? p?.love?.headline ?? "Your palm reading"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
