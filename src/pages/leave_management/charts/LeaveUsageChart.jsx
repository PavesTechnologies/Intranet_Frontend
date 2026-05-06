import { useState, useEffect } from "react";

const LEAVE_THEMES = {
  EARNED_LEAVE:       { from: "#34d399", to: "#059669", bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200" },
  SICK_LEAVE:         { from: "#f87171", to: "#dc2626", bg: "bg-red-50",      text: "text-red-700",      ring: "ring-red-200"     },
  COMPENSATORY_LEAVE: { from: "#60a5fa", to: "#2563eb", bg: "bg-blue-50",     text: "text-blue-700",     ring: "ring-blue-200"    },
  UNPAID_LEAVE:       { from: "#a8a29e", to: "#57534e", bg: "bg-stone-50",    text: "text-stone-700",    ring: "ring-stone-200"   },
  DEFAULT:            { from: "#a78bfa", to: "#7c3aed", bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200"  },
};

function ArcRing({ pct, from, to, size = 110, stroke = 10 }) {
  const [displayed, setDisplayed] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 100) * circ;
  const id = `grad-${from.replace("#", "")}`;

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#f1f5f9" strokeWidth={stroke} />
      {/* Progress */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${id})`} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

export default function LeaveUsageChart({ leave }) {
  const { accruedLeaves, usedLeaves, leaveType, remainingLeaves, totalLeaves } = leave;
  const leaveName = leaveType?.leaveName ?? "DEFAULT";
  const isUnpaid = leaveName === "UNPAID_LEAVE";
  const isCompOff = leaveName === "COMPENSATORY_LEAVE";
  const theme = LEAVE_THEMES[leaveName] ?? LEAVE_THEMES.DEFAULT;

  const remaining = Math.max(remainingLeaves, 0);
  const pct = isUnpaid ? 100 : accruedLeaves > 0 ? Math.round(((accruedLeaves - usedLeaves) / accruedLeaves) * 100) : 100;

  return (
  <div className="py-2">
    {/* ✅ flex-col on small cards, flex-row only when card is wide enough */}
    <div className="flex flex-col items-center gap-3 [@media(min-width:320px)]:flex-row [@media(min-width:320px)]:items-center">

      {/* Ring — fixed size, never shrinks */}
      <div className="relative flex-shrink-0">
        <ArcRing pct={pct} from={theme.from} to={theme.to} size={88} stroke={8} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {isUnpaid ? (
            <span className="text-base font-bold text-stone-700">∞</span>
          ) : (
            <>
              <span className="text-sm font-bold text-gray-800 leading-none">{usedLeaves}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">of {accruedLeaves}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats — takes remaining width, never overflows */}
      <div className="w-full flex-1 space-y-2.5 min-w-0 overflow-hidden">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Used</span>
            <span className="text-xs font-semibold text-gray-700 tabular-nums">{usedLeaves} days</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: isUnpaid || !accruedLeaves ? "0%" : `${Math.min((usedLeaves / accruedLeaves) * 100, 100)}%`,
                background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
              }} />
          </div>
        </div>

        {!isCompOff && !isUnpaid && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Accrued</span>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">{accruedLeaves} days</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 opacity-40"
                style={{
                  width: totalLeaves > 0 ? `${Math.min((accruedLeaves / totalLeaves) * 100, 100)}%` : "0%",
                  background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                }} />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</span>
          <span className="text-xs font-semibold text-gray-700 tabular-nums">
            {isUnpaid ? "∞" : `${remaining.toFixed(2)} days`}
          </span>
        </div>
      </div>
    </div>
  </div>
);
}