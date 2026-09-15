import type { Theme } from "../useTheme";

/**
 * Light/dark switch.
 *
 * Both icons ride one rail that slides, so the change reads as a single
 * movement rather than one glyph swapping for another. Each icon fills a full
 * button-sized cell and the rail travels exactly one cell, so the travel can't
 * drift out of step with the icon box the way a hand-tuned offset does.
 */
export function ThemeToggle({
  theme,
  onToggle,
  tone = "titanium",
}: {
  theme: Theme;
  onToggle: () => void;
  tone?: "titanium" | "console";
}) {
  const shell =
    tone === "console"
      ? "border border-line bg-raised text-dim hover:border-line-bright hover:text-text"
      : "glass-sm text-ti-body hover:text-ti-ink";

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full transition-[color,background,border-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px active:translate-y-0 active:scale-95 ${shell}`}
    >
      <span
        className="flex h-9 w-9 flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: theme === "dark" ? "translateY(-100%)" : "none" }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center">
          <SunIcon />
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center">
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" aria-hidden="true">
      <circle cx="10" cy="10" r="3.4" {...stroke} />
      <path
        d="M10 2.4v1.6M10 16v1.6M17.6 10H16M4 10H2.4M15.4 4.6l-1.1 1.1M5.7 14.3l-1.1 1.1M15.4 15.4l-1.1-1.1M5.7 5.7 4.6 4.6"
        {...stroke}
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M16.1 12.2A6.8 6.8 0 0 1 7.8 3.9a6.8 6.8 0 1 0 8.3 8.3Z" {...stroke} />
    </svg>
  );
}
