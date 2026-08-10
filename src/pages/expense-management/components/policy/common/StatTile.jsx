import React from "react";

const ACCENTS = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function StatTile({ icon, label, value, accent = "indigo", hint, loading = false }) {
  const palette = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`shrink-0 rounded-lg p-3 ${palette.bg} ${palette.text}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        {loading ? (
          <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-100" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        )}
        {hint && !loading && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}
