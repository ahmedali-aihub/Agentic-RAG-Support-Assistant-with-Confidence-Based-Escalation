import { useState } from "react";
import { Eyebrow, StatusDot } from "./Primitives";
import type { ChatMessage } from "../types";

type NodeState = "idle" | "active" | "done" | "skipped" | "taken" | "rejected" | "failed";

const NODES = [
  { id: "retrieve", label: "Retrieve", detail: "Pulls 20 candidate passages from 313 indexed chunks, then a cross-encoder reranks them to the best 5." },
  { id: "judge", label: "Judge", detail: "A model reads those passages and scores whether they genuinely answer the question." },
  { id: "rewrite", label: "Rewrite", detail: "After a weak first pass, restates the question in documentation vocabulary and searches again." },
  { id: "answer", label: "Answer", detail: "Writes the reply from the retrieved passages and cites every source it used." },
  { id: "escalate", label: "Escalate", detail: "Files a ticket with a triage summary so a person can pick the question up." },
] as const;

const STYLE: Record<NodeState, string> = {
  idle: "border-line text-faint",
  active: "border-line-bright bg-raised text-text bevel-lift",
  done: "border-line-bright bg-raised text-text",
  taken: "border-line-bright bg-raised text-text",
  rejected: "border-line text-faint opacity-40",
  skipped: "border-line text-faint opacity-40",
  failed: "border-alert/40 bg-alert/8 text-alert",
};

function statesFor(msg: ChatMessage | null, busy: boolean): Record<string, NodeState> {
  if (busy) {
    return { retrieve: "active", judge: "active", rewrite: "idle", answer: "idle", escalate: "idle" };
  }
  if (!msg?.outcome) {
    return { retrieve: "idle", judge: "idle", rewrite: "idle", answer: "idle", escalate: "idle" };
  }
  // On an outage no judge ran, so there was no routing decision to show. The
  // handoff still happened, but it was a fallback, not a verdict — marking the
  // judge "done" here would claim the system weighed something it never saw.
  if (msg.outcome === "unavailable" || msg.outcome === "error") {
    return {
      retrieve: "done",
      judge: "failed",
      rewrite: "skipped",
      answer: "skipped",
      escalate: "taken",
    };
  }

  const retried = (msg.attempts ?? 1) > 1;
  const answered = msg.outcome === "answered";
  return {
    retrieve: "done",
    judge: "done",
    rewrite: retried ? "taken" : "skipped",
    answer: answered ? "taken" : "rejected",
    escalate: answered ? "rejected" : "taken",
  };
}

export function PipelineTrace({ latest, busy }: { latest: ChatMessage | null; busy: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const states = statesFor(latest, busy);
  const timings = latest?.timings;

  return (
    <div className="flex flex-col gap-1 p-4">
      {NODES.map((node, i) => {
        const state = states[node.id];
        const isOpen = open === node.id;
        const live = state === "active";
        const on = state === "taken" || state === "done";

        return (
          <div key={node.id}>
            {i > 0 && (
              <div className="relative my-0.5 ml-[15px] h-4 w-px overflow-hidden bg-line">
                {busy && (
                  <span
                    className="absolute inset-x-0 h-3 bg-gradient-to-b from-transparent via-silver to-transparent"
                    style={{ animation: `glint 1.8s cubic-bezier(0.4,0,0.6,1) ${i * 0.2}s infinite` }}
                  />
                )}
              </div>
            )}

            <button
              type="button"
              onMouseEnter={() => setOpen(node.id)}
              onMouseLeave={() => setOpen(null)}
              onClick={() => setOpen(isOpen ? null : node.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-hover active:scale-[0.98] ${STYLE[state]}`}
            >
              <StatusDot
                tone={state === "failed" ? "alert" : on ? "silver" : "idle"}
                active={live}
              />
              <span className="text-[0.82rem] font-medium">{node.label}</span>
              <span className="ml-auto flex items-center gap-2 font-mono text-[0.62rem] text-faint tabular-nums">
                {timings?.[node.id] != null && on && (
                  <span>{(timings[node.id] / 1000).toFixed(1)}s</span>
                )}
                {state === "failed" ? "✕" : on ? "●" : state === "idle" || state === "active" ? "" : "○"}
              </span>
            </button>

            <div
              className="grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="mt-1 ml-[15px] border-l border-line py-1 pl-4 text-[0.76rem] leading-relaxed text-dim">
                  {node.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {latest?.rewrittenQuery && (
        <div className="animate-fade mt-4 rounded-xl border border-line bg-raised p-3">
          <Eyebrow>Re-searched as</Eyebrow>
          <p className="mt-1.5 text-[0.78rem] leading-relaxed text-text">
            {latest.rewrittenQuery}
          </p>
        </div>
      )}
    </div>
  );
}
