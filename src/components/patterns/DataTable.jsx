import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import classNames from "classnames";
import { TableSkeleton } from "./Loaders";
import EmptyState from "./EmptyState";

// Canonical table shell — the shared visual language for every table across
// the app (indigo gradient header, rounded outer corners, zebra body rows),
// matching the established GenericTable/LeaveTable presentation. `columns`
// is [{ key, header, render?, className?, sticky? }]; `rows` is an array of
// records. This intentionally does not wrap @tanstack/react-table or replace
// any existing page-specific table — see docs/ui/phase-1-canonical-ui.md.
//
// Row selection (`selectable`) is opt-in and controlled: the caller owns
// `selectedRowKeys` (a Set of whatever `getRowKey(row, rowIndex)` returns)
// and receives the next Set via `onSelectedRowKeysChange`. "Select all"
// only ever affects the rows currently passed in `rows` (the current
// page/filtered view) — DataTable has no opinion on cross-page selection;
// a caller that wants selections to survive a page change simply keeps
// those keys in the Set it owns. See docs/ui/phase-2-leave-management.md
// ("P1.2 — DataTable Row Selection Enhancement") for the rationale.
//
// Sticky columns (`col.sticky: "left" | "right"`) are opt-in per column.
// Left offsets stack after the selection column (if any); right offsets
// stack from the table's right edge inward. Offsets are measured from the
// actual rendered header-cell widths (not hardcoded), since real column
// widths vary with content — see "P1.5 — DataTable Sticky Columns
// Enhancement" in docs/ui/phase-2-leave-management.md for the rationale
// and the repository evidence this was built from.
const SHELL_CLASSNAME =
  "w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm";

const SELECT_COL_KEY = "__select__";

function SelectAllCheckbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label="Select all rows"
      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
    />
  );
}

export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  emptyTitle = "No data",
  emptyDescription,
  getRowKey,
  onRowClick,
  className = "",
  selectable = false,
  selectedRowKeys,
  onSelectedRowKeysChange,
}) {
  // `rows = []` above only covers an omitted/undefined prop; a caller that
  // explicitly passes null/undefined (e.g. before its first fetch resolves)
  // must still get a header-visible empty state, not a crash on rows.length.
  rows = Array.isArray(rows) ? rows : [];
  // Sticky-column offset measurement. Hooks must run unconditionally (before
  // the loading/empty early returns below), so this always executes; the
  // effect itself is a no-op whenever there's no table to measure.
  const headerCellRefs = useRef({});
  const [stickyOffsets, setStickyOffsets] = useState({});
  const leftStickyCols = columns.filter((col) => col.sticky === "left");
  const rightStickyCols = columns.filter((col) => col.sticky === "right");
  const hasStickyCols = leftStickyCols.length > 0 || rightStickyCols.length > 0;

  const setHeaderRef = (key) => (el) => {
    headerCellRefs.current[key] = el;
  };

  useLayoutEffect(() => {
    if (!hasStickyCols || loading || !rows.length) return;

    const widthOf = (key) => headerCellRefs.current[key]?.getBoundingClientRect().width || 0;
    const nextOffsets = {};

    let runningLeft = selectable ? widthOf(SELECT_COL_KEY) : 0;
    if (selectable) nextOffsets[SELECT_COL_KEY] = 0;
    leftStickyCols.forEach((col) => {
      nextOffsets[col.key] = runningLeft;
      runningLeft += widthOf(col.key);
    });

    let runningRight = 0;
    [...rightStickyCols].reverse().forEach((col) => {
      nextOffsets[col.key] = runningRight;
      runningRight += widthOf(col.key);
    });

    setStickyOffsets(nextOffsets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStickyCols, loading, rows, selectable, columns]);

  if (loading) {
    return (
      <div className={classNames(SHELL_CLASSNAME, className)}>
        <TableSkeleton rows={5} columns={columns.length || 4} />
      </div>
    );
  }

  const keyOf = (row, rowIndex) => (getRowKey ? getRowKey(row, rowIndex) : rowIndex);
  const lastLeftStickyKey = leftStickyCols[leftStickyCols.length - 1]?.key;
  const firstRightStickyKey = rightStickyCols[0]?.key;

  const stickyHeaderCellProps = (key, side) => ({
    ref: setHeaderRef(key),
    style: { position: "sticky", [side]: stickyOffsets[key] ?? 0, zIndex: 20 },
    className: classNames(
      "bg-indigo-900",
      side === "left" && key === lastLeftStickyKey && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.25)]",
      side === "right" && key === firstRightStickyKey && "shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.25)]"
    ),
  });

  const stickyBodyCellProps = (key, side, rowIndex) => ({
    style: { position: "sticky", [side]: stickyOffsets[key] ?? 0, zIndex: 10 },
    className: classNames(
      rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50",
      "group-hover:bg-indigo-50",
      side === "left" && key === lastLeftStickyKey && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]",
      side === "right" && key === firstRightStickyKey && "shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.15)]"
    ),
  });
  const selectedKeys = selectedRowKeys || new Set();
  const visibleKeys = selectable ? rows.map((row, rowIndex) => keyOf(row, rowIndex)) : [];
  const selectedVisibleCount = visibleKeys.filter((key) => selectedKeys.has(key)).length;
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleAll = (checked) => {
    if (!onSelectedRowKeysChange) return;
    const next = new Set(selectedKeys);
    visibleKeys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
    onSelectedRowKeysChange(next);
  };

  const toggleRow = (key, checked) => {
    if (!onSelectedRowKeysChange) return;
    const next = new Set(selectedKeys);
    if (checked) next.add(key);
    else next.delete(key);
    onSelectedRowKeysChange(next);
  };

  return (
    <div className={classNames(SHELL_CLASSNAME, className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900">
              {selectable && (
                <th
                  className={classNames(
                    "w-10 px-4 py-3 text-center",
                    hasStickyCols && stickyHeaderCellProps(SELECT_COL_KEY, "left").className
                  )}
                  ref={hasStickyCols ? setHeaderRef(SELECT_COL_KEY) : undefined}
                  style={hasStickyCols ? stickyHeaderCellProps(SELECT_COL_KEY, "left").style : undefined}
                >
                  <SelectAllCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => {
                const sticky = col.sticky === "left" || col.sticky === "right" ? col.sticky : null;
                const stickyProps = sticky ? stickyHeaderCellProps(col.key, sticky) : null;
                return (
                  <th
                    key={col.key}
                    ref={stickyProps?.ref}
                    style={stickyProps?.style}
                    className={classNames(
                      "px-4 py-3 text-sm font-semibold text-white",
                      stickyProps?.className,
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8">
                  <div className="flex w-full items-center justify-center">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const key = keyOf(row, rowIndex);
                const isSelected = selectable && selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={classNames(
                      "group border-b border-gray-100 text-sm text-gray-700 last:border-b-0 transition-colors",
                      rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50",
                      "hover:bg-indigo-50",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td
                        className={classNames(
                          "w-10 px-4 py-3 text-center",
                          hasStickyCols && stickyBodyCellProps(SELECT_COL_KEY, "left", rowIndex).className
                        )}
                        style={hasStickyCols ? stickyBodyCellProps(SELECT_COL_KEY, "left", rowIndex).style : undefined}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(key, e.target.checked)}
                          aria-label="Select row"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const sticky = col.sticky === "left" || col.sticky === "right" ? col.sticky : null;
                      const stickyProps = sticky ? stickyBodyCellProps(col.key, sticky, rowIndex) : null;
                      return (
                        <td
                          key={col.key}
                          style={stickyProps?.style}
                          className={classNames("px-4 py-2", stickyProps?.className, col.className)}
                        >
                          {col.render ? col.render(row, rowIndex) : row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
