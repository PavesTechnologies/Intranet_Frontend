import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Inbox,
  Layers,
  ShieldAlert,
  Lock,
  ClipboardCheck,
  MessageSquareWarning,
  Hourglass,
  BadgeCheck,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import SearchInput from "@/components/filter/Searchbar";
import { useFinanceQueue, useFinanceHistory, useFinancePaymentSummary } from "./hooks/useFinanceVerification";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import { useEmployeeDirectory } from "../../approval-engine/hooks/useEmployeeDirectory";
import FinanceReviewPanel from "./components/FinanceReviewPanel";
import PolicyEmptyState from "../../components/policy/common/PolicyEmptyState";
import SelectableStatCard from "../../components/common/SelectableStatCard";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import InvoiceHandoffBadge from "../../components/expense-reports/InvoiceHandoffBadge";
import { formatMoney, formatDate } from "../../approval-engine/constants/approvalLabels";
import Pagination from "@/components/Pagination/pagination";

const TABS = [
  { value: "PENDING", label: "To verify" },
  { value: "QUERIED", label: "Queried" },
  { value: "VERIFIED", label: "Verified & payments" },
];

// Reimbursement state of a verified report (backend PaymentRoutingStatus).
const PAYMENT_FILTERS = [
  { value: "", label: "All" },
  { value: "APPROVED_FOR_PAYMENT", label: "With AP" },
  { value: "PAYMENT_COMPLETED", label: "Paid" },
];

const EMPTY_TEXT = {
  PENDING: ["Nothing to verify right now.", "Expense reports reach Finance after the manager approves them."],
  QUERIED: ["No open queries.", "Reports you send back to an employee for correction appear here until they resubmit."],
  VERIFIED: ["Nothing verified yet.", "Reports you verify appear here, with whether AP has paid the employee."],
};

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

function PaymentCell({ status, paidAt }) {
  if (status === "PAYMENT_COMPLETED") {
    return (
      <div className="leading-tight">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          <BadgeCheck className="h-3 w-3" /> Paid
        </span>
        {paidAt && <span className="block text-[11px] text-gray-400 mt-0.5">{formatDate(paidAt)}</span>}
      </div>
    );
  }
  if (status === "APPROVED_FOR_PAYMENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
        <Hourglass className="h-3 w-3" /> With AP
      </span>
    );
  }
  if (status === "HANDOFF_FAILED") {
    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">Handoff failed</span>;
  }
  // NONE: verified at Finance but the report still has later approval levels.
  return <span className="text-xs text-gray-400">Still in approval</span>;
}

/**
 * Finance - one page for the whole Finance Executive job: verify expense reports (To verify),
 * follow up on what was sent back (Queried), and see whether AP has paid verified reports
 * (Verified & payments). Replaces the old Verification / Reimbursements / Payment Status items.
 * Tabs: my-queue, history?status=QUERIED, history?status=VERIFIED; payment counts from
 * /payment-summary. Verify / Query happen in FinanceReviewPanel (opened with Review).
 */
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [pageByTab, setPageByTab] = useState({});
  const pageSize = DEFAULT_PAGE_SIZE;
  const [reviewingReport, setReviewingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const pageFor = (tab) => pageByTab[tab] ?? 0;
  const setPageFor = (tab, next) => setPageByTab((prev) => ({ ...prev, [tab]: next }));

  const pendingQuery = useFinanceQueue(pageFor("PENDING"), pageSize);
  const queriedQuery = useFinanceHistory("QUERIED", pageFor("QUERIED"), pageSize);
  const verifiedQuery = useFinanceHistory("VERIFIED", pageFor("VERIFIED"), pageSize);
  const { data: paymentSummary } = useFinancePaymentSummary();
  const { data: directory } = useEmployeeDirectory();

  const queriesByTab = { PENDING: pendingQuery, QUERIED: queriedQuery, VERIFIED: verifiedQuery };
  const activeQuery = queriesByTab[activeTab];
  const { data, isLoading, isError, error, refetch } = activeQuery;
  const items = data?.content || [];

  const switchTab = (tab, payment = "") => {
    setActiveTab(tab);
    setPaymentFilter(tab === "VERIFIED" ? payment : "");
  };

  // Search / payment filter work on the loaded page only - these endpoints take no such parameter.
  const filteredItems = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return items.filter((item) => {
      const empName = (directory?.get(item.employeeId)?.name || item.employeeId || "").toLowerCase();
      const matchesSearch =
        !query ||
        (item.reportNumber || "").toLowerCase().includes(query) ||
        merchantSummary(item.pendingLineItems).toLowerCase().includes(query) ||
        empName.includes(query);
      const matchesPayment = activeTab !== "VERIFIED" || !paymentFilter || item.paymentRoutingStatus === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [items, searchTerm, paymentFilter, directory, activeTab]);

  const reviewButton = (item, label, variant = "outline") => (
    <Button size="small" variant={variant} onClick={() => setReviewingReport(item)}>
      {label}
    </Button>
  );

  let headers;
  let columns;
  let rows;
  if (activeTab === "PENDING") {
    headers = ["Report", "Employee", "Submitted", "Expenses to verify", "Status", "Report total", "Action"];
    columns = ["report", "employee", "submitted", "expenses", "status", "amount", "action"];
    rows = filteredItems.map((item) => {
      const hasIneligible = hasIneligibleLines(item.pendingLineItems);
      return {
        report: <span className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</span>,
        employee: <EmployeeLabel employeeId={item.employeeId} />,
        submitted: formatDate(item.submittedAt),
        expenses: (
          <span className="text-xs text-gray-700">
            <span className="font-semibold">{item.pendingLineItems?.length ?? 0}</span>
            <span className="ml-1 text-gray-400">{merchantSummary(item.pendingLineItems)}</span>
          </span>
        ),
        status: hasIneligible ? (
          <span
            title="Some expenses can't be verified yet - open Review to see why"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
          >
            <ShieldAlert className="h-3 w-3" /> Needs attention
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Ready to verify</span>
        ),
        amount: <span className="font-mono font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>,
        action: reviewButton(item, "Review", "primary"),
      };
    });
  } else if (activeTab === "QUERIED") {
    headers = ["Report", "Employee", "Amount", "Queried by", "Queried on", "Reason", ""];
    columns = ["report", "employee", "amount", "actor", "actionedOn", "reason", "action"];
    rows = filteredItems.map((item) => ({
      report: <span className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</span>,
      employee: <EmployeeLabel employeeId={item.employeeId} />,
      amount: <span className="font-mono font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>,
      actor: item.actedBy ? <EmployeeLabel employeeId={item.actedBy} /> : "—",
      actionedOn: item.actionedAt ? formatDate(item.actionedAt) : "—",
      reason: item.comment ? <span className="block max-w-[260px] text-xs text-gray-600 line-clamp-2">{item.comment}</span> : "—",
      action: reviewButton(item, "View"),
    }));
  } else {
    headers = ["Report", "Employee", "Amount", "Verified by", "Verified on", "Payment", "Client invoice", ""];
    columns = ["report", "employee", "amount", "actor", "actionedOn", "payment", "invoice", "action"];
    rows = filteredItems.map((item) => ({
      report: <span className="font-mono text-xs font-semibold text-gray-700">{item.reportNumber}</span>,
      employee: <EmployeeLabel employeeId={item.employeeId} />,
      amount: <span className="font-mono font-semibold text-gray-900">{formatMoney(item.totalAmount, item.currencyCode)}</span>,
      actor: item.actedBy ? <EmployeeLabel employeeId={item.actedBy} /> : "—",
      actionedOn: item.actionedAt ? formatDate(item.actionedAt) : "—",
      payment: <PaymentCell status={item.paymentRoutingStatus} paidAt={item.paymentCompletedAt} />,
      invoice: ["PENDING", "COMPLETED"].includes(item.invoiceHandoffStatus) ? (
        <InvoiceHandoffBadge status={item.invoiceHandoffStatus} />
      ) : (
        <span className="text-xs text-gray-400">—</span>
      ),
      action: reviewButton(item, "View"),
    }));
  }

  const errorStatus = error?.response?.status;
  const isAuthError = errorStatus === 401 || errorStatus === 403;
  const [emptyTitle, emptyDescription] = EMPTY_TEXT[activeTab];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Finance" }]} />

      <PageHeader
        title="Finance"
        subtitle="Verify approved expense reports, follow up on queries, and track whether AP has reimbursed the employee."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectableStatCard
          title="To verify"
          value={pendingQuery.data?.totalElements ?? "—"}
          subtitle="Reports waiting on you"
          icon={ClipboardCheck}
          textColor="text-amber-700"
          active={activeTab === "PENDING"}
          onClick={() => switchTab("PENDING")}
        />
        <SelectableStatCard
          title="Queried"
          value={queriedQuery.data?.totalElements ?? "—"}
          subtitle="Back with the employee"
          icon={MessageSquareWarning}
          textColor="text-rose-700"
          active={activeTab === "QUERIED"}
          onClick={() => switchTab("QUERIED")}
        />
        <SelectableStatCard
          title="With AP"
          value={paymentSummary?.awaitingPaymentCount ?? "—"}
          subtitle="Verified, not yet paid"
          icon={Hourglass}
          textColor="text-indigo-700"
          active={activeTab === "VERIFIED" && paymentFilter === "APPROVED_FOR_PAYMENT"}
          onClick={() => switchTab("VERIFIED", "APPROVED_FOR_PAYMENT")}
        />
        <SelectableStatCard
          title="Paid"
          value={paymentSummary?.paidCount ?? "—"}
          subtitle="Employee reimbursed"
          icon={BadgeCheck}
          textColor="text-emerald-700"
          active={activeTab === "VERIFIED" && paymentFilter === "PAYMENT_COMPLETED"}
          onClick={() => switchTab("VERIFIED", "PAYMENT_COMPLETED")}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => switchTab(tab)}>
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
          <SearchInput value={searchTerm} onSearch={(val) => setSearchTerm(val || "")} placeholder="Employee, merchant or report #..." />
        </div>
        {activeTab === "VERIFIED" && (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-slate-600">Payment:</span>
            {PAYMENT_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setPaymentFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  paymentFilter === f.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </FilterCard>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4 shadow-sm">
          {isAuthError ? <Lock className="h-6 w-6 text-rose-500" /> : <AlertTriangle className="h-6 w-6 text-rose-500" />}
          <p className="text-sm font-semibold text-rose-700">
            {errorStatus === 401
              ? "Your session has expired. Please log in again."
              : errorStatus === 403
              ? "Access denied. This page needs the Finance Executive role."
              : "Couldn't load this list."}
          </p>
          <p className="text-xs text-rose-500 max-w-md">
            {error?.response?.data?.message || error?.message || "Please check your connection and try again."}
          </p>
          {!isAuthError && (
            <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <LoadingSpinner text="Loading…" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {items.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title={emptyTitle} description={emptyDescription} />
          ) : filteredItems.length === 0 ? (
            <PolicyEmptyState icon={<Layers className="h-10 w-10" />} title="No reports match" description="Nothing on this page matches the search or filter." />
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
