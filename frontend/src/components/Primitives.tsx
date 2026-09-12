import { useEffect, useRef, useState } from "react";

export type Tone = "good" | "warn" | "alert" | "idle" | "silver";

const DOT: Record<Tone, string> = {
  good: "bg-good",
  warn: "bg-warn",
  alert: "bg-alert",
  silver: "bg-silver",
  idle: "bg-faint",
};

/** Status dot. Breathes only while work is genuinely in flight. */
export function StatusDot({ tone, active }: { tone: Tone; active?: boolean }) {
  return (
    <span className="relative grid h-2 w-2 shrink-0 place-items-center">
      {active && (
        <span
          className={`absolute h-2 w-2 rounded-full ${DOT[tone]}`}
          style={{ animation: "breathe 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />
      )}
      <span className={`relative h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
    </span>
  );
}

/**
 * Reveals text progressively.
 *
 * The reply arrives from the API whole, so this is presentation rather than a
 * real token stream — used only for the assistant's own words, so a finished
 * answer reads as it settles instead of appearing as a block.
 */
export function StreamingText({
  text,
  speed = 12,
  onTick,
}: {
  text: string;
  speed?: number;
  onTick?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + 3, text.length);
      setShown(i);
      tick.current?.();
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  const done = shown >= text.length;

  return (
    <span>
      {text.slice(0, shown)}
      {!done && (
        <span
          className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[2px] rounded-full bg-silver align-baseline"
          style={{ animation: "caret 1.05s steps(2) infinite" }}
        />
      )}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.68rem] font-semibold tracking-[0.06em] text-faint uppercase">
      {children}
    </span>
  );
}

/** Panel chrome: rounded, bevelled, with a hairline header. */
export function Panel({
  label,
  right,
  children,
  className = "",
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-2xl border border-line bg-panel bevel ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <Eyebrow>{label}</Eyebrow>
        {right}
      </header>
      {children}
    </section>
  );
}
