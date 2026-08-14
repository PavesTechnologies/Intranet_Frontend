import React from "react";
import classNames from "classnames";
import { TableSkeleton } from "./Loaders";
import EmptyState from "./EmptyState";

// Canonical table shell for future module migrations. `columns` is
// [{ key, header, render?, className? }]; `rows` is an array of records.
// This intentionally does not wrap @tanstack/react-table or replace any
// existing page-specific table — see docs/ui/phase-1-canonical-ui.md.
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  emptyTitle = "No data",
  emptyDescription,
  getRowKey,
  onRowClick,
  className = "",
}) {
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length || 4} className={className} />;
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={classNames("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={classNames(
                  "border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={classNames(
                "border-b border-gray-100 text-sm text-gray-700 last:border-b-0 hover:bg-gray-50",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={classNames("px-4 py-3", col.className)}>
                  {col.render ? col.render(row, rowIndex) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
