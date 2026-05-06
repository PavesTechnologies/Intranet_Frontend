// src/pages/Projects/MyWork/components/TestWorkSection.jsx
import React, { useState } from "react";
import { FlaskConical, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";

const STATUS_LABELS = {
  NOT_STARTED:   { label: "Not Started", color: "text-slate-500 bg-slate-100"  },
  IN_PROGRESS:   { label: "In Progress", color: "text-blue-600 bg-blue-50"     },
  COMPLETED:     { label: "Completed",   color: "text-emerald-600 bg-emerald-50"},
  PASS:          { label: "Pass",        color: "text-emerald-600 bg-emerald-50"},
  FAIL:          { label: "Fail",        color: "text-red-600 bg-red-50"        },
  BLOCKED:       { label: "Blocked",     color: "text-orange-600 bg-orange-50"  },
  NOT_EXECUTED:  { label: "Not Run",     color: "text-slate-500 bg-slate-100"   },
};

const TestItemRow = ({ item }) => {
  const statusCfg = STATUS_LABELS[item.status] || { label: item.status, color: "text-slate-600 bg-slate-100" };
  const isRun     = item.type === "TEST_RUN";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0
      hover:bg-slate-50/70 transition-colors group">

      {/* Type badge */}
      <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold
        ${isRun
          ? "bg-violet-50 text-violet-700 border border-violet-200"
          : "bg-purple-50 text-purple-700 border border-purple-200"
        }`}>
        {isRun ? "Run" : "Case"}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
          <span>{item.projectName}</span>
          {item.cycleName && <><span>·</span><span>{item.cycleName}</span></>}
          {item.runName    && <><span>·</span><span className="truncate">{item.runName}</span></>}
          {isRun && item.remainingCases > 0 && (
            <><span>·</span>
              <span className="text-indigo-600 font-medium">
                {item.remainingCases} cases remaining
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${statusCfg.color}`}>
        {statusCfg.label}
      </span>
    </div>
  );
};

export default function TestWorkSection({ testWork }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!testWork || testWork.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3 shadow-sm">

      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3
          bg-violet-50 hover:bg-violet-100 transition-colors border-b border-violet-100"
      >
        <div className="flex items-center gap-2.5">
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-violet-400" />
            : <ChevronDown  className="w-4 h-4 text-violet-400" />}
          <FlaskConical className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-900">My Test Work</span>
        </div>
        <span className="text-xs text-violet-500 font-medium">
          {testWork.length} item{testWork.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Items */}
      {!collapsed && (
        <>
          {testWork.map((item) => (
            <TestItemRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </>
      )}
    </div>
  );
}