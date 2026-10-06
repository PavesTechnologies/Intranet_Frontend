import React, { useState, useMemo } from "react";
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
  { value: "APPROVED_FOR_PAYMENT", label: "To pay" },
  { value: "PAYMENT_COMPLETED", label: "Paid" },
  { value: "HANDOFF_FAILED", label: "Handoff failed" },
];

const EMPTY_TEXT = {
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
  const [activeTab, setActiveTab] = useState("APPROVED_FOR_PAYMENT");
  const [pageByTab, setPageByTab] = useState({});
  const pageSize = DEFAULT_PAGE_SIZE;
  const [reviewingReport, setReviewingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const pageFor = (status) => pageByTab[status] ?? 0;
  const setPageFor = (status, next) => setPageByTab((prev) => ({ ...prev, [status]: next }));

  const pendingQuery = useApPaymentQueue(pageFor("APPROVED_FOR_PAYMENT"), pageSize);
  const completedQuery = useApPaymentHistory("PAYMENT_COMPLETED", pageFor("PAYMENT_COMPLETED"), pageSize);
  const handoffFailedQuery = useApPaymentHistory("HANDOFF_FAILED", pageFor("HANDOFF_FAILED"), pageSize);
  const { data: summary } = useApPaymentSummary();

  const queriesByTab = {
    APPROVED_FOR_PAYMENT: pendingQuery,
    PAYMENT_COMPLETED: completedQuery,
    HANDOFF_FAILED: handoffFailedQuery,
  };
  const activeQuery = queriesByTab[activeTab];
  const { data, isLoading, isError, error, refetch } = activeQuery;
  const items = data?.content || [];
  const isPaidTab = activeTab === "PAYMENT_COMPLETED";

  // Search filters the loaded page only - these endpoints take no search parameter.
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((item) =>
      [item.reportNumber, item.employeeId, item.costCenterName, item.title].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
  };

  const headers = ["Report", "Employee", "Cost Center", "Amount", "Approved On"];
  const columns = ["report", "employee", "costCenter", "amount", "approvedOn"];
  if (isPaidTab) {
    headers.push("Paid On");
    columns.push("paidOn");
  }
  headers.push("Status", "Client invoice", "Action");
  columns.push("status", "invoice", "action");

  const rows = filteredItems.map((item) => ({
    report: (
      <div className="leading-tight text-left">
        <span className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</span>
        {item.title && <span className="block max-w-[220px] truncate text-[11px] text-gray-400">{item.title}</span>}
      </div>
    ),
    employee: <EmployeeLabel employeeId={item.employeeId} />,
    costCenter: item.costCenterName || "—",
    amount: <span className="font-mono font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>,
    approvedOn: formatDate(item.approvedAt),
    paidOn: formatDate(item.paymentCompletedAt),
    status: <StatusBadge label={item.paymentRoutingStatus} size="sm" />,
    invoice: ["PENDING", "COMPLETED"].includes(item.invoiceHandoffStatus) ? (
      <InvoiceHandoffBadge status={item.invoiceHandoffStatus} />
    ) : (
      <span className="text-xs text-gray-400">—</span>
    ),
    action: (
      <Button
        size="small"
        variant={activeTab === "APPROVED_FOR_PAYMENT" ? "primary" : "outline"}
        onClick={() => setReviewingReport(item)}
      >
        {activeTab === "APPROVED_FOR_PAYMENT" ? "Review & pay" : "View"}
      </Button>
    ),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "AP Payments" }]} />

      <PageHeader
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
              <span className="ml-1.5 text-xs text-slate-400">({queriesByTab[tab.value].data?.totalElements ?? 0})</span>
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
              currentPage={pageFor(activeTab) + 1}
              totalPages={data?.totalPages ?? 0}
              onPrevious={() => setPageFor(activeTab, Math.max(pageFor(activeTab) - 1, 0))}
              onNext={() => setPageFor(activeTab, Math.min(pageFor(activeTab) + 1, (data?.totalPages ?? 0) - 1))}
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
