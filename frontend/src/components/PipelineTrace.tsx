import { useState } from "react";
import { Eyebrow, StatusDot } from "./Primitives";
import type { ChatMessage } from "../types";

type NodeState = "idle" | "active" | "done" | "skipped" | "taken" | "rejected";

interface NodeSpec {
  id: string;
  label: string;
  detail: string;
}

const NODES: NodeSpec[] = [
  { id: "retrieve", label: "RETRIEVE", detail: "20 candidates pulled from 313 chunks, reranked to the best 5 by a cross-encoder." },
  { id: "judge", label: "JUDGE", detail: "A model scores whether those passages actually answer the question." },
  { id: "rewrite", label: "REWRITE", detail: "On a weak first pass, restates the question in documentation vocabulary and searches again." },
  { id: "answer", label: "ANSWER", detail: "Writes the reply from the retrieved passages and cites its sources." },
  { id: "escalate", label: "ESCALATE", detail: "Files a ticket with a triage summary so a human picks it up." },
];

const STATE_STYLE: Record<NodeState, string> = {
  idle: "border-line text-faint",
  active: "border-signal text-signal glow-signal",
  done: "border-signal-dim text-signal",
  taken: "border-signal-dim text-signal",
  rejected: "border-line text-faint opacity-35",
  skipped: "border-line text-faint opacity-35",
};

function nodeStates(msg: ChatMessage | null, busy: boolean): Record<string, NodeState> {
  if (busy) {
    return { retrieve: "active", judge: "active", rewrite: "idle", answer: "idle", escalate: "idle" };
  }
  if (!msg?.outcome) {
    return { retrieve: "idle", judge: "idle", rewrite: "idle", answer: "idle", escalate: "idle" };
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

export function PipelineTrace({
  latest,
  busy,
}: {
  latest: ChatMessage | null;
  busy: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const states = nodeStates(latest, busy);

  return (
    <div className="flex flex-col gap-1.5 p-3">
      {NODES.map((node, i) => {
        const state = states[node.id];
        const isOpen = open === node.id;
        const live = state === "active";

        return (
          <div key={node.id}>
            {i > 0 && (
              <div className="relative ml-[11px] h-3 w-px overflow-hidden bg-line">
                {busy && (
                  <span
                    className="absolute inset-0 bg-signal"
                    style={{ animation: `trace 1.4s linear ${i * 0.18}s infinite` }}
                  />
                )}
              </div>
            )}

            <button
              type="button"
              onMouseEnter={() => setOpen(node.id)}
              onMouseLeave={() => setOpen(null)}
              onClick={() => setOpen(isOpen ? null : node.id)}
              className={`flex w-full items-center gap-2.5 border px-2.5 py-2 text-left transition-all duration-200 hover:bg-hover active:scale-[0.985] ${STATE_STYLE[state]}`}
            >
              <StatusDot
                tone={state === "rejected" || state === "skipped" ? "idle" : "signal"}
                active={live}
              />
              <span className="font-mono text-[0.68rem] font-bold tracking-[0.1em]">
                {node.label}
              </span>
              <span className="ml-auto font-mono text-[0.6rem] text-faint">
                {state === "taken" && "◆"}
                {state === "rejected" && "—"}
                {state === "skipped" && "—"}
                {state === "done" && "✓"}
              </span>
            </button>

            <div
              className="grid transition-all duration-300"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="mt-1 ml-[11px] border-l border-line py-1 pl-3 text-[0.72rem] leading-relaxed text-dim">
                  {node.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {latest?.rewrittenQuery && (
        <div className="mt-2 border border-dashed border-line-bright p-2.5">
          <Eyebrow>Re-searched as</Eyebrow>
          <p className="mt-1 font-mono text-[0.7rem] leading-relaxed text-text">
            {latest.rewrittenQuery}
          </p>
        </div>
      )}
    </div>
  );
}
