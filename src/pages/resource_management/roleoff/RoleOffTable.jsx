import React from "react";
import { ViewIcon, NextCircleIcon, EditIcon, CloseIcon, SecurityAlertIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import GenericTable from "../../../components/Table/table";

const STATUS_STYLES = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700",
  ENDED: "border-slate-200 bg-slate-100 text-slate-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  NOT_REQUESTED: "border-slate-200 bg-slate-100 text-slate-700",
  APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  FULFILLED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-700",
  ROLLED_OFF: "border-slate-200 bg-slate-100 text-slate-700",
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
      header: "Roll-Off Status",
      renderCell: (row) => renderBadge(row.roleOffStatus || "NOT_REQUESTED", STATUS_STYLES),
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
  const showSelectionCheckboxes =
    (mode === "pm" && pmTab === "active") ||
    (mode !== "pm" && pmTab !== "fulfilled");
  const allSelected = rows.length > 0 && rows.every((row) => selectedRows.includes(row.id));
  const anySelected = rows.some((row) => selectedRows.includes(row.id));
  const pmExtraColumn = getPmExtraColumnConfig(pmTab);

  const canPmCancel = (row) =>
    pmTab === "process" &&
    (row.roleOffStatus === "PENDING" || row.roleOffStatus === "APPROVED");

  const getPmAction = (row) => {
    if (pmTab === "active") {
      return {
        key: "roleoff",
        label: "Roll-Off",
        icon: NextCircleIcon,
      };
    }

    if (
      row.roleOffStatus === "APPROVED" ||
      row.roleOffStatus === "FULFILLED" ||
      row.roleOffStatus === "REJECTED" ||
      row.roleOffStatus === "ROLLED_OFF"
    ) {
      return {
        key: "view",
        label: "View",
        icon: ViewIcon,
      };
    }

    if (row.roleOffStatus && row.roleOffStatus !== "NOT_REQUESTED") {
      return {
        key: "edit",
        label: "Edit",
        icon: EditIcon,
      };
    }

    return {
      key: "roleoff",
      label: "Roll-Off",
      icon: NextCircleIcon,
    };
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <GenericTable
          headers={[
            ...(showSelectionCheckboxes ? [<input type="checkbox" checked={allSelected} ref={(n) => n && (n.indeterminate = !allSelected && anySelected)} onChange={(e) => onToggleAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0" />] : []),
            "Resource",
            "Demand Name",
            "Impact",
            mode === "pm" ? "Allocation" : "Status",
            mode === "pm" ? "End Date" : "Effective Date",
            ...(mode === "pm" ? [pmExtraColumn.header] : []),
            "Actions"
          ]}
          columns={[
            ...(showSelectionCheckboxes ? ["selection"] : []),
            "resource_info",
            "role_info",
            "impact_info",
            "status_info",
            "date_info",
            ...(mode === "pm" ? ["extra"] : []),
            "actions"
          ]}
          rows={rows.map((row) => {
            const pmAction = mode === "pm" ? getPmAction(row) : null;
            const PmActionIcon = pmAction?.icon;
            return {
              ...row,
              selection: (
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.id)}
                  onChange={(e) => onToggleRow(row.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ),
              resource_info: (
                <div className="flex items-start gap-3">
                  {row.impact === "High" && <SecurityAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                  <div>
                    <p className="font-semibold text-[#081534]">{row.resource}</p>
                    <p className="text-xs text-gray-500">{row.department}</p>
                  </div>
                </div>
              ),
              role_info: (
                <div>
                  <p className="font-medium text-gray-800">{row.role}</p>
                  {!(mode === "pm" && pmTab === "active") && <p className="text-xs text-gray-500">{row.skill}</p>}
                </div>
              ),
              impact_info: renderBadge(row.impact, IMPACT_STYLES),
              status_info: mode === "pm" ? <p className="font-medium text-gray-800">{row.allocationPercent}%</p> : renderBadge(row.status, STATUS_STYLES),
              date_info: mode === "pm" ? row.endDate : row.effectiveDate,
              extra: mode === "pm" ? pmExtraColumn.renderCell(row) : null,
              actions: (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {mode === "pm" && pmTab === "process" ? (
                    <>
                      <button
                        type="button"
                        title="Edit Roll-Off"
                        onClick={() => onAction(pmAction.key, row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      {canPmCancel(row) && (
                        <button
                          type="button"
                          title="Cancel Roll-Off"
                          onClick={() => onAction("cancel", row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-8 border-gray-300 bg-white px-3 text-xs"
                      onClick={() => onAction(mode === "pm" ? pmAction.key : "view", row)}
                    >
                      {mode === "pm" ? (
                        PmActionIcon && <PmActionIcon className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <ViewIcon className="mr-1 h-3.5 w-3.5" />
                      )}
                      {mode === "pm" ? pmAction.label : "View"}
                    </Button>
                  )}
                </div>
              ),
              rowClass: cn(
                "align-top",
                row.impact === "High" && "bg-rose-50/40",
                selectedRows.includes(row.id) && "bg-blue-50/40",
                activeRowId === row.id && "bg-slate-100"
              )
            };
          })}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default RoleOffTable;
