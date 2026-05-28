import React, { useState, useMemo } from "react";
import { getChangeTypeConfig } from "../utils/scopeChangeHelpers";
import Pagination from "../../../../../components/Pagination/pagination";

const PAGE_SIZE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year  = d.getFullYear();
  const time  = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day}/${month}/${year} ${time}`;
};

const toDateKey = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString().slice(0, 10); // "YYYY-MM-DD"
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
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");

  const filtered = useMemo(() => {
    if (!fromDate && !toDate) return scopeChanges;
    return scopeChanges.filter((sc) => {
      const key = toDateKey(sc.changedAt ?? sc.date);
      if (!key) return true;
      if (fromDate && key < fromDate) return false;
      if (toDate   && key > toDate)   return false;
      return true;
    });
  }, [scopeChanges, fromDate, toDate]);

  const handleFromDate = (e) => {
    setFromDate(e.target.value);
    setCurrentPage(1);
  };

  const handleToDate = (e) => {
    setToDate(e.target.value);
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const isFiltered   = fromDate || toDate;
  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const startIndex   = (currentPage - 1) * PAGE_SIZE;
  const pageRows     = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-medium text-slate-500">Filter by date:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-400">From</label>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={handleFromDate}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-400">To</label>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={handleToDate}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {isFiltered && (
          <button
            onClick={clearFilter}
            className="text-xs px-2 py-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 transition-colors"
          >
            Clear
          </button>
        )}
        {isFiltered && (
          <span className="text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          {scopeChanges.length === 0 ? "No scope changes recorded" : "No results for the selected date range"}
        </div>
      ) : (
        <>
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
                    Epic
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
                {pageRows.map((sc, i) => {
                  const cfg = getChangeTypeConfig(sc.changeType);
                  const inc = sc.pointsDelta > 0  ? sc.pointsDelta           : "—";
                  const dec = sc.pointsDelta < 0  ? Math.abs(sc.pointsDelta) : "—";
                  const pts = sc.newStoryPoints != null ? sc.newStoryPoints   : "—";

                  return (
                    <tr
                      key={sc.id ?? startIndex + i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatDate(sc.changedAt ?? sc.date)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-indigo-600 whitespace-nowrap">
                        {sc.issueTitle ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-violet-600 whitespace-nowrap">
                        {sc.epicName ?? <span className="text-slate-300">—</span>}
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

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ScopeChangeMiniTable;
