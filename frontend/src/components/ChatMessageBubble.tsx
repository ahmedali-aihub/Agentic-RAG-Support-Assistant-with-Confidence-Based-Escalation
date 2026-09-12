import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  AlertIcon,
  BotIcon,
  CheckIcon,
  HandoffIcon,
  LinkIcon,
  RetryIcon,
} from "./Icons";
import type { ChatMessage, Outcome } from "../types";

const OUTCOME_META: Record<
  Outcome,
  { label: string; cls: string; Icon: (p: { className?: string }) => ReactElement }
> = {
  answered: { label: "Answered from docs", cls: "ok", Icon: CheckIcon },
  escalated: { label: "Escalated to a human", cls: "warn", Icon: HandoffIcon },
  unavailable: { label: "Service unavailable", cls: "down", Icon: AlertIcon },
  error: { label: "Request failed", cls: "down", Icon: AlertIcon },
};

const STAGES = ["Searching documentation", "Weighing the evidence", "Deciding the route"];

function sourceLabel(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "") || url;
  } catch {
    return url;
  }
}

/** Counts up to the final score so the number lands with the bar. */
function useCountUp(target: number, run: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 600, 1);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run]);

  return value;
}

function ConfidenceMeter({ score, threshold = 0.6 }: { score: number; threshold?: number }) {
  const shown = useCountUp(score, true);
  const tone = score >= threshold ? "ok" : score > 0 ? "warn" : "down";

  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label">Confidence</span>
        <span className={`meter-value meter-value--${tone}`}>
          {Math.round(shown * 100)}%
        </span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill meter-fill--${tone}`} style={{ width: `${score * 100}%` }} />
        <span className="meter-threshold" style={{ left: `${threshold * 100}%` }} />
      </div>
      <span className="meter-caption">
        Threshold {Math.round(threshold * 100)}% — {score >= threshold ? "cleared" : "not met"}
      </span>
    </div>
  );
}

function PendingBubble() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="row row--bot">
      <span className="avatar avatar--thinking">
        <BotIcon className="avatar-svg" />
      </span>
      <div className="bubble bubble--bot bubble--pending">
        <div className="stages">
          {STAGES.map((label, i) => (
            <div
              key={label}
              className={`stage${i < stage ? " stage--done" : ""}${
                i === stage ? " stage--active" : ""
              }`}
            >
              <span className="stage-node">
                {i < stage ? <CheckIcon className="stage-check" /> : <span className="stage-dot" />}
              </span>
              <span className="stage-label">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="row row--user">
        <div className="bubble bubble--user">{message.text}</div>
      </div>
    );
  }

  if (message.pending) return <PendingBubble />;

  const meta = message.outcome ? OUTCOME_META[message.outcome] : null;
  const retried = (message.attempts ?? 1) > 1;

  return (
    <div className="row row--bot">
      <span className={`avatar${meta ? ` avatar--${meta.cls}` : ""}`}>
        <BotIcon className="avatar-svg" />
      </span>

      <div className={`bubble bubble--bot${meta ? ` bubble--${meta.cls}` : ""}`}>
        {meta && (
          <div className="bubble-head">
            <span className={`chip chip--${meta.cls}`}>
              <meta.Icon className="chip-icon" />
              {meta.label}
            </span>
            <span className="head-meta">
              {retried && (
                <span className="retry-tag" title={`Re-searched as: ${message.rewrittenQuery}`}>
                  <RetryIcon className="retry-icon" />
                  retried
                </span>
              )}
              {message.elapsedMs != null && (
                <span className="elapsed">{(message.elapsedMs / 1000).toFixed(1)}s</span>
              )}
            </span>
          </div>
        )}

        {retried && message.rewrittenQuery && (
          <div className="rewrite-note">
            First search came up short, so it searched again for
            <em>“{message.rewrittenQuery}”</em>
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
              {message.citations.map((url, i) => (
                <a
                  key={url}
                  className="source-link"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {sourceLabel(url)}
                  <LinkIcon className="source-icon" />
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
            {message.servedBy && <span className="served">{message.servedBy}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
