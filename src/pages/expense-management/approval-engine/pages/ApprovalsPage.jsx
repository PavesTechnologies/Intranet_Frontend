import React, { useCallback, useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  RefreshCw,
} from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Pagination from "@/components/Pagination/pagination";
import PendingApprovalsPage from "./PendingApprovalsPage";
import ApprovalHistoryPage from "./ApprovalHistoryPage";
import CashAdvanceApprovalsList from "../components/CashAdvanceApprovalsList";
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

const PENDING_SORT_OPTIONS = [
  { label: "Newest first", value: "NEWEST" },
  { label: "Oldest first", value: "OLDEST" },
  { label: "Amount, high to low", value: "AMOUNT_DESC" },
];

export default function ApprovalsPage() {
  const { hasRole } = useAuth();

  // -----------------------------
  // State
  // -----------------------------
  const [activeTab, setActiveTab] = useState("pending");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingShow, setPendingShow] = useState("ALL");
  // Rows each list currently shows, keyed by tab, so the page can show one empty message for the whole table.
  const [rowCounts, setRowCounts] = useState({});
  const reportExpenseRows = useCallback(
    (count) => setRowCounts((prev) => (prev[`${activeTab}-expense`] === count ? prev : { ...prev, [`${activeTab}-expense`]: count })),
    [activeTab]
  );
  const reportCashRows = useCallback(
    (count) => setRowCounts((prev) => (prev[`${activeTab}-cash`] === count ? prev : { ...prev, [`${activeTab}-cash`]: count })),
    [activeTab]
  );
  const reportSuppRows = useCallback(
    (count) => setRowCounts((prev) => (prev[`${activeTab}-supp`] === count ? prev : { ...prev, [`${activeTab}-supp`]: count })),
    [activeTab]
  );

  const [pendingSort, setPendingSort] = useState("NEWEST");

  // One pager for the whole table. The expense rows and the cash advance rows form one sequence (expense rows first),
  // and each child renders only the slice of its own rows that falls inside the current page.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchTerm, pendingShow, pendingSort]);
  const expenseCount = rowCounts[`${activeTab}-expense`] ?? 0;
  const cashCount = rowCounts[`${activeTab}-cash`] ?? 0;
  const suppCount = rowCounts[`${activeTab}-supp`] ?? 0;
  const combinedRows = expenseCount + cashCount + suppCount;
  const totalPages = Math.max(1, Math.ceil(combinedRows / APPROVALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const winStart = safePage * APPROVALS_PAGE_SIZE;
  const winEnd = winStart + APPROVALS_PAGE_SIZE;
  // Each source covers its own slice of the one sequence: expense reports, then cash advances, then supplementary claims.
  const windowFor = (offset, count) => ({
    start: Math.max(Math.min(winStart - offset, count), 0),
    end: Math.max(Math.min(winEnd - offset, count), 0),
  });
  const expenseWindow = windowFor(0, expenseCount);
  const cashWindow = windowFor(expenseCount, cashCount);
  const suppWindow = windowFor(expenseCount + cashCount, suppCount);

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

  const mountedLists = ["expense", ...(isManager || isFinance ? ["cash", "supp"] : [])];
  const allReported = mountedLists.every((key) => rowCounts[`${activeTab}-${key}`] !== undefined);
  const totalRows = mountedLists.reduce((sum, key) => sum + (rowCounts[`${activeTab}-${key}`] ?? 0), 0);
  const showEmptyTable = allReported && totalRows === 0;
  const EMPTY_TEXT = {
    pending: ["No approvals are awaiting you.", "Nothing needs your decision right now."],
    approved: ["No approved items yet.", "Items you approve will show here."],
    rejected: ["No rejected items yet.", "Items you reject will show here."],
  };

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

  const pendingCount =
    (queueQuery.data?.totalElements ?? 0) + (cashAdvancePendingQuery.data ?? 0);
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

  // -----------------------------
  // Status options
  // -----------------------------
  const statusFilterOptions = [
    {
      label: "Pending",
      value: "pending",
    },
    {
      label: "Approved",
      value: "approved",
    },
    {
      label: "Rejected",
      value: "rejected",
    },
  ];

  // -----------------------------
  // Tabs
  // -----------------------------
  const tabs = [
    {
      key: "pending",
      label: "Pending",
      icon: Clock,
    },
    {
      key: "approved",
      label: "Approved",
      icon: CheckCircle2,
    },
    {
      key: "rejected",
      label: "Rejected",
      icon: XCircle,
    },
  ];

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">
            My Approvals
          </h1>

          <p className="mt-0.5 text-xs text-gray-500">
            Review and manage expense report and cash advance
            approval requests.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReload}
          title="Reload approval data"
          className="self-start rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 lg:self-auto"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
            <Clock size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Pending My Approval
            </p>

            <p className="mt-0.5 text-xl font-bold text-gray-900">
              {pendingCount}
            </p>
          </div>
        </div>

        {/* Approved */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Approved
            </p>

            <p className="mt-0.5 text-xl font-bold text-green-600">
              {approvedCount}
            </p>
          </div>
        </div>

        {/* Rejected */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
            <XCircle size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Rejected
            </p>

            <p className="mt-0.5 text-xl font-bold text-rose-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
            <Layers size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Total
            </p>

            <p className="mt-0.5 text-xl font-bold text-gray-900">
              {totalCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {/* Tabs */}
          <div className="flex w-fit space-x-1 rounded-lg bg-gray-50 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />

                  {tab.label}

                  {tab.key === "pending" &&
                    pendingCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="w-full lg:w-72">
            <SearchInput
              value={searchTerm}
              onSearch={handleSearch}
              placeholder="Search by report/advance number or title/category..."
              className="!px-3 !py-1.5 !text-xs"
            />
          </div>

          {/* Status */}
          <div className="w-full lg:w-40">
            <FormSelect
              label="Status"
              name="activeTab"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              options={statusFilterOptions}
              className="[&>label]:mb-1 [&>label]:text-xs"
              buttonClassName="!px-3 !py-1.5 !text-xs"
            />
          </div>

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
      </div>

      {/* One table for expense reports and cash advances. The Type and Status badges tell them apart. */}
      <div className="approvals-tab-container space-y-4">
        {activeTab === "pending" && <MyDelegateCard />}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm text-left">
              {/* Fixed column widths: each header sits exactly above its cells, whatever the row content is. */}
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs font-semibold text-white uppercase">
                <tr>
                  <th className="px-2.5 py-2 text-left">Type</th>
                  <th className="px-2.5 py-2 text-left">Reference</th>
                  <th className="px-2.5 py-2 text-left">Employee</th>
                  <th className="px-2.5 py-2 text-left">Title / Merchant</th>
                  <th className="px-2.5 py-2 text-left">Cost Center</th>
                  <th className="px-2.5 py-2 text-left">Status</th>
                  <th className="px-2.5 py-2 text-right">Amount</th>
                  <th className="px-2.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              {activeTab === "pending" && (
                <PendingApprovalsPage
                  key={`pending-${reloadKey}`}
                  searchTerm={searchTerm}
                  statusFilter={pendingShow}
                  sortBy={pendingSort}
                  hideHeader
                  noPadding
                  embedded
                  onRowCount={reportExpenseRows}
                  windowStart={expenseWindow.start}
                  windowEnd={expenseWindow.end}
                />
              )}
              {activeTab === "approved" && (
                <ApprovalHistoryPage key={`approved-${reloadKey}`} outcome="APPROVED" searchTerm={searchTerm} embedded onRowCount={reportExpenseRows} windowStart={expenseWindow.start} windowEnd={expenseWindow.end} />
              )}
              {activeTab === "rejected" && (
                <ApprovalHistoryPage key={`rejected-${reloadKey}`} outcome="REJECTED" searchTerm={searchTerm} embedded onRowCount={reportExpenseRows} windowStart={expenseWindow.start} windowEnd={expenseWindow.end} />
              )}
              {(isManager || isFinance) && (
                <CashAdvanceApprovalsList key={`cash-${activeTab}-${reloadKey}`} activeTab={activeTab} searchTerm={searchTerm} embedded onRowCount={reportCashRows} windowStart={cashWindow.start} windowEnd={cashWindow.end} />
              )}
              {(isManager || isFinance) && (
                <SupplementaryApprovalsList key={`supp-${activeTab}-${reloadKey}`} activeTab={activeTab} searchTerm={searchTerm} isManager={isManager} isFinance={isFinance} onRowCount={reportSuppRows} windowStart={suppWindow.start} windowEnd={suppWindow.end} />
              )}
              {showEmptyTable && (
                <tbody>
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-gray-700">{EMPTY_TEXT[activeTab]?.[0]}</p>
                      <p className="mt-1 text-xs text-gray-500">{EMPTY_TEXT[activeTab]?.[1]}</p>
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
          {combinedRows > 0 && (
            <div className="flex flex-col items-center gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-500">
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
      </div>
    </div>
  );

}