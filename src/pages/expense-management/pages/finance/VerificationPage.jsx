import React, { useState, useMemo } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Inbox, Layers, ShieldAlert, Lock, FileStack, FilePlus2, Landmark } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { useFinanceQueue, useVerifyLineItem, useQueryLineItem } from "./hooks/useFinanceVerification";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import { useEmployeeDirectory } from "../../approval-engine/hooks/useEmployeeDirectory";
import FinanceLineItemReviewPanel from "./components/FinanceLineItemReviewPanel";
import FinanceReviewPanel from "./components/FinanceReviewPanel";
import { formatMoney, formatDate } from "../../approval-engine/constants/approvalLabels";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import Pagination from "@/components/Pagination/pagination";

const merchantSummary = (lineItems) => {
  if (!lineItems?.length) return "—";
  const first = lineItems[0]?.merchantName || lineItems[0]?.categoryName || "Line item";
  return lineItems.length > 1 ? `${first} +${lineItems.length - 1} more` : first;
};

const isLineEligible = (line) => {
  if (!line) return false;
  if (line.eligibleForVerify === false) return false;
  if (line.ineligibleReason && String(line.ineligibleReason).trim().length > 0) return false;
  return true;
};

const hasIneligibleLines = (lineItems) => (lineItems || []).some((l) => !isLineEligible(l));

/**
 * The Finance Verification queue - GET /xms/finance-verification/my-queue is the ONLY network call
 * this page's content depends on. FinanceQueueItemResponse.pendingLineItems already carries every
 * field a row/expanded-panel needs (amount, glAccountCode, eligibleForVerify, ineligibleReason,
 * clientBillable) — there is no per-row reconstruction here, unlike the previous version which fired
 * two extra queries (lineItemService.getAll + financeVerificationApi.getReviews) per report purely
 * to rebuild what this one response already provides correctly.
 */
export default function VerificationPage() {
  const [page, setPage] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [reviewingReport, setReviewingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");

  const { data, isLoading, isError, error, refetch } = useFinanceQueue(page, 20);
  const { data: directory } = useEmployeeDirectory();
  const verifyLineItem = useVerifyLineItem();
  const queryLineItem = useQueryLineItem();

  const items = data?.content || [];
  const isMutating = verifyLineItem.isPending || queryLineItem.isPending;

<<<<<<< HEAD
  const lineItemsQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["reportLineItems", item.reportId],
      queryFn: async () => {
        const res = await lineItemService.getAll(item.reportId);
        const payload = res.data?.data;
        return Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
      },
      staleTime: 30_000,
    })),
  });

  const reviewsQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["financeReviews", item.reportId],
      queryFn: async () => {
        try {
          const res = await financeVerificationApi.getReviews(item.reportId);
          return res.data?.data || [];
        } catch {
          return [];
        }
      },
      staleTime: 15_000,
    })),
  });

  const resolvedItems = useMemo(() => {
    return items.map((item, idx) => {
      const queriedLines = lineItemsQueries[idx]?.data;
      const backendLines = item.pendingLineItems || item.lineItems || item.items || item.pendingLines || [];
      const baseLines = (queriedLines && queriedLines.length > 0) ? queriedLines : backendLines;
      const reportReviews = reviewsQueries[idx]?.data || [];

      const mergedLines = baseLines.map((line) => {
        const qi = backendLines.find((b) => b.lineItemId === line.lineItemId) || {};
        return { ...line, ...qi };
      });

      // A line is pending verification if it has not been verified or queried.
      const pendingLineItems = mergedLines.filter((line) => {
        const lineReviews = reportReviews.filter((r) => r.lineItemId === line.lineItemId);
        const hasVerifiedOrQueried = lineReviews.some((r) => r.status === "VERIFIED" || r.status === "QUERIED");
        return !hasVerifiedOrQueried;
      });

      const finalPending = pendingLineItems.length > 0 ? pendingLineItems : mergedLines;

      return {
        ...item,
        pendingLineItems: finalPending,
      };
    });
  }, [items, lineItemsQueries, reviewsQueries]);

=======
>>>>>>> 6a1e43b2b17d8368043b7d5982e4776d74ad1373
  const handleVerifyLine = (reportId, lineItemId) => {
    verifyLineItem.mutate(
      { reportId, lineItemId },
      {
        onSuccess: () => showStatusToast("Line item verified successfully", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to verify line item", "error"),
      }
    );
  };

  const handleQueryLine = (reportId, lineItemId, reason) => {
    queryLineItem.mutate(
      { reportId, lineItemId, reason },
      {
        onSuccess: () =>
          showStatusToast("Correction requested — the report has been returned to the employee.", "success"),
        onError: (err) => showStatusToast(err.response?.data?.message || "Failed to raise query", "error"),
      }
    );
  };

  // Accurate: comes straight from the backend's own count of ALL reports currently
  // PENDING_FINANCE_VERIFICATION, independent of page size.
  const totalReportsCount = data?.totalElements ?? 0;
  // NOT globally accurate — the backend has no endpoint that sums pending line items or queue
  // value across the whole queue, only per-page data. Labeled "current page" rather than presented
  // as a global total, per the explicit instruction not to invent one.
  const pageLineItemsCount = items.reduce((sum, item) => sum + (item.pendingLineItems?.length ?? 0), 0);
  const pageQueueValue = items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const firstCurrency = items[0]?.currencyCode || "INR";

  // Client-side, over the currently loaded page only — search does not query the backend (it has
  // no such parameter), so results are scoped to what's already on screen.
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const reportNumber = (item.reportNumber || "").toLowerCase();
      const merchant = merchantSummary(item.pendingLineItems).toLowerCase();
      const empEntry = directory?.get(item.employeeId);
      const empName = (empEntry?.name || item.employeeId || "").toLowerCase();
      const query = searchTerm.toLowerCase();
      const matchesSearch = !query || reportNumber.includes(query) || merchant.includes(query) || empName.includes(query);

      const hasIneligible = hasIneligibleLines(item.pendingLineItems);
      const matchesEligibility =
        !eligibilityFilter ||
        (eligibilityFilter === "READY" && !hasIneligible) ||
        (eligibilityFilter === "CONSTRAINTS" && hasIneligible);

      return matchesSearch && matchesEligibility;
    });

    return filtered.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [items, searchTerm, eligibilityFilter, directory]);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Finance", to: "/expense-management/finance/verification" },
    { label: "Verification" },
  ];

  const Header = () => (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-[#0a174e]">Finance Verification</h1>
        <p className="text-xs text-gray-500 mt-0.5">Review and verify expense report line items for reimbursement.</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3">
        <Breadcrumb items={breadcrumbs} />
        <Header />
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <LoadingSpinner text="Loading verification queue…" />
        </div>
      </div>
    );
  }

  if (isError) {
    const errorStatus = error?.response?.status;
    const isAuthError = errorStatus === 401 || errorStatus === 403;
    return (
      <div className="p-4 sm:p-6 space-y-3">
        <Breadcrumb items={breadcrumbs} />
        <Header />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4 shadow-sm">
          {isAuthError ? <Lock className="h-6 w-6 text-rose-500" /> : <AlertTriangle className="h-6 w-6 text-rose-500" />}
          <p className="text-sm font-semibold text-rose-700">
            {errorStatus === 401
              ? "Your session has expired. Please log in again."
              : errorStatus === 403
              ? "Access denied. You do not have the required role (Finance Executive) to view this page."
              : "Failed to load verification queue."}
          </p>
          <p className="text-xs text-rose-500 max-w-md">
            {error?.response?.data?.message || error?.message || "Please check your network connection and try again."}
          </p>
          {!isAuthError && (
            <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-3">
      <Breadcrumb items={breadcrumbs} />
      <Header />

      {/* Summary cards. "Pending Verification" and "Total Reports" intentionally show the same
          accurate totalElements count — Finance's entire queue IS the pending set (there is no
          separate history bucket to distinguish them from). "Pending Line Items" and "Queue Value"
          are explicitly current-page sums, not global totals the backend can't provide. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileStack size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending Verification</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalReportsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Reports</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalReportsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <FilePlus2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending Line Items (This Page)</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{pageLineItemsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <Landmark size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Queue Value (This Page)</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">{formatMoney(pageQueueValue, firstCurrency)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search (current page)</label>
            <SearchInput
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val || "")}
              placeholder="Search by employee, merchant, or report #..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>
          <FormSelect
            label="Eligibility"
            name="eligibilityFilter"
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
            options={[
              { label: "All Eligibilities", value: "" },
              { label: "Ready", value: "READY" },
              { label: "Constraints", value: "CONSTRAINTS" },
            ]}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {items.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Inbox className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No pending verifications</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">Expense reports awaiting Finance verification will show up here.</p>
            </PageCardContent>
          </PageCard>
        ) : filteredItems.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Reports Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">No verification items on this page match the selected search criteria or filters.</p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm [&_td]:!py-2 [&_td]:!px-3 [&_td]:!text-xs [&_th]:!py-2.5 [&_th]:!px-3 [&_th]:!text-xs [&_table]:!text-xs [&_.rounded-full]:!text-[10px] [&_.rounded-full]:!px-2 [&_.rounded-full]:!py-0.5">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  <tr>
                    <th className="w-8 px-3 py-2.5 text-white" />
                    <th className="px-3 py-2.5 text-white">Report</th>
                    <th className="px-3 py-2.5 text-white">Employee</th>
                    <th className="px-3 py-2.5 text-white">Submitted</th>
                    <th className="px-3 py-2.5 text-white">Level</th>
                    <th className="px-3 py-2.5 text-white">Pending Expenses</th>
                    <th className="px-3 py-2.5 text-white">Eligibility</th>
                    <th className="px-3 py-2.5 text-white">Report Total</th>
                    <th className="px-3 py-2.5 text-right text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredItems.map((item) => {
                    const isExpanded = expandedReportId === item.reportId;
                    const hasIneligible = hasIneligibleLines(item.pendingLineItems);
                    return (
                      <React.Fragment key={item.reportId}>
                        <tr
                          className="hover:bg-blue-50/40 transition cursor-pointer"
                          onClick={() => setExpandedReportId(isExpanded ? null : item.reportId)}
                        >
                          <td className="px-3 py-2 text-gray-400">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] font-semibold text-gray-700">{item.reportNumber}</td>
                          <td className="px-3 py-2 text-gray-600 font-medium">
                            <EmployeeLabel employeeId={item.employeeId} />
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(item.submittedAt)}</td>
                          <td className="px-3 py-2 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" /> Finance Verification
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 font-medium">
                            {item.pendingLineItems?.length ?? 0}
                            <span className="ml-1 text-gray-400 font-normal">{merchantSummary(item.pendingLineItems)}</span>
                          </td>
                          <td className="px-3 py-2">
                            {hasIneligible ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                <ShieldAlert className="h-3 w-3" /> Constraints
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-900 font-semibold whitespace-nowrap font-mono">
                            {formatMoney(item.totalAmount, item.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              variant="outline"
                              className="!py-1 !px-2.5 !text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
                              disabled={isMutating}
                              onClick={() => setReviewingReport(item)}
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-slate-50/60 p-0">
                              {hasIneligible && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-700 px-4 pt-3">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Contains line items that are currently ineligible for verification.
                                </p>
                              )}
                              <FinanceLineItemReviewPanel
                                reportId={item.reportId}
                                lineItems={item.pendingLineItems}
                                isBusy={isMutating}
                                onVerifyLine={(lineItemId) => handleVerifyLine(item.reportId, lineItemId)}
                                onQueryLine={(lineItemId, reason) => handleQueryLine(item.reportId, lineItemId, reason)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((item) => {
                const hasIneligible = hasIneligibleLines(item.pendingLineItems);
                return (
                  <div key={item.reportId} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</p>
                        <p className="text-sm text-gray-900 font-medium mt-0.5">
                          <EmployeeLabel employeeId={item.employeeId} />
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(item.submittedAt)}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        <Layers className="h-3 w-3" /> Finance Verification
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {item.pendingLineItems?.length ?? 0} pending expense(s)
                      </span>
                      {hasIneligible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          <ShieldAlert className="h-3 w-3" /> Constraints
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Ready</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button size="small" variant="outline" disabled={isMutating} onClick={() => setReviewingReport(item)} className="w-full">
                        Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {data?.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={page + 1}
                  totalPages={data.totalPages}
                  onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
                  onNext={() => setPage((p) => Math.min(p + 1, data.totalPages - 1))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {reviewingReport && (
        <FinanceReviewPanel
          isOpen={reviewingReport != null}
          onClose={() => setReviewingReport(null)}
          reportId={reviewingReport.reportId}
          queueItem={reviewingReport}
        />
      )}
    </div>
  );
}
