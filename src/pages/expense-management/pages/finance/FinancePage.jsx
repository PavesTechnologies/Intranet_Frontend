import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Eye,
  Inbox,
  Lock,
  ClipboardCheck,
  MessageSquareWarning,
  Hourglass,
  BadgeCheck,
  Wallet,
  Layers,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useFinanceQueue, useFinanceHistory, useFinancePaymentSummary } from "./hooks/useFinanceVerification";
import { useEmployeeDirectory } from "../../approval-engine/hooks/useEmployeeDirectory";
import FinanceReviewPanel from "./components/FinanceReviewPanel";
import Modal from "@/components/Modal/modal";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import PolicyEmptyState from "../../components/policy/common/PolicyEmptyState";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import InvoiceHandoffBadge from "../../components/expense-reports/InvoiceHandoffBadge";
import { formatMoney, formatDate } from "../../approval-engine/constants/approvalLabels";
import Pagination from "@/components/Pagination/pagination";
import { financeClaimService, unwrapList } from "@/pages/expense-management/api/supplementaryClaimApi";
import RequestTypeBadge, { reportTypeOf } from "@/pages/expense-management/components/common/RequestTypeBadge";
import TableFilterBar from "@/pages/expense-management/components/common/TableFilterBar";
import { HeroQuickActions } from "@/pages/expense-management/components/dashboard/DashboardHero";
import RowActionButton, { RowActions } from "../../approval-engine/components/RowActionButton";
import { APPROVAL_STATUS_OPTIONS, ApprovalStatusBadge, cashStatusKey, expenseStatusKey } from "../../approval-engine/components/approvalStatus";

const EMPTY_TEXT = {
  ALL: ["Nothing to show yet.", "Reports and cash advances at every stage appear here, newest first."],
  PENDING: ["Nothing to verify right now.", "Expense reports reach Finance after the manager approves them."],
  ADVANCES: ["No cash advances waiting.", "Cash advances reach Finance after the manager approves them."],
  QUERIED: ["No open queries.", "Reports you send back to an employee for correction appear here until they resubmit."],
  VERIFIED: ["Nothing verified yet.", "Reports you verify appear here, with whether AP has paid the employee."],
};

// Type filter: the same request types as the badges in the Type column.
const TYPE_FILTER_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Expense", value: "EXPENSE" },
  { label: "Advance settlement", value: "SETTLEMENT" },
  { label: "Cash advance", value: "ADVANCE" },
  { label: "Supplementary claim", value: "SUPPLEMENTARY" },
];

// Quick actions in the banner. Each reuses an existing route; `roles` mirrors that route's guard in App.jsx.
const FINANCE_QUICK_ACTIONS = [
  { key: "settlement", label: "Settlement", hint: "Settle cash advance balances", icon: "Banknote", to: "/expense-management/cash-advance/settlement", primary: true },
  { key: "reports", label: "Expense reports", hint: "All expense reports, with their status", icon: "FileText", to: "/expense-management/reports", roles: ["FINANCE", "FINANCE_EXECUTIVE", "MANAGER", "ADMIN", "SUPER_ADMIN"] },
  { key: "financeDashboard", label: "Finance dashboard", hint: "Finance Management overview", icon: "ClipboardCheck", to: "/finance/dashboard" },
  { key: "itcRegister", label: "ITC register", hint: "GST you can claim back, for the GST return", icon: "Receipt", to: "/expense-management/finance/itc-register" },
  { key: "clientBilling", label: "Client billing", hint: "Client-billable expenses to invoice", icon: "ReceiptText", to: "/expense-management/client-billing", roles: ["FINANCE_EXECUTIVE"] },
];

/**
 * An expense row's status in the shared approval vocabulary (approvalStatus.jsx), so Finance, managers and employees
 * see the same name for the same stage: waiting on Finance, sent back, approved, with AP or paid.
 */
const financeStatusKey = (item) => {
  const tab = item.__tab;
  if (tab === "PENDING") return "PENDING_FINANCE";
  if (tab === "QUERIED") return "SENT_BACK";
  if (item.paymentRoutingStatus === "PAYMENT_COMPLETED") return "PAID";
  if (item.paymentRoutingStatus === "APPROVED_FOR_PAYMENT" || item.paymentRoutingStatus === "HANDOFF_FAILED") return "AWAITING_PAYMENT";
  return item.reportStatus ? expenseStatusKey(item) : "APPROVED";
};

// Rows read per status for the "All" view. Each status is paged on screen from this list.
const ALL_FETCH_SIZE = 100;

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

// Lines whose tax check failed: Finance must confirm the tax before verifying (same rule as the dashboard's count).
const TAX_REVIEW_STATUSES = ["MISMATCH", "REQUIRES_FINANCE_REVIEW"];
export const needsTaxReview = (lineItems) => (lineItems || []).some((l) => TAX_REVIEW_STATUSES.includes(l?.taxValidationStatus));
const TAX_FILTER_OPTIONS = [
  { label: "Any", value: "" },
  { label: "Needs tax review", value: "REVIEW" },
];

const initialsOf = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

/** Avatar, name and employee ID, resolved from the directory (falls back to the ID). */
function EmployeeCell({ employeeId, directory }) {
  const name = directory?.get(employeeId)?.name || directory?.get(String(employeeId))?.name;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A0082]/10 text-[11px] font-bold text-[#0A0082]">
        {name ? initialsOf(name) : "#"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{name || employeeId || "—"}</p>
        {name && employeeId && <p className="truncate text-[11px] text-slate-400">{employeeId}</p>}
      </div>
    </div>
  );
}

const FINANCE_COLUMNS = [
  { key: "type", label: "Type", className: "text-left" },
  { key: "employee", label: "Employee", className: "text-left" },
  { key: "amount", label: "Amount", className: "text-right" },
  { key: "status", label: "Status", className: "text-left" },
  { key: "date", label: "Date", className: "text-left" },
  { key: "action", label: "Action", className: "text-right" },
];

/** The Finance work list. Rows waiting on this user get an amber edge so they stand out. */
function FinanceTable({ rows }) {
  return (
    <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          {FINANCE_COLUMNS.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={`bg-blue-900 bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white first:rounded-tl-lg last:rounded-tr-lg ${col.className}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="group transition-colors hover:bg-slate-50/80">
            {FINANCE_COLUMNS.map((col, i) => (
              <td
                key={col.key}
                className={`border-b border-slate-100 px-4 py-3 align-middle ${col.className} ${
                  i === 0 ? `border-l-2 ${row.waiting ? "border-l-amber-400 bg-amber-50/30" : "border-l-transparent"}` : ""
                }`}
              >
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Finance - one page for the whole Finance Executive job: verify expense reports (To verify),
 * follow up on what was sent back (Queried), and see whether AP has paid verified reports
 * (Verified & payments). Replaces the old Verification / Reimbursements / Payment Status items.
 * Tabs: my-queue, history?status=QUERIED, history?status=VERIFIED; payment counts from
 * /payment-summary. Verify / Query happen in FinanceReviewPanel (opened with Review).
 */
export default function FinancePage() {
  // ?tab=QUERIED / VERIFIED / PENDING / ADVANCES opens that view (the Finance dashboard's cards link here).
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const t = String(searchParams.get("tab") || "").toUpperCase();
    return ["ALL", "PENDING", "ADVANCES", "QUERIED", "VERIFIED"].includes(t) ? t : "ALL";
  });
  const [pageByTab, setPageByTab] = useState({});
  const pageSize = DEFAULT_PAGE_SIZE;
  const [reviewingReport, setReviewingReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  // Column filters, the same bar as My Expenses and My Approvals. The cards above choose the stage.
  const EMPTY_COLUMNS = { type: "", status: "", employee: "", tax: "", amount: { min: "", max: "" }, date: { from: "", to: "" } };
  // ?tax=review (the dashboard's "Review now") opens only the reports with lines that need a tax check.
  const [columnFilters, setColumnFilters] = useState(() => ({
    ...EMPTY_COLUMNS,
    tax: String(searchParams.get("tax") || "").toLowerCase() === "review" ? "REVIEW" : "",
  }));

  const pageFor = (tab) => pageByTab[tab] ?? 0;
  const setPageFor = (tab, next) => setPageByTab((prev) => ({ ...prev, [tab]: next }));

  // "All" needs every row of each status, so it reads each status in one larger page and pages the merged list itself.
  const allView = activeTab === "ALL";
  const sourceSize = allView ? ALL_FETCH_SIZE : pageSize;
  const sourcePage = (tab) => (allView ? 0 : pageFor(tab));
  const pendingQuery = useFinanceQueue(sourcePage("PENDING"), sourceSize);
  const queriedQuery = useFinanceHistory("QUERIED", sourcePage("QUERIED"), sourceSize);
  const verifiedQuery = useFinanceHistory("VERIFIED", sourcePage("VERIFIED"), sourceSize);
  const { data: paymentSummary } = useFinancePaymentSummary();
  const { data: directory } = useEmployeeDirectory();

  // Cash advances for Finance sit in the same table as expense reports. One status choice drives both.
  const advancesQuery = useQuery({
    queryKey: ["financeCashAdvances"],
    queryFn: async () => {
      const res = await cashAdvanceApi.getMyApprovals({ size: 100 });
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : data.content || data.items || [];
    },
    staleTime: 30_000,
  });
  const allAdvances = advancesQuery.data || [];

  // Supplementary claims waiting for Finance (late or missing bills on paid reports) sit in the same table. An account
  // without the claim permission gets a 403; the table then simply shows none rather than failing.
  const supplementaryQuery = useQuery({
    queryKey: ["financeSupplementaryQueue"],
    queryFn: () => financeClaimService.queue().then(unwrapList),
    staleTime: 30_000,
    retry: false,
  });
  const pendingClaims = supplementaryQuery.data || [];
  const claimPath = (claim) => `/expense-management/finance/supplementary-claims/${claim.claimId}`;
  const advanceIsPending = (adv) => (adv.status || "").toUpperCase().includes("FINANCE");
  const advanceIsDone = (adv) => ["APPROVED", "DISBURSED", "SETTLED"].includes((adv.status || "").toUpperCase());
  const advanceRef = (adv) => adv.advanceNumber || `ADV-${String(adv.advanceId || adv.id || "").slice(0, 8).toUpperCase()}`;

  const [approvingAdvance, setApprovingAdvance] = useState(null);
  const [rejectingAdvance, setRejectingAdvance] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [advanceActionLoading, setAdvanceActionLoading] = useState(false);

  const confirmApprove = async () => {
    const advanceId = approvingAdvance.advanceId || approvingAdvance.id;
    setAdvanceActionLoading(true);
    try {
      await cashAdvanceApi.approve(advanceId);
      showStatusToast(`Cash advance ${advanceRef(approvingAdvance)} approved.`, "success");
      setApprovingAdvance(null);
      advancesQuery.refetch();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to approve cash advance", "error");
    } finally {
      setAdvanceActionLoading(false);
    }
  };

  const confirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showStatusToast("Rejection reason is mandatory when rejecting a request.", "error");
      return;
    }
    const advanceId = rejectingAdvance.advanceId || rejectingAdvance.id;
    setAdvanceActionLoading(true);
    try {
      await cashAdvanceApi.reject(advanceId, rejectionReason.trim());
      showStatusToast(`Cash advance ${advanceRef(rejectingAdvance)} rejected.`, "success");
      setRejectingAdvance(null);
      setRejectionReason("");
      advancesQuery.refetch();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to reject cash advance", "error");
    } finally {
      setAdvanceActionLoading(false);
    }
  };

  const queriesByTab = { PENDING: pendingQuery, QUERIED: queriedQuery, VERIFIED: verifiedQuery };
  const isAll = activeTab === "ALL";
  const isAdvancesTab = activeTab === "ADVANCES";
  // "All" and "Advances to approve" are paged on screen; the other statuses are paged by the server.
  const clientPaged = isAll || isAdvancesTab;
  const sourceQueries = [pendingQuery, queriedQuery, verifiedQuery];
  // "All" reads the first page of each expense status and merges them.
  const activeQuery = isAll
    ? {
        data: undefined,
        isLoading: sourceQueries.some((q) => q.isLoading),
        isError: sourceQueries.some((q) => q.isError),
        error: sourceQueries.find((q) => q.error)?.error,
        refetch: () => sourceQueries.forEach((q) => q.refetch()),
      }
    : isAdvancesTab
    ? {
        data: undefined,
        isLoading: advancesQuery.isLoading,
        isError: advancesQuery.isError,
        error: advancesQuery.error,
        refetch: advancesQuery.refetch,
      }
    : queriesByTab[activeTab];
  const { data, isLoading, isError, error, refetch } = activeQuery;

  // Each expense row remembers its own status (__tab) so its badge, action and review step match that status.
  const items = useMemo(() => {
    if (!isAll) return (data?.content || []).map((item) => ({ ...item, __tab: activeTab }));
    const tag = (q, tab) => (q.data?.content || []).map((item) => ({ ...item, __tab: tab }));
    return [
      ...tag(pendingQuery, "PENDING"),
      ...tag(queriedQuery, "QUERIED"),
      ...tag(verifiedQuery, "VERIFIED"),
    ].sort((a, b) =>
      String(b.submittedAt || b.actionedAt || "").localeCompare(String(a.submittedAt || a.actionedAt || ""))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAll, activeTab, data, pendingQuery.data, queriedQuery.data, verifiedQuery.data]);

  const tabOf = (item) => item.__tab || activeTab;

  const switchTab = (tab, payment = "") => {
    setActiveTab(tab);
    setPaymentFilter(tab === "VERIFIED" ? payment : "");
  };

  // One check for every row (expense reports and cash advances): type, status, employee, amount, date.
  const matchesColumns = (row) => {
    const { type, status, employee, tax, amount, date } = columnFilters;
    if (type && row.type !== type) return false;
    if (tax === "REVIEW" && !row.taxReview) return false;
    if (status && row.status !== status) return false;
    const emp = employee.trim().toLowerCase();
    if (emp && !`${row.employeeId || ""} ${row.employeeName || ""}`.toLowerCase().includes(emp)) return false;
    const n = Number(row.amount) || 0;
    if (amount.min !== "" && n < Number(amount.min)) return false;
    if (amount.max !== "" && n > Number(amount.max)) return false;
    if (date.from || date.to) {
      if (!row.date) return false;
      const d = new Date(row.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (date.from && day < new Date(`${date.from}T00:00:00`).getTime()) return false;
      if (date.to && day > new Date(`${date.to}T00:00:00`).getTime()) return false;
    }
    return true;
  };
  const nameOf = (employeeId) => directory?.get(employeeId)?.name || directory?.get(String(employeeId))?.name || "";

  // Search / payment filter work on the loaded page only - these endpoints take no such parameter.
  const filteredItems = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return items.filter((item) => {
      const empName = (directory?.get(item.employeeId)?.name || item.employeeId || "").toLowerCase();
      const matchesSearch =
        !query ||
        (item.reportNumber || "").toLowerCase().includes(query) ||
        merchantSummary(item.pendingLineItems).toLowerCase().includes(query) ||
        empName.includes(query) ||
        (item.title || "").toLowerCase().includes(query);
      const matchesPayment = tabOf(item) !== "VERIFIED" || !paymentFilter || item.paymentRoutingStatus === paymentFilter;
      const matchesCols = matchesColumns({
        type: reportTypeOf(item), status: financeStatusKey({ ...item, __tab: tabOf(item) }), employeeId: item.employeeId,
        employeeName: nameOf(item.employeeId), amount: item.totalAmount, date: item.submittedAt || item.actionedAt,
        taxReview: needsTaxReview(item.pendingLineItems),
      });
      return matchesSearch && matchesPayment && matchesCols;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchTerm, paymentFilter, directory, activeTab, columnFilters]);

  const navigate = useNavigate();

  // A pulsing dot marks rows that are waiting for this user.
  const WaitingDot = () => (
    <span className="relative mr-1.5 inline-flex h-2 w-2 shrink-0 align-middle" title="Waiting for you" aria-label="Waiting for you">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
    </span>
  );


  // Pending shows what Finance must act on; Verified shows what is done. Queried has only expense reports.
  const query = searchTerm.toLowerCase();
  const advanceList = isAll
    ? allAdvances.filter((adv) => advanceIsPending(adv) || advanceIsDone(adv))
    : isAdvancesTab
    ? allAdvances.filter(advanceIsPending)
    : activeTab === "VERIFIED"
    ? allAdvances.filter(advanceIsDone)
    : [];
  const advanceTabOf = (adv) => (advanceIsPending(adv) ? "PENDING" : "VERIFIED");
  const pendingAdvanceCount = allAdvances.filter(advanceIsPending).length;
  const doneAdvanceCount = allAdvances.filter(advanceIsDone).length;
  const pendingClaimCount = pendingClaims.length;
  const pendingReportCount = (pendingQuery.data?.totalElements ?? 0) + pendingClaimCount;
  const waitingCount = pendingReportCount + pendingAdvanceCount;
  const countFor = (tab) => {
    switch (tab) {
      case "ALL":
        return sourceQueries.reduce((sum, q) => sum + (q.data?.totalElements ?? 0), 0) + pendingClaimCount + pendingAdvanceCount + doneAdvanceCount;
      case "PENDING":
        return pendingReportCount;
      case "ADVANCES":
        return pendingAdvanceCount;
      case "VERIFIED":
        return (verifiedQuery.data?.totalElements ?? 0) + doneAdvanceCount;
      default:
        return queriesByTab[tab]?.data?.totalElements ?? 0;
    }
  };
  // Tabs with something waiting for this user get a dot.
  const tabNeedsYou = (tab) => (tab === "PENDING" ? pendingReportCount > 0 : tab === "ADVANCES" ? pendingAdvanceCount > 0 : tab === "ALL" && waitingCount > 0);
  const visibleAdvances = advanceList.filter(
    (adv) =>
      (!query ||
        [adv.title, adv.purpose, adv.employeeId, adv.employeeName, advanceRef(adv)].some((v) => (v || "").toLowerCase().includes(query))) &&
      matchesColumns({
        type: "ADVANCE", status: cashStatusKey(adv.status), employeeId: adv.employeeId || adv.employee_id,
        employeeName: adv.employeeName || nameOf(adv.employeeId || adv.employee_id), amount: adv.amount, date: adv.neededByDate || adv.createdAt,
      })
  );

  // Supplementary claims show under All and To verify (on its first page; that tab is paged by the server).
  const claimList = isAll || (activeTab === "PENDING" && pageFor("PENDING") === 0) ? pendingClaims : [];
  const visibleClaims = claimList.filter(
    (c) =>
      (!query ||
        [c.claimNumber, c.reportNumber, c.employeeId, nameOf(c.employeeId)].some((v) => (v || "").toLowerCase().includes(query))) &&
      matchesColumns({
        type: "SUPPLEMENTARY", status: "PENDING_FINANCE", employeeId: c.employeeId, employeeName: nameOf(c.employeeId),
        amount: c.totalAmount, date: c.submittedAt || c.createdAt,
      })
  );

  // Type column: the request type only. A row waiting for this user gets a small pulsing dot.
  const typeCell = (kind, waiting) => (
    <span className="inline-flex items-center whitespace-nowrap">
      {waiting && <WaitingDot />}
      <RequestTypeBadge type={kind} />
    </span>
  );
  const amountCell = (amount, currency) => (
    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{formatMoney(amount, currency)}</span>
  );
  const dateCell = (value) => <span className="whitespace-nowrap text-[13px] text-slate-600">{formatDate(value)}</span>;

  const allRows = [
    ...filteredItems.map((item) => ({
      key: `exp-${item.reportId || item.id || item.reportNumber}`,
      waiting: tabOf(item) === "PENDING",
      type: typeCell(reportTypeOf(item), tabOf(item) === "PENDING"),
      employee: <EmployeeCell employeeId={item.employeeId} directory={directory} />,
      amount: amountCell(item.totalAmount, item.currencyCode),
      status: (
        <ApprovalStatusBadge
          statusKey={financeStatusKey({ ...item, __tab: tabOf(item) })}
          detail={
            tabOf(item) === "PENDING" && hasIneligibleLines(item.pendingLineItems)
              ? "Needs attention"
              : item.paymentRoutingStatus === "HANDOFF_FAILED"
              ? "Handoff to AP failed"
              : null
          }
          detailTone="text-amber-700"
        />
      ),
      date: dateCell(item.submittedAt || item.actionedAt),
      action: (() => {
        // Finance verifies line by line, so each decision opens the review. Done reports can only be viewed.
        const pending = tabOf(item) === "PENDING";
        const done = pending ? null : tabOf(item) === "QUERIED" ? "Sent back; waiting for the employee" : "Already verified";
        return (
          <RowActions>
            <RowActionButton tone="view" icon={Eye} label={`View ${item.reportNumber || "report"}`} title="View the report" onClick={() => setReviewingReport(item)} />
            <RowActionButton tone="approve" icon={CheckCircle2} label="Verify" title={done || "Open the review to verify the lines"} disabled={!pending} onClick={() => setReviewingReport(item)} />
            <RowActionButton tone="clarify" icon={MessageSquareWarning} label="Send back" title={done || "Open the review to query a line"} disabled={!pending} onClick={() => setReviewingReport(item)} />
            <RowActionButton tone="reject" icon={XCircle} label="Reject" title={done || "Open the review to reject"} disabled={!pending} onClick={() => setReviewingReport(item)} />
          </RowActions>
        );
      })(),
    })),
    // Finance decides a supplementary claim on its own page (with the bills and receipts), so every action opens it.
    ...visibleClaims.map((c) => ({
      key: `supp-${c.claimId}`,
      waiting: true,
      type: typeCell("SUPPLEMENTARY", true),
      employee: <EmployeeCell employeeId={c.employeeId} directory={directory} />,
      amount: amountCell(c.totalAmount, c.currencyCode),
      status: <ApprovalStatusBadge statusKey="PENDING_FINANCE" detail={c.claimNumber} detailTone="text-slate-500" />,
      date: dateCell(c.submittedAt || c.createdAt),
      action: (
        <RowActions>
          <RowActionButton tone="view" icon={Eye} label={`View supplementary claim ${c.claimNumber}`} title="View the claim" onClick={() => navigate(claimPath(c))} />
          <RowActionButton tone="approve" icon={CheckCircle2} label={`Approve supplementary claim ${c.claimNumber}`} title="Open the claim to approve" onClick={() => navigate(claimPath(c))} />
          <RowActionButton tone="clarify" icon={MessageSquareWarning} label={`Ask about supplementary claim ${c.claimNumber}`} title="Open the claim to ask for clarification" onClick={() => navigate(claimPath(c))} />
          <RowActionButton tone="reject" icon={XCircle} label={`Reject supplementary claim ${c.claimNumber}`} title="Open the claim to reject" onClick={() => navigate(claimPath(c))} />
        </RowActions>
      ),
    })),
    ...visibleAdvances.map((adv) => ({
      key: `adv-${adv.advanceId || adv.id}`,
      waiting: advanceTabOf(adv) === "PENDING",
      type: typeCell("ADVANCE", advanceTabOf(adv) === "PENDING"),
      employee: <EmployeeCell employeeId={adv.employeeId || adv.employee_id} directory={directory} />,
      amount: amountCell(adv.amount, adv.currencyCode),
      status: <ApprovalStatusBadge statusKey={cashStatusKey(adv.status)} />,
      date: dateCell(adv.neededByDate),
      action: (() => {
        const pending = advanceTabOf(adv) === "PENDING";
        return (
          <RowActions>
            <RowActionButton tone="view" icon={Eye} label={`View cash advance ${advanceRef(adv)}`} title="View the advance" onClick={() => navigate(`/expense-management/approvals/cash-advance/${adv.advanceId || adv.id}`)} />
            <RowActionButton tone="approve" icon={CheckCircle2} label={`Approve cash advance ${advanceRef(adv)}`} title={pending ? "Approve" : "Already decided"} disabled={!pending} onClick={() => setApprovingAdvance(adv)} />
            <RowActionButton tone="clarify" icon={MessageSquareWarning} label="Send back" title="Cash advances are approved or rejected; give the reason when rejecting" disabled />
            <RowActionButton tone="reject" icon={XCircle} label={`Reject cash advance ${advanceRef(adv)}`} title={pending ? "Reject" : "Already decided"} disabled={!pending} onClick={() => setRejectingAdvance(adv)} />
          </RowActions>
        );
      })(),
    })),
  ];

  const pagerTab = activeTab;
  const listPage = pageFor(pagerTab);
  const rows = clientPaged ? allRows.slice(listPage * pageSize, (listPage + 1) * pageSize) : allRows;
  const listTotalPages = clientPaged ? Math.ceil(allRows.length / pageSize) : data?.totalPages ?? 0;

  const errorStatus = error?.response?.status;
  const isAuthError = errorStatus === 401 || errorStatus === 403;
  const [emptyTitle, emptyDescription] = EMPTY_TEXT[activeTab];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Finance" }]} />

      {/* Banner: what is waiting for Finance right now */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-6 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <ClipboardCheck size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Finance</h1>
              <p className="mt-0.5 text-sm text-white/70">Verify expense reports, approve cash advances and track AP payments.</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                {waitingCount > 0 ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden="true" />
                    {pendingReportCount} report{pendingReportCount === 1 ? "" : "s"} to verify · {pendingAdvanceCount} advance{pendingAdvanceCount === 1 ? "" : "s"} to approve
                  </>
                ) : (
                  <>
                    <BadgeCheck size={14} className="text-emerald-300" aria-hidden="true" />
                    You&apos;re all caught up
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        {/* Quick actions, as on the dashboard and My Approvals. */}
        <HeroQuickActions actions={FINANCE_QUICK_ACTIONS} />
      </section>

      {/* Summary cards; each also filters the list below */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { key: "ALL", label: "All", caption: "Every report and advance", icon: Layers, value: countFor("ALL"), tone: "bg-[#0A0082]/10 text-[#0A0082]", text: "text-[#0a174e]", active: "border-indigo-300 bg-indigo-50/40", isActive: activeTab === "ALL", onClick: () => switchTab("ALL") },
          { key: "PENDING", label: "To verify", caption: "Reports waiting on you", icon: ClipboardCheck, value: pendingReportCount, tone: "bg-amber-50 text-amber-600", text: "text-amber-600", active: "border-amber-300 bg-amber-50/40", isActive: activeTab === "PENDING", onClick: () => switchTab("PENDING"), dot: pendingReportCount > 0 },
          { key: "ADVANCES", label: "Advances", caption: "Cash advances to approve", icon: Wallet, value: pendingAdvanceCount, tone: "bg-[#ff3d72]/10 text-[#e0245e]", text: "text-[#e0245e]", active: "border-[#ff3d72]/40 bg-[#ff3d72]/[0.04]", isActive: isAdvancesTab, onClick: () => switchTab("ADVANCES"), dot: pendingAdvanceCount > 0 },
          { key: "QUERIED", label: "Queried", caption: "Back with the employee", icon: MessageSquareWarning, value: queriedQuery.data?.totalElements ?? 0, tone: "bg-rose-50 text-rose-600", text: "text-rose-600", active: "border-rose-300 bg-rose-50/40", isActive: activeTab === "QUERIED", onClick: () => switchTab("QUERIED") },
          { key: "WITH_AP", label: "With AP", caption: "Verified, not yet paid", icon: Hourglass, value: paymentSummary?.awaitingPaymentCount ?? 0, tone: "bg-indigo-50 text-indigo-600", text: "text-indigo-600", active: "border-indigo-300 bg-indigo-50/40", isActive: activeTab === "VERIFIED" && paymentFilter === "APPROVED_FOR_PAYMENT", onClick: () => switchTab("VERIFIED", "APPROVED_FOR_PAYMENT") },
          { key: "PAID", label: "Paid", caption: "Employee reimbursed", icon: BadgeCheck, value: paymentSummary?.paidCount ?? 0, tone: "bg-emerald-50 text-emerald-600", text: "text-emerald-600", active: "border-emerald-300 bg-emerald-50/40", isActive: activeTab === "VERIFIED" && paymentFilter === "PAYMENT_COMPLETED", onClick: () => switchTab("VERIFIED", "PAYMENT_COMPLETED") },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={card.isActive}
              onClick={card.onClick}
              className={`relative flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${card.isActive ? card.active : "border-slate-200"}`}
            >
              {card.dot && (
                <span className="absolute right-3 top-3 flex h-2.5 w-2.5" aria-label="Needs your action">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              )}
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</span>
                <span className={`block text-xl font-bold tabular-nums ${card.value > 0 ? card.text : "text-[#0a174e]"}`}>{card.value}</span>
                <span className="block truncate text-[11px] text-slate-400">{card.caption}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters: the same bar as My Expenses and My Approvals. The cards above choose the stage. */}
      <TableFilterBar
        filters={[
          { key: "search", label: "Search", type: "search", placeholder: "Report number, title, employee or merchant" },
          { key: "type", label: "Type", type: "select", options: TYPE_FILTER_OPTIONS },
          { key: "status", label: "Status", type: "select", options: APPROVAL_STATUS_OPTIONS },
          { key: "employee", label: "Employee", type: "search", placeholder: "Name or employee ID" },
          { key: "tax", label: "Tax", type: "select", options: TAX_FILTER_OPTIONS },
          { key: "amount", label: "Amount", type: "amountRange" },
          { key: "date", label: "Date", type: "dateRange" },
        ]}
        values={{ search: searchTerm, ...columnFilters }}
        onChange={(v) => {
          setSearchTerm(v.search ?? "");
          setColumnFilters({ type: v.type ?? "", status: v.status ?? "", employee: v.employee ?? "", tax: v.tax ?? "", amount: v.amount, date: v.date });
        }}
        onReset={() => {
          setSearchTerm("");
          setColumnFilters(EMPTY_COLUMNS);
        }}
        resultCount={allRows.length}
        totalCount={countFor(activeTab)}
        noun="items"
      />

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {isError ? (
        <div className="m-3 flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4">
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
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text="Loading…" />
        </div>
      ) : (
        <div className="p-3">
          {rows.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title={emptyTitle} description={emptyDescription} />
          ) : (
            <div className="w-full overflow-x-auto">
              <FinanceTable rows={rows} />
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={listPage + 1}
              totalPages={listTotalPages}
              onPrevious={() => setPageFor(pagerTab, Math.max(listPage - 1, 0))}
              onNext={() => setPageFor(pagerTab, Math.min(listPage + 1, listTotalPages - 1))}
            />
          </div>
        </div>
      )}
      </section>

      <Modal
        isOpen={!!approvingAdvance}
        onClose={() => setApprovingAdvance(null)}
        title="Approve cash advance"
        subtitle={approvingAdvance ? `${advanceRef(approvingAdvance)} - ${approvingAdvance.employeeName || approvingAdvance.employeeId || ""}` : ""}
        size="md"
      >
        <div className="space-y-4 text-sm">
          <p className="text-gray-700">
            Approve this cash advance of {formatMoney(approvingAdvance?.amount, approvingAdvance?.currencyCode)}? It moves on to disbursement.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApprovingAdvance(null)} disabled={advanceActionLoading}>Cancel</Button>
            <Button variant="success" onClick={confirmApprove} disabled={advanceActionLoading} loading={advanceActionLoading}>Approve</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!rejectingAdvance}
        onClose={() => { setRejectingAdvance(null); setRejectionReason(""); }}
        title="Reject cash advance"
        subtitle={rejectingAdvance ? advanceRef(rejectingAdvance) : ""}
        size="md"
      >
        <form onSubmit={confirmReject} className="space-y-4 text-sm">
          <label htmlFor="advance-reject-reason" className="block font-medium text-gray-900">Reason (required)</label>
          <textarea
            id="advance-reject-reason"
            rows={3}
            maxLength={500}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setRejectingAdvance(null); setRejectionReason(""); }} disabled={advanceActionLoading}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={advanceActionLoading} loading={advanceActionLoading}>Reject</Button>
          </div>
        </form>
      </Modal>

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
