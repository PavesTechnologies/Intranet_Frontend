import React from "react";
import { Eye, ArrowRightCircle, Pencil, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import LoadingSpinner from "../../../components/LoadingSpinner";
import GenericTable from "../../../components/Table/table";

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

  if (pmTab === "rejected") {
    return {
      header: "Rejection Reason",
      renderCell: (row) => (
        <span
          className="block max-w-[220px] truncate font-medium text-rose-700"
          title={row.rejectionReason || "-"}
        >
          {row.rejectionReason || "-"}
        </span>
      ),
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
  const showSelectionCheckboxes =
    (mode === "pm" && pmTab === "active") ||
    (mode !== "pm" && pmTab !== "fulfilled");
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
                {row.impact === "High" && <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
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
              <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                {mode === "pm" ? (
                  <>
                    <Button variant="outline" className="h-8 border-gray-300 bg-white px-3 text-xs" onClick={() => onAction(pmAction.key, row)}>
                      {PmActionIcon && <PmActionIcon className="mr-1 h-3.5 w-3.5" />}
                      {pmAction.label}
                    </Button>
                    {canPmCancel(row) && (
                      <Button variant="outline" className="h-8 border-rose-300 bg-white px-3 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => onAction("cancel", row)}>
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" className="h-8 border-gray-300 bg-white px-3 text-xs" onClick={() => onAction("view", row)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
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
