"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Camera, Check, Hand, ImageIcon, Lightbulb, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PalmScanOverlay } from "@/components/PalmScanOverlay";
import { createClient } from "@/lib/supabase/client";
import { cn, palmPath } from "@/lib/utils";
import { BUCKET } from "@/types";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2048;

/** Re-encode to JPEG (the storage path is palm.jpg), capping dimensions to keep uploads fast. */
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", 0.9)
  );
}

const ERRORS: Record<string, string> = {
  limit_reached: "You've used your free reading. Get a credit to read another palm.",
  not_a_palm: "We couldn't find a hand in that photo. Try a clear, well-lit photo of your open palm.",
  ai_unavailable: "The stars are busy right now. Please try again in a minute.",
  image_not_found: "Your photo didn't upload correctly. Please try again.",
};

const GUIDELINES = [
  "Well-lit room, natural light",
  "Fingers relaxed & slightly open",
  "Palm facing the camera directly",
  "No harsh flash reflections",
];

const LINES = [
  { name: "Heart Line", title: "Emotional", text: "Empathy, intimate bonds and relational balance." },
  { name: "Head Line", title: "Intellect", text: "Clarity, problem solving and your philosophical arc." },
  { name: "Life Line", title: "Vitality", text: "Vital force, your physical journey and grounding." },
];

export function PalmUploader({ userId }: { userId: string }) {
  const router = useRouter();
  const browseRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = useCallback((f: File | undefined | null) => {
    setError(null);
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) return setError("Please choose a JPEG, PNG or WEBP image.");
    if (f.size > MAX_BYTES) return setError("That image is over 10 MB. Please choose a smaller one.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  async function predict() {
    if (!file) return;
    setError(null);
    setStage("Uploading your palm");
    try {
      const readingId = crypto.randomUUID();
      const blob = await toJpeg(file);
      const { error: upErr } = await createClient()
        .storage.from(BUCKET)
        .upload(palmPath(userId, readingId), blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error("image_not_found");

      setStage("Consulting the palmist");
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reading_id: readingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ai_error");

      setStage("Your reading is ready");
      router.push(`/reading/${readingId}`);
      router.refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(ERRORS[code] ?? "Something went wrong while reading your palm. Please try again.");
      setStage(null);
      if (code === "limit_reached") router.refresh();
    }
  }

  const fileInput = (ref: React.RefObject<HTMLInputElement>, capture?: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      {...(capture ? { capture: "environment" as const } : {})}
      className="hidden"
      onChange={(e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <>
      <AnimatePresence>{stage && <PalmScanOverlay stage={stage} />}</AnimatePresence>
      {fileInput(browseRef)}
      {fileInput(cameraRef, true)}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Left: intake */}
        <div className="space-y-5">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a photo of your palm"
            onClick={() => browseRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && browseRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-surface px-6 py-10 text-center transition-all sm:py-14",
              dragging ? "border-accent bg-accent-soft shadow-glow" : "border-line hover:border-accent/50 hover:shadow-soft"
            )}
          >
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-accent-soft">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-surface shadow-soft">
                <Hand className="h-7 w-7 text-accent" strokeWidth={1.5} />
              </span>
              <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-accent/60" />
            </span>
            <p className="mt-5 text-lg font-semibold text-ink">Drag & drop your palm photo here</p>
            <p className="mt-1 text-sm text-muted">
              or <span className="font-semibold text-accent underline underline-offset-2">browse local files</span>{" "}
              from your device
            </p>
            <span className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-mist px-3.5 py-1.5 text-xs text-muted">
              <ImageIcon className="h-3.5 w-3.5" /> JPG, PNG, WEBP · Maximum 10 MB ·
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% Private
            </span>
          </div>

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-medium text-ink transition hover:border-accent/40 sm:hidden"
          >
            <Camera className="h-4 w-4 text-accent" /> Take a photo with your camera
          </button>

          <Card className="border-accent/10 bg-mist/60 p-5">
            <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
              <Lightbulb className="h-4 w-4 text-gold" /> Palm Photo Guidelines
            </h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {GUIDELINES.map((g) => (
                <li key={g} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-soft text-gold">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            {LINES.map((l) => (
              <Card key={l.name} className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{l.name}</p>
                <p className="mt-1.5 font-serif text-lg text-ink">{l.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{l.text}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: scanning chamber */}
        <Card className="flex flex-col p-4 sm:p-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Scanning Chamber</p>
            {preview && (
              <button
                type="button"
                onClick={() => browseRef.current?.click()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-mist px-3 text-xs font-medium text-accent hover:bg-accent-soft"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Change photo
              </button>
            )}
          </div>

          <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-mist to-accent-soft/60">
            {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(
              (c) => (
                <span key={c} className={cn("absolute z-10 h-6 w-6 rounded-sm border-gold", c)} />
              )
            )}
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your palm preview" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 h-10 -translate-y-1/2 animate-scan">
                  <div className="h-full w-full bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-accent shadow-[0_0_14px_3px_rgba(124,58,237,0.55)]" />
                </div>
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between rounded-xl bg-surface/90 px-3 py-2 text-xs backdrop-blur"
                >
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} /> Photo ready for reading
                  </span>
                  <span className="text-muted">{(file!.size / 1024 / 1024).toFixed(1)} MB</span>
                </motion.span>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <Hand className="h-24 w-24 text-accent/30" strokeWidth={0.9} />
                <p className="mt-4 font-serif text-lg italic text-muted">Your palm will appear here</p>
              </div>
            )}
          </div>

          {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <Button size="lg" shimmer className="mt-4 w-full shadow-lift" disabled={!file || !!stage} onClick={predict}>
            <Sparkles className="h-4 w-4" /> Predict My Future <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 text-sm text-muted hover:text-ink"
          >
            <Camera className="h-4 w-4" /> Take Another Photo
          </button>
        </Card>
      </div>
    </>
  );
}
