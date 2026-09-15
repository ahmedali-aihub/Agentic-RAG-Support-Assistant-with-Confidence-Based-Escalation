import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { Eyebrow, StatusDot } from "../components/Primitives";
import { useTheme } from "../useTheme";
import { listTickets, queueStats, updateTicket } from "../api";
import type { QueueStats, Ticket, TicketStatus } from "../types";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "text-warn",
  in_progress: "text-silver",
  resolved: "text-good",
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Metric({ label, value, tone = "text-text" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
      <span className="text-[0.7rem] text-faint">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export default function Queue() {
  const { theme, toggle } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "all">("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([listTickets(), queueStats()]);
      setTickets(t);
      setStats(s);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const move = useCallback(
    async (id: string, status: TicketStatus, answer?: string) => {
      setPending(id);
      try {
        await updateTicket(id, status, answer);
        await load();
      } catch {
        setError(true);
      } finally {
        setPending(null);
      }
    },
    [load]
  );

  const shown = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3">
        <div>
          <h1 className="text-[0.95rem] font-semibold tracking-[-0.015em]">Escalation queue</h1>
          <p className="text-[0.72rem] text-faint">
            Questions the assistant declined to answer, waiting on a person
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="#/" className="text-[0.78rem] font-medium text-faint transition-colors hover:text-text">
            Overview
          </a>
          <a href="#/app" className="text-[0.78rem] font-medium text-faint transition-colors hover:text-text">
            Console
          </a>
          <ThemeToggle theme={theme} onToggle={toggle} tone="console" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6">
        {error && (
          <div className="mb-5 rounded-xl border border-alert/40 bg-alert/8 px-4 py-3 text-[0.85rem] text-alert">
            Couldn&rsquo;t reach the service. Check the backend is running on port 8000.
          </div>
        )}

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Metric label="Waiting" value={stats.open} tone="text-warn" />
            <Metric label="In progress" value={stats.in_progress} />
            <Metric label="Resolved" value={stats.resolved} tone="text-good" />
            <Metric
              label="Added to knowledge base"
              value={stats.learned}
              tone={stats.learned > 0 ? "text-good" : "text-dim"}
            />
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {(["open", "in_progress", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-[0.76rem] font-medium transition-all duration-300 ${
                filter === f
                  ? "border-line-bright bg-raised text-text"
                  : "border-line text-faint hover:text-dim"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel px-6 py-14 text-center">
            <p className="text-[0.9rem] text-dim">
              {filter === "open"
                ? "Nothing waiting. Every escalation has been picked up."
                : "No tickets here."}
            </p>
            <p className="mt-1.5 text-[0.78rem] text-faint">
              Tickets arrive when the assistant judges the docs insufficient.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((t) => {
              const open = expanded === t.id;
              const status = (t.status ?? "open") as TicketStatus;
              return (
                <article key={t.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : t.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-300 hover:bg-hover"
                  >
                    <span className="mt-1.5">
                      <StatusDot
                        tone={status === "resolved" ? "good" : status === "open" ? "warn" : "silver"}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9rem] leading-snug font-medium">{t.question}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.68rem] text-faint">
                        <span>#{t.id}</span>
                        <span>{timeAgo(t.created_at)}</span>
                        {typeof t.confidence_score === "number" && (
                          <span>confidence {Math.round(t.confidence_score * 100)}%</span>
                        )}
                        <span className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</span>
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-[0.7rem] text-faint transition-transform duration-300"
                      style={{ transform: open ? "rotate(180deg)" : "none" }}
                    >
                      ▾
                    </span>
                  </button>

                  <div
                    className="grid transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
                        <div className="flex flex-col gap-1.5">
                          <Eyebrow>Triage summary</Eyebrow>
                          <p className="text-[0.85rem] leading-relaxed text-dim">{t.summary}</p>
                        </div>

                        {t.confidence_reasoning && (
                          <div className="flex flex-col gap-1.5">
                            <Eyebrow>Why it declined</Eyebrow>
                            <p className="text-[0.82rem] leading-relaxed text-dim">
                              {t.confidence_reasoning}
                            </p>
                          </div>
                        )}

                        {t.related_sources.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <Eyebrow>Related documentation</Eyebrow>
                            <div className="flex flex-wrap gap-1.5">
                              {t.related_sources.map((u) => (
                                <a
                                  key={u}
                                  href={u}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[0.68rem] text-dim transition-colors hover:border-line-bright hover:text-text"
                                >
                                  {(() => {
                                    try {
                                      return new URL(u).pathname.replace(/^\//, "") || u;
                                    } catch {
                                      return u;
                                    }
                                  })()}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {status === "resolved" && !t.agent_answer && (
                          <div className="flex flex-col gap-1 rounded-xl border border-warn/30 bg-warn/8 p-3">
                            <span className="text-[0.8rem] font-medium text-warn">
                              Closed without an answer
                            </span>
                            <p className="text-[0.78rem] leading-relaxed text-dim">
                              Nothing was added to the knowledge base, so this question will
                              escalate again. Reopen it to write the answer.
                            </p>
                          </div>
                        )}

                        {t.agent_answer && (
                          <div className="flex flex-col gap-1.5 rounded-xl border border-good/30 bg-good/8 p-3">
                            <span className="flex items-center gap-2">
                              <Eyebrow>Answered by an agent</Eyebrow>
                              {t.learned && (
                                <span className="rounded-full bg-good/20 px-2 py-0.5 text-[0.62rem] font-semibold text-good">
                                  in the knowledge base
                                </span>
                              )}
                            </span>
                            <p className="text-[0.85rem] leading-relaxed text-dim">
                              {t.agent_answer}
                            </p>
                          </div>
                        )}

                        {status !== "resolved" && (
                          <div className="flex flex-col gap-2">
                            <Eyebrow>Answer this</Eyebrow>
                            <textarea
                              id={`answer-${t.id}`}
                              rows={3}
                              value={drafts[t.id] ?? ""}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [t.id]: e.target.value }))
                              }
                              placeholder="Write the answer a customer should have received…"
                              className="resize-y rounded-xl border border-line bg-raised px-3 py-2.5 text-[0.85rem] leading-relaxed text-text outline-none placeholder:text-faint focus-visible:border-line-bright"
                            />
                            <span className="text-[0.72rem] text-faint">
                              Resolving with an answer adds it to the knowledge base, so the
                              next person asking this gets it without waiting.
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                          {status !== "in_progress" && status !== "resolved" && (
                            <button
                              type="button"
                              disabled={pending === t.id}
                              onClick={() => move(t.id, "in_progress")}
                              className="rounded-full border border-line-bright bg-raised px-3.5 py-1.5 text-[0.76rem] font-medium transition-all duration-300 hover:bg-hover active:scale-95 disabled:opacity-50"
                            >
                              Claim
                            </button>
                          )}
                          {status !== "resolved" && (
                            <button
                              type="button"
                              // Resolving without an answer teaches nothing, which
                              // is the whole point of the queue — so it is blocked
                              // rather than quietly allowed.
                              disabled={pending === t.id || !drafts[t.id]?.trim()}
                              onClick={() => move(t.id, "resolved", drafts[t.id]!.trim())}
                              title={
                                drafts[t.id]?.trim()
                                  ? "Resolve and add this answer to the knowledge base"
                                  : "Write the answer first"
                              }
                              className="rounded-full bg-good/15 px-3.5 py-1.5 text-[0.76rem] font-medium text-good transition-all duration-300 hover:bg-good/25 active:scale-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-faint disabled:ring-1 disabled:ring-line"
                            >
                              Resolve and teach
                            </button>
                          )}
                          {status !== "resolved" && !drafts[t.id]?.trim() && (
                            <button
                              type="button"
                              disabled={pending === t.id}
                              onClick={() => move(t.id, "resolved")}
                              title="Close this without adding anything to the knowledge base"
                              className="rounded-full border border-line px-3.5 py-1.5 text-[0.76rem] font-medium text-faint transition-all duration-300 hover:text-dim active:scale-95 disabled:opacity-50"
                            >
                              Close without answering
                            </button>
                          )}
                          {status === "resolved" && (
                            <button
                              type="button"
                              disabled={pending === t.id}
                              onClick={() => move(t.id, "open")}
                              className="rounded-full border border-line px-3.5 py-1.5 text-[0.76rem] font-medium text-faint transition-all duration-300 hover:text-text active:scale-95 disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          )}
                          {t.judge_model && (
                            <span className="ml-auto font-mono text-[0.66rem] text-faint">
                              judged by {t.judge_model}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
