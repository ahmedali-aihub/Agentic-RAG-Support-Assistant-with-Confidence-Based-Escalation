import { JudgeIcon, RouteIcon, ScanIcon } from "./Icons";
import type { ChatMessage } from "../types";

const STEPS = [
  {
    Icon: ScanIcon,
    title: "Retrieve",
    body: "Pulls 20 candidate passages from 313 chunks of Stripe docs, then a cross-encoder reranks them down to the best 5.",
  },
  {
    Icon: JudgeIcon,
    title: "Judge",
    body: "A model reads those passages and scores whether they genuinely answer the question.",
  },
  {
    Icon: RouteIcon,
    title: "Route",
    body: "Clears the bar and it answers with citations. Falls short and it rewrites the search once, then hands off to a human.",
  },
] as const;

const PROMPTS = [
  { text: "How do I issue a partial refund?", hint: "answerable" },
  { text: "What test card number simulates a successful payment?", hint: "answerable" },
  { text: "How do I verify a webhook signature?", hint: "answerable" },
  { text: "Why did my payout pay_9f8e7d fail last night?", hint: "escalates" },
  { text: "Can you reactivate my suspended account?", hint: "escalates" },
] as const;

interface SessionPanelProps {
  messages: ChatMessage[];
  onPick: (q: string) => void;
  disabled: boolean;
}

export function SessionPanel({ messages, onPick, disabled }: SessionPanelProps) {
  const replies = messages.filter((m) => m.role === "assistant" && m.outcome);
  const answered = replies.filter((m) => m.outcome === "answered").length;
  const escalated = replies.filter((m) => m.outcome === "escalated").length;
  const down = replies.filter((m) => m.outcome === "unavailable").length;
  const retries = replies.filter((m) => (m.attempts ?? 1) > 1).length;
  const total = replies.length;

  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <aside className="panel">
      <section className="panel-block">
        <h2 className="panel-title">How it decides</h2>
        <ol className="flow">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li className="flow-step" key={title} style={{ animationDelay: `${i * 90}ms` }}>
              <span className="flow-icon">
                <Icon className="flow-svg" />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel-block">
        <h2 className="panel-title">This session</h2>
        {total === 0 ? (
          <p className="panel-empty">Ask something to see how it routes.</p>
        ) : (
          <>
            <div
              className="split-bar"
              role="img"
              aria-label={`${answered} answered, ${escalated} escalated, ${down} unavailable`}
            >
              {answered > 0 && (
                <span className="split split--ok" style={{ width: `${pct(answered)}%` }} />
              )}
              {escalated > 0 && (
                <span className="split split--warn" style={{ width: `${pct(escalated)}%` }} />
              )}
              {down > 0 && (
                <span className="split split--down" style={{ width: `${pct(down)}%` }} />
              )}
            </div>
            <dl className="stats">
              <div className="stat">
                <dt><span className="key key--ok" />Answered</dt>
                <dd>{answered}</dd>
              </div>
              <div className="stat">
                <dt><span className="key key--warn" />Escalated</dt>
                <dd>{escalated}</dd>
              </div>
              {down > 0 && (
                <div className="stat">
                  <dt><span className="key key--down" />Unavailable</dt>
                  <dd>{down}</dd>
                </div>
              )}
              {retries > 0 && (
                <div className="stat stat--sub">
                  <dt>Searched twice</dt>
                  <dd>{retries}</dd>
                </div>
              )}
            </dl>
          </>
        )}
      </section>

      <section className="panel-block">
        <h2 className="panel-title">Try these</h2>
        <div className="prompts">
          {PROMPTS.map((p, i) => (
            <button
              key={p.text}
              type="button"
              className="prompt"
              onClick={() => onPick(p.text)}
              disabled={disabled}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <span className="prompt-text">{p.text}</span>
              <span
                className={`prompt-hint prompt-hint--${
                  p.hint === "answerable" ? "ok" : "warn"
                }`}
              >
                {p.hint}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
