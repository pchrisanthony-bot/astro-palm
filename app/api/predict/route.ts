import { NextResponse } from "next/server";
import { createAdminClient, getUsage, getUser } from "@/lib/supabase/server";
import { AIUnavailableError, NotAPalmError, generateReading } from "@/lib/openai";
import { canPredict, palmPath, UUID_RE } from "@/lib/utils";
import { BUCKET } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const readingId = typeof body.reading_id === "string" ? body.reading_id : "";
  if (!UUID_RE.test(readingId)) return NextResponse.json({ error: "invalid_reading_id" }, { status: 400 });

  const admin = createAdminClient();

  // Idempotency: if this reading already exists for this user, return it instead of charging again.
  const { data: existing } = await admin
    .from("readings")
    .select("id, user_id, prediction")
    .eq("id", readingId)
    .maybeSingle();
  if (existing) {
    if (existing.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.json({ prediction: existing.prediction, reading_id: existing.id });
  }

  // Usage check before spending an AI call (enforced again atomically on insert).
  const usage = await getUsage(user.id);
  if (!canPredict(usage)) return NextResponse.json({ error: "limit_reached" }, { status: 403 });

  // The path is always derived from the verified user id, never from the request.
  const path = palmPath(user.id, readingId);
  const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signError || !signed) return NextResponse.json({ error: "image_not_found" }, { status: 400 });

  let prediction;
  try {
    prediction = await generateReading(signed.signedUrl);
  } catch (err) {
    if (err instanceof NotAPalmError) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: "not_a_palm" }, { status: 422 });
    }
    if (err instanceof AIUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    console.error("predict: AI error", err);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }

  // Atomically consume the allowance (free first, then paid credit) and store the reading.
  const { data: tier, error: rpcError } = await admin.rpc("create_reading", {
    p_user: user.id,
    p_reading_id: readingId,
    p_path: path,
    p_prediction: prediction,
  });
  if (rpcError) {
    console.error("predict: create_reading failed", rpcError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!tier) return NextResponse.json({ error: "limit_reached" }, { status: 403 });

  return NextResponse.json({ prediction, reading_id: readingId });
}
