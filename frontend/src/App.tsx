import { useCallback, useEffect, useRef, useState } from "react";
import { askQuestion } from "./api";
import { PipelineTrace } from "./components/PipelineTrace";
import { Eyebrow, Panel, StatusDot } from "./components/Primitives";
import { Prompt } from "./components/Prompt";
import { Telemetry } from "./components/Telemetry";
import { Transcript } from "./components/Transcript";
import type { ChatMessage, Outcome } from "./types";

const BOOT: ChatMessage = {
  id: "boot",
  role: "assistant",
  text:
    "Agent online. I answer Stripe questions from indexed documentation, and when " +
    "the docs don't actually cover what you asked, I route the question to a human " +
    "rather than guessing at it.",
};

const newId = () => Math.random().toString(36).slice(2);

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([BOOT]);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  const stick = useCallback(() => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
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
                escalationId: res.escalation_id,
                servedBy: res.served_by,
                attempts: res.attempts,
                rewrittenQuery: res.rewritten_query,
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
                  "Could not reach the agent service. Check that the backend is running " +
                  "on port 8000, then run the query again.",
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
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center border border-signal-dim bg-signal/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-signal" aria-hidden="true">
              <path d="M12 2.8v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="2.2" r="1.1" fill="currentColor" />
              <rect x="4" y="5.6" width="16" height="12.6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="9" cy="11.6" r="1.4" fill="currentColor" />
              <circle cx="15" cy="11.6" r="1.4" fill="currentColor" />
              <path d="M9.6 15.4h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <path d="M4 9.4H2m20 0h-2M4 14.4H2m20 0h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h1 className="text-[0.94rem] leading-tight font-semibold tracking-tight">
              Agent Console
            </h1>
            <p className="font-mono text-[0.64rem] text-faint">
              confidence-gated retrieval · stripe documentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-line px-2.5 py-1.5">
          <StatusDot tone={busy ? "signal" : "idle"} active={busy} />
          <span className="font-mono text-[0.64rem] tracking-[0.1em] text-dim">
            {busy ? "PROCESSING" : "IDLE"}
          </span>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_268px]">
        <Panel label="Telemetry" className="hidden overflow-y-auto lg:flex">
          <Telemetry messages={messages} busy={busy} onProbe={send} />
        </Panel>

        <section className="flex min-h-0 min-w-0 flex-col border-x border-line">
          <div ref={streamRef} className="min-h-0 flex-1 overflow-y-auto p-3.5">
            <Transcript messages={messages} onStream={stick} />
          </div>
          <Prompt onSend={send} disabled={busy} />
        </section>

        <Panel
          label="Pipeline"
          className="hidden overflow-y-auto lg:flex"
          right={
            <span className="font-mono text-[0.6rem] text-faint">
              {lastReply ? `${lastReply.attempts ?? 1} pass` : "—"}
            </span>
          }
        >
          <PipelineTrace latest={lastReply} busy={busy} />
          <div className="mt-auto border-t border-line p-3">
            <Eyebrow>Note</Eyebrow>
            <p className="mt-1.5 text-[0.72rem] leading-relaxed text-dim">
              Hover a stage to see what it does. Solid stages ran; dimmed stages were
              not taken on the last query.
            </p>
          </div>
        </Panel>
      </main>
    </div>
  );
}
