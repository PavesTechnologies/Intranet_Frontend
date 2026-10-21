import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";

/** Readable labels for the workflow events a report goes through; unknown events fall back to their code. */
const EVENT_LABELS = {
  REPORT_SUBMITTED: "Submitted",
  LEVEL_ACTIVATED: "Sent for approval",
  LINE_ITEM_REVIEWED: "Line reviewed by approver",
  REPORT_AWAITING_CORRECTION: "Sent back for correction",
  VERIFICATION_QUERY_RAISED: "Finance requested a correction",
  LINE_ITEM_REOPENED: "Line sent for review again",
  REPORT_RESUMED: "Resubmitted after correction",
  REPORT_RESTARTED: "Resubmitted - approval restarted",
  LEVEL_COMPLETED: "Approval level completed",
  FINANCE_VERIFICATION_ACTIVATED: "With Finance for verification",
  LINE_ITEM_VERIFIED: "Line verified by Finance",
  LINE_ITEM_TAX_ADJUSTED: "Tax adjusted by Finance",
  FINANCE_VERIFICATION_COMPLETED: "Finance verification completed",
  REPORT_APPROVED: "Approved",
  REPORT_APPROVED_FOR_PAYMENT: "Sent to Accounts Payable",
  REPORT_SETTLED_NO_PAYMENT: "Settled - no payment due",
  PAYMENT_COMPLETED: "Payment confirmed by AP",
  REPORT_REJECTED: "Rejected",
  REPORT_RECALLED: "Recalled",
  REPORT_CANCELLED: "Cancelled",
};

const label = (action) =>
  EVENT_LABELS[action] || String(action || "").toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const formatWhen = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

/**
 * Everything that happened to a report, across every correction round - who sent it back and why,
 * resubmissions, verification, payment. Approval progress shows only the current round; this keeps
 * the earlier rounds visible after a correction.
 */
export default function ReportHistoryTimeline({ reportId }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["expenseReportHistory", reportId],
    queryFn: () => expenseReportService.getHistory(reportId).then((res) => res.data?.data || []),
    enabled: open && !!reportId,
    staleTime: 30_000,
  });
  const events = Array.isArray(data) ? data : [];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-400" /> Report history
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading history...</p>
          ) : isError ? (
            <p className="text-xs text-red-600">Couldn't load the report history.</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-gray-400">Nothing has happened to this report yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {events.map((e, i) => (
                <li key={`${e.action}-${e.performedAt}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-gray-800">{label(e.action)}</p>
                    <p className="text-gray-500">
                      {formatWhen(e.performedAt)}
                      {e.performedBy && (
                        <>
                          {" "}· <EmployeeLabel employeeId={e.performedBy} />
                        </>
                      )}
                    </p>
                    {e.comment && <p className="mt-0.5 whitespace-pre-wrap text-gray-700">"{e.comment}"</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
