import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { askQuestion } from "./api";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageBubble } from "./components/ChatMessageBubble";
import { SessionPanel } from "./components/SessionPanel";
import type { ChatMessage, Outcome } from "./types";
import { useTheme } from "./useTheme";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "I answer Stripe questions from the official documentation. When the docs don't " +
    "actually cover what you asked, I hand the question to a human rather than guessing.",
};

function newId() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const pendingId = newId();
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", text },
        { id: pendingId, role: "assistant", text: "", pending: true },
      ]);
      setIsSending(true);

      const started = performance.now();
      try {
        const res = await askQuestion(text);
        const outcome: Outcome = res.escalated
          ? res.escalation_reason === "service_unavailable"
            ? "unavailable"
            : "escalated"
          : "answered";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: pendingId,
                  role: "assistant",
                  text: res.answer,
                  outcome,
                  citations: res.citations,
                  // A confidence score is only meaningful when a judge ran.
                  confidenceScore: outcome === "unavailable" ? null : res.confidence_score,
                  escalationId: res.escalation_id,
                  servedBy: res.served_by,
                  elapsedMs: performance.now() - started,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: pendingId,
                  role: "assistant",
                  text:
                    "I couldn't reach the support service. Check that the backend is " +
                    "running on port 8000, then try again.",
                  outcome: "error",
                  elapsedMs: performance.now() - started,
                }
              : m
          )
        );
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 3 4 7v5c0 4.4 3.2 8.3 8 9 4.8-.7 8-4.6 8-9V7l-8-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m8.6 12 2.3 2.3 4.5-4.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1>Support Assistant</h1>
            <p>Answers from Stripe docs — or a human when the docs fall short</p>
          </div>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6 4.3 4.3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </header>

      <main className="layout">
        <section className="chat">
          <div className="stream" ref={scrollRef}>
            {messages.map((m) => (
              <ChatMessageBubble key={m.id} message={m} />
            ))}
          </div>
          <ChatInput onSend={handleSend} disabled={isSending} />
        </section>

        <SessionPanel messages={messages} onPick={handleSend} disabled={isSending} />
      </main>
    </div>
  );
}
