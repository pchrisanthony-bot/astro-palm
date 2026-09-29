import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PalmUploader } from "@/components/PalmUploader";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { UsageBadge } from "@/components/UsageBadge";
import { getUsage, getUser } from "@/lib/supabase/server";
import { canPredict } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload your palm — Astro Palm" };

export default async function UploadPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const usage = await getUsage(user.id);
  const allowed = canPredict(usage);

  return (
    <>
      <Header usage={usage} email={user.email ?? ""} />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            <span className="text-accent">Chamber 01</span> / Palm Divination Intake
          </p>
          <UsageBadge usage={usage} className="lg:hidden" />
        </div>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Upload Your Palm</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Hold your dominant hand flat in good lighting. Our cosmic AI reads your Heart, Head and Life lines with
          Vedic & Western palmistry principles.
        </p>

        <div className="mt-8">
          {allowed ? (
            <PalmUploader userId={user.id} />
          ) : (
            <PaymentPrompt autoOpen message="You have used your free reading. Get another for ₹99." />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted/80">
          Your photo is stored privately and only ever seen by you. Astro Palm is for entertainment and
          self-reflection.
        </p>
      </main>
    </>
  );
}
