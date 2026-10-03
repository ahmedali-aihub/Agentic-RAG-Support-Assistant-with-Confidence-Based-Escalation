import { useEffect, useState } from "react";
import { lookupTicketStatus } from "../api";
import { IconAnswer, IconEscalate, IconShield } from "../landing/TiIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../useTheme";
import type { TicketStatusPublic } from "../types";

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; ticket: TicketStatusPublic }
  | { kind: "not_found" }
  | { kind: "error" };

const STATUS_COPY: Record<TicketStatusPublic["status"], { label: string; note: string }> = {
  open: {
    label: "Waiting for a person",
    note: "Your question is in the queue. Nobody has picked it up yet.",
  },
  in_progress: {
    label: "Someone is on it",
    note: "A member of the support team is looking into this now.",
  },
  resolved: {
    label: "Answered",
    note: "A member of the support team has answered your question below.",
  },
};

/** Pulls a ticket id out of the hash, e.g. "#/ticket/ab12cd34" -> "ab12cd34". */
function idFromHash(): string {
  const match = window.location.hash.match(/^#\/ticket\/?(.*)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export default function TicketStatus() {
  const { theme, toggle } = useTheme();
  const [id, setId] = useState(idFromHash);
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  async function lookup(ticketId: string) {
    const trimmed = ticketId.trim();
    if (!trimmed) return;

    setState({ kind: "loading" });
    try {
      const ticket = await lookupTicketStatus(trimmed);
      setState(ticket ? { kind: "found", ticket } : { kind: "not_found" });
    } catch {
      setState({ kind: "error" });
    }
  }

  // A link like #/ticket/ab12cd34 (e.g. from the chat's escalation message)
  // looks itself up immediately rather than waiting on the form.
  useEffect(() => {
    const initial = idFromHash();
    if (initial) void lookup(initial);
    // Only on mount: typing in the field afterward is driven by the form, not the hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ti-ground min-h-svh text-ti-ink antialiased">
      <header className="sticky top-0 z-40 nav-fill hairline border-b backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <a href="#/" className="flex items-center gap-2.5">
            <span className="graphite grid h-7 w-7 place-items-center rounded-lg">
              <IconShield className="h-4 w-4" />
            </span>
            <span className="text-[0.9rem] font-semibold tracking-[-0.02em]">Support Assistant</span>
          </a>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <h1 className="ink text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          Check your ticket
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-ti-body">
          Enter the ticket number from your escalation message to see whether it&rsquo;s been
          picked up, and read the answer once there is one.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(id);
          }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            id="ticket-id-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. ab12cd34"
            autoComplete="off"
            spellCheck={false}
            className="glass-sm h-12 flex-1 rounded-full px-5 font-mono text-[0.92rem] text-ti-ink outline-none placeholder:font-sans placeholder:text-ti-mute"
          />
          <button
            type="submit"
            disabled={!id.trim() || state.kind === "loading"}
            className="graphite h-12 shrink-0 rounded-full px-7 text-[0.92rem] font-medium whitespace-nowrap transition-[transform,box-shadow,background] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {state.kind === "loading" ? "Checking…" : "Check status"}
          </button>
        </form>

        <div className="mt-8">
          {state.kind === "not_found" && (
            <div className="glass-sm rounded-2xl px-6 py-5">
              <p className="text-[0.95rem] font-medium text-ti-ink">No ticket found</p>
              <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ti-mute">
                Double-check the ticket number from your escalation message. It&rsquo;s the
                short code shown after &ldquo;Ticket #&rdquo;.
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="glass-sm rounded-2xl px-6 py-5">
              <p className="text-[0.95rem] font-medium text-ti-ink">Couldn&rsquo;t check that</p>
              <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ti-mute">
                The support service may be unreachable right now. Try again in a moment.
              </p>
            </div>
          )}

          {state.kind === "found" && (
            <div className="glass rounded-[22px] px-6 py-6 sm:px-7 sm:py-7">
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    state.ticket.status === "resolved" ? "graphite" : "fill-3"
                  }`}
                >
                  {state.ticket.status === "resolved" ? (
                    <IconAnswer className="h-4 w-4" />
                  ) : (
                    <IconEscalate className="h-4 w-4 text-ti-mute" />
                  )}
                </span>
                <div>
                  <p className="text-[0.95rem] font-semibold text-ti-ink">
                    {STATUS_COPY[state.ticket.status].label}
                  </p>
                  <p className="font-mono text-[0.72rem] text-ti-mute">#{state.ticket.id}</p>
                </div>
              </div>

              <p className="mt-4 text-[0.88rem] leading-relaxed text-ti-mute">
                {STATUS_COPY[state.ticket.status].note}
              </p>

              <div className="mt-5 border-t border-ti-500/25 pt-5">
                <p className="text-[0.7rem] font-semibold tracking-[0.1em] text-ti-mute uppercase">
                  Your question
                </p>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ti-ink">
                  {state.ticket.question}
                </p>
              </div>

              {state.ticket.answer && (
                <div className="mt-5 border-t border-ti-500/25 pt-5">
                  <p className="text-[0.7rem] font-semibold tracking-[0.1em] text-ti-mute uppercase">
                    Answer
                  </p>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ti-ink">
                    {state.ticket.answer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
