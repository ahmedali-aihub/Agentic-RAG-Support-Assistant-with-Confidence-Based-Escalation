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

const STEPS: {
  id: StepId;
  label: string;
  tip: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "retrieve", label: "Retrieve", tip: "Pulls 20 candidate passages, then reranks to the best 5.", Icon: IconRetrieve },
  { id: "judge", label: "Judge", tip: "Scores whether those passages genuinely answer the question.", Icon: IconJudge },
  { id: "rewrite", label: "Rewrite", tip: "A weak first pass is restated in the docs' vocabulary and searched again.", Icon: IconRewrite },
  { id: "answer", label: "Answer", tip: "Above the threshold, writes the reply and cites its sources.", Icon: IconAnswer },
  { id: "escalate", label: "Escalate", tip: "Below it, files a ticket with a triage summary for a person.", Icon: IconEscalate },
];

const EXAMPLES = [
  "How do I issue a partial refund?",
  "What test card simulates a successful payment?",
  "Why did my payout pay_9f8e7d fail?",
];

/**
 * Recorded runs for when no backend is reachable.
 *
 * The page has to demonstrate the behaviour from a static host with nothing
 * running behind it. These mirror real responses, and anything served this way
 * is labelled so it is never mistaken for a live result.
 */
const RECORDED: Record<"answer" | "escalate", Omit<Result, "simulated">> = {
  answer: {
    answered: true,
    text:
      "Open the Payments page and find the payment, click the overflow menu, then choose " +
      "Refund payment and enter a smaller amount instead of the full total. Partial refunds " +
      "must be issued individually — bulk refunding only handles full refunds.",
    confidence: 0.97,
    citations: ["refunds"],
    ticket: null,
    retried: false,
    timings: { retrieve: 2900, judge: 1200, answer: 2700 },
  },
  escalate: {
    answered: false,
    text:
      "I'm not confident I can answer this from the documentation, so I've passed it to the " +
      "support team rather than guessing. They'll follow up shortly.",
    confidence: 0.24,
    citations: [],
    ticket: "9f4c21a8",
    retried: true,
    timings: { retrieve: 2800, judge: 2100, rewrite: 3400, escalate: 900 },
  },
};

function looksAnswerable(q: string) {
  // Account-specific identifiers are the clearest sign the docs can't help.
  return !/\b(pay_|sub_|ch_|acct_|my account|my payout|cancel my)\b/i.test(q);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const IDLE: Record<StepId, StepState> = {
  retrieve: "idle", judge: "idle", rewrite: "idle", answer: "idle", escalate: "idle",
};

export function LiveDemo() {
  const [value, setValue] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [states, setStates] = useState<Record<StepId, StepState>>(IDLE);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * Advances the pipeline lights while the request is still in flight.
   *
   * The server returns one response at the end, so there is no token stream to
   * follow. Waiting for it before animating leaves the panel frozen for the
   * whole call, which on a slow free tier is a minute of looking broken. This
   * walks the stages the graph really runs, in order, and holds on the last one
   * until the answer lands rather than pretending to finish.
   */
  const startProgress = useCallback(() => {
    const order: StepId[] = ["retrieve", "judge", "rewrite", "answer"];
    let i = 0;
    let stopped = false;

    const step = async () => {
      while (!stopped && alive.current && i < order.length) {
        const id = order[i];
        setStates((s) => ({ ...s, [id]: "running" }));
        await sleep(i === order.length - 1 ? 9999_000 : 2200);
        if (stopped || !alive.current) return;
        setStates((s) => ({ ...s, [id]: "done" }));
        i += 1;
      }
    };
    void step();

    return () => {
      stopped = true;
    };
  }, []);

  /** Settles the pipeline on what the run actually did. */
  const settle = useCallback((r: Result) => {
    setStates({
      retrieve: "done",
      judge: "done",
      rewrite: r.retried ? "done" : "skipped",
      answer: r.answered ? "done" : "skipped",
      escalate: r.answered ? "skipped" : "done",
    });
    setResult(r);
  }, []);

  const run = useCallback(
    async (question: string) => {
      if (busy) return;
      setBusy(true);
      setResult(null);
      setAsked(question);
      setValue("");
      setStates(IDLE);

      // Start the lights before awaiting, so the panel moves during the call
      // rather than after it.
      const stopProgress = startProgress();

      let r: Result;
      try {
        const res = await askQuestion(question);
        r = {
          answered: !res.escalated,
          text: res.answer,
          confidence: res.confidence_score ?? 0,
          citations: res.citations.map((u) => {
            try {
              return new URL(u).pathname.replace(/^\//, "") || u;
            } catch {
              return u;
            }
          }),
          ticket: res.escalation_id,
          retried: (res.attempts ?? 1) > 1,
          timings: res.timings as Partial<Record<StepId, number>>,
          simulated: false,
        };
      } catch {
        r = { ...RECORDED[looksAnswerable(question) ? "answer" : "escalate"], simulated: true };
      }

      stopProgress();
      settle(r);
      if (alive.current) setBusy(false);
    },
    [busy, startProgress, settle]
  );

  return (
    <div className="glass overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between gap-4 hairline border-b px-6 py-4">
        <span className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-ti-ink2/60" />
          <span className="text-[0.82rem] font-medium text-ti-body">Support Assistant</span>
        </span>
        {result?.simulated && (
          <span className="rounded-full fill-3 px-2.5 py-1 text-[0.66rem] font-medium text-ti-mute">
            Recorded example — backend offline
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
        {/* Conversation */}
        <div className="flex min-h-[360px] flex-col justify-between gap-5 p-6">
          <div className="flex flex-col gap-4">
            {!asked && (
              <>
                <p className="max-w-md text-[0.95rem] leading-relaxed text-ti-body">
                  Ask something a support team would get. Watch it either answer with a
                  citation, or decide it can&rsquo;t and hand the question to a person.
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => run(q)}
                      className="glass-sm rounded-full px-3.5 py-2 text-left text-[0.78rem] text-ti-body transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover-fill-4 active:translate-y-0"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {asked && (
              <div className="flex justify-end">
                <p className="graphite max-w-[86%] rounded-[18px] rounded-br-md px-4 py-2.5 text-[0.88rem] leading-relaxed">
                  {asked}
                </p>
              </div>
            )}

            {result && (
              <div className="glass-sm flex flex-col gap-3.5 rounded-[18px] rounded-tl-md p-4">
                <div className="flex flex-wrap items-center gap-2">
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
                    <span className="text-[0.62rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
                      Source
                    </span>
                    {result.citations.map((c) => (
                      <span
                        key={c}
                        className="rounded-full fill-4 px-2.5 py-1 text-[0.7rem] text-ti-body"
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
              className="glass-sm h-12 min-w-0 flex-1 rounded-full px-5 text-[0.88rem] text-ti-ink outline-none placeholder:text-ti-mute focus-visible:ring-2 focus-visible:ring-ti-ink/25 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !value.trim()}
              aria-label="Send"
              className="graphite grid h-12 w-12 shrink-0 place-items-center rounded-full transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-35"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <IconArrow className="h-[18px] w-[18px]" />
              )}
            </button>
          </form>
        </div>

        {/* Pipeline */}
        <div className="hairline border-t fill-1 p-5 lg:border-t-0 lg:border-l">
          <span className="text-[0.7rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
            Pipeline
          </span>
          <div className="mt-4 flex flex-col">
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
                    className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      st === "running"
                        ? "border-ti-ink/15 fill-5 animate-[ti-pulse_1.9s_ease-in-out_infinite]"
                        : st === "done"
                          ? "hairline fill-3"
                          : st === "skipped"
                            ? "border-transparent opacity-35"
                            : "border-transparent opacity-55"
                    }`}
                  >
                    <span className={on ? "text-ti-ink2" : "text-ti-mute"}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span
                      className={`text-[0.8rem] font-medium ${on ? "text-ti-ink" : "text-ti-mute"}`}
                    >
                      {label}
                    </span>
                    {st === "done" && result?.timings[id] != null && (
                      <span className="ml-auto text-[0.68rem] tabular-nums text-ti-mute">
                        {(result.timings[id]! / 1000).toFixed(1)}s
                      </span>
                    )}

                    {/* Glass popover, same material as the cards. */}
                    <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-max max-w-[220px] -translate-x-1/2 translate-y-1.5 rounded-xl hairline border fill-5 px-3 py-2 text-[0.74rem] leading-snug text-ti-body opacity-0 shadow-[0_12px_30px_-12px_rgba(28,27,25,0.3)] backdrop-blur-xl transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      {tip}
                    </span>
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
        <span className="text-[0.62rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
          Confidence
        </span>
        <span className="ink text-[1.05rem] font-semibold tabular-nums">
          {Math.round(score * 100)}%
        </span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-ti-500/35">
        <div
          className={`h-full origin-left rounded-full ${cleared ? "bg-[#4f8a67]" : "bg-[#b07f38]"}`}
          style={{
            width: `${score * 100}%`,
            animation: "ti-sweep 0.85s cubic-bezier(0.32,0.72,0,1) both",
          }}
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
