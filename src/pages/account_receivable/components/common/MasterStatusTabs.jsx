import React from "react";

/**
 * Subtle segmented status control shared by every Master Data list page:
 * All (n) | Active (n) | Inactive (n). Replaces the old status <select> —
 * the tab itself IS the status filter now.
 * tabs: [{ key, label, count }]
 */
export default function MasterStatusTabs({ tabs, activeKey, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive ? "bg-white text-[#0A0082] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                isActive ? "bg-[#0A0082]/10 text-[#0A0082]" : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
