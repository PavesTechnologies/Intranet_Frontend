export default function ArModuleIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Document (Background) */}
      <path d="M10 2H3v15h8" />
      <path d="M15 7v3" />
      <path d="M10 2l5 5" />
      <path d="M10 2v5h5" />

      {/* Document Lines */}
      <line x1="5" y1="9" x2="13" y2="9" />
      <line x1="5" y1="12" x2="8" y2="12" />

      {/* Calculator (Foreground) */}
      <rect x="11" y="10" width="11" height="12" rx="1.5" />
      <line x1="14" y1="13" x2="19" y2="13" />

      {/* Calculator Buttons (2x2 grid) */}
      <path d="M14 16.5h.01M18 16.5h.01" />
      <path d="M14 19.5h.01M18 19.5h.01" />
    </svg>
  );
}
