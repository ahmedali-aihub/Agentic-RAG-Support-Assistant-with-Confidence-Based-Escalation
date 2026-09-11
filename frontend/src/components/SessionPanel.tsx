import type { ChatMessage } from "../types";

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
  const total = replies.length;

  const answeredPct = total ? (answered / total) * 100 : 0;
  const escalatedPct = total ? (escalated / total) * 100 : 0;
  const downPct = total ? (down / total) * 100 : 0;

  return (
    <aside className="panel">
      <section className="panel-block">
        <h2 className="panel-title">How it decides</h2>
        <ol className="flow">
          <li className="flow-step">
            <span className="flow-num">1</span>
            <div>
              <strong>Retrieve</strong>
              <p>Semantic search over 313 chunks of Stripe documentation.</p>
            </div>
          </li>
          <li className="flow-step">
            <span className="flow-num">2</span>
            <div>
              <strong>Judge</strong>
              <p>An LLM scores whether those chunks actually answer the question.</p>
            </div>
          </li>
          <li className="flow-step flow-step--split">
            <span className="flow-num">3</span>
            <div>
              <strong>Route</strong>
              <p>
                Above the threshold it answers with citations. Below it, the question goes
                to a human instead of being guessed at.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="panel-block">
        <h2 className="panel-title">This session</h2>
        {total === 0 ? (
          <p className="panel-empty">Ask something to see how it routes.</p>
        ) : (
          <>
            <div className="split-bar" role="img" aria-label={`${answered} answered, ${escalated} escalated, ${down} unavailable`}>
              {answeredPct > 0 && (
                <span className="split split--ok" style={{ width: `${answeredPct}%` }} />
              )}
              {escalatedPct > 0 && (
                <span className="split split--warn" style={{ width: `${escalatedPct}%` }} />
              )}
              {downPct > 0 && (
                <span className="split split--down" style={{ width: `${downPct}%` }} />
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
            </dl>
          </>
        )}
      </section>

      <section className="panel-block">
        <h2 className="panel-title">Try these</h2>
        <div className="prompts">
          {PROMPTS.map((p) => (
            <button
              key={p.text}
              type="button"
              className="prompt"
              onClick={() => onPick(p.text)}
              disabled={disabled}
            >
              <span className="prompt-text">{p.text}</span>
              <span className={`prompt-hint prompt-hint--${p.hint === "answerable" ? "ok" : "warn"}`}>
                {p.hint}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
