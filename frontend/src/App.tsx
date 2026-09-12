import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { askQuestion } from "./api";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageBubble } from "./components/ChatMessageBubble";
import { SessionPanel } from "./components/SessionPanel";
import { BotIcon, MoonIcon, SunIcon } from "./components/Icons";
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

  const handleSend = useCallback(async (text: string) => {
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
                // A confidence score only means something when a judge ran.
                confidenceScore: outcome === "unavailable" ? null : res.confidence_score,
                escalationId: res.escalation_id,
                servedBy: res.served_by,
                attempts: res.attempts,
                rewrittenQuery: res.rewritten_query,
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
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">
            <BotIcon className="mark-svg" />
          </span>
          <div className="brand-text">
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
          <span className="toggle-inner" data-theme-state={theme}>
            <SunIcon className="toggle-svg toggle-svg--sun" />
            <MoonIcon className="toggle-svg toggle-svg--moon" />
          </span>
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
