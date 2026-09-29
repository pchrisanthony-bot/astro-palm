import { notFound, redirect } from "next/navigation";
import { CalendarDays, Lock, ScanLine, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { PredictionCard } from "@/components/PredictionCard";
import { ChatBot } from "@/components/ChatBot";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { PrintButton } from "@/components/PrintButton";
import { LogoMark } from "@/components/Logo";
import { createAdminClient, createClient, getUsage, getUser } from "@/lib/supabase/server";
import { canPredict, UUID_RE } from "@/lib/utils";
import { BUCKET, CATEGORIES, type ChatMessage, type Reading } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your reading — Astro Palm" };

export default async function ReadingPage({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) notFound();
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: reading } = await supabase
    .from("readings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Reading>();
  if (!reading) notFound();

  const [usage, { data: messages }, { data: signed }] = await Promise.all([
    getUsage(user.id),
    supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("reading_id", reading.id)
      .order("created_at", { ascending: true }),
    createAdminClient().storage.from(BUCKET).createSignedUrl(reading.palm_image_path, 60 * 60),
  ]);

  const freeQuestionAvailable = usage.free_chat_questions_used < 1;
  const exhausted = !canPredict(usage) && !reading.is_paid && !freeQuestionAvailable;
  const p = reading.prediction;
  const name =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "you";
  const date = new Date(reading.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Header usage={usage} email={user.email ?? ""} />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {exhausted && <PaymentPrompt className="mb-6 print:hidden" />}

        {/* Reading header */}
        <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <LogoMark className="h-12 w-12 rounded-2xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold capitalize">Reading for {name}</h1>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                  Natal Palm Synthesis
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {date}
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-accent" /> Stored privately
                </span>
                {reading.is_paid && (
                  <span className="flex items-center gap-1 text-gold">
                    <Sparkles className="h-3.5 w-3.5" /> Premium reading
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="print:hidden">
            <PrintButton />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          {/* Left: palm + glance */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Palm Resonance Scan
                </span>
                <span className="text-accent">Your Palm</span>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-mist">
                {signed?.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signed.signedUrl} alt="Your palm" className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[4/5] place-items-center text-muted">Image unavailable</div>
                )}
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur">
                  <ScanLine className="h-3.5 w-3.5 text-accent" /> Scan complete
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Your Palm at a Glance</h2>
              <ul className="mt-4 space-y-2.5">
                {CATEGORIES.map((c) => (
                  <li key={c.key} className="flex items-center justify-between gap-3 rounded-xl bg-mist/70 px-3.5 py-2.5">
                    <span className="text-sm text-muted">{c.label}</span>
                    <span className="text-right text-sm font-semibold text-ink">
                      {p[c.key]?.feature ?? "Read"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Right: reading + chat */}
          <section className="space-y-5">
            {p.extra && (
              <article className="relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-accent-soft via-surface to-gold-soft p-6 shadow-soft sm:p-7">
                <Sparkles className="absolute right-5 top-5 h-5 w-5 text-accent/60" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Key Harmonic Finding</p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{p.extra.feature ?? "A Rare Sign"}</h2>
                <p className="mt-3 font-serif text-lg italic text-ink">{p.extra.headline}</p>
                {p.extra.summary && <p className="mt-2 text-[15px] leading-[1.6] text-muted">{p.extra.summary}</p>}
              </article>
            )}

            {CATEGORIES.map((c, i) =>
              p[c.key] ? (
                <PredictionCard
                  key={c.key}
                  category={c.key}
                  label={c.label}
                  aspect={c.aspect}
                  section={p[c.key]}
                  index={i}
                />
              ) : null
            )}

            <div className="pt-2 print:hidden">
              <ChatBot
                readingId={reading.id}
                initialMessages={(messages ?? []) as ChatMessage[]}
                isPaid={reading.is_paid}
                freeQuestionAvailable={freeQuestionAvailable}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
