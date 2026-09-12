import { useEffect, useRef, useState } from "react";

export type Tone = "signal" | "warn" | "alert" | "idle";

const DOT_TONE: Record<Tone, string> = {
  signal: "bg-signal",
  warn: "bg-warn",
  alert: "bg-alert",
  idle: "bg-faint",
};

/** Status dot. Pulses only while genuinely active — a resting system reads still. */
export function StatusDot({ tone, active }: { tone: Tone; active?: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONE[tone]}`}
      style={
        active
          ? {
              animation: `${tone === "warn" ? "pulse-ring-warn" : "pulse-ring"} 1.8s ease-out infinite`,
            }
          : undefined
      }
    />
  );
}

/**
 * Reveals text progressively.
 *
 * The answer arrives from the API in one piece, so this is presentation, not a
 * real token stream — it is used only where the agent is "speaking", to make a
 * finished reply legible as it lands rather than appearing as a wall.
 */
export function StreamingText({
  text,
  speed = 9,
  onTick,
}: {
  text: string;
  speed?: number;
  onTick?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      // Several characters per tick: one-at-a-time is too slow to read a real
      // paragraph without feeling like a stunt.
      i = Math.min(i + 3, text.length);
      setShown(i);
      tickRef.current?.();
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
          className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] bg-signal align-baseline"
          style={{ animation: "caret 1s steps(2) infinite" }}
        />
      )}
    </span>
  );
}

/** Uppercase section marker used throughout the console. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.62rem] font-bold tracking-[0.14em] text-faint uppercase">
      {children}
    </span>
  );
}

/** Panel chrome: every boxed region in the console uses this frame. */
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
      className={`flex min-h-0 flex-col border border-line bg-panel/80 backdrop-blur-[2px] ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2">
        <Eyebrow>{label}</Eyebrow>
        {right}
      </header>
      {children}
    </section>
  );
}
