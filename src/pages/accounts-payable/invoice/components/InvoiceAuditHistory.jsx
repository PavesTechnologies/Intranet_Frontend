import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import CollapsiblePanel from "./CollapsiblePanel";
import { useInvoiceHistory } from "../hooks/useInvoiceHistory";
import { useInvoiceApproval } from "../hooks/useInvoiceApprovals";
import { getApiErrorMessage } from "../../utils/apiError";
import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";
import {
  ACTIVITY_FILTERS,
  buildActivityItems,
  countByCategory,
  groupItemsByDate,
} from "../utils/invoiceActivityEvents";
import { deriveWorkflowStages } from "../utils/invoiceWorkflowProgress";
import InvoiceWorkflowTracker from "./activity/InvoiceWorkflowTracker";
import ActivityTimeline from "./activity/ActivityTimeline";
import ActivityEventDetails from "./activity/ActivityEventDetails";

/**
 * Invoice Activity — workflow progress tracker and business-friendly activity timeline (filters,
 * date groups, expandable details).
 *
 * Data (no new endpoints, no extra requests):
 *  - GET /invoice-details/invoice/{id}/history (useInvoiceHistory) — ap.audit_log rows for this
 *    invoice (table_name='invoice'), oldest first. The raw records are never modified.
 *  - GET /invoice/{id}/approval (useInvoiceApproval) — same query key InvoiceApprovalPanel uses,
 *    so React Query serves it from cache; only used for "Level N of M". A 404 just means the
 *    invoice hasn't been sent for approval yet.
 *  - invoice.status / amountPaid / netAmount from the already-loaded invoice detail.
 * changed_by is the JWT's numeric employee id, resolved to a name through the employee directory;
 * service actors (AP_AUTOMATION, RECURRING_SCHEDULE, …) are shown as automated.
 *
 * Collapsible like the other Invoice Details cards (see CollapsiblePanel) — collapsed unless `defaultOpen`.
 *
 * @param {{invoice: {id: number, invoiceNumber?: string, status: string, amountPaid?: number|null, netAmount?: number|null}, defaultOpen?: boolean}} props
 */
export default function InvoiceAuditHistory({ invoice, defaultOpen = false }) {
  const invoiceId = invoice?.id;
  const { data: history, isLoading, error, refetch, isFetching } = useInvoiceHistory(invoiceId);
  const { data: approval } = useInvoiceApproval(invoiceId);
  const { data: employeeDirectory } = useEmployeeDirectory();
  const [filter, setFilter] = useState("all");

  const resolveName = useCallback((id) => resolveEmployeeName(employeeDirectory, id), [employeeDirectory]);
  const records = useMemo(() => (Array.isArray(history) ? history : []), [history]);

  const stages = useMemo(
    () =>
      deriveWorkflowStages({
        status: invoice?.status,
        history: records,
        approval,
        amountPaid: invoice?.amountPaid,
        netAmount: invoice?.netAmount,
      }),
    [invoice?.status, invoice?.amountPaid, invoice?.netAmount, records, approval],
  );

  const items = useMemo(() => buildActivityItems(records, { resolveName }), [records, resolveName]);
  const counts = useMemo(() => countByCategory(items), [items]);
  const visibleItems = useMemo(() => (filter === "all" ? items : items.filter((item) => item.category === filter)), [items, filter]);
  const groups = useMemo(() => groupItemsByDate(visibleItems), [visibleItems]);

  const activeFilterLabel = ACTIVITY_FILTERS.find((entry) => entry.key === filter)?.label;

  const summary = isLoading || error ? null : `${items.length} ${items.length === 1 ? "activity" : "activities"}`;

  return (
    <CollapsiblePanel
      title="Activity"
      subtitle="Workflow progress and the full history of this invoice."
      badge={summary}
      defaultOpen={defaultOpen}
      bodyClassName="space-y-5"
    >
      <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-4">
        <InvoiceWorkflowTracker stages={stages} />
      </div>

      {isLoading ? (
        <TimelineSkeleton />
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {getApiErrorMessage(error, "Unable to load activity right now.")}
          </p>
          {error?.status !== 403 && error?.status !== 404 && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      ) : records.length === 0 ? (
        <EmptyState title="No activity recorded yet." />
      ) : (
        <>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter activities by category">
            {ACTIVITY_FILTERS.map((entry) => {
              const active = filter === entry.key;
              const count = counts[entry.key] || 0;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
                    active ? "border-[#0A0082] bg-[#0A0082] text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {entry.label}
                  <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {visibleItems.length === 0 ? (
            <EmptyState
              title={`No ${activeFilterLabel?.toLowerCase() || "matching"} activity yet.`}
              action={
                <button type="button" onClick={() => setFilter("all")} className="text-xs font-medium text-[#0A0082] hover:underline">
                  Show all activities
                </button>
              }
            />
          ) : (
            <ActivityTimeline groups={groups} renderDetails={(item) => <ActivityEventDetails item={item} />} />
          )}
        </>
      )}
    </CollapsiblePanel>
  );
}

function EmptyState({ title, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
      <Inbox className="h-6 w-6 text-gray-300" aria-hidden="true" />
      <p className="text-sm text-gray-500">{title}</p>
      {action}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Loading activity" className="space-y-4">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
        ))}
      </div>
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading activity...</span>
    </div>
  );
}
