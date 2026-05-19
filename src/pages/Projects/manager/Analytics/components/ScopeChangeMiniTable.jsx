import React from "react";
import { getChangeTypeConfig, formatPointsDelta, getDeltaColor } from "../utils/scopeChangeHelpers";

const ScopeChangeMiniTable = ({ scopeChanges = [] }) => {
  const recent = scopeChanges.filter((s) => s.pointsDelta !== 0).slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        No scope changes recorded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recent.map((sc, i) => {
        const cfg = getChangeTypeConfig(sc.changeType);
        return (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium text-indigo-600 truncate">{sc.issueTitle}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-md mt-0.5 border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                {cfg.label}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-sm font-semibold ${getDeltaColor(sc.pointsDelta)}`}>
                {formatPointsDelta(sc.pointsDelta)}
              </span>
              <p className="text-xs text-slate-400">Day {sc.sprintDayNumber}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScopeChangeMiniTable;