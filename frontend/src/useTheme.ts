import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "support-assistant-theme";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Private windows and blocked storage both throw; fall through.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Shared light/dark preference.
 *
 * The attribute goes on the document root rather than a wrapper so it also
 * reaches the fixed pseudo-element that paints the page ground, which no React
 * subtree contains.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // The preference just won't survive a reload; the page still renders.
    }
  }, [theme]);

  // Follow the OS only while the user has not chosen for themselves.
  useEffect(() => {
    let chosen = false;
    try {
      chosen = localStorage.getItem(KEY) !== null;
    } catch {
      /* treat unreadable storage as no choice made */
    }
    if (chosen) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, toggle };
}
