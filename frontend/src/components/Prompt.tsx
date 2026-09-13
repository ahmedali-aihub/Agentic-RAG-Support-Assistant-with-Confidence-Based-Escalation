import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

export function Prompt({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // Floored at one line so a single-line field matches the send button's
    // height exactly, and capped so a long question scrolls instead of
    // pushing the transcript off screen.
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), 132)}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(resize);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 px-4 pt-2 pb-5">
      <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-3xl items-end gap-2.5">
        <div
          className={`flex min-h-12 flex-1 items-center rounded-2xl border bg-raised transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            focused ? "border-line-bright bevel-lift" : "border-line bevel"
          }`}
        >
          <textarea
            id="question-input"
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            aria-label="Your question"
            placeholder="Ask about refunds, webhooks, test cards, payouts…"
            className="flex-1 resize-none bg-transparent px-4 py-3 text-[0.92rem] leading-6 text-text outline-none placeholder:text-faint disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          // Working and empty are both disabled, but only one is inert — the
          // busy button keeps its metal face so the spinner reads against it.
          className={`send-btn group${disabled ? " send-btn--busy" : ""}`}
          aria-label={disabled ? "Working" : "Send"}
        >
          <span className="send-btn__face">
            {disabled ? (
              <span className="send-btn__spinner" />
            ) : (
              <svg viewBox="0 0 20 20" className="send-btn__arrow" aria-hidden="true">
                <path
                  d="M4 10h11M10 5l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
