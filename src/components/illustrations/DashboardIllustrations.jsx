/**
 * Home-dashboard illustrations in the Paves palette (navy / indigo / pink).
 * Pure inline SVG — no network assets.
 */

export const PAVES = {
  NAVY: "#0A174E",
  NAVY2: "#263383",
  INDIGO: "#0A0082",
  PINK: "#FF3D72",
  SOFT: "#F4F6FC",
  LINE: "#D5D9EC",
  SKIN: "#F3C6A8",
  HAIR: "#1C1840",
};

/** Small flat calendar + mug scene for the "nobody on leave" empty state. */
export function FullHouseIllustration({ className = "" }) {
  const { NAVY, INDIGO, PINK, SOFT, LINE } = PAVES;
  return (
    <svg viewBox="0 0 140 100" className={className} aria-hidden="true">
      <ellipse cx="70" cy="92" rx="56" ry="5" fill={NAVY} opacity=".07" />
      <rect x="14" y="18" width="70" height="66" rx="9" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <rect x="14" y="18" width="70" height="16" rx="9" fill={INDIGO} />
      <rect x="14" y="27" width="70" height="7" fill={INDIGO} />
      <rect x="28" y="12" width="5" height="12" rx="2.5" fill={NAVY} />
      <rect x="65" y="12" width="5" height="12" rx="2.5" fill={NAVY} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}-${c}`} x={22 + c * 15} y={42 + r * 13} width="9" height="8" rx="2"
          fill={r === 1 && c === 2 ? PINK : SOFT} />
      )))}
      <circle cx="84" cy="74" r="12" fill="#10b981" />
      <path d="M78.5 74.5l4 4 7-7.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="56" width="22" height="26" rx="5" fill="#fff" stroke={LINE} strokeWidth="1.6" />
      <path d="M122 62 q8 0 8 7 t-8 7" fill="none" stroke={LINE} strokeWidth="1.6" />
      <rect x="100" y="62" width="22" height="5" fill={PINK} opacity=".85" />
      <path className="sg-steam" d="M106 50 q-4 -5 0 -9 t0 -9" fill="none" stroke="#B6BCD6" strokeWidth="1.6" strokeLinecap="round" />
      <path className="sg-steam sg-d2" d="M114 50 q-4 -5 0 -9 t0 -9" fill="none" stroke="#B6BCD6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Shared keyframes. Render once per page. */
export function DashboardIllustrationStyles() {
  return (
    <style>{`
      @keyframes sgSteam  { 0%{opacity:0;transform:translateY(3px)} 30%{opacity:.8} 100%{opacity:0;transform:translateY(-10px)} }
      @keyframes hdGrad   { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      .sg-steam{animation:sgSteam 2.6s ease-out infinite both}
      .sg-d2{animation-delay:1.2s}
      .hd-grad-bg{background:linear-gradient(120deg,#FFFFFF 0%,#F1F0FF 40%,#FDEBF2 100%);background-size:200% 200%;animation:hdGrad 18s ease-in-out infinite}

      @media (prefers-reduced-motion:reduce){
        .sg-steam,.hd-grad-bg{animation:none}
      }
    `}</style>
  );
}
