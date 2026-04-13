import React from "react";
import { Eye, ArrowRightCircle, Pencil, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import LoadingSpinner from "../../../components/LoadingSpinner";

const STATUS_STYLES = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "Not Requested": "border-slate-200 bg-slate-100 text-slate-700",
  "Pending Approval": "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-blue-200 bg-blue-50 text-blue-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  Fulfilled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-700",
};

const IMPACT_STYLES = {
  Low: "border-teal-200 bg-teal-50 text-teal-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-rose-200 bg-rose-50 text-rose-700",
};

const renderBadge = (label, map) => (
  <Badge className={cn("text-[11px] font-semibold", map[label] || "border-gray-200 bg-gray-50 text-gray-700")}>
    {label}
  </Badge>
);

const getPmExtraColumnConfig = (pmTab) => {
  if (pmTab === "fulfilled") {
    return {
      header: "Effective Date",
      renderCell: (row) => <span className="font-medium text-gray-800">{row.effectiveDate || "-"}</span>,
    };
  }

  if (pmTab === "process") {
    return {
      header: "Role-Off Status",
      renderCell: (row) => renderBadge(row.roleOffStatus || "Not Requested", STATUS_STYLES),
    };
  }

  return {
    header: "Demand Skills",
    renderCell: (row) => <span className="text-gray-700">{row.skill || "-"}</span>,
  };
};

const RoleOffTable = ({
  mode,
  pmTab = "active",
  rows,
  hasActiveFilters = false,
  selectedRows = [],
  activeRowId,
  onToggleRow,
  onToggleAll,
  onAction,
  onRowClick,
  loading,
}) => {
  const showPmCheckboxes = mode === "pm" && pmTab === "active";
  const showSelectionCheckboxes = mode !== "pm" || pmTab === "active";
  const allSelected = rows.length > 0 && rows.every((row) => selectedRows.includes(row.id));
  const anySelected = rows.some((row) => selectedRows.includes(row.id));
  const pmExtraColumn = getPmExtraColumnConfig(pmTab);
  const emptyStateMessage = hasActiveFilters
    ? "No records match the current filters."
    : "No role-off records available.";
  const canPmCancel = (row) =>
    pmTab === "process" &&
    (row.roleOffStatus === "Pending Approval" || row.roleOffStatus === "Approved");
  const getPmAction = (row) => {
    if (pmTab === "active") {
      return {
        key: "roleoff",
        label: "Role-Off",
        icon: ArrowRightCircle,
      };
    }

    if (
      row.roleOffStatus === "Approved" ||
      row.roleOffStatus === "Fulfilled" ||
      row.roleOffStatus === "Rejected"
    ) {
      return {
        key: "view",
        label: "View",
        icon: Eye,
      };
    }

    if (row.roleOffStatus && row.roleOffStatus !== "Not Requested") {
      return {
        key: "edit",
        label: "Edit",
        icon: Pencil,
      };
    }

    return {
      key: "roleoff",
      label: "Role-Off",
      icon: ArrowRightCircle,
    };
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {showSelectionCheckboxes ? (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = !allSelected && anySelected;
                    }}
                    onChange={(event) => onToggleAll(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  />
                </th>
              ) : null}
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Resource
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Demand Name
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Impact
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {mode === "pm" ? "Allocation" : "Status"}
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {mode === "pm" ? "End Date" : "Effective Date"}
              </th>
              {mode === "pm" ? (
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {pmExtraColumn.header}
                </th>
              ) : null}
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={mode === "pm" ? (showPmCheckboxes ? 8 : 7) : 7}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex justify-center items-center">
                    <LoadingSpinner text="Loading Requests..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={mode === "pm" ? (showSelectionCheckboxes ? 8 : 7) : 8}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyStateMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isHigh = row.impact === "High";
                const isSelected = selectedRows.includes(row.id);
                const pmAction = mode === "pm" ? getPmAction(row) : null;
                const PmActionIcon = pmAction?.icon;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "align-top cursor-pointer transition-colors",
                      isHigh && "bg-rose-50/40",
                      isSelected && "bg-blue-50/40",
                      activeRowId === row.id && "bg-slate-100",
                      "hover:bg-slate-50",
                    )}
                  >
                    {showSelectionCheckboxes ? (
                      <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => onToggleRow(row.id, event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {isHigh ? (
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        ) : null}
                        <div>
                          <p className="font-semibold text-[#081534]">{row.resource}</p>
                          <p className="text-xs text-gray-500">{row.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-800">{row.role}</p>
                      {!(mode === "pm" && pmTab === "active") ? (
                        <p className="text-xs text-gray-500">{row.skill}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">{renderBadge(row.impact, IMPACT_STYLES)}</td>
                    <td className="px-4 py-4">
                      {mode === "pm" ? (
                        <p className="font-medium text-gray-800">{row.allocationPercent}%</p>
                      ) : (
                        renderBadge(row.status, STATUS_STYLES)
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {mode === "pm" ? row.endDate : row.effectiveDate}
                    </td>
                    {mode === "pm" ? (
                      <td className="px-4 py-4">
                        {pmExtraColumn.renderCell(row)}
                      </td>
                    ) : null}
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        {mode === "pm" ? (
                          <>
                            <Button
                              variant="outline"
                              className="h-8 border-gray-300 bg-white px-3 text-xs"
                              onClick={() => onAction(pmAction.key, row)}
                            >
                              {PmActionIcon ? <PmActionIcon className="mr-1 h-3.5 w-3.5" /> : null}
                              {pmAction.label}
                            </Button>
                            {canPmCancel(row) ? (
                              <Button
                                variant="outline"
                                className="h-8 border-rose-300 bg-white px-3 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                onClick={() => onAction("cancel", row)}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            ) : null}
                          </>
                        ) : null}

                        {mode === "rm" ? (
                          <Button
                            variant="outline"
                            className="h-8 border-gray-300 bg-white px-3 text-xs"
                            onClick={() => onAction("view", row)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        ) : null}

                        {mode === "dm" ? (
                          <Button
                            variant="outline"
                            className="h-8 border-gray-300 bg-white px-3 text-xs"
                            onClick={() => onAction("view", row)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleOffTable;
