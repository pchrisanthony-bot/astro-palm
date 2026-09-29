import "server-only";
import OpenAI from "openai";
import type { ChatMessage, Insight, ReadingJSON, ReadingSection } from "@/types";

const MODEL = "gpt-4o";

let _client: OpenAI | null = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export class AIUnavailableError extends Error {}
export class NotAPalmError extends Error {}

const READING_PROMPT = `You are Astro Palm, an AI palmist who combines the mystical tradition of palmistry with structured insight. Analyse the palm in the image (its major lines: heart, head, life and fate; its mounts; finger shapes and overall hand shape) and return ONLY a JSON object with this structure:
{
  "valid_palm": true,
  "love":   { "feature": "...", "headline": "...", "summary": "...", "insights": [{ "title": "...", "text": "..." }, ...] },
  "career": { ...same shape },
  "wealth": { ...same shape },
  "health": { ...same shape },
  "growth": { ...same shape },
  "extra":  { "feature": "...", "headline": "...", "summary": "...", "insights": [] } or null
}
Rules:
- "feature": the palm feature this reading draws on, 2-4 words in Title Case (e.g. "Curved Heart Line", "Strong Mount Of Jupiter").
- "headline": one evocative, forward-looking sentence (under 14 words), no surrounding quotes.
- "summary": 1-2 sentences explaining what you see in the palm and what it signifies.
- "insights": 2-3 items per category. "title" is a 2-5 word Title Case label; "text" is one specific, readable sentence.
- Tone: mystical but grounded; warm, never fearful.
- "extra" is the single most striking additional finding visible in the palm (for example a rare marking or unusual line formation), with no insights; use null if there is nothing notable.
- Never say "I cannot analyse this image." If the image is unclear, blurry or partial, still give a general reading.
- Only if the image clearly contains no human hand at all (a landscape, an object, a document), return {"valid_palm": false} and nothing else.
- Health insights are gentle wellbeing reflections, never medical diagnoses.`;

const CHAT_PROMPT = `You are Astro Palm, an AI palmist. The user already received the palm reading below and is asking follow-up questions about it. Answer warmly and specifically, in a mystical-but-grounded tone, grounding your answers in their reading and palm. Keep answers concise (under 150 words) unless asked for more. You are for entertainment and self-reflection: never give medical, legal or financial instructions; gently suggest a professional where relevant.`;

function isRetryable(err: unknown) {
  const status = (err as { status?: number })?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
}

/** Retry once on rate-limit / server errors, then surface as AIUnavailableError (-> 503). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRetryable(err)) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    try {
      return await fn();
    } catch (err2) {
      if (isRetryable(err2)) throw new AIUnavailableError("AI temporarily unavailable");
      throw err2;
    }
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function cleanSection(s: unknown): ReadingSection | null {
  const sec = s as { headline?: unknown; summary?: unknown; feature?: unknown; insights?: unknown } | null;
  const headline = str(sec?.headline).replace(/^["“]|["”]$/g, "");
  if (!sec || !headline) return null;
  const insights: Insight[] = Array.isArray(sec.insights)
    ? sec.insights
        .map((i) => (typeof i === "string" ? { title: "", text: i.trim() } : { title: str(i?.title), text: str(i?.text) }))
        .filter((i) => i.text)
        .slice(0, 4)
    : [];
  return { headline, summary: str(sec.summary) || undefined, feature: str(sec.feature) || undefined, insights };
}

export async function generateReading(imageUrl: string): Promise<ReadingJSON> {
  const res = await withRetry(() =>
    client().chat.completions.create({
      model: MODEL,
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: READING_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Here is my palm. Please read it." },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    })
  );

  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}");
  if (raw.valid_palm === false) throw new NotAPalmError("not_a_palm");

  const reading = {} as ReadingJSON;
  for (const key of ["love", "career", "wealth", "health", "growth"] as const) {
    const sec = cleanSection(raw[key]);
    if (!sec) throw new Error(`AI response missing category: ${key}`);
    reading[key] = sec;
  }
  reading.extra = cleanSection(raw.extra);
  return reading;
}

export async function chatAboutReading(opts: {
  reading: ReadingJSON;
  imageUrl: string | null;
  history: ChatMessage[];
  message: string;
}): Promise<string> {
  const context: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: `Here is my palm reading (JSON):\n${JSON.stringify(opts.reading)}` },
  ];
  if (opts.imageUrl) context.push({ type: "image_url", image_url: { url: opts.imageUrl, detail: "low" } });

  const res = await withRetry(() =>
    client().chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 500,
      messages: [
        { role: "system", content: CHAT_PROMPT },
        { role: "user", content: context },
        { role: "assistant", content: "I have your reading and your palm before me. What would you like to know?" },
        ...opts.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.message },
      ],
    })
  );
  return res.choices[0]?.message?.content?.trim() || "The lines are quiet for a moment. Please ask again.";
}
