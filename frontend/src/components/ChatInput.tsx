import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(resize);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        id="question-input"
        ref={taRef}
        rows={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ask about refunds, webhooks, test cards, payouts…"
        disabled={disabled}
        aria-label="Your question"
      />
      <button type="submit" className="send" disabled={disabled || !value.trim()}>
        {disabled ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M3 10h13M11 5l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span className="send-label">{disabled ? "Working" : "Send"}</span>
      </button>
    </form>
  );
}
