import { NextResponse } from "next/server";
import { createAdminClient, getUsage, getUser } from "@/lib/supabase/server";
import { AIUnavailableError, chatAboutReading } from "@/lib/openai";
import { UUID_RE } from "@/lib/utils";
import { BUCKET, type ChatMessage, type Reading } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const readingId = typeof body.reading_id === "string" ? body.reading_id : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!UUID_RE.test(readingId)) return NextResponse.json({ error: "invalid_reading_id" }, { status: 400 });
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: reading } = await admin
    .from("readings")
    .select("*")
    .eq("id", readingId)
    .eq("user_id", user.id)
    .maybeSingle<Reading>();
  if (!reading) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Paid readings get unlimited chat; otherwise the single lifetime free question applies.
  if (!reading.is_paid) {
    const usage = await getUsage(user.id);
    if (usage.free_chat_questions_used >= 1) {
      return NextResponse.json({ error: "limit_reached" }, { status: 403 });
    }
  }

  const [{ data: history }, { data: signed }] = await Promise.all([
    admin
      .from("chat_messages")
      .select("role, content")
      .eq("reading_id", readingId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(40),
    admin.storage.from(BUCKET).createSignedUrl(reading.palm_image_path, 60 * 60),
  ]);

  let answer: string;
  try {
    answer = await chatAboutReading({
      reading: reading.prediction,
      imageUrl: signed?.signedUrl ?? null,
      history: (history ?? []) as ChatMessage[],
      message,
    });
  } catch (err) {
    if (err instanceof AIUnavailableError) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    console.error("chat: AI error", err);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }

  if (!reading.is_paid) {
    const { data: consumed, error } = await admin.rpc("consume_free_chat", { p_user: user.id });
    if (error) {
      console.error("chat: consume_free_chat failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (!consumed) return NextResponse.json({ error: "limit_reached" }, { status: 403 });
  }

  const now = Date.now();
  await admin.from("chat_messages").insert([
    { reading_id: readingId, user_id: user.id, role: "user", content: message, created_at: new Date(now).toISOString() },
    { reading_id: readingId, user_id: user.id, role: "assistant", content: answer, created_at: new Date(now + 1).toISOString() },
  ]);

  return NextResponse.json({ response: answer });
}
