import { Eyebrow, StatusDot } from "./Primitives";
import type { ChatMessage } from "../types";

const PROBES = [
  { text: "How do I issue a partial refund?", kind: "answers" },
  { text: "What test card number simulates a successful payment?", kind: "answers" },
  { text: "How do I verify a webhook signature?", kind: "answers" },
  { text: "Why did my payout pay_9f8e7d fail last night?", kind: "escalates" },
  { text: "Can you reactivate my suspended account?", kind: "escalates" },
] as const;

function Row({
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
      <span className="text-[0.8rem] text-dim">{label}</span>
      <span className={`text-[0.85rem] font-medium tabular-nums ${tone}`}>{value}</span>
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

  const lat = replies.map((m) => m.elapsedMs ?? 0).filter(Boolean);
  const avg = lat.length ? (lat.reduce((a, b) => a + b, 0) / lat.length / 1000).toFixed(1) : null;

  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="flex flex-col gap-7 p-4">
      <div className="flex flex-col gap-3">
        <Eyebrow>Session</Eyebrow>
        {total === 0 ? (
          <p className="text-[0.8rem] leading-relaxed text-faint">
            Ask something, or run one of the examples below.
          </p>
        ) : (
          <>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
              {answered > 0 && (
                <span
                  className="bg-good transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ width: `${pct(answered)}%` }}
                />
              )}
              {escalated > 0 && (
                <span
                  className="bg-warn transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ width: `${pct(escalated)}%` }}
                />
              )}
              {down > 0 && (
                <span
                  className="bg-alert transition-all duration-700"
                  style={{ width: `${pct(down)}%` }}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Row label="Answered" value={answered} tone="text-good" />
              <Row label="Escalated" value={escalated} tone="text-warn" />
              {down > 0 && <Row label="Unavailable" value={down} tone="text-alert" />}
              {retried > 0 && <Row label="Searched twice" value={retried} tone="text-dim" />}
              {avg && (
                <div className="mt-1 border-t border-line pt-2">
                  <Row label="Average time" value={`${avg}s`} tone="text-dim" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow>Knowledge base</Eyebrow>
        <div className="flex flex-col gap-2">
          <Row label="Documentation pages" value={20} tone="text-dim" />
          <Row label="Indexed passages" value={313} tone="text-dim" />
          <Row label="Retrieved, then kept" value="20 → 5" tone="text-dim" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Eyebrow>Examples</Eyebrow>
        <div className="flex flex-col gap-2">
          {PROBES.map((p, i) => (
            <button
              key={p.text}
              type="button"
              onClick={() => onProbe(p.text)}
              disabled={busy}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-rise group flex items-start gap-2.5 rounded-xl border border-line bg-raised px-3 py-2.5 text-left transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-line-bright hover:bevel-lift active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <span className="mt-1.5">
                <StatusDot tone={p.kind === "answers" ? "good" : "warn"} />
              </span>
              <span className="flex-1 text-[0.78rem] leading-snug">{p.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
