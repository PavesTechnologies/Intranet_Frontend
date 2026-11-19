import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { ReadinessBadge, StatusBadge } from "./MilestoneBadges";
import { formatDate, formatMoney, formatPercent, isEditable } from "../utils/milestoneUtils";

// Fixed layout: planned column shares (sum = 100%) so space is spread evenly instead of
// following content length. Long text truncates with a tooltip.
const COLUMN_WIDTHS = ["11%", "18%", "14%", "10%", "10%", "10%", "9%", "11%", "7%"];

const SortHeader = ({ column, label, sort, onSort, className = "", align = "left" }) => {
  const active = sort.sortBy === column;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-2.5 ${align === "right" ? "!text-right" : "!text-left"} align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 rounded hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? "text-indigo-600" : "text-slate-300"}`} aria-hidden="true" />
      </button>
    </th>
  );
};

const Th = ({ children, className = "", align = "left" }) => (
  <th
    scope="col"
    className={`px-4 py-2.5 ${align === "right" ? "!text-right" : "!text-left"} align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
  >
    {children}
  </th>
);

const SkeletonRows = () =>
  Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse motion-reduce:animate-none">
      {COLUMN_WIDTHS.map((__, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-3.5 rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  ));

const MilestoneTable = ({ rows, isLoading, isFiltered, sort, onSort, onOpen, onEdit, onDelete, onCreate }) => {
  if (!isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50">
          <Flag className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {isFiltered ? "No milestones match these filters" : "No milestones yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isFiltered
              ? "Try a different status or readiness filter."
              : "Add the delivery milestones for this project and allocate its billing value across them."}
          </p>
        </div>
        {!isFiltered && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add milestone
          </button>
        )}
      </div>
    );
  }

  // The app's global CSS centres every table cell (`table th, table td`), so each cell
  // sets its alignment explicitly: text left, numbers and actions right.
  const td = "px-4 py-3 align-middle !text-left";
  const tdRight = "px-4 py-3 align-middle !text-right";
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] table-fixed divide-y divide-slate-200 text-sm">
        <caption className="sr-only">Project milestones</caption>
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <SortHeader column="milestoneCode" label="Code" sort={sort} onSort={onSort} />
            <SortHeader column="name" label="Milestone" sort={sort} onSort={onSort} />
            <Th>Epic</Th>
            <SortHeader column="plannedDueDate" label="Due" sort={sort} onSort={onSort} />
            <Th>Completed</Th>
            <Th>Status</Th>
            <SortHeader column="allocationPercentage" label="Allocation" sort={sort} onSort={onSort} align="right" />
            <Th>Billing</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <SkeletonRows />
          ) : (
            rows.map((m) => (
              <tr
                key={m.id}
                onClick={() => onOpen(m)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className={`${td} truncate font-mono text-xs text-slate-600`} title={m.milestoneCode}>
                  {m.milestoneCode}
                </td>
                <td className={td}>
                  {/* Real button keeps the row reachable by keyboard; the row itself handles mouse clicks. */}
                  <button
                    type="button"
                    onClick={stop(() => onOpen(m))}
                    className="rounded text-left font-medium text-slate-800 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [overflow-wrap:anywhere]"
                  >
                    {m.name}
                  </button>
                </td>
                <td className={`${td} truncate text-slate-600`} title={m.epicName || undefined}>
                  {m.epicName || <span className="text-slate-400">—</span>}
                </td>
                <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(m.plannedDueDate)}</td>
                <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(m.actualCompletionDate)}</td>
                <td className={td}>
                  <StatusBadge status={m.executionStatus} />
                </td>
                <td className={`${tdRight} whitespace-nowrap`}>
                  {m.billable ? (
                    <>
                      <div className="font-medium text-slate-800 tabular-nums">{formatPercent(m.allocationPercentage)}</div>
                      <div className="text-xs text-slate-500 tabular-nums" title="Estimate from project budget">
                        ≈ {formatMoney(m.estimatedAmount, m.currency)}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">Non-billable</span>
                  )}
                </td>
                <td className={td}>
                  <ReadinessBadge readiness={m.billingReadiness} />
                </td>
                <td className={tdRight}>
                  <div className="inline-flex items-center justify-end gap-1">
                    {isEditable(m) ? (
                      <button
                        type="button"
                        onClick={stop(() => onEdit(m))}
                        aria-label={`Edit ${m.name}`}
                        title="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span
                        role="img"
                        aria-label="Edit unavailable: completed milestones can't be changed"
                        title="Completed milestones can't be changed"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-slate-300"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    {m.canDelete ? (
                      <button
                        type="button"
                        onClick={stop(() => onDelete(m))}
                        aria-label={`Delete ${m.name}`}
                        title="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      // Kept in place (not hidden) so the column stays aligned and the rule is discoverable.
                      <span
                        role="img"
                        aria-label="Delete unavailable: only planned milestones can be deleted"
                        title="Only planned milestones can be deleted"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-slate-300"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MilestoneTable;
