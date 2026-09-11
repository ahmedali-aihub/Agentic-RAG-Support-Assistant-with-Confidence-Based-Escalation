import type { ChatMessage } from "../types";

function hostnameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`bubble-row ${isUser ? "bubble-row--user" : "bubble-row--assistant"}`}>
      <div className={`bubble ${isUser ? "bubble--user" : "bubble--assistant"}`}>
        {message.pending ? (
          <span className="typing-dots" aria-label="Thinking">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <>
            {!isUser && message.escalated && (
              <div className="badge badge--escalated">Escalated to human support</div>
            )}
            {!isUser && !message.escalated && message.confidenceScore != null && (
              <div className="badge badge--confident">
                Confidence: {(message.confidenceScore * 100).toFixed(0)}%
              </div>
            )}
            <p className="bubble-text">{message.text}</p>
            {!!message.citations?.length && (
              <div className="citations">
                <span className="citations-label">Sources</span>
                <ul>
                  {message.citations.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {hostnameOf(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
