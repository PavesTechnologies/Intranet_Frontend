import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Inbox, Layers, RefreshCw, XCircle } from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Pagination from "@/components/Pagination/pagination";
import PendingApprovalsPage from "./PendingApprovalsPage";
import ApprovalHistoryPage from "./ApprovalHistoryPage";
import CashAdvanceApprovalsList from "../components/CashAdvanceApprovalsList";
import FinanceVerificationApprovalsList, { FINANCE_APPROVALS_PAGE_SIZE } from "../components/FinanceVerificationApprovalsList";
import { useFinanceQueue } from "@/pages/expense-management/pages/finance/hooks/useFinanceVerification";
import SupplementaryApprovalsList from "../components/SupplementaryApprovalsList";
import MyDelegateCard from "../components/MyDelegateCard";
import { useMyQueue, useMyHistory } from "../hooks/useApprovalWorkflow";
import TableFilterBar from "@/pages/expense-management/components/common/TableFilterBar";
import { HeroQuickActions } from "@/pages/expense-management/components/dashboard/DashboardHero";
import { APPROVAL_STATUS_OPTIONS } from "../components/approvalStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

const QUEUE_PAGE_SIZE = 20;
// Rows per page across the whole table: expense reports first, then cash advances, as one sequence.
const APPROVALS_PAGE_SIZE = 10;

// Which kinds of request the table shows, on every tab.
const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Expense reports", value: "EXPENSE" },
  { label: "Cash advances", value: "CASH" },
  { label: "Supplementary claims", value: "SUPP" },
];

// Cash advances only: approved as requested, or at a lower amount.
const AMOUNT_OPTIONS = [
  { label: "Any", value: "" },
  { label: "Approved in full", value: "FULL" },
  { label: "Approved lower amount", value: "REDUCED" },
];

const PENDING_SORT_OPTIONS = [
  { label: "Newest first", value: "" },
  { label: "Oldest first", value: "OLDEST" },
  { label: "Amount, high to low", value: "AMOUNT_DESC" },
];

// Quick actions in the banner. Each reuses an existing route; `roles` mirrors that route's guard.
const APPROVER_QUICK_ACTIONS = [
  { key: "myExpenses", label: "My Expenses", hint: "Your own expense reports", icon: "FileText", to: "/expense-management/expenses/my", primary: true },
  { key: "submit", label: "Submit expense", hint: "Create an expense report", icon: "ReceiptText", to: "/expense-management/expenses/create", roles: ["GENERAL", "MANAGER"] },
  { key: "myAdvances", label: "My Advances", hint: "Your cash advances and balances", icon: "Wallet", to: "/expense-management/cash-advance/my" },
  { key: "team", label: "Team expenses", hint: "Expense reports from your team", icon: "FileText", to: "/expense-management/expenses/all", roles: ["MANAGER"] },
  { key: "supplementary", label: "Supplementary review", hint: "Supplementary claims waiting for you", icon: "ClipboardCheck", to: "/expense-management/manager/supplementary-claims", roles: ["MANAGER"] },
];

// `embedded`: rendered inside another page (the Finance dashboard), so the page's own breadcrumb and banner are
// dropped and a compact summary line with its own refresh takes their place. Queries, tabs and actions are unchanged.
// Every source the table can show: each request type, for each status.
const SOURCE_KEYS = ["expense", "cash", "supp"].flatMap((kind) => ["pending", "approved", "rejected"].map((o) => `${kind}-${o}`));

/** A small red dot on the Pending card and tab when new requests arrived since the tab was last opened. */
function NewDot() {
  return (
    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5" role="status" aria-label="New requests waiting">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
    </span>
  );
}

export default function ApprovalsPage({ embedded = false }) {
  const { hasRole, user } = useAuth();

  // -----------------------------
  // State
  // -----------------------------
  // "All" by default: a request stays in view after a decision, with its new status, instead of leaving the list.
  const [activeTab, setActiveTab] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  // Column filters, applied by every list in the table (expense reports, Finance, cash advances, supplementary claims).
  const EMPTY_COLUMNS = { status: "", employee: "", costCenter: "", amount: { min: "", max: "" }, submitted: { from: "", to: "" } };
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMNS);
  const showType = (t) => !typeFilter || typeFilter === t;
  // Rows each list currently shows, keyed by source ("cash-approved", ...), so the page can page them as one table
  // and show one empty message for the whole table. One stable reporter per source.
  const [rowCounts, setRowCounts] = useState({});
  const rowReporters = useMemo(
    () =>
      Object.fromEntries(
        SOURCE_KEYS.map((key) => [
          key,
          (count) => setRowCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count })),
        ])
      ),
    []
  );

  const [pendingSort, setPendingSort] = useState("");

  // One pager for the whole table. The expense rows and the cash advance rows form one sequence (expense rows first),
  // and each child renders only the slice of its own rows that falls inside the current page.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchTerm, pendingSort, typeFilter, amountFilter, columnFilters]);
  // The cash amount filter only applies to cash advances; it is reset when it no longer applies.
  useEffect(() => {
    if (typeFilter !== "CASH" || activeTab === "pending") setAmountFilter("");
  }, [typeFilter, activeTab]);

  // One check for every list: employee (name or ID), cost center, amount range, submitted date range. Null when no
  // column filter is set, so the lists skip it.
  const rowFilter = useMemo(() => {
    const { status, employee, costCenter, amount, submitted } = columnFilters;
    const emp = employee.trim().toLowerCase();
    const cc = costCenter.trim().toLowerCase();
    const hasAmount = amount.min !== "" || amount.max !== "";
    const hasDate = Boolean(submitted.from || submitted.to);
    if (!status && !emp && !cc && !hasAmount && !hasDate) return null;
    return (row) => {
      // Same status keys in every list (approvalStatus.jsx), so one filter works for the whole table.
      if (status && row.status !== status) return false;
      if (emp && !`${row.employeeId || ""} ${row.employeeName || ""}`.toLowerCase().includes(emp)) return false;
      if (cc && !String(row.costCenter || "").toLowerCase().includes(cc)) return false;
      const n = Number(row.amount) || 0;
      if (amount.min !== "" && n < Number(amount.min)) return false;
      if (amount.max !== "" && n > Number(amount.max)) return false;
      if (hasDate) {
        if (!row.date) return false;
        const d = new Date(row.date);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (submitted.from && day < new Date(`${submitted.from}T00:00:00`).getTime()) return false;
        if (submitted.to && day > new Date(`${submitted.to}T00:00:00`).getTime()) return false;
      }
      return true;
    };
  }, [columnFilters]);
  // -----------------------------
  // Role check
  // -----------------------------
  // Only people who approve other employees' requests see the approval categories. General (employee)
  // and Admin/Finance roles are not approvers here; Finance has its own category below. The server
  // still decides which items each user can act on.
  const isManager = hasRole
    ? hasRole([
        "Manager",
        "MANAGER",
        "Reporting_Manager",
        "Project_Manager",
        "Delivery_Manager",
        "Resource_Manager",
      ])
    : false;

  // Finance verification queue, shown as a category so Finance users work from Approvals.
  const isFinance = hasRole
    ? hasRole(["Finance", "FINANCE", "Finance_Executive", "FINANCE_EXECUTIVE"])
    : false;

  // The table is one sequence of sources: for each status on this tab (All shows pending, then approved, then rejected),
  // expense reports, then cash advances, then supplementary claims. A source hidden by the type filter is left out.
  const outcomes = activeTab === "all" ? ["pending", "approved", "rejected"] : [activeTab];
  const sources = outcomes.flatMap((outcome) => [
    ...(showType("EXPENSE") ? [{ kind: "expense", outcome, key: `expense-${outcome}` }] : []),
    ...(isManager || isFinance
      ? [
          ...(showType("CASH") ? [{ kind: "cash", outcome, key: `cash-${outcome}` }] : []),
          ...(showType("SUPP") ? [{ kind: "supp", outcome, key: `supp-${outcome}` }] : []),
        ]
      : []),
  ]);
  const combinedRows = sources.reduce((sum, src) => sum + (rowCounts[src.key] ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(combinedRows / APPROVALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const winStart = safePage * APPROVALS_PAGE_SIZE;
  const winEnd = winStart + APPROVALS_PAGE_SIZE;
  // Each source renders only its own slice of the current page.
  let offset = 0;
  const windows = {};
  for (const src of sources) {
    const count = rowCounts[src.key] ?? 0;
    windows[src.key] = {
      start: Math.max(Math.min(winStart - offset, count), 0),
      end: Math.max(Math.min(winEnd - offset, count), 0),
    };
    offset += count;
  }

  const allReported = sources.every((src) => rowCounts[src.key] !== undefined);
  const showEmptyTable = allReported && combinedRows === 0;

  // -----------------------------
  // Breadcrumbs
  // -----------------------------
  const breadcrumbs = [
    {
      label: "Expense Management",
      to: "/expense-management/dashboard",
    },
    {
      label: "Approvals",
    },
  ];

  // -----------------------------
  // Approval data
  // -----------------------------
  const queueQuery = useMyQueue(0, QUEUE_PAGE_SIZE);

  const approvedQuery = useMyHistory(
    "APPROVED",
    0,
    QUEUE_PAGE_SIZE
  );

  const rejectedQuery = useMyHistory(
    "REJECTED",
    0,
    QUEUE_PAGE_SIZE
  );

  // -----------------------------
  // Counts
  // -----------------------------
  // Cash advance totals per tab, from the same endpoint the Cash Advances list uses,
  // so the cards and the list agree. Only the total is needed, so ask for one row.
  const cashAdvanceCountQuery = (status) => ({
    queryKey: ["cashAdvanceApprovalCount", status ?? "PENDING", reloadKey],
    queryFn: async () => {
      const res = await cashAdvanceApi.getMyApprovals({ status, page: 0, size: 1 });
      return res.data?.data?.totalElements ?? 0;
    },
  });

  const cashAdvancePendingQuery = useQuery(cashAdvanceCountQuery());
  const cashAdvanceApprovedQuery = useQuery(cashAdvanceCountQuery("APPROVED"));
  const cashAdvanceRejectedQuery = useQuery(cashAdvanceCountQuery("REJECTED"));

  // Finance users also work the role-based Finance Verification queue from here. Same page/size as
  // FinanceVerificationApprovalsList so both share one cached request.
  const financeQueueQuery = useFinanceQueue(0, FINANCE_APPROVALS_PAGE_SIZE, { enabled: isFinance });
  // Reports already in the caller's own approval queue (they hold the Finance assignment) are not
  // shown or counted twice.
  const myQueueReportIds = new Set((queueQuery.data?.content || []).map((item) => item.reportId));
  const financeDuplicates = (financeQueueQuery.data?.content || []).filter((item) => myQueueReportIds.has(item.reportId)).length;
  const financePendingCount = isFinance ? Math.max((financeQueueQuery.data?.totalElements ?? 0) - financeDuplicates, 0) : 0;

  const pendingCount =
    (queueQuery.data?.totalElements ?? 0) + (cashAdvancePendingQuery.data ?? 0) + financePendingCount;
  const approvedCount =
    (approvedQuery.data?.totalElements ?? 0) + (cashAdvanceApprovedQuery.data ?? 0);
  const rejectedCount =
    (rejectedQuery.data?.totalElements ?? 0) + (cashAdvanceRejectedQuery.data ?? 0);

  const totalCount =
    pendingCount + approvedCount + rejectedCount;

  // -----------------------------
  // Reload
  // -----------------------------
  const handleReload = () => {
    setReloadKey((prev) => prev + 1);

    queueQuery.refetch();
    approvedQuery.refetch();
    rejectedQuery.refetch();
    if (isFinance) financeQueueQuery.refetch();
  };

  // -----------------------------
  // Search
  // -----------------------------

  // -----------------------------
  // Which cash advance stage this page acts on: managers approve at manager stage; a Finance-only
  // user approves at finance stage. A user with both roles sees the manager stage here and the
  // finance stage on the Finance tab.

  const loadingCounts =
    queueQuery.isLoading || approvedQuery.isLoading || rejectedQuery.isLoading ||
    cashAdvancePendingQuery.isLoading || cashAdvanceApprovedQuery.isLoading || cashAdvanceRejectedQuery.isLoading ||
    (isFinance && financeQueueQuery.isLoading);
  const decided = approvedCount + rejectedCount;
  const approvalRate = decided > 0 ? Math.round((approvedCount / decided) * 100) : null;

  // How long the oldest request in your queue has waited (expense reports and the Finance queue; their submit dates).
  const oldestWaitingDays = (() => {
    const dates = [...(queueQuery.data?.content || []), ...(isFinance ? financeQueueQuery.data?.content || [] : [])]
      .map((i) => (i.submittedAt ? new Date(i.submittedAt).getTime() : null))
      .filter(Boolean);
    if (!dates.length) return null;
    return Math.max(0, Math.floor((Date.now() - Math.min(...dates)) / 86400000));
  })();
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const reportTotal =
    (queueQuery.data?.totalElements ?? 0) + financePendingCount + (approvedQuery.data?.totalElements ?? 0) + (rejectedQuery.data?.totalElements ?? 0);
  const cashTotal = (cashAdvancePendingQuery.data ?? 0) + (cashAdvanceApprovedQuery.data ?? 0) + (cashAdvanceRejectedQuery.data ?? 0);
  const pct = (n) => (decided > 0 ? Math.round((n / decided) * 100) : null);
  const isRefreshing = queueQuery.isFetching || approvedQuery.isFetching || rejectedQuery.isFetching;

  // -----------------------------
  // Tabs: each is also a summary card, so the numbers and the list never disagree about what is selected.
  // -----------------------------
  // A dot on Pending when requests arrived since the approver last opened that tab.
  const seenKey = `approvals.pendingSeen.${user?.employeeId || "me"}`;
  const [pendingSeen, setPendingSeen] = useState(() => {
    try {
      return Number(window.localStorage.getItem(seenKey)) || 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    if (activeTab !== "pending" || loadingCounts) return;
    setPendingSeen(pendingCount);
    try {
      window.localStorage.setItem(seenKey, String(pendingCount));
    } catch {
      // Storage can be unavailable (private mode); the dot then simply shows until the tab is opened.
    }
  }, [activeTab, loadingCounts, pendingCount, seenKey]);
  const hasNewPending = !loadingCounts && pendingCount > pendingSeen;

  const tabs = [
    {
      key: "all",
      label: "All",
      caption: `${plural(reportTotal, "report")} · ${plural(cashTotal, "cash advance")}`,
      icon: Layers,
      count: totalCount,
      tone: { tile: "bg-[#0A0082]/10 text-[#0A0082]", text: "text-[#0a174e]", ring: "ring-indigo-300", active: "border-indigo-300 bg-indigo-50/40", bar: "from-indigo-500 to-blue-400", chip: "bg-indigo-100 text-indigo-800" },
      empty: { icon: Inbox, title: "Nothing here yet", text: "Requests your team sends you, and your decisions on them, will be listed here." },
    },
    {
      key: "pending",
      label: "Pending",
      caption: pendingCount === 0 ? "Nothing waiting for you" : oldestWaitingDays === null ? "Waiting for your decision" : oldestWaitingDays === 0 ? "Oldest arrived today" : `Oldest waiting ${plural(oldestWaitingDays, "day")}`,
      icon: Clock,
      count: pendingCount,
      tone: { tile: "bg-amber-50 text-amber-600", text: "text-amber-600", ring: "ring-amber-300", active: "border-amber-300 bg-amber-50/40", bar: "from-amber-400 to-orange-300", chip: "bg-amber-100 text-amber-800" },
      empty: { icon: Inbox, title: "You're all caught up", text: "Nothing is waiting for your approval right now. New requests from your team will show up here." },
    },
    {
      key: "approved",
      label: "Approved",
      caption: pct(approvedCount) === null ? "Requests you approved" : `${pct(approvedCount)}% of your decisions`,
      icon: CheckCircle2,
      count: approvedCount,
      tone: { tile: "bg-emerald-50 text-emerald-600", text: "text-emerald-600", ring: "ring-emerald-300", active: "border-emerald-300 bg-emerald-50/40", bar: "from-emerald-500 to-teal-400", chip: "bg-emerald-100 text-emerald-800" },
      empty: { icon: CheckCircle2, title: "No approvals yet", text: "Requests you approve will be listed here." },
    },
    {
      key: "rejected",
      label: "Rejected",
      caption: pct(rejectedCount) === null ? "Requests you rejected" : `${pct(rejectedCount)}% of your decisions`,
      icon: XCircle,
      count: rejectedCount,
      tone: { tile: "bg-rose-50 text-rose-600", text: "text-rose-600", ring: "ring-rose-300", active: "border-rose-300 bg-rose-50/40", bar: "from-[#ff3d72] to-[#ff7aa0]", chip: "bg-rose-100 text-rose-800" },
      empty: { icon: XCircle, title: "Nothing rejected", text: "Requests you reject will be listed here." },
    },
  ];
  const active = tabs.find((t) => t.key === activeTab) || tabs[0];
  // Empty only when every list has reported zero rows (supplementary claims included) and, on Pending,
  // the Finance verification rows (not part of the paged lists) are empty too.
  const showEmpty =
    showEmptyTable && !((activeTab === "pending" || activeTab === "all") && showType("EXPENSE") && financePendingCount > 0);
  const EmptyIcon = active.empty.icon;

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className={embedded ? "space-y-4" : "space-y-4 p-4 sm:p-6"} data-approvals-embedded={embedded || undefined}>
      {!embedded && <Breadcrumb items={breadcrumbs} />}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Expense reports and cash advances routed to you for a decision.
            {approvalRate !== null && (
              <span className="ml-1">
                You have approved <b className="tabular-nums text-emerald-700">{approvalRate}%</b> of {decided} decision{decided === 1 ? "" : "s"}.
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0A0082] transition hover:border-[#0A0082]/30"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
            Refresh approvals
          </button>
        </div>
      )}

      {/* Banner: what is waiting, and how decisions have gone so far */}
      {!embedded && (
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-6 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <ClipboardCheck size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">My Approvals</h1>
              <p className="mt-0.5 text-sm text-white/70">Expense reports and cash advances your team has sent you.</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                {loadingCounts ? (
                  "Checking your queue..."
                ) : pendingCount > 0 ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden="true" />
                    {pendingCount} request{pendingCount === 1 ? "" : "s"} waiting for your decision
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" aria-hidden="true" />
                    You&apos;re all caught up
                  </>
                )}
              </p>
            </div>
          </div>

        </div>
        {/* Quick actions, as on the dashboard: the approver's own expenses and advances are one click away. */}
        <HeroQuickActions actions={APPROVER_QUICK_ACTIONS} />
      </section>
      )}

      {/* Summary cards; the first three also switch the list below */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...tabs.slice(1), tabs[0]].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              data-approvals-card={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
                isActive ? tab.tone.active : "border-slate-200"
              }`}
            >
              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tab.tone.tile}`}>
                <Icon size={18} aria-hidden="true" />
                {tab.key === "pending" && hasNewPending && <NewDot />}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tab.label}</span>
                <span className={`block text-xl font-bold tabular-nums ${tab.count > 0 ? tab.tone.text : "text-[#0a174e]"}`}>
                  {loadingCounts ? <span className="text-slate-300">0</span> : tab.count}
                </span>
                <span className="block truncate text-[11px] text-slate-400">{tab.caption}</span>
              </span>
            </button>
          );
        })}

      </div>

      {/* Delegate: only relevant while there is a queue to cover */}
      {(activeTab === "pending" || activeTab === "all") && <MyDelegateCard />}

      {/* Filters: one per table column, the same bar as My Expenses and My Advances. The cards above choose the status. */}
      <TableFilterBar
        filters={[
          { key: "search", label: "Search", type: "search", placeholder: "Number, title or category" },
          { key: "type", label: "Type", type: "select", options: TYPE_OPTIONS },
          { key: "status", label: "Status", type: "select", options: APPROVAL_STATUS_OPTIONS },
          { key: "employee", label: "Employee", type: "search", placeholder: "Name or employee ID" },
          { key: "costCenter", label: "Cost center", type: "search", placeholder: "Cost center" },
          { key: "amount", label: "Amount", type: "amountRange" },
          { key: "submitted", label: "Submitted", type: "dateRange" },
          ...(activeTab === "pending" || activeTab === "all"
            ? [
                { key: "sort", label: "Sort by", type: "select", options: PENDING_SORT_OPTIONS },
              ]
            : []),
          ...((activeTab === "approved" || activeTab === "all") && typeFilter === "CASH"
            ? [{ key: "cashAmount", label: "Approved amount", type: "select", options: AMOUNT_OPTIONS }]
            : []),
        ]}
        values={{
          search: searchTerm, type: typeFilter, status: columnFilters.status, sort: pendingSort, cashAmount: amountFilter,
          employee: columnFilters.employee, costCenter: columnFilters.costCenter,
          amount: columnFilters.amount, submitted: columnFilters.submitted,
        }}
        onChange={(v) => {
          setSearchTerm(v.search ?? "");
          setTypeFilter(v.type ?? "");
          setPendingSort(v.sort ?? "");
          setAmountFilter(v.cashAmount ?? "");
          setColumnFilters({ status: v.status ?? "", employee: v.employee ?? "", costCenter: v.costCenter ?? "", amount: v.amount, submitted: v.submitted });
        }}
        onReset={() => {
          setSearchTerm("");
          setTypeFilter("");
          setPendingSort("");
          setAmountFilter("");
          setColumnFilters(EMPTY_COLUMNS);
        }}
        resultCount={combinedRows}
        totalCount={active.count}
        noun={`${active.label.toLowerCase() === "all" ? "" : active.label.toLowerCase() + " "}requests`}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="approvals-tab-container">
          <div className="overflow-x-auto">
          <table className="approvals-table w-full min-w-[1000px] table-fixed text-left text-sm">
            {/* Fixed column widths: each header sits exactly above its cells, whatever the row content is.
                Actions has a fixed width wide enough for four icon buttons, so they never wrap onto a second line. */}
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[23%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[168px]" />
            </colgroup>
            {/* Blue header, the same as every other table in Expense Management. */}
            <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-[10.5px] font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-2.5 py-2.5 text-left">Type</th>
                <th className="px-2.5 py-2.5 text-left">Employee</th>
                <th className="px-2.5 py-2.5 text-left">Title</th>
                <th className="px-2.5 py-2.5 text-left">Cost Center</th>
                <th className="px-2.5 py-2.5 text-left">Status</th>
                <th className="px-2.5 py-2.5 text-right">Requested</th>
                <th className="px-2.5 py-2.5 text-right">Approved</th>
                <th className="px-2.5 py-2.5 text-right">Paid</th>
                <th className="px-2.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            {sources.map((src) => {
              const win = windows[src.key];
              const onRowCount = rowReporters[src.key];
              if (src.kind === "expense" && src.outcome === "pending") {
                return (
                  <React.Fragment key={`${src.key}-${reloadKey}`}>
                    <PendingApprovalsPage
                      searchTerm={searchTerm}
                      statusFilter="ALL"
                      sortBy={pendingSort || "NEWEST"}
                      rowFilter={rowFilter}
                      hideHeader
                      noPadding
                      embedded
                      onRowCount={onRowCount}
                      windowStart={win.start}
                      windowEnd={win.end}
                    />
                    {isFinance && <FinanceVerificationApprovalsList searchTerm={searchTerm} excludeReportIds={myQueueReportIds} rowFilter={rowFilter} />}
                  </React.Fragment>
                );
              }
              if (src.kind === "expense") {
                return (
                  <ApprovalHistoryPage
                    key={`${src.key}-${reloadKey}`}
                    outcome={src.outcome.toUpperCase()}
                    searchTerm={searchTerm}
                    rowFilter={rowFilter}
                    embedded
                    onRowCount={onRowCount}
                    windowStart={win.start}
                    windowEnd={win.end}
                  />
                );
              }
              if (src.kind === "cash") {
                return (
                  <CashAdvanceApprovalsList
                    key={`${src.key}-${reloadKey}`}
                    activeTab={src.outcome}
                    searchTerm={searchTerm}
                    amountFilter={src.outcome === "approved" && amountFilter ? amountFilter : "ALL"}
                    rowFilter={rowFilter}
                    embedded
                    onRowCount={onRowCount}
                    onDecided={handleReload}
                    windowStart={win.start}
                    windowEnd={win.end}
                  />
                );
              }
              return (
                <SupplementaryApprovalsList
                  key={`${src.key}-${reloadKey}`}
                  activeTab={src.outcome}
                  searchTerm={searchTerm}
                  rowFilter={rowFilter}
                  isManager={isManager}
                  isFinance={isFinance}
                  onRowCount={onRowCount}
                  windowStart={win.start}
                  windowEnd={win.end}
                />
              );
            })}
            {showEmpty && (
              <tbody data-approvals-empty>
                <tr>
                  <td colSpan={9} className="px-4 py-14">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${active.tone.tile}`}>
                        <EmptyIcon size={26} aria-hidden="true" />
                      </span>
                      <p className="mt-4 text-base font-semibold text-[#0a174e]">{active.empty.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{active.empty.text}</p>
                      {activeTab === "pending" && approvedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("approved")}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#0A0082] transition hover:border-[#0A0082]/30 hover:bg-[#0A0082]/5"
                        >
                          See the {approvedCount} you approved
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
          {/* One row style for every list in the table (expenses, finance, cash advances, supplementary claims). */}
          <style>{`
            .approvals-table > tbody > tr { background: #fff !important; border-bottom: 1px solid #EEF0F6; transition: background-color .15s ease; }
            .approvals-table > tbody > tr:hover { background: #F8F9FD !important; }
            .approvals-table > tbody > tr > td:not([colspan]) { padding: 14px 12px !important; vertical-align: middle; }
            .approvals-table > tbody > tr > td[title="Shown for cash advances only"] { color: #CBD5E1; }
          `}</style>
          </div>
        {combinedRows > 0 && (
          // Pager in the middle of the table's foot.
          <div className="flex items-center justify-center border-t border-slate-100 px-4 py-3" data-approvals-pager>
            <Pagination
              currentPage={safePage + 1}
              totalPages={totalPages}
              onPrevious={() => setPage(Math.max(safePage - 1, 0))}
              onNext={() => setPage(Math.min(safePage + 1, totalPages - 1))}
            />
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
