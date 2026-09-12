interface IconProps {
  className?: string;
}

/** Assistant mark: a chassis with an active sensor, drawn on a 24px grid. */
export function BotIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.6v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="2.2" r="1.2" fill="currentColor" />
      <rect
        x="3.4"
        y="5.9"
        width="17.2"
        height="13"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8.7" cy="12" r="1.55" fill="currentColor" className="bot-eye" />
      <circle cx="15.3" cy="12" r="1.55" fill="currentColor" className="bot-eye" />
      <path
        d="M9.6 15.8h4.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M3.4 10.4H1.9m20.2 0h-1.5M3.4 14.2H1.9m20.2 0h-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Retrieval: concentric scan arcs over a target. */
export function ScanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path
        d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M19 5a9.9 9.9 0 0 1 0 14M5 19A9.9 9.9 0 0 1 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

/** Judgement: a balance beam. */
export function JudgeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 4.2v15.4M6.4 19.6h11.2M4 8.2h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8.2" r="1.5" fill="currentColor" />
      <path
        d="M4 8.2 1.8 13.4a2.6 2.6 0 0 0 4.4 0L4 8.2ZM20 8.2l-2.2 5.2a2.6 2.6 0 0 0 4.4 0L20 8.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Routing: one track splitting into two. */
export function RouteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 21v-5.5c0-2.5 1.8-4.2 4-4.6l3.6-.6M12 15.5c0-2.5-1.8-4.2-4-4.6l-3.6-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20.4" cy="9.9" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="3.6" cy="9.9" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="21.4" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="m3.4 8.4 3 3 6.2-6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Escalation: a handoff to a person. */
export function HandoffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="5.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.2 13.4a4.8 4.8 0 0 1 9.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 2.6 1.8 13.2h12.4L8 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6.6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function RetryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M13.4 8a5.4 5.4 0 1 1-1.7-3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.7 1.9v3.1h-3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d="M3.2 10h13M11 4.6 16.4 10 11 15.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6 4.3 4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M6 3h7v7M13 3 6.5 9.5M11 11v2H3V5h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
