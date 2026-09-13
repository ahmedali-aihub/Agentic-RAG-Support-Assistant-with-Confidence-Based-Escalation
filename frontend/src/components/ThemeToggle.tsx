import type { Theme } from "../useTheme";

/**
 * Light/dark switch.
 *
 * Both icons ride one rail that slides, so the change reads as a single
 * movement rather than one glyph swapping for another.
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

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full transition-[color,background,border-color,transform] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px active:translate-y-0 active:scale-95 ${shell}`}
    >
      <span
        className="flex flex-col items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: theme === "dark" ? "translateY(-18px)" : "none" }}
      >
        <SunIcon />
        <MoonIcon />
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
    <svg viewBox="0 0 20 20" className="my-[5px] h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="3.4" {...stroke} />
      <path
        d="M10 2.2v1.7M10 16.1v1.7M17.8 10h-1.7M3.9 10H2.2M15.5 4.5l-1.2 1.2M5.7 14.3l-1.2 1.2M15.5 15.5l-1.2-1.2M5.7 5.7 4.5 4.5"
        {...stroke}
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="my-[5px] h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path d="M16.3 12.3A6.9 6.9 0 0 1 7.7 3.7a6.9 6.9 0 1 0 8.6 8.6Z" {...stroke} />
    </svg>
  );
}
