import { useEffect, useState } from "react";
import { Metrics } from "./Metrics";
import { Eyebrow, StatusDot, StreamingText } from "./Primitives";
import type { ChatMessage, Outcome } from "../types";

const OUTCOME: Record<Outcome, { label: string; text: string; dot: "good" | "warn" | "alert" }> = {
  answered: { label: "Answered from documentation", text: "text-good", dot: "good" },
  escalated: { label: "Escalated to a person", text: "text-warn", dot: "warn" },
  unavailable: { label: "Service unavailable", text: "text-alert", dot: "alert" },
  error: { label: "Request failed", text: "text-alert", dot: "alert" },
};

const STAGES = [
  "Searching documentation",
  "Reranking passages",
  "Weighing the evidence",
  "Choosing a route",
];

function sourceLabel(url: string) {
  try {
    return new URL(url).pathname.replace(/^\//, "") || url;
  } catch {
    return url;
  }
}

function Confidence({ score, threshold = 0.6 }: { score: number; threshold?: number }) {
  const cleared = score >= threshold;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-raised p-3.5">
      <div className="flex items-end justify-between">
        <Eyebrow>Confidence</Eyebrow>
        <span className="silver-text text-2xl leading-none font-semibold tabular-nums">
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full origin-left rounded-full ${
            cleared
              ? "bg-gradient-to-r from-silver to-white"
              : "bg-gradient-to-r from-steel to-warn"
          }`}
          style={{ width: `${score * 100}%`, animation: "sweep 0.85s cubic-bezier(0.32,0.72,0,1) both" }}
        />
        <span
          className="absolute -top-1 -bottom-1 w-px bg-faint"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <span className="text-[0.72rem] text-faint">
        {(threshold * 100).toFixed(0)}% required · {cleared ? "cleared" : "not met"}
      </span>
    </div>
  );
}

function Working() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1150);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-rise rounded-2xl border border-line bg-panel p-5 bevel">
      <div className="flex items-center gap-2.5">
        <StatusDot tone="silver" active />
        <span className="text-[0.82rem] font-medium text-dim">Working</span>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2.5 text-[0.8rem] transition-colors duration-500 ${
              i < stage ? "text-faint" : i === stage ? "text-text" : "text-faint/40"
            }`}
          >
            <span className="w-3 text-center text-[0.7rem]">
              {i < stage ? "✓" : i === stage ? "" : "·"}
            </span>
            {s}
            {i === stage && (
              <span
                className="inline-block h-[0.9em] w-[2px] rounded-full bg-silver"
                style={{ animation: "caret 1.05s steps(2) infinite" }}
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {messages.map((m) => {
        if (m.pending) return <Working key={m.id} />;

        if (m.role === "user") {
          return (
            <div key={m.id} className="animate-rise flex justify-end">
              <div className="max-w-[84%] rounded-2xl rounded-br-md border border-line-bright bg-raised px-4 py-3 text-[0.92rem] leading-relaxed bevel">
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
            className="animate-rise overflow-hidden rounded-2xl rounded-tl-md border border-line bg-panel bevel"
          >
            {meta && (
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                <span className="flex items-center gap-2.5">
                  <StatusDot tone={meta.dot} />
                  <span className={`text-[0.8rem] font-medium ${meta.text}`}>{meta.label}</span>
                </span>
                <span className="flex items-center gap-3 text-[0.72rem] text-faint tabular-nums">
                  {retried && (
                    <span
                      className="rounded-full border border-line-bright px-2 py-0.5"
                      title={`Re-searched as: ${m.rewrittenQuery}`}
                    >
                      Searched twice
                    </span>
                  )}
                  {m.elapsedMs != null && <span>{(m.elapsedMs / 1000).toFixed(1)}s</span>}
                </span>
              </header>
            )}

            <div className="flex flex-col gap-4 p-5">
              <p className="text-[0.94rem] leading-[1.65] whitespace-pre-wrap">
                {meta ? <StreamingText text={m.text} onTick={onStream} /> : m.text}
              </p>

              {typeof m.confidenceScore === "number" && <Confidence score={m.confidenceScore} />}

              <Metrics message={m} />

              {!!m.citations?.length && (
                <div className="flex flex-col gap-2">
                  <Eyebrow>Sources</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {m.citations.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ animationDelay: `${i * 70}ms` }}
                        className="animate-rise rounded-full border border-line bg-raised px-3 py-1.5 text-[0.76rem] text-dim transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-line-bright hover:text-text hover:bevel-lift"
                      >
                        {sourceLabel(url)}
                        <span className="ml-1.5 text-faint">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(m.servedBy || m.escalationId) && (
                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5 font-mono text-[0.68rem] text-faint">
                  {m.escalationId && <span className="text-warn">Ticket {m.escalationId}</span>}
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
