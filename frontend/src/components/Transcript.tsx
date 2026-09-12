import { useEffect, useState } from "react";
import { Eyebrow, StatusDot, StreamingText } from "./Primitives";
import type { ChatMessage, Outcome } from "../types";

const OUTCOME: Record<Outcome, { label: string; text: string; border: string; glow: string }> = {
  answered: { label: "RESOLVED", text: "text-signal", border: "border-l-signal", glow: "glow-signal" },
  escalated: { label: "ESCALATED", text: "text-warn", border: "border-l-warn", glow: "glow-warn" },
  unavailable: { label: "SERVICE DOWN", text: "text-alert", border: "border-l-alert", glow: "glow-alert" },
  error: { label: "FAILED", text: "text-alert", border: "border-l-alert", glow: "glow-alert" },
};

const STAGES = ["retrieving passages", "reranking candidates", "scoring sufficiency", "routing"];

function sourceLabel(url: string) {
  try {
    return new URL(url).pathname.replace(/^\//, "") || url;
  } catch {
    return url;
  }
}

function ConfidenceBar({ score, threshold = 0.6 }: { score: number; threshold?: number }) {
  const cleared = score >= threshold;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Confidence</Eyebrow>
        <span
          className={`font-mono text-sm font-bold tabular-nums ${cleared ? "text-signal" : "text-warn"}`}
        >
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <div className="relative h-[3px] w-full bg-line">
        <div
          className={`h-full origin-left ${cleared ? "bg-signal" : "bg-warn"}`}
          style={{ width: `${score * 100}%`, animation: "sweep 0.6s cubic-bezier(0.22,0.92,0.3,1) both" }}
        />
        <span
          className="absolute -top-1 -bottom-1 w-px bg-faint"
          style={{ left: `${threshold * 100}%` }}
          title={`Threshold ${threshold * 100}%`}
        />
      </div>
      <span className="font-mono text-[0.62rem] text-faint">
        threshold {(threshold * 100).toFixed(0)}% · {cleared ? "cleared" : "not met"}
      </span>
    </div>
  );
}

function Working() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-rise border border-line border-l-2 border-l-signal bg-panel p-3">
      <div className="flex items-center gap-2">
        <StatusDot tone="signal" active />
        <span className="font-mono text-[0.68rem] font-bold tracking-[0.1em] text-signal">
          AGENT WORKING
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-1">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 font-mono text-[0.7rem] transition-colors duration-300 ${
              i < stage ? "text-dim" : i === stage ? "text-text" : "text-faint/45"
            }`}
          >
            <span className="w-3 text-signal">{i < stage ? "✓" : i === stage ? "▸" : "·"}</span>
            {s}
            {i === stage && (
              <span
                className="inline-block h-[0.85em] w-[2px] bg-signal"
                style={{ animation: "caret 1s steps(2) infinite" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Transcript({
  messages,
  onStream,
}: {
  messages: ChatMessage[];
  onStream: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {messages.map((m) => {
        if (m.pending) return <Working key={m.id} />;

        if (m.role === "user") {
          return (
            <div key={m.id} className="animate-rise flex justify-end">
              <div className="max-w-[86%] border border-line-bright bg-raised px-3.5 py-2.5 text-[0.9rem]">
                <span className="mr-2 font-mono text-[0.62rem] text-faint">USER</span>
                {m.text}
              </div>
            </div>
          );
        }

        const meta = m.outcome ? OUTCOME[m.outcome] : null;
        const retried = (m.attempts ?? 1) > 1;

        return (
          <article
            key={m.id}
            className={`animate-rise border border-line bg-panel ${
              meta ? `border-l-2 ${meta.border}` : ""
            }`}
          >
            {meta && (
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2">
                <span className="flex items-center gap-2">
                  <StatusDot tone={m.outcome === "answered" ? "signal" : m.outcome === "escalated" ? "warn" : "alert"} />
                  <span className={`font-mono text-[0.66rem] font-bold tracking-[0.12em] ${meta.text}`}>
                    {meta.label}
                  </span>
                </span>
                <span className="flex items-center gap-3 font-mono text-[0.62rem] text-faint tabular-nums">
                  {retried && (
                    <span
                      className="border border-line-bright px-1.5 py-px"
                      title={`Re-searched as: ${m.rewrittenQuery}`}
                    >
                      RETRY ×1
                    </span>
                  )}
                  {m.elapsedMs != null && <span>{(m.elapsedMs / 1000).toFixed(1)}s</span>}
                </span>
              </header>
            )}

            <div className="flex flex-col gap-3.5 p-3.5">
              <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap">
                {meta ? <StreamingText text={m.text} onTick={onStream} /> : m.text}
              </p>

              {typeof m.confidenceScore === "number" && <ConfidenceBar score={m.confidenceScore} />}

              {!!m.citations?.length && (
                <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <Eyebrow>Sources</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {m.citations.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="animate-rise border border-line bg-raised px-2 py-1 font-mono text-[0.68rem] text-dim transition-all duration-200 hover:border-signal hover:text-signal hover:glow-signal"
                        style={{ animationDelay: `${i * 55}ms` }}
                      >
                        {sourceLabel(url)} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(m.servedBy || m.escalationId) && (
                <div className="flex flex-wrap items-center gap-3 font-mono text-[0.62rem] text-faint">
                  {m.escalationId && <span className="text-warn">TICKET #{m.escalationId}</span>}
                  {m.servedBy && <span>{m.servedBy}</span>}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
