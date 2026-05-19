import React from "react";
import { TrendingDown, TrendingUp, BarChart2, GitBranch } from "lucide-react";

const TABS = [
  { id: "burndown", label: "Burndown", icon: TrendingDown },
  { id: "burnup",   label: "Burnup",   icon: TrendingUp },
];

const ChartTabBar = ({ activeChart, onChange }) => (
  <div className="flex items-center gap-2 mb-5">
    {TABS.map(({ id, label, icon: Icon }) => {
      const active = activeChart === id;
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            border transition-all duration-150
            ${active
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"}
          `}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          {label}
        </button>
      );
    })}
  </div>
);

export default ChartTabBar;