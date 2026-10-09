import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  RefreshCw,
} from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PendingApprovalsPage from "./PendingApprovalsPage";
import ApprovalHistoryPage from "./ApprovalHistoryPage";
import CashAdvanceApprovalsList from "../components/CashAdvanceApprovalsList";
import { useMyQueue, useMyHistory } from "../hooks/useApprovalWorkflow";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";

const QUEUE_PAGE_SIZE = 20;

export default function ApprovalsPage() {
  const { hasRole } = useAuth();

  // -----------------------------
  // State
  // -----------------------------
  const [activeTab, setActiveTab] = useState("pending");
  const [approvalCategory, setApprovalCategory] =
    useState("EXPENSE_REPORTS");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // -----------------------------
  // Role check
  // -----------------------------
  const isManager = hasRole
    ? hasRole([
        "Manager",
        "MANAGER",
        "Reporting_Manager",
        "Project_Manager",
        "Delivery_Manager",
        "Resource_Manager",
        "General",
        "GENERAL",
        "Finance Executive",
        "FINANCE_EXECUTIVE",
        "Finance",
        "FINANCE",
        "Admin",
        "ADMIN",
      ])
    : true;

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
  const pendingCount = queueQuery.data?.totalElements ?? 0;
  const approvedCount = approvedQuery.data?.totalElements ?? 0;
  const rejectedCount = rejectedQuery.data?.totalElements ?? 0;

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
  // Category options
  // -----------------------------
  const categoryOptions = [
    {
      label: "Expense Reports",
      value: "EXPENSE_REPORTS",
    },
    ...(isManager
      ? [
          {
            label: "Cash Advances",
            value: "CASH_ADVANCES",
          },
        ]
      : []),
  ];

  const activeCategory = isManager
    ? approvalCategory
    : "EXPENSE_REPORTS";

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

          {/* Type */}
          <div className="w-full lg:w-48">
            <FormSelect
              label="Type"
              name="approvalCategory"
              value={activeCategory}
              onChange={(e) =>
                setApprovalCategory(e.target.value)
              }
              options={categoryOptions}
              className="[&>label]:mb-1 [&>label]:text-xs"
              buttonClassName="!px-3 !py-1.5 !text-xs"
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="approvals-tab-container">
        {/* Cash Advances */}
        {activeCategory === "CASH_ADVANCES" ? (
          <CashAdvanceApprovalsList
            key={`cash-${activeTab}-${reloadKey}`}
            activeTab={activeTab}
            searchTerm={searchTerm}
          />
        ) : (
          <>
            {/* Pending Expense Reports */}
            {activeTab === "pending" && (
              <PendingApprovalsPage
                key={`pending-${reloadKey}`}
                searchTerm={searchTerm}
                hideHeader
                noPadding
              />
            )}

            {/* Approved Expense Reports */}
            {activeTab === "approved" && (
              <ApprovalHistoryPage
                key={`approved-${reloadKey}`}
                outcome="APPROVED"
                title="Approved"
                breadcrumbLabel="Approved"
                searchTerm={searchTerm}
                hideHeader
                noPadding
              />
            )}

            {/* Rejected Expense Reports */}
            {activeTab === "rejected" && (
              <ApprovalHistoryPage
                key={`rejected-${reloadKey}`}
                outcome="REJECTED"
                title="Rejected"
                breadcrumbLabel="Rejected"
                searchTerm={searchTerm}
                hideHeader
                noPadding
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}