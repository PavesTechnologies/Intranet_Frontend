import React from "react";
import { getChangeTypeConfig } from "../utils/scopeChangeHelpers";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year  = d.getFullYear();
  const time  = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day}/${month}/${year} ${time}`;
};

const getEventDetail = (sc) => {
  switch (sc.changeType) {
    case "ADDED_TO_SPRINT":        return "Added to sprint";
    case "REMOVED_FROM_SPRINT":    return "Removed from sprint";
    case "STORY_POINTS_CHANGED":   return `Points: ${sc.oldStoryPoints ?? "?"} → ${sc.newStoryPoints ?? "?"}`;
    case "STATUS_CHANGED_TO_DONE": return "Marked as done";
    case "STATUS_REOPENED":        return "Reopened";
    default:                       return sc.changeType ?? "—";
  }
};

const ScopeChangeMiniTable = ({ scopeChanges = [] }) => {
  if (scopeChanges.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No scope changes recorded
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Date
            </th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">
              Issue
            </th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">
              Event Type
            </th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">
              Event Detail
            </th>
            <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">
              Inc.
            </th>
            <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">
              Dec.
            </th>
            <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Story Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {scopeChanges.map((sc, i) => {
            const cfg = getChangeTypeConfig(sc.changeType);
            const inc = sc.pointsDelta > 0  ? sc.pointsDelta           : "—";
            const dec = sc.pointsDelta < 0  ? Math.abs(sc.pointsDelta) : "—";
            const pts = sc.newStoryPoints != null ? sc.newStoryPoints   : "—";

            return (
              <tr
                key={sc.id ?? i}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                  {formatDate(sc.changedAt ?? sc.date)}
                </td>
                <td className="px-3 py-2.5 font-medium text-indigo-600 whitespace-nowrap">
                  {sc.issueTitle ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded border whitespace-nowrap
                      ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}
                  >
                    {cfg.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-500">
                  {getEventDetail(sc)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                  {inc}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-red-500">
                  {dec}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                  {pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScopeChangeMiniTable;
