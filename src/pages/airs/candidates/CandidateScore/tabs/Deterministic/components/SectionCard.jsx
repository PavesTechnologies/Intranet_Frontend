import React from "react";

// Shared clean/modern card shell for the Deterministic tab's lower sections
// (Hierarchy Matches, Validation, Score Calculation, Configuration, raw
// JSON) — icon chip + title on top, consistent rounded-2xl/shadow-sm frame.
export default function SectionCard({ icon: Icon, title, action, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <Icon size={14} />
            </div>
          )}
          <span className="text-[12.5px] font-bold text-slate-900">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
