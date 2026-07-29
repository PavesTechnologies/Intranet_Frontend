import React from "react";

// Tab bar only — the parent (CandidateScorePage) owns the selected-tab state
// and lazy-loads the corresponding tab component.
export default function CandidateTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex items-center gap-1 px-5 border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-3 py-2.5 text-[13px] font-semibold relative whitespace-nowrap"
          style={{ color: activeTab === tab.id ? "#2563EB" : "#98A1AF" }}
        >
          {tab.label}
          {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-600" />}
        </button>
      ))}
    </div>
  );
}
