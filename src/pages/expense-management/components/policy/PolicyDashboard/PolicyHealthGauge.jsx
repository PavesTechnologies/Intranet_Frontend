import React from "react";

export default function PolicyHealthGauge({ percentage = 0, label = "Policy Health", sublabel, loading = false }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 80 ? "#16a34a" : clamped >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {!loading && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {loading ? (
            <div className="h-6 w-10 animate-pulse rounded bg-gray-100" />
          ) : (
            <span className="text-2xl font-bold text-gray-900">{Math.round(clamped)}%</span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sublabel && <p className="mt-1 text-xs text-gray-400">{sublabel}</p>}
      </div>
    </div>
  );
}
