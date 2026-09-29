"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, SendHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = ["When will I meet my soulmate?", "Which career suits me best?", "What should I focus on this year?"];

export function ChatBot({
  readingId,
  initialMessages,
  isPaid,
  freeQuestionAvailable,
}: {
  readingId: string;
  initialMessages: ChatMessage[];
  isPaid: boolean;
  freeQuestionAvailable: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [locked, setLocked] = useState(!isPaid && !freeQuestionAvailable);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking || locked) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reading_id: readingId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error === "limit_reached") {
        setMessages((m) => m.slice(0, -1));
        setLocked(true);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.response }]);
      if (!isPaid) setLocked(true); // the single free question is now used
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setInput(message);
      setError(
        e instanceof Error && e.message === "ai_unavailable"
          ? "The stars are busy right now. Please try again in a minute."
          : "Your question couldn't be answered. Please try again."
      );
    } finally {
      setThinking(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <h2 className="font-serif text-lg">Ask the Oracle</h2>
          <p className="text-xs text-muted">
            {isPaid ? "Unlimited questions for this reading" : locked ? "Free question used" : "1 free question"}
          </p>
        </div>
        <span className="text-gold" aria-hidden>
          ✦
        </span>
      </div>

      <div ref={scrollRef} className="max-h-[420px] min-h-[160px] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 && !thinking && (
          <p className="py-4 text-center font-serif italic text-muted">
            Curious about something in your reading? Ask away.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={m.id ?? `local-${i}`}
              initial={m.role === "assistant" ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-accent text-white"
                    : "rounded-bl-md border border-line bg-surface text-ink shadow-soft"
                )}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && (
          <div className="flex justify-start" aria-label="The palmist is typing">
            <div className="flex gap-1.5 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3.5 shadow-soft">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-dot rounded-full bg-accent/70"
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-5 pb-2 text-sm text-rose-600">{error}</p>}

      <div className="border-t border-line bg-canvas/60 p-3 sm:p-4">
        {!locked && messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={thinking}
                className="min-h-[36px] rounded-full border border-line bg-surface px-3 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={locked ? "Chat locked — get a credit to keep asking" : "Ask about love, career, your lines…"}
            disabled={locked || thinking}
            maxLength={1000}
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={locked || thinking || !input.trim()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lift disabled:pointer-events-none disabled:bg-line disabled:text-muted"
          >
            {locked ? <Lock className="h-4 w-4" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        </form>
        {locked && (
          <PaymentPrompt
            compact
            className="mt-3"
            message="You've used your free question. Get another reading for ₹99."
          />
        )}
      </div>
    </Card>
  );
}
