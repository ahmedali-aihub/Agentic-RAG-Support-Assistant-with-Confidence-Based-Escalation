import { useCallback, useEffect, useRef, useState } from "react";
import { askQuestion } from "../api";
import {
  IconAnswer,
  IconArrow,
  IconEscalate,
  IconJudge,
  IconRetrieve,
  IconRewrite,
} from "./TiIcons";

type StepId = "retrieve" | "judge" | "rewrite" | "answer" | "escalate";
type StepState = "idle" | "running" | "done" | "skipped";

interface Result {
  answered: boolean;
  text: string;
  confidence: number;
  citations: string[];
  ticket: string | null;
  retried: boolean;
  timings: Partial<Record<StepId, number>>;
  simulated: boolean;
}

const STEPS: { id: StepId; label: string; tip: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: "retrieve", label: "Retrieve", tip: "Pulls 20 candidate passages from the indexed docs, then a cross-encoder reranks them to the best 5.", Icon: IconRetrieve },
  { id: "judge", label: "Judge", tip: "A model reads those passages and scores whether they genuinely answer the question.", Icon: IconJudge },
  { id: "rewrite", label: "Rewrite", tip: "If the first pass was weak, the question is restated in documentation vocabulary and searched again.", Icon: IconRewrite },
  { id: "answer", label: "Answer", tip: "Above the threshold, the reply is written from the retrieved passages, with sources cited.", Icon: IconAnswer },
  { id: "escalate", label: "Escalate", tip: "Below it, a ticket is filed with a triage summary so a person can pick the question up.", Icon: IconEscalate },
];

const EXAMPLES = [
  "How do I issue a partial refund?",
  "What test card number simulates a successful payment?",
  "Why did my payout pay_9f8e7d fail last night?",
];

/**
 * Scripted runs for when the backend isn't reachable.
 *
 * The page is a shop window: it has to demonstrate the behaviour from a static
 * host with nothing running behind it. These mirror real recorded responses,
 * and anything served this way is labelled so it is never mistaken for live.
 */
const SIMULATED: Record<"answer" | "escalate", Omit<Result, "simulated">> = {
  answer: {
    answered: true,
    text:
      "To issue a partial refund, open the Payments page and find the payment. Click the " +
      "overflow menu, choose Refund payment, then enter a smaller amount instead of the full " +
      "total and select a reason. Partial refunds have to be issued individually — bulk " +
      "refunding in the Dashboard only handles full refunds.",
    confidence: 0.97,
    citations: ["refunds"],
    ticket: null,
    retried: false,
    timings: { retrieve: 2900, judge: 1200, answer: 2700 },
  },
  escalate: {
    answered: false,
    text:
      "I'm not confident I can answer this accurately from the documentation, so I've passed " +
      "it to the support team rather than guessing. They'll follow up shortly.",
    confidence: 0.24,
    citations: [],
    ticket: "9f4c21a8",
    retried: true,
    timings: { retrieve: 2800, judge: 2100, rewrite: 3400, escalate: 900 },
  },
};

function looksAnswerable(q: string) {
  // Account-specific identifiers are the clearest signal the docs can't help.
  return !/\b(pay_|sub_|ch_|acct_|my account|my payout|refund my|cancel my)\b/i.test(q);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function LiveDemo() {
  const [value, setValue] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [states, setStates] = useState<Record<StepId, StepState>>({
    retrieve: "idle", judge: "idle", rewrite: "idle", answer: "idle", escalate: "idle",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reset = () =>
    setStates({ retrieve: "idle", judge: "idle", rewrite: "idle", answer: "idle", escalate: "idle" });

  /** Walks the pipeline lights in step with the timings a run reported. */
  const playback = useCallback(async (r: Result) => {
    const order: StepId[] = ["retrieve", "judge"];
    if (r.retried) order.push("rewrite");
    order.push(r.answered ? "answer" : "escalate");

    for (const id of order) {
      setStates((s) => ({ ...s, [id]: "running" }));
      // Long real timings are compressed: the point is to show the sequence,
      // not to make the visitor sit through it.
      await sleep(Math.min(Math.max(r.timings[id] ?? 700, 420), 1100));
      setStates((s) => ({ ...s, [id]: "done" }));
    }
    setStates((s) => ({
      ...s,
      rewrite: r.retried ? "done" : "skipped",
      answer: r.answered ? "done" : "skipped",
      escalate: r.answered ? "skipped" : "done",
    }));
    setResult(r);
  }, []);

  const run = useCallback(
    async (question: string) => {
      if (busy) return;
      setBusy(true);
      setResult(null);
      setAsked(question);
      setValue("");
      reset();

      let r: Result;
      try {
        const res = await askQuestion(question);
        r = {
          answered: !res.escalated,
          text: res.answer,
          confidence: res.confidence_score ?? 0,
          citations: res.citations.map((u) => {
            try { return new URL(u).pathname.replace(/^\//, "") || u; } catch { return u; }
          }),
          ticket: res.escalation_id,
          retried: (res.attempts ?? 1) > 1,
          timings: res.timings as Partial<Record<StepId, number>>,
          simulated: false,
        };
      } catch {
        const base = SIMULATED[looksAnswerable(question) ? "answer" : "escalate"];
        r = { ...base, simulated: true };
      }

      await playback(r);
      setBusy(false);
    },
    [busy, playback]
  );

  return (
    <div className="glass overflow-hidden rounded-[26px]">
      <div className="flex items-center justify-between gap-4 border-b border-white/55 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-ti-blue/70" />
          <span className="text-[0.82rem] font-medium text-ti-body">Support Assistant</span>
        </div>
        {result?.simulated && (
          <span className="rounded-full bg-white/60 px-2.5 py-1 text-[0.66rem] font-medium text-ti-mute">
            Recorded example — backend offline
          </span>
        )}
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_268px]">
        {/* Conversation */}
        <div className="flex min-h-[352px] flex-col justify-between gap-5 p-6">
          <div className="flex flex-col gap-4">
            {!asked && (
              <div className="flex flex-col gap-4">
                <p className="max-w-sm text-[0.95rem] leading-relaxed text-ti-body">
                  Ask something a support team would get. Watch it either answer with a
                  citation, or decide it can't and hand the question to a person.
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => run(q)}
                      className="glass-tight lift rounded-full px-3.5 py-2 text-left text-[0.78rem] text-ti-body"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {asked && (
              <div className="flex justify-end">
                <p className="max-w-[86%] rounded-[18px] rounded-br-md bg-gradient-to-b from-[#6d8aa8] to-[#44607a] px-4 py-2.5 text-[0.88rem] text-white shadow-[0_8px_20px_-10px_rgba(68,96,122,0.6)]">
                  {asked}
                </p>
              </div>
            )}

            {result && (
              <div className="glass-tight flex flex-col gap-3.5 rounded-[18px] rounded-tl-md p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${result.answered ? "bg-[#3f7d55]" : "bg-[#9a6a2a]"}`}
                  />
                  <span
                    className={`text-[0.74rem] font-semibold ${result.answered ? "text-[#3f7d55]" : "text-[#9a6a2a]"}`}
                  >
                    {result.answered ? "Answered from documentation" : "Escalated to a person"}
                  </span>
                  {result.ticket && (
                    <span className="ml-auto text-[0.7rem] text-ti-mute">
                      Ticket {result.ticket}
                    </span>
                  )}
                </div>

                <p className="text-[0.88rem] leading-relaxed text-ti-ink">{result.text}</p>

                <Confidence score={result.confidence} />

                {result.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="eyebrow-ti text-[0.6rem]">Source</span>
                    {result.citations.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-white/70 px-2.5 py-1 text-[0.7rem] text-ti-body"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) run(value.trim());
            }}
            className="flex items-center gap-2.5"
          >
            <input
              id="demo-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
              placeholder="Ask a support question…"
              aria-label="Ask a support question"
              className="glass-tight h-12 flex-1 rounded-full px-5 text-[0.88rem] text-ti-ink outline-none placeholder:text-ti-mute disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !value.trim()}
              aria-label="Send"
              className="pill pill-solid !h-12 !w-12 !px-0 disabled:opacity-40"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-r-transparent" />
              ) : (
                <IconArrow className="h-[18px] w-[18px]" />
              )}
            </button>
          </form>
        </div>

        {/* Pipeline */}
        <div className="border-t border-white/55 bg-white/24 p-5 md:border-t-0 md:border-l">
          <span className="eyebrow-ti">Pipeline</span>
          <div className="mt-4 flex flex-col gap-1.5">
            {STEPS.map(({ id, label, tip, Icon }, i) => {
              const st = states[id];
              const on = st === "running" || st === "done";
              return (
                <div key={id}>
                  {i > 0 && (
                    <div className="ml-[17px] h-3 w-px bg-gradient-to-b from-ti-500/45 to-transparent" />
                  )}
                  <div
                    tabIndex={0}
                    className={`has-tip relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                      st === "running"
                        ? "step-live border-ti-blue/35 bg-white/78"
                        : st === "done"
                          ? "border-white/70 bg-white/58"
                          : st === "skipped"
                            ? "border-transparent bg-transparent opacity-35"
                            : "border-transparent bg-transparent opacity-55"
                    }`}
                  >
                    <span className={on ? "text-ti-blue" : "text-ti-mute"}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span
                      className={`text-[0.8rem] font-medium ${on ? "text-ti-ink" : "text-ti-mute"}`}
                    >
                      {label}
                    </span>
                    {result?.timings[id] != null && st === "done" && (
                      <span className="ml-auto text-[0.68rem] tabular-nums text-ti-mute">
                        {(result.timings[id]! / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span className="tip">{tip}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Confidence({ score, threshold = 0.6 }: { score: number; threshold?: number }) {
  const cleared = score >= threshold;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow-ti text-[0.6rem]">Confidence</span>
        <span className="numeral text-[1.05rem]">{Math.round(score * 100)}%</span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-ti-500/35">
        <div
          className={`h-full origin-left rounded-full ${cleared ? "bg-[#4f8a67]" : "bg-[#b07f38]"}`}
          style={{ width: `${score * 100}%`, animation: "ti-sweep 0.85s cubic-bezier(0.32,0.72,0,1) both" }}
        />
        <span
          className="absolute -top-1 -bottom-1 w-px bg-ti-ink/40"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <span className="text-[0.7rem] text-ti-mute">
        {Math.round(threshold * 100)}% required · {cleared ? "cleared" : "not met"}
      </span>
    </div>
  );
}
