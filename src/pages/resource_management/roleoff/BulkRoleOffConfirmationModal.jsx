import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Loader2,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  FileText,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const impactStyles = {
  High: "border-rose-200 bg-rose-50 text-rose-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-slate-200 bg-slate-100 text-slate-700",
};

const formatDateDisplay = (dateValue) => {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateValue;
  }
};

const BulkRoleOffConfirmationModal = ({
  open,
  message,
  impactDetails,
  eligibleRecords = [],
  bulkPayload = null,
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Normalize resources array from eligibleRecords and/or impactDetails
  const parsedResources = useMemo(() => {
    if (eligibleRecords && eligibleRecords.length > 0) {
      return eligibleRecords.map((item, idx) => {
        let impactObj = null;
        if (Array.isArray(impactDetails)) {
          impactObj = impactDetails.find(
            (d) =>
              d.resourceId === item.resourceId ||
              d.id === item.id ||
              d.resourceName === item.resource
          );
        }
        return {
          id: item.id || item.allocationId || `res-${idx}`,
          resourceId:
            item.resourceId ||
            item.empId ||
            item.allocationId ||
            item.id ||
            `RES-${1000 + idx}`,
          resourceName: item.resource || item.name || "Resource",
          project: item.project || item.projectName || "-",
          allocationPercent: Number(item.allocationPercent ?? 100),
          impact:
            impactObj?.impactLevel ||
            impactObj?.impact ||
            item.impact ||
            "Medium",
          reason: item.reason || item.roleOffReason || "",
        };
      });
    }

    if (
      Array.isArray(impactDetails) &&
      impactDetails.length > 0 &&
      typeof impactDetails[0] === "object"
    ) {
      return impactDetails.map((item, idx) => ({
        id: item.id || `res-${idx}`,
        resourceId: item.resourceId || item.empId || `RES-${1000 + idx}`,
        resourceName:
          item.resourceName || item.resource || item.name || `Resource #${idx + 1}`,
        project: item.project || item.projectName || "-",
        allocationPercent: Number(
          item.allocationPercent ?? item.allocation ?? 100
        ),
        impact: item.impactLevel || item.impact || "Medium",
        reason: item.reason || item.message || "",
      }));
    }

    return [];
  }, [eligibleRecords, impactDetails]);

  const totalResources = parsedResources.length;
  const isLargeSelection = totalResources > 5;

  // Compute metrics for the summary section
  const summaryMetrics = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let totalUtil = 0;

    parsedResources.forEach((r) => {
      const imp = String(r.impact || "").toUpperCase();
      if (imp === "HIGH") high += 1;
      else if (imp === "LOW") low += 1;
      else medium += 1;

      totalUtil += r.allocationPercent || 0;
    });

    const effectiveDate =
      bulkPayload?.effectiveRoleOffDate ||
      eligibleRecords[0]?.effectiveDateIso ||
      eligibleRecords[0]?.effectiveDate ||
      "-";

    const reason =
      bulkPayload?.roleOffReason ||
      eligibleRecords[0]?.reason ||
      eligibleRecords[0]?.roleOffReason ||
      "Planned Roll-Off";

    return {
      high,
      medium,
      low,
      totalUtil,
      avgUtil: totalResources > 0 ? Math.round(totalUtil / totalResources) : 0,
      effectiveDate: formatDateDisplay(effectiveDate),
      reason,
    };
  }, [parsedResources, bulkPayload, eligibleRecords, totalResources]);

  // Filtered resources for search inside the table
  const filteredResources = useMemo(() => {
    if (!searchTerm.trim()) return parsedResources;
    const term = searchTerm.toLowerCase();
    return parsedResources.filter(
      (r) =>
        r.resourceName.toLowerCase().includes(term) ||
        String(r.resourceId).toLowerCase().includes(term) ||
        r.project.toLowerCase().includes(term) ||
        r.impact.toLowerCase().includes(term)
    );
  }, [parsedResources, searchTerm]);

  if (!open) return null;

  const displayMessage =
    message ||
    `High impact roll-off detected for ${totalResources} selected resource(s). Please review details before confirming.`;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 bg-slate-50/70 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
              Bulk Roll-Off Review
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-[#081534]">
              Confirm Bulk Roll-Off
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Warning Message Banner */}
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-sm">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
            <p className="text-amber-950 leading-relaxed font-medium">
              {displayMessage}
            </p>
          </div>

          {/* LARGE SELECTION: Compact Summary + Expandable Table */}
          {isLargeSelection ? (
            <>
              {/* Compact Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Total Resources & Impact Breakdown */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-600" />
                      Total Resources
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {totalResources}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200/80">
                    {summaryMetrics.high > 0 && (
                      <Badge className="text-[10px] font-semibold border-rose-200 bg-rose-50 text-rose-700">
                        {summaryMetrics.high} High Impact
                      </Badge>
                    )}
                    {summaryMetrics.medium > 0 && (
                      <Badge className="text-[10px] font-semibold border-amber-200 bg-amber-50 text-amber-700">
                        {summaryMetrics.medium} Medium
                      </Badge>
                    )}
                    {summaryMetrics.low > 0 && (
                      <Badge className="text-[10px] font-semibold border-slate-200 bg-slate-100 text-slate-700">
                        {summaryMetrics.low} Low
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Utilization Impact */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-indigo-600" />
                      Total Capacity Impact
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {summaryMetrics.totalUtil}%{" "}
                    <span className="text-xs font-normal text-gray-500">
                      (Avg {summaryMetrics.avgUtil}%/res)
                    </span>
                  </p>
                </div>

                {/* Schedule & Reason */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-3.5 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium truncate">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>Effective:</span>
                    <span className="font-semibold text-gray-900 truncate">
                      {summaryMetrics.effectiveDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium truncate">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>Reason:</span>
                    <span className="font-semibold text-gray-900 truncate">
                      {summaryMetrics.reason}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable Section Header */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                    <Layers className="h-4 w-4 text-gray-500" />
                    <span>View Affected Resources ({totalResources})</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{isExpanded ? "Collapse" : "Expand"}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Expandable Content Container */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-200 space-y-3 bg-white">
                    {/* Search & Filter Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search resource, ID, project or impact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-8 py-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-gray-100/90 backdrop-blur-xs text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 z-10">
                          <tr>
                            <th className="px-3 py-2">Resource Name</th>
                            <th className="px-3 py-2">Resource ID</th>
                            <th className="px-3 py-2">Project</th>
                            <th className="px-3 py-2 text-right">Allocation</th>
                            <th className="px-3 py-2 text-center">Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {filteredResources.length > 0 ? (
                            filteredResources.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {item.resourceName}
                                </td>
                                <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">
                                  {item.resourceId}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {item.project}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                  {item.allocationPercent}%
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-semibold",
                                      impactStyles[item.impact] ||
                                        impactStyles.Medium
                                    )}
                                  >
                                    {item.impact}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-6 text-center text-xs text-gray-400"
                              >
                                No matching resources found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SMALL SELECTION (<= 5 resources): Direct Table View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Affected Resources ({totalResources})
                </span>
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-7 py-1 text-xs text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 z-10">
                    <tr>
                      <th className="px-3.5 py-2">Resource Name</th>
                      <th className="px-3.5 py-2">Resource ID</th>
                      <th className="px-3.5 py-2">Project</th>
                      <th className="px-3.5 py-2 text-right">Allocation</th>
                      <th className="px-3.5 py-2 text-center">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredResources.length > 0 ? (
                      filteredResources.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-3.5 py-2 font-medium text-gray-900">
                            {item.resourceName}
                          </td>
                          <td className="px-3.5 py-2 text-gray-500 font-mono text-[11px]">
                            {item.resourceId}
                          </td>
                          <td className="px-3.5 py-2 text-gray-600">
                            {item.project}
                          </td>
                          <td className="px-3.5 py-2 text-right font-semibold text-gray-800">
                            {item.allocationPercent}%
                          </td>
                          <td className="px-3.5 py-2 text-center">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold",
                                impactStyles[item.impact] || impactStyles.Medium
                              )}
                            >
                              {item.impact}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-xs text-gray-400"
                        >
                          No matching resources found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur-xs border-t border-gray-200 px-6 py-3.5 flex items-center justify-end gap-2.5 z-20 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 border-gray-300 bg-white text-xs font-medium hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-9 px-4 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Roll-Off"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkRoleOffConfirmationModal;
