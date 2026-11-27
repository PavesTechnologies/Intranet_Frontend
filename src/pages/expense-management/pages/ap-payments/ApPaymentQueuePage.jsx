import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supplementaryPaymentService, unwrapList } from "@/pages/expense-management/api/supplementaryClaimApi";
import { AlertTriangle, Inbox, Wallet, CalendarCheck, BadgeCheck } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import StatusBadge from "@/components/status/statusbadge";
import SearchInput from "@/components/filter/Searchbar";
import PolicyEmptyState from "../../components/policy/common/PolicyEmptyState";
import SelectableStatCard from "../../components/common/SelectableStatCard";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import { formatMoney, formatDate } from "../../approval-engine/constants/approvalLabels";
import { useApPaymentQueue, useApPaymentHistory, useApPaymentSummary } from "./hooks/useApPayments";
import ApPaymentReviewPanel from "./components/ApPaymentReviewPanel";
import InvoiceHandoffBadge from "@/pages/expense-management/components/expense-reports/InvoiceHandoffBadge";
import Pagination from "@/components/Pagination/pagination";

// Real PaymentRoutingStatus values (backend enum). Client-billable reports are paid here like any
// other; their invoice handoff is a separate track, shown in the Client invoice column.
const TABS = [
  { value: "ALL", label: "All records" },
  { value: "APPROVED_FOR_PAYMENT", label: "To pay" },
  { value: "PAYMENT_COMPLETED", label: "Paid" },
  { value: "HANDOFF_FAILED", label: "Handoff failed" },
];

// Rows read per status for "All records"; that list is then paged on screen.
const ALL_FETCH_SIZE = 100;

const SUPP_PAYMENTS_PATH = "/expense-management/ap/supplementary-payments";

/**
 * A supplementary-claim payment (a late or missing bill on a report already paid), shaped like a report row so it
 * sits in the same table. REQUESTED is "to pay", PAID is "payment completed".
 */
const fromSupplementaryPayment = (p) => ({
  __supp: true,
  key: `supp-${p.paymentId}`,
  reportNumber: p.claimNumber,
  title: "Supplementary claim",
  employeeId: p.employeeId,
  costCenterName: null,
  paidAmount: p.status === "PAID" ? p.amount : null,
  reimbursableAmount: p.amount,
  currencyCode: p.currencyCode,
  approvedAt: p.requestedAt,
  paymentDate: p.paymentDate || p.paidAt,
  paymentReference: p.bankReference,
  paymentRoutingStatus: p.status === "PAID" ? "PAYMENT_COMPLETED" : "APPROVED_FOR_PAYMENT",
});

const EMPTY_TEXT = {
  ALL: ["No payment records yet.", "Reports appear here once Finance has verified them, and stay here after they are paid."],
  APPROVED_FOR_PAYMENT: ["Nothing to pay right now.", "Reports appear here once Finance has verified them."],
  PAYMENT_COMPLETED: ["No payments recorded yet.", "Reports you mark as paid are listed here."],
  HANDOFF_FAILED: ["No failed handoffs.", "Reports whose downstream handoff failed would appear here."],
};

/**
 * AP Payments - reimburse employees for finance-verified reports. One tab per real backend
 * paymentRoutingStatus (APPROVED_FOR_PAYMENT -> /queue, others -> /history?status=), all
 * server-paginated; the summary cards come from /summary and are global totals.
 */
export default function ApPaymentQueuePage() {
  // "All records" is the default: every report AP has seen, whatever its payment status, in one table.
  const [activeTab, setActiveTab] = useState("ALL");
  const [pageByTab, setPageByTab] = useState({});
  const pageSize = DEFAULT_PAGE_SIZE;
  const [reviewingReport, setReviewingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const pageFor = (status) => pageByTab[status] ?? 0;
  const setPageFor = (status, next) => setPageByTab((prev) => ({ ...prev, [status]: next }));

  // "All records" reads the first ALL_FETCH_SIZE rows of each status, merges them and pages the list on screen.
  // The single-status tabs are paged by the server.
  const isAll = activeTab === "ALL";
  const srcPage = (status) => (isAll ? 0 : pageFor(status));
  const srcSize = isAll ? ALL_FETCH_SIZE : pageSize;
  const pendingQuery = useApPaymentQueue(srcPage("APPROVED_FOR_PAYMENT"), srcSize);
  const completedQuery = useApPaymentHistory("PAYMENT_COMPLETED", srcPage("PAYMENT_COMPLETED"), srcSize);
  const handoffFailedQuery = useApPaymentHistory("HANDOFF_FAILED", srcPage("HANDOFF_FAILED"), srcSize);
  const { data: summary } = useApPaymentSummary();
  const navigate = useNavigate();

  // Supplementary-claim payments: waiting for AP, and already paid. A failure leaves them out, not the page.
  const suppToPay = useQuery({
    queryKey: ["apSupplementaryPayments", "queue"],
    queryFn: () => supplementaryPaymentService.queue().then(unwrapList),
    staleTime: 30_000,
    retry: false,
  });
  const suppPaid = useQuery({
    queryKey: ["apSupplementaryPayments", "paid"],
    queryFn: () => supplementaryPaymentService.paid().then(unwrapList),
    staleTime: 30_000,
    retry: false,
  });
  const suppRows = useMemo(
    () => ({
      APPROVED_FOR_PAYMENT: (suppToPay.data || []).map(fromSupplementaryPayment),
      PAYMENT_COMPLETED: (suppPaid.data || []).map(fromSupplementaryPayment),
      HANDOFF_FAILED: [],
    }),
    [suppToPay.data, suppPaid.data]
  );

  const queriesByTab = {
    APPROVED_FOR_PAYMENT: pendingQuery,
    PAYMENT_COMPLETED: completedQuery,
    HANDOFF_FAILED: handoffFailedQuery,
  };
  const allSources = [pendingQuery, completedQuery, handoffFailedQuery];
  const activeQuery = isAll
    ? {
        data: undefined,
        isLoading: allSources.some((q) => q.isLoading),
        isError: allSources.some((q) => q.isError),
        error: allSources.find((q) => q.error)?.error,
        refetch: () => allSources.forEach((q) => q.refetch()),
      }
    : queriesByTab[activeTab];
  const { data, isLoading, isError, error, refetch } = activeQuery;
  const items = useMemo(() => {
    // Single-status tabs: the server page, plus that status's supplementary payments on the first page.
    if (!isAll) return [...(data?.content || []), ...(pageFor(activeTab) === 0 ? suppRows[activeTab] || [] : [])];
    // Each row keeps its own status, newest decision first.
    return [...allSources.flatMap((q) => q.data?.content || []), ...suppRows.APPROVED_FOR_PAYMENT, ...suppRows.PAYMENT_COMPLETED]
      .sort((a, b) =>
        String(b.paymentDate || b.paymentCompletedAt || b.approvedAt || "").localeCompare(
          String(a.paymentDate || a.paymentCompletedAt || a.approvedAt || "")
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAll, activeTab, pageByTab, data, pendingQuery.data, completedQuery.data, handoffFailedQuery.data, suppRows]);
  const suppCount = (tab) => (suppRows[tab] || []).length;
  const allCount =
    allSources.reduce((sum, q) => sum + (q.data?.totalElements ?? 0), 0) + suppCount("APPROVED_FOR_PAYMENT") + suppCount("PAYMENT_COMPLETED");
  const tabCount = (tab) => (tab === "ALL" ? allCount : (queriesByTab[tab].data?.totalElements ?? 0) + suppCount(tab));
  // Paid on / Reference show on the Paid tab and on All records (blank for rows not paid yet).
  const isPaidTab = activeTab === "PAYMENT_COMPLETED";
  const showPaidColumns = isPaidTab || isAll;

  // Search filters the loaded page only - these endpoints take no search parameter.
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((item) =>
      [item.reportNumber, item.employeeId, item.costCenterName, item.title, item.paymentReference].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPageFor(tab, 0);
    setSearchTerm("");
  };

  // What the employee is owed (claimed less any cash advance) - or, once paid, what AP confirmed paying.
  const headers = ["Report", "Employee", "Cost Center", isPaidTab ? "Amount Paid" : isAll ? "Amount" : "Amount to Pay", "Approved On"];
  const columns = ["report", "employee", "costCenter", "amount", "approvedOn"];
  if (showPaidColumns) {
    headers.push("Paid On", "Reference");
    columns.push("paidOn", "reference");
  }
  headers.push("Status", "Client invoice", "Action");
  columns.push("status", "invoice", "action");

  // All records is paged on screen; the single-status tabs are paged by the server.
  const listPage = pageFor(activeTab);
  const pagedItems = isAll ? filteredItems.slice(listPage * pageSize, (listPage + 1) * pageSize) : filteredItems;
  const totalPages = isAll ? Math.ceil(filteredItems.length / pageSize) : data?.totalPages ?? 0;

  const rows = pagedItems.map((item) => ({
    report: (
      <div className="leading-tight text-left">
        <span className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</span>
        {item.__supp ? (
          <span className="mt-0.5 block w-fit rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">Supplementary claim</span>
        ) : (
          item.title && <span className="block max-w-[220px] truncate text-[11px] text-gray-400">{item.title}</span>
        )}
      </div>
    ),
    employee: <EmployeeLabel employeeId={item.employeeId} />,
    costCenter: item.costCenterName || "—",
    amount: (
      <span className="whitespace-nowrap font-mono font-semibold text-gray-900">
        {formatMoney(item.paidAmount ?? item.reimbursableAmount ?? item.totalAmount, item.currencyCode)}
      </span>
    ),
    approvedOn: <span className="whitespace-nowrap">{formatDate(item.approvedAt)}</span>,
    paidOn: <span className="whitespace-nowrap">{item.paymentDate || item.paymentCompletedAt ? formatDate(item.paymentDate || item.paymentCompletedAt) : "—"}</span>,
    reference: <span className="font-mono text-xs text-gray-700">{item.paymentReference || "—"}</span>,
    status: <StatusBadge label={item.paymentRoutingStatus} size="sm" />,
    invoice: ["PENDING", "COMPLETED"].includes(item.invoiceHandoffStatus) ? (
      <InvoiceHandoffBadge status={item.invoiceHandoffStatus} />
    ) : (
      <span className="text-xs text-gray-400">—</span>
    ),
    action: (
      <Button
        size="small"
        variant={item.paymentRoutingStatus === "APPROVED_FOR_PAYMENT" ? "primary" : "outline"}
        // A supplementary payment is recorded on its own AP page (bank reference, method, date).
        onClick={() => (item.__supp ? navigate(SUPP_PAYMENTS_PATH) : setReviewingReport(item))}
      >
        {item.paymentRoutingStatus === "APPROVED_FOR_PAYMENT" ? "Review & pay" : "View"}
      </Button>
    ),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "AP Payments" }]} />

      <PageHeader
        icon={Wallet}
        title="AP Payments"
        subtitle="Reimburse employees for finance-verified expense reports, and keep a record of what's been paid."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectableStatCard
          title="To pay"
          value={summary?.pendingCount ?? "—"}
          subtitle="Verified, awaiting payment"
          icon={Wallet}
          textColor="text-indigo-700"
          active={activeTab === "APPROVED_FOR_PAYMENT"}
          onClick={() => switchTab("APPROVED_FOR_PAYMENT")}
        />
        <SelectableStatCard
          title="Paid this month"
          value={summary?.paidThisMonthCount ?? "—"}
          subtitle="Since the 1st"
          icon={CalendarCheck}
          textColor="text-emerald-700"
          active={isPaidTab}
          onClick={() => switchTab("PAYMENT_COMPLETED")}
        />
        <SelectableStatCard
          title="Paid (all time)"
          value={summary?.paidCount ?? "—"}
          subtitle="Employees reimbursed"
          icon={BadgeCheck}
          active={isPaidTab}
          onClick={() => switchTab("PAYMENT_COMPLETED")}
        />
        <SelectableStatCard
          title="Handoff failed"
          value={summary?.handoffFailedCount ?? "—"}
          subtitle="Needs follow-up"
          icon={AlertTriangle}
          textColor={summary?.handoffFailedCount ? "text-rose-700" : "text-slate-800"}
          active={activeTab === "HANDOFF_FAILED"}
          onClick={() => switchTab("HANDOFF_FAILED")}
        />
      </div>

      <Tabs value={activeTab} onValueChange={switchTab}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">({tabCount(tab.value)})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterCard title="Search" description="Filters the reports on the current page.">
        <div className="w-full sm:max-w-md">
          <SearchInput
            value={searchTerm}
            onSearch={(val) => setSearchTerm(val || "")}
            placeholder="Report number, title, employee or cost center..."
          />
        </div>
      </FilterCard>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load this list.</p>
          <p className="text-xs text-rose-500 max-w-md">
            {error?.response?.data?.message || error?.message || "Please check your connection and try again."}
          </p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading payments…" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {items.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title={EMPTY_TEXT[activeTab][0]} description={EMPTY_TEXT[activeTab][1]} />
          ) : filteredItems.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title="No reports match the search." />
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable headers={headers} columns={columns} rows={rows} />
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={listPage + 1}
              totalPages={totalPages}
              onPrevious={() => setPageFor(activeTab, Math.max(listPage - 1, 0))}
              onNext={() => setPageFor(activeTab, Math.min(listPage + 1, totalPages - 1))}
            />
          </div>
        </div>
      )}

      {reviewingReport && (
        <ApPaymentReviewPanel
          isOpen={reviewingReport != null}
          onClose={() => setReviewingReport(null)}
          reportId={reviewingReport.reportId}
          queueItem={reviewingReport}
        />
      )}
    </div>
  );
}
