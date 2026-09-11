import type { ChatMessage, Outcome } from "../types";

const OUTCOME_META: Record<Outcome, { label: string; cls: string }> = {
  answered: { label: "Answered from docs", cls: "ok" },
  escalated: { label: "Escalated to a human", cls: "warn" },
  unavailable: { label: "Service unavailable", cls: "down" },
  error: { label: "Request failed", cls: "down" },
};

function sourceLabel(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "") || url;
  } catch {
    return url;
  }
}

function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  // The meter is read alongside the routing decision, so it uses the same
  // semantic colors rather than a separate scale.
  const tone = score >= 0.6 ? "ok" : score > 0 ? "warn" : "down";
  return (
    <div className="meter" title={`Confidence ${pct}%`}>
      <div className="meter-track">
        <div className={`meter-fill meter-fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="meter-value">{pct}%</span>
    </div>
  );
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="row row--user">
        <div className="bubble bubble--user">{message.text}</div>
      </div>
    );
  }

  if (message.pending) {
    return (
      <div className="row row--bot">
        <div className="bubble bubble--bot bubble--pending">
          <span className="dots" aria-label="Thinking">
            <span />
            <span />
            <span />
          </span>
          <span className="pending-label">Retrieving and checking confidence…</span>
        </div>
      </div>
    );
  }

  const meta = message.outcome ? OUTCOME_META[message.outcome] : null;

  return (
    <div className="row row--bot">
      <div className={`bubble bubble--bot${meta ? ` bubble--${meta.cls}` : ""}`}>
        {meta && (
          <div className="bubble-head">
            <span className={`chip chip--${meta.cls}`}>
              <span className="chip-dot" />
              {meta.label}
            </span>
            {message.elapsedMs != null && (
              <span className="elapsed">{(message.elapsedMs / 1000).toFixed(1)}s</span>
            )}
          </div>
        )}

        <p className="bubble-text">{message.text}</p>

        {typeof message.confidenceScore === "number" && (
          <ConfidenceMeter score={message.confidenceScore} />
        )}

        {!!message.citations?.length && (
          <div className="sources">
            <span className="sources-label">Sources</span>
            <div className="sources-list">
              {message.citations.map((url) => (
                <a key={url} className="source-link" href={url} target="_blank" rel="noreferrer">
                  {sourceLabel(url)}
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="source-icon">
                    <path
                      d="M6 3h7v7M13 3 6.5 9.5M11 11v2H3V5h2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {(message.servedBy || message.escalationId) && (
          <div className="bubble-foot">
            {message.escalationId && (
              <span className="ticket">Ticket #{message.escalationId}</span>
            )}
            {message.servedBy && <span className="served">via {message.servedBy}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
