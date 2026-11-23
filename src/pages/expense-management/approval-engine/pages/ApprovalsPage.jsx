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
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

const QUEUE_PAGE_SIZE = 20;
// Rows per page across the whole table: expense reports first, then cash advances, as one sequence.
const APPROVALS_PAGE_SIZE = 10;

const PENDING_SHOW_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Ready to approve", value: "PENDING" },
  { label: "Policy warnings", value: "FLAGGED" },
  { label: "Awaiting employee", value: "AWAITING" },
];

// Which kinds of request the table shows, on every tab.
const TYPE_OPTIONS = [
  { label: "All types", value: "ALL" },
  { label: "Expense reports", value: "EXPENSE" },
  { label: "Cash advances", value: "CASH" },
  { label: "Supplementary claims", value: "SUPP" },
];

// Cash advances only: approved as requested, or at a lower amount.
const AMOUNT_OPTIONS = [
  { label: "Any amount", value: "ALL" },
  { label: "Approved in full", value: "FULL" },
  { label: "Approved lower amount", value: "REDUCED" },
];

// Statuses the table can show (the "all" view shows them in this order), and the lists behind each.
const STATUS_KEYS = ["pending", "approved", "rejected"];
const LIST_TYPES = ["expense", "cash", "supp"];

const PENDING_SORT_OPTIONS = [
  { label: "Newest first", value: "NEWEST" },
  { label: "Oldest first", value: "OLDEST" },
  { label: "Amount, high to low", value: "AMOUNT_DESC" },
];

// `embedded`: rendered inside another page (the Finance dashboard), so the page's own breadcrumb and banner are
// dropped and a compact summary line with its own refresh takes their place. Queries, tabs and actions are unchanged.
export default function ApprovalsPage({ embedded = false }) {
  const { hasRole } = useAuth();

  // -----------------------------
  // State
  // -----------------------------
  // "all" (the default) shows every status in one table; Pending / Approved / Rejected filter it.
  const [activeTab, setActiveTab] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingShow, setPendingShow] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [amountFilter, setAmountFilter] = useState("ALL");
  const showType = (t) => typeFilter === "ALL" || typeFilter === t;
  // Rows each list currently shows, keyed by status and type (e.g. "approved-cash"), so the page can page across
  // every list and show one empty message for the whole table.
  const [rowCounts, setRowCounts] = useState({});
  const reporters = useMemo(() => {
    const map = {};
    STATUS_KEYS.forEach((status) =>
      LIST_TYPES.forEach((type) => {
        const key = `${status}-${type}`;
        map[key] = (count) => setRowCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
      })
    );
    return map;
  }, []);

  const [pendingSort, setPendingSort] = useState("NEWEST");

  // One pager for the whole table. The rows form one sequence - status by status (pending, approved, rejected), and
  // within each status expense reports, then cash advances, then supplementary claims - and each list renders only
  // the slice of its own rows that falls inside the current page.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchTerm, pendingShow, pendingSort, typeFilter, amountFilter]);
  // The amount filter only applies to approved cash advances; it is reset when it no longer applies.
  useEffect(() => {
    if (typeFilter !== "CASH" || activeTab !== "approved") setAmountFilter("ALL");
  }, [typeFilter, activeTab]);

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

  // The statuses this view shows, and the lists mounted for each (a list hidden by the type filter adds no rows).
  const visibleStatuses = activeTab === "all" ? STATUS_KEYS : [activeTab];
  const mountedLists = [
    ...(showType("EXPENSE") ? ["expense"] : []),
    ...(isManager || isFinance ? [...(showType("CASH") ? ["cash"] : []), ...(showType("SUPP") ? ["supp"] : [])] : []),
  ];
  const segments = visibleStatuses.flatMap((status) => mountedLists.map((type) => `${status}-${type}`));
  const allReported = segments.every((key) => rowCounts[key] !== undefined);
  const combinedRows = segments.reduce((sum, key) => sum + (rowCounts[key] ?? 0), 0);
  const showEmptyTable = allReported && combinedRows === 0;

  const totalPages = Math.max(1, Math.ceil(combinedRows / APPROVALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const winStart = safePage * APPROVALS_PAGE_SIZE;
  const winEnd = winStart + APPROVALS_PAGE_SIZE;
  // Each list covers its own slice of the one sequence.
  const windows = {};
  segments.reduce((offset, key) => {
    const count = rowCounts[key] ?? 0;
    windows[key] = {
      start: Math.max(Math.min(winStart - offset, count), 0),
      end: Math.max(Math.min(winEnd - offset, count), 0),
    };
    return offset + count;
  }, 0);
  const windowOf = (key) => windows[key] || { start: 0, end: 0 };

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
  const handleSearch = (value) => {
    setSearchTerm(value || "");
  };

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
  const isRefreshing = queueQuery.isFetching || approvedQuery.isFetching || rejectedQuery.isFetching;

  // -----------------------------
  // Tabs: each is also a summary card, so the numbers and the list never disagree about what is selected.
  // -----------------------------
  const tabs = [
    {
      key: "pending",
      label: "Pending",
      caption: "Waiting for your decision",
      icon: Clock,
      count: pendingCount,
      tone: { tile: "bg-amber-50 text-amber-600", text: "text-amber-600", ring: "ring-amber-300", bar: "from-amber-400 to-orange-300", chip: "bg-amber-100 text-amber-800" },
      empty: { icon: Inbox, title: "You're all caught up", text: "Nothing is waiting for your approval right now. New requests from your team will show up here." },
    },
    {
      key: "approved",
      label: "Approved",
      caption: "Requests you approved",
      icon: CheckCircle2,
      count: approvedCount,
      tone: { tile: "bg-emerald-50 text-emerald-600", text: "text-emerald-600", ring: "ring-emerald-300", bar: "from-emerald-500 to-teal-400", chip: "bg-emerald-100 text-emerald-800" },
      empty: { icon: CheckCircle2, title: "No approvals yet", text: "Requests you approve will be listed here." },
    },
    {
      key: "rejected",
      label: "Rejected",
      caption: "Requests you rejected",
      icon: XCircle,
      count: rejectedCount,
      tone: { tile: "bg-rose-50 text-rose-600", text: "text-rose-600", ring: "ring-rose-300", bar: "from-[#ff3d72] to-[#ff7aa0]", chip: "bg-rose-100 text-rose-800" },
      empty: { icon: XCircle, title: "Nothing rejected", text: "Requests you reject will be listed here." },
    },
  ];
  const allTab = {
    key: "all",
    label: "All",
    caption: "Every request routed to you",
    icon: Layers,
    count: totalCount,
    tone: { tile: "bg-[#0A0082]/10 text-[#0A0082]", text: "text-[#0A0082]", ring: "ring-[#0A0082]/30", bar: "from-[#0A0082] to-[#5B66B8]", chip: "bg-[#0A0082]/10 text-[#0A0082]" },
    empty: { icon: Inbox, title: "No approval requests yet", text: "Requests your team sends you will be listed here." },
  };
  const toolbarTabs = [allTab, ...tabs];
  const active = toolbarTabs.find((t) => t.key === activeTab) || allTab;
  // Empty only when every list has reported zero rows (supplementary claims included) and, on Pending,
  // the Finance verification rows (not part of the paged lists) are empty too.
  const showEmpty = showEmptyTable && !(visibleStatuses.includes("pending") && showType("EXPENSE") && financePendingCount > 0);
  const EmptyIcon = active.empty.icon;
  const pct = (n) => (totalCount > 0 ? (n / totalCount) * 100 : 0);

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

          <div className="flex items-stretch gap-3">
            <div className="rounded-xl bg-white/[0.08] px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Approval rate</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{approvalRate === null ? "—" : `${approvalRate}%`}</p>
              <p className="text-[11px] text-white/60">
                {decided} decision{decided === 1 ? "" : "s"} made
              </p>
            </div>
            <button
              type="button"
              onClick={handleReload}
              title="Reload approval data"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0082] shadow-sm transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Summary cards; the first three also switch the list below */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              data-approvals-card={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
                isActive ? `border-transparent ring-2 ${tab.tone.ring}` : "border-slate-100"
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tab.tone.tile}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tab.label}</span>
                <span className={`block text-2xl font-bold tabular-nums ${tab.count > 0 ? tab.tone.text : "text-[#0a174e]"}`}>
                  {loadingCounts ? "—" : tab.count}
                </span>
                <span className="block truncate text-[11px] text-slate-400">{tab.caption}</span>
              </span>
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${tab.tone.bar} transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={activeTab === "all"}
          data-approvals-card="all"
          onClick={() => setActiveTab("all")}
          className={`group relative flex flex-col justify-center overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
            activeTab === "all" ? `border-transparent ring-2 ${allTab.tone.ring}` : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0082]/10 text-[#0A0082]">
              <Layers size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</span>
              <span className="block text-2xl font-bold tabular-nums text-[#0a174e]">{loadingCounts ? "—" : totalCount}</span>
            </span>
          </div>
          <div
            className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${pendingCount} pending, ${approvedCount} approved, ${rejectedCount} rejected`}
          >
            {pendingCount > 0 && <span className="h-full bg-amber-400" style={{ width: `${pct(pendingCount)}%` }} />}
            {approvedCount > 0 && <span className="h-full bg-emerald-500" style={{ width: `${pct(approvedCount)}%` }} />}
            {rejectedCount > 0 && <span className="h-full bg-rose-500" style={{ width: `${pct(rejectedCount)}%` }} />}
          </div>
        </button>
      </div>

      {/* Delegate: only relevant while there is a queue to cover */}
      {(activeTab === "pending" || activeTab === "all") && <MyDelegateCard />}

      {/* The list: toolbar on top, then one table for expense reports and cash advances */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 lg:w-fit" role="tablist">
            {toolbarTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-white text-[#0A0082] shadow-sm" : "text-slate-500 hover:text-[#0a174e]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" className={isActive ? tab.tone.text : ""} />
                  {tab.label}
                  <TabCountDot count={loadingCounts ? null : tab.count} tone={tab.key} />
                </button>
              );
            })}
          </div>

          <div className="w-full lg:w-80">
            <SearchInput
              value={searchTerm}
              onSearch={handleSearch}
              placeholder="Search by number, title or category..."
              className="!px-3 !py-2 !text-sm"
            />
          </div>

          <div className="w-full lg:w-48">
            <FormSelect
              label="Type"
              name="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={TYPE_OPTIONS}
              className="[&>label]:mb-1 [&>label]:text-xs"
              buttonClassName="!px-3 !py-1.5 !text-xs"
            />
          </div>

          {/* Approved tab, cash advances: approved as requested or at a lower amount */}
          {activeTab === "approved" && typeFilter === "CASH" && (
            <div className="w-full lg:w-52">
              <FormSelect
                label="Amount"
                name="amountFilter"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                options={AMOUNT_OPTIONS}
                className="[&>label]:mb-1 [&>label]:text-xs"
                buttonClassName="!px-3 !py-1.5 !text-xs"
              />
            </div>
          )}

          {/* Pending only: which rows to show, and their order */}
          {activeTab === "pending" && (
            <>
              <div className="w-full lg:w-44">
                <FormSelect
                  label="Show"
                  name="pendingShow"
                  value={pendingShow}
                  onChange={(e) => setPendingShow(e.target.value)}
                  options={PENDING_SHOW_OPTIONS}
                  className="[&>label]:mb-1 [&>label]:text-xs"
                  buttonClassName="!px-3 !py-1.5 !text-xs"
                />
              </div>
              <div className="w-full lg:w-44">
                <FormSelect
                  label="Sort by"
                  name="pendingSort"
                  value={pendingSort}
                  onChange={(e) => setPendingSort(e.target.value)}
                  options={PENDING_SORT_OPTIONS}
                  className="[&>label]:mb-1 [&>label]:text-xs"
                  buttonClassName="!px-3 !py-1.5 !text-xs"
                />
              </div>
            </>
          )}
        </div>

        <div className="approvals-tab-container">
          <div className="overflow-x-auto">
          <table className="approvals-table w-full min-w-[1000px] table-fixed text-left text-sm">
            {/* Fixed column widths: each header sits exactly above its cells, whatever the row content is.
                Actions has a fixed width wide enough for four icon buttons, so they never wrap onto a second line. */}
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[20%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[168px]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Employee</th>
                <th className="px-3 py-3 text-left">Title / Merchant</th>
                <th className="px-3 py-3 text-left">Cost Center</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Requested</th>
                <th className="px-3 py-3 text-right">Approved</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            {/* One block of lists per visible status: just the selected one, or all three in the "all" view. */}
            {visibleStatuses.map((status) => {
              const expenseKey = `${status}-expense`;
              const cashKey = `${status}-cash`;
              const suppKey = `${status}-supp`;
              return (
                <React.Fragment key={status}>
                  {status === "pending" && showType("EXPENSE") && (
                    <PendingApprovalsPage
                      key={`pending-${reloadKey}`}
                      searchTerm={searchTerm}
                      statusFilter={activeTab === "pending" ? pendingShow : "ALL"}
                      sortBy={activeTab === "pending" ? pendingSort : "NEWEST"}
                      hideHeader
                      noPadding
                      embedded
                      onRowCount={reporters[expenseKey]}
                      windowStart={windowOf(expenseKey).start}
                      windowEnd={windowOf(expenseKey).end}
                    />
                  )}
                  {status === "pending" && isFinance && showType("EXPENSE") && (
                    <FinanceVerificationApprovalsList key={`finance-${reloadKey}`} searchTerm={searchTerm} excludeReportIds={myQueueReportIds} />
                  )}
                  {status !== "pending" && showType("EXPENSE") && (
                    <ApprovalHistoryPage
                      key={`${status}-${reloadKey}`}
                      outcome={status.toUpperCase()}
                      searchTerm={searchTerm}
                      embedded
                      onRowCount={reporters[expenseKey]}
                      windowStart={windowOf(expenseKey).start}
                      windowEnd={windowOf(expenseKey).end}
                    />
                  )}
                  {(isManager || isFinance) && showType("CASH") && (
                    <CashAdvanceApprovalsList
                      key={`cash-${status}-${reloadKey}`}
                      activeTab={status}
                      searchTerm={searchTerm}
                      amountFilter={activeTab === "approved" ? amountFilter : "ALL"}
                      embedded
                      onRowCount={reporters[cashKey]}
                      windowStart={windowOf(cashKey).start}
                      windowEnd={windowOf(cashKey).end}
                    />
                  )}
                  {(isManager || isFinance) && showType("SUPP") && (
                    <SupplementaryApprovalsList
                      key={`supp-${status}-${reloadKey}`}
                      activeTab={status}
                      searchTerm={searchTerm}
                      isManager={isManager}
                      isFinance={isFinance}
                      onRowCount={reporters[suppKey]}
                      windowStart={windowOf(suppKey).start}
                      windowEnd={windowOf(suppKey).end}
                    />
                  )}
                </React.Fragment>
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
          <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {winStart + 1}–{Math.min(winEnd, combinedRows)} of {combinedRows}
            </p>
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

// Notification dot + count on each status tab. Pending pulses while anything is waiting for a decision.
const DOT_TONES = {
  all: { chip: "bg-[#0A0082]/10 text-[#0A0082]", dot: "bg-[#0A0082]" },
  pending: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  approved: { chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  rejected: { chip: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
};

function TabCountDot({ count, tone }) {
  if (count === null || count === undefined || count <= 0) return null;
  const t = DOT_TONES[tone] || DOT_TONES.all;
  return (
    <span className={`ml-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums ${t.chip}`}>
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {tone === "pending" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${t.dot}`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${t.dot}`} />
      </span>
      {count}
    </span>
  );
}
