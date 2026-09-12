import { Eyebrow, StatusDot } from "./Primitives";
import type { ChatMessage } from "../types";

const PROBES = [
  { text: "How do I issue a partial refund?", kind: "in-scope" },
  { text: "What test card number simulates a successful payment?", kind: "in-scope" },
  { text: "How do I verify a webhook signature?", kind: "in-scope" },
  { text: "Why did my payout pay_9f8e7d fail last night?", kind: "out-of-scope" },
  { text: "Can you reactivate my suspended account?", kind: "out-of-scope" },
] as const;

function Metric({
  label,
  value,
  tone = "text-text",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.76rem] text-dim">{label}</span>
      <span className={`font-mono text-[0.82rem] font-medium tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export function Telemetry({
  messages,
  busy,
  onProbe,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onProbe: (q: string) => void;
}) {
  const replies = messages.filter((m) => m.role === "assistant" && m.outcome);
  const answered = replies.filter((m) => m.outcome === "answered").length;
  const escalated = replies.filter((m) => m.outcome === "escalated").length;
  const down = replies.filter((m) => m.outcome === "unavailable").length;
  const retried = replies.filter((m) => (m.attempts ?? 1) > 1).length;
  const total = replies.length;

  const latencies = replies.map((m) => m.elapsedMs ?? 0).filter(Boolean);
  const avg = latencies.length
    ? (latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000).toFixed(1)
    : "—";

  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="flex flex-col gap-2.5">
        <Eyebrow>Session</Eyebrow>
        {total === 0 ? (
          <p className="text-[0.76rem] text-faint">No queries yet.</p>
        ) : (
          <>
            <div className="flex h-1.5 overflow-hidden bg-line">
              {answered > 0 && <span className="bg-signal transition-all duration-500" style={{ width: `${pct(answered)}%` }} />}
              {escalated > 0 && <span className="bg-warn transition-all duration-500" style={{ width: `${pct(escalated)}%` }} />}
              {down > 0 && <span className="bg-alert transition-all duration-500" style={{ width: `${pct(down)}%` }} />}
            </div>
            <div className="flex flex-col gap-1.5">
              <Metric label="Resolved" value={answered} tone="text-signal" />
              <Metric label="Escalated" value={escalated} tone="text-warn" />
              {down > 0 && <Metric label="Unavailable" value={down} tone="text-alert" />}
              {retried > 0 && <Metric label="Re-searched" value={retried} tone="text-dim" />}
              <div className="mt-1 border-t border-line pt-1.5">
                <Metric label="Avg latency" value={avg === "—" ? "—" : `${avg}s`} tone="text-dim" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Eyebrow>Knowledge base</Eyebrow>
        <div className="flex flex-col gap-1.5">
          <Metric label="Source pages" value={20} tone="text-dim" />
          <Metric label="Indexed chunks" value={313} tone="text-dim" />
          <Metric label="Retrieved / reranked" value="20 → 5" tone="text-dim" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Probes</Eyebrow>
        <div className="flex flex-col gap-1.5">
          {PROBES.map((p, i) => (
            <button
              key={p.text}
              type="button"
              onClick={() => onProbe(p.text)}
              disabled={busy}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-rise group flex items-start gap-2 border border-line bg-raised px-2.5 py-2 text-left transition-all duration-200 hover:border-signal hover:bg-hover hover:translate-x-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0"
            >
              <StatusDot tone={p.kind === "in-scope" ? "signal" : "warn"} />
              <span className="flex-1 text-[0.74rem] leading-snug">{p.text}</span>
              <span
                className={`shrink-0 font-mono text-[0.55rem] tracking-wider opacity-0 transition-opacity group-hover:opacity-100 ${
                  p.kind === "in-scope" ? "text-signal" : "text-warn"
                }`}
              >
                {p.kind === "in-scope" ? "RESOLVE" : "ESCALATE"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
