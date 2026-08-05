import React from "react";

const TABS = [
  { value: "verified", label: "Verified Skills" },
  { value: "unknown", label: "Unknown Skills" },
];

// Modern rounded-pill segmented control (Linear/GitHub style) — purely a
// display/onChange pair, matching this module's existing tone (blue-600
// active state, same as the Skill Detail page's tab underline and the
// Show-inactive toggle elsewhere in this module).
export default function SkillTabs({ activeTab, onChange }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200 mb-6">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-transparent text-slate-500 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
