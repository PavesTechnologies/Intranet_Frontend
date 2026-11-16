import React from "react";

export default function ScoreRing({ value, size = 44, color = "#2563EB", label, decimals = 1 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1F6" strokeWidth="5" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-900">{Number(value).toFixed(decimals)}</span>
      {label && <span className="absolute -bottom-4 text-[9px] font-medium text-slate-400">{label}</span>}
    </div>
  );
}
