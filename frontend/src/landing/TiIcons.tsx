interface P {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconRetrieve({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="10.6" cy="10.6" r="6.1" {...base} />
      <path d="m15.2 15.2 4.3 4.3" {...base} />
      <path d="M7.8 9.4h5.6M7.8 12.2h3.6" {...base} opacity="0.55" />
    </svg>
  );
}

export function IconJudge({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 4.4v15M6.4 19.4h11.2M4.2 8.2h15.6" {...base} />
      <circle cx="12" cy="8.2" r="1.3" fill="currentColor" />
      <path d="M4.2 8.2 2.1 13a2.4 2.4 0 0 0 4.2 0L4.2 8.2Z" {...base} />
      <path d="M19.8 8.2 17.7 13a2.4 2.4 0 0 0 4.2 0l-2.1-4.8Z" {...base} />
    </svg>
  );
}

export function IconRewrite({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M20 11.4a8 8 0 1 1-2.5-5.8" {...base} />
      <path d="M20.3 3.6v4.2h-4.2" {...base} />
    </svg>
  );
}

export function IconAnswer({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4.4 6.6A2.2 2.2 0 0 1 6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v7.6a2.2 2.2 0 0 1-2.2 2.2H9.6L5.6 19.6v-3.2h-1a.2.2 0 0 1-.2-.2V6.6Z" {...base} />
      <path d="m8.9 10.4 2.1 2.1 4.1-4.3" {...base} strokeWidth="1.7" />
    </svg>
  );
}

export function IconEscalate({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.3" {...base} />
      <path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0" {...base} />
    </svg>
  );
}

export function IconDoc({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6.6 3.6h7.2l4.2 4.2v12.6H6.6z" {...base} />
      <path d="M13.6 3.6v4.4h4.4" {...base} />
      <path d="M9.6 12.4h6M9.6 15.6h4" {...base} opacity="0.55" />
    </svg>
  );
}

export function IconGuess({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" {...base} />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5" {...base} />
      <circle cx="12" cy="16.6" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function IconShield({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.4 5.2 6.6v5.1c0 3.9 2.8 7.4 6.8 8.3 4-.9 6.8-4.4 6.8-8.3V6.6L12 3.4Z" {...base} />
      <path d="m9.1 12 2 2 3.9-4.2" {...base} strokeWidth="1.7" />
    </svg>
  );
}

export function IconArrow({ className }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M4 10h11M10 5.2 14.8 10 10 14.8" {...base} strokeWidth="1.6" />
    </svg>
  );
}
