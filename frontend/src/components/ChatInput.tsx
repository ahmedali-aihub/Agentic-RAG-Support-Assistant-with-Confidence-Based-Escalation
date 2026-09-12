import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { SendIcon } from "./Icons";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
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
      <div className={`field${focused ? " field--focused" : ""}`}>
        <textarea
          id="question-input"
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about refunds, webhooks, test cards, payouts…"
          disabled={disabled}
          aria-label="Your question"
        />
        <kbd className="hint">Enter</kbd>
      </div>

      <button type="submit" className="send" disabled={disabled || !value.trim()}>
        <span className="send-face">
          {disabled ? <span className="spinner" /> : <SendIcon className="send-svg" />}
          <span className="send-label">{disabled ? "Working" : "Send"}</span>
        </span>
      </button>
    </form>
  );
}
