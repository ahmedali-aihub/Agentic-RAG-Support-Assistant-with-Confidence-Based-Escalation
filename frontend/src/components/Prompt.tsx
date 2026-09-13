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
          className="group grid aspect-square h-12 w-12 shrink-0 place-items-center self-end rounded-2xl bg-silver text-black shadow-[0_2px_10px_-3px_rgba(232,232,237,0.5)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:shadow-[0_4px_18px_-4px_rgba(255,255,255,0.6)] active:scale-[0.93] disabled:border disabled:border-line disabled:bg-transparent disabled:text-faint disabled:shadow-none disabled:cursor-not-allowed"
          aria-label={disabled ? "Working" : "Send"}
        >
          {disabled ? (
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : (
            <svg viewBox="0 0 20 20" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">
              <path
                d="M3.5 10h12M10.5 5l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
