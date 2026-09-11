import { useRef, useState, useEffect } from "react";
import "./App.css";
import { askQuestion } from "./api";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageBubble } from "./components/ChatMessageBubble";
import type { ChatMessage } from "./types";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hi! I'm a support assistant for Stripe. Ask me about payments, billing, subscriptions, " +
    "refunds, or webhooks. If I'm not confident in an answer, I'll escalate it to a human instead of guessing.",
};

function newId() {
  return Math.random().toString(36).slice(2);
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = { id: newId(), role: "user", text };
    const pendingId = newId();
    const pendingMsg: ChatMessage = { id: pendingId, role: "assistant", text: "", pending: true };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setIsSending(true);

    try {
      const res = await askQuestion(text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                id: pendingId,
                role: "assistant",
                text: res.answer,
                escalated: res.escalated,
                citations: res.citations,
                confidenceScore: res.confidence_score,
                escalationId: res.escalation_id,
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
                text: "Something went wrong reaching the support assistant. Please try again.",
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Support Assistant</h1>
        <p>Agentic RAG · knows when to escalate</p>
      </header>

      <div className="chat-window" ref={scrollRef}>
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} message={m} />
        ))}
      </div>

      <ChatInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}

export default App;
