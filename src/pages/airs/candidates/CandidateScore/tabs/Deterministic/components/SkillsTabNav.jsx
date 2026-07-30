import React from "react";

const TABS = [
  { value: "mandatory", label: "Mandatory Skills" },
  { value: "preferred", label: "Preferred Skills" },
  { value: "missing", label: "Missing Skills" },
  { value: "additional", label: "Additional Skills" },
];

// Rounded-pill segmented control for switching between the Mandatory /
// Preferred / Missing / Additional skill sections of the Deterministic tab —
// same tone as the Skill Ontology module's SkillTabs (blue-600 active state).
export default function SkillsTabNav({ activeTab, onChange, counts = {} }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        const count = counts[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-transparent text-slate-500 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {count !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
