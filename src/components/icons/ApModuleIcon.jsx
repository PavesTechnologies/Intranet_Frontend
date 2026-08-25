export default function ApModuleIcon({ className = "h-5 w-5" }) {
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
      {/* Wallet body — distinct silhouette from ArModuleIcon's invoice sheet */}
      <rect x="2" y="7" width="15" height="12" rx="2" />
      <path d="M2 10.5h15" />
      <circle cx="13" cy="14" r="1.3" fill="currentColor" stroke="none" />

      {/* Large outgoing-payment arrow, exiting the wallet — money leaving vs AR's incoming ₹ */}
      <path d="M16.5 8L22 2.5M22 2.5V6.5M22 2.5H18" />
    </svg>
  );
}
