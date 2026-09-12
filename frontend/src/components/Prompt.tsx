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
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
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
    <form
      onSubmit={onSubmit}
      className={`flex shrink-0 items-end gap-2 border-t border-line bg-panel p-2.5 transition-shadow duration-200 ${
        focused ? "glow-signal" : ""
      }`}
    >
      <span
        className={`self-center pl-1 font-mono text-sm transition-colors ${
          focused ? "text-signal" : "text-faint"
        }`}
      >
        ❯
      </span>

      <textarea
        id="agent-prompt"
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
        aria-label="Query the agent"
        placeholder="query the agent — refunds, webhooks, test cards, payouts…"
        className="flex-1 resize-none bg-transparent py-1.5 font-mono text-[0.84rem] leading-relaxed text-text outline-none placeholder:text-faint disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="group shrink-0 border border-signal-dim bg-signal/10 px-3.5 py-2 font-mono text-[0.7rem] font-bold tracking-[0.1em] text-signal transition-all duration-200 hover:bg-signal/20 hover:glow-signal active:scale-95 disabled:border-line disabled:bg-transparent disabled:text-faint disabled:cursor-not-allowed"
      >
        {disabled ? (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full border border-current border-r-transparent"
              style={{ animation: "spin 0.7s linear infinite" }}
            />
            BUSY
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            RUN
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">▸</span>
          </span>
        )}
      </button>
    </form>
  );
}
