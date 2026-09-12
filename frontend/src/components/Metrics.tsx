import { useState } from "react";
import { Eyebrow } from "./Primitives";
import type { ChatMessage } from "../types";

const NODE_LABEL: Record<string, string> = {
  retrieve: "Search",
  rewrite: "Re-search",
  judge: "Judge",
  answer: "Write",
  escalate: "Hand off",
};

const NODE_BAR: Record<string, string> = {
  retrieve: "bg-steel",
  rewrite: "bg-warn",
  judge: "bg-silver",
  answer: "bg-good",
  escalate: "bg-warn",
};

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="group relative flex flex-col gap-0.5">
      <span className="text-[0.68rem] text-faint">{label}</span>
      <span className="text-[0.92rem] font-semibold tabular-nums">{value}</span>
      {hint && (
        <span className="pointer-events-none absolute -top-9 left-0 z-10 w-max max-w-[220px] rounded-lg border border-line-bright bg-hover px-2.5 py-1.5 text-[0.7rem] leading-snug text-dim opacity-0 transition-opacity duration-200 group-hover:opacity-100 bevel-lift">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Per-answer metrics.
 *
 * A plain RAG demo returns prose and nothing else. Showing where the time went,
 * how many passages were weighed, and why the judge ruled as it did is what
 * makes the decision auditable instead of asking the reader to trust it.
 */
export function Metrics({ message }: { message: ChatMessage }) {
  const [open, setOpen] = useState(false);

  const timings = message.timings ?? {};
  const entries = Object.entries(timings).filter(([, ms]) => ms > 0);
  const totalNode = entries.reduce((sum, [, ms]) => sum + ms, 0);
  const wall = message.elapsedMs ?? totalNode;

  if (!entries.length && message.topRelevance == null) return null;

  return (
    <div className="rounded-xl border border-line bg-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-3.5 py-3 text-left transition-colors duration-300 hover:bg-hover"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Figure
            label="Total time"
            value={`${(wall / 1000).toFixed(1)}s`}
            hint="Wall-clock time from request to answer, including network."
          />
          {message.chunksConsidered != null && (
            <Figure
              label="Passages"
              value={`${message.chunksConsidered} → ${message.chunksUsed}`}
              hint="Candidates pulled from the index, then narrowed by the cross-encoder reranker."
            />
          )}
          {message.topRelevance != null && (
            <Figure
              label="Top relevance"
              value={message.topRelevance.toFixed(2)}
              hint="Cross-encoder score for the best passage. Above ~0 means genuinely on-topic."
            />
          )}
          {(message.attempts ?? 1) > 1 && (
            <Figure label="Searches" value={String(message.attempts)} hint="The first search was too weak, so the question was rewritten and run again." />
          )}
        </div>
        <span
          className="shrink-0 text-[0.7rem] text-faint transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      <div
        className="grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3.5 border-t border-line px-3.5 py-3.5">
            {entries.length > 0 && (
              <div className="flex flex-col gap-2">
                <Eyebrow>Where the time went</Eyebrow>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
                  {entries.map(([node, ms]) => (
                    <span
                      key={node}
                      className={NODE_BAR[node] ?? "bg-steel"}
                      style={{ width: `${(ms / totalNode) * 100}%` }}
                      title={`${NODE_LABEL[node] ?? node}: ${Math.round(ms)}ms`}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {entries
                    .sort((a, b) => b[1] - a[1])
                    .map(([node, ms]) => (
                      <div key={node} className="flex items-center gap-2.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${NODE_BAR[node] ?? "bg-steel"}`}
                        />
                        <span className="flex-1 text-[0.78rem] text-dim">
                          {NODE_LABEL[node] ?? node}
                        </span>
                        <span className="text-[0.78rem] tabular-nums">
                          {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {message.confidenceReasoning && (
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                <Eyebrow>Why it decided that</Eyebrow>
                <p className="text-[0.78rem] leading-relaxed text-dim">
                  {message.confidenceReasoning}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
