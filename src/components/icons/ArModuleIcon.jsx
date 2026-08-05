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
      {/* Invoice document with a folded corner at the top-left */}
      <path d="M9.5 2H18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5L9.5 2Z" />
      <polyline points="10 2 10 8 4 8" />

      {/* Wavy line */}
      <path d="M7 10.8c.6-.5 1.2.5 1.8 0s1.2-.5 1.8 0 1.2.5 1.8 0" />

      {/* Text lines */}
      <line x1="7" y1="13.4" x2="15" y2="13.4" />
      <line x1="7" y1="15.8" x2="13" y2="15.8" />
      <line x1="7" y1="18.2" x2="11" y2="18.2" />

      {/* Currency badge overlapping the bottom-right corner */}
      <circle cx="18.5" cy="18.5" r="3.2" />

      {/* Rupee */}
      <text
        x="18.5"
        y="19.6"
        textAnchor="middle"
        fontSize="3.2"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="Arial, sans-serif"
      >
        ₹
      </text>
    </svg>
  );
}
