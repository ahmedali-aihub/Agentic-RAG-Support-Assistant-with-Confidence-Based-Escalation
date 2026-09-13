import { useCallback, useEffect, useRef, useState } from "react";
import { askQuestion } from "./api";
import { PipelineTrace } from "./components/PipelineTrace";
import { Eyebrow, Panel, StatusDot } from "./components/Primitives";
import { Prompt } from "./components/Prompt";
import { Telemetry } from "./components/Telemetry";
import { ThemeToggle } from "./components/ThemeToggle";
import { Transcript } from "./components/Transcript";
import type { ChatMessage, Outcome } from "./types";
import { useTheme } from "./useTheme";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "I answer Stripe questions from the official documentation. When the documentation " +
    "doesn't actually cover what you asked, I pass the question to a person rather than " +
    "guessing at it.",
};

const newId = () => Math.random().toString(36).slice(2);

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  const stick = useCallback(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const pendingId = newId();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text },
      { id: pendingId, role: "assistant", text: "", pending: true },
    ]);
    setBusy(true);

    const started = performance.now();
    try {
      const res = await askQuestion(text);
      const outcome: Outcome = res.escalated
        ? res.escalation_reason === "service_unavailable"
          ? "unavailable"
          : "escalated"
        : "answered";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                id: pendingId,
                role: "assistant",
                text: res.answer,
                outcome,
                citations: res.citations,
                // A confidence score only means something when a judge ran.
                confidenceScore: outcome === "unavailable" ? null : res.confidence_score,
                confidenceReasoning:
                  outcome === "unavailable" ? null : res.confidence_reasoning,
                escalationId: res.escalation_id,
                servedBy: res.served_by,
                attempts: res.attempts,
                rewrittenQuery: res.rewritten_query,
                timings: res.timings,
                chunksConsidered: res.chunks_considered,
                chunksUsed: res.chunks_used,
                topRelevance: res.top_relevance,
                elapsedMs: performance.now() - started,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                id: pendingId,
                role: "assistant",
                text:
                  "I couldn't reach the support service. Check that the backend is running " +
                  "on port 8000, then try again.",
                outcome: "error",
                elapsedMs: performance.now() - started,
              }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const lastReply =
    [...messages].reverse().find((m) => m.role === "assistant" && m.outcome) ?? null;

  return (
    <div className="relative z-[1] flex h-svh flex-col">
      {/* Translucent nav, the way Apple floats chrome over content. */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-void/72 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-b from-silver to-steel text-black bevel">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
              <path
                d="M12 3.2 4.8 6.6v5.1c0 4.2 3 7.9 7.2 8.8 4.2-.9 7.2-4.6 7.2-8.8V6.6L12 3.2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m8.9 12.1 2.2 2.2 4.2-4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-[0.95rem] leading-tight font-semibold tracking-[-0.015em]">
              Support Assistant
            </h1>
            <p className="text-[0.72rem] text-faint">
              Answers from documentation, or a person when it falls short
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="#/"
            className="text-[0.78rem] font-medium text-faint transition-colors duration-300 hover:text-text"
          >
            ← Overview
          </a>
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-raised px-3 py-1.5">
            <StatusDot tone={busy ? "silver" : "idle"} active={busy} />
            <span className="text-[0.72rem] font-medium text-dim">
              {busy ? "Working" : "Ready"}
            </span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggle} tone="console" />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[254px_minmax(0,1fr)_280px]">
        <Panel label="Overview" className="hidden overflow-y-auto lg:flex">
          <Telemetry messages={messages} busy={busy} onProbe={send} />
        </Panel>

        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-line bg-panel bevel">
          <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto p-5">
            <Transcript messages={messages} onStream={stick} />
          </div>
          <Prompt onSend={send} disabled={busy} />
        </section>

        <Panel
          label="How it decided"
          className="hidden overflow-y-auto lg:flex"
          right={
            <span className="text-[0.7rem] text-faint tabular-nums">
              {lastReply ? `${lastReply.attempts ?? 1} pass` : "—"}
            </span>
          }
        >
          <PipelineTrace latest={lastReply} busy={busy} />
          <div className="mt-auto border-t border-line p-4">
            <Eyebrow>Reading this</Eyebrow>
            <p className="mt-2 text-[0.76rem] leading-relaxed text-dim">
              Hover a step to see what it does. Filled steps ran on the last question;
              hollow ones weren't taken.
            </p>
          </div>
        </Panel>
      </main>
    </div>
  );
}
