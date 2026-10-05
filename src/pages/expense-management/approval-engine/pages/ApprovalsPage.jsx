import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, Layers, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PendingApprovalsPage from "./PendingApprovalsPage";
import ApprovalHistoryPage from "./ApprovalHistoryPage";
import CashAdvanceApprovalsList from "../components/CashAdvanceApprovalsList";
import { useMyQueue, useMyHistory } from "../hooks/useApprovalWorkflow";
import SearchInput from "@/components/filter/Searchbar";
<<<<<<< HEAD
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";

export default function ApprovalsPage() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "rejected"
  const [approvalCategory, setApprovalCategory] = useState("EXPENSE_REPORTS"); // "EXPENSE_REPORTS" | "CASH_ADVANCES"
=======

// Shared with PendingApprovalsPage/ApprovalHistoryPage's own content fetch: same (page, size) means
// react-query serves both the summary-card count here AND the active tab's content from the exact
// same cached request instead of firing it twice.
const QUEUE_PAGE_SIZE = 20;

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "history"
>>>>>>> 6a1e43b2b17d8368043b7d5982e4776d74ad1373
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

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
        "ADMIN"
      ])
    : true;

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Approvals" },
  ];

  // One fetch per bucket for the summary cards — matching sizes with the tab content below lets
  // react-query dedupe into a single network call whenever that tab is actually the active one.
  const queueQuery = useMyQueue(0, QUEUE_PAGE_SIZE);
  const approvedQuery = useMyHistory("APPROVED", 0, QUEUE_PAGE_SIZE);
  const rejectedQuery = useMyHistory("REJECTED", 0, 1);

  const pendingCount = queueQuery.data?.totalElements ?? 0;
  const approvedCount = approvedQuery.data?.totalElements ?? 0;
  const rejectedCount = rejectedQuery.data?.totalElements ?? 0;
  const totalCount = pendingCount + approvedCount + rejectedCount;

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
    queueQuery.refetch();
    approvedQuery.refetch();
    rejectedQuery.refetch();
  };

<<<<<<< HEAD
  const handleSearch = (value) => {
    setSearchTerm(value || "");
  };

  const categoryOptions = [
    { label: "Expense Reports", value: "EXPENSE_REPORTS" },
    ...(isManager ? [{ label: "Cash Advances", value: "CASH_ADVANCES" }] : []),
  ];

  const activeCategory = isManager ? approvalCategory : "EXPENSE_REPORTS";

  const statusFilterOptions = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
=======
  const tabs = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "history", label: "History", icon: Layers },
>>>>>>> 6a1e43b2b17d8368043b7d5982e4776d74ad1373
  ];

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">My Approvals</h1>
          <p className="text-xs text-gray-500 mt-0.5">Review and manage expense report and cash advance approval requests.</p>
        </div>

        <button
          onClick={handleReload}
          title="Reload current tab data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition self-start lg:self-auto animate-none"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending My Approval</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Approved</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <XCircle size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rejected</p>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{rejectedCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex space-x-1 rounded-lg bg-gray-50 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tab.key === "pending" && pendingCount > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full lg:w-72">
            <SearchInput
              value={searchTerm}
<<<<<<< HEAD
              onSearch={handleSearch}
              placeholder="Search by report/advance number or title/category..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>
          <FormSelect
            label="Type"
            name="approvalCategory"
            value={activeCategory}
            onChange={(e) => setApprovalCategory(e.target.value)}
            options={categoryOptions}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
          <FormSelect
            label="Status"
            name="activeTab"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            options={statusFilterOptions}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
        </div>
      </div>

      {/* Tab Content container */}
      <div className="approvals-tab-container">
        {activeCategory === "CASH_ADVANCES" ? (
          <CashAdvanceApprovalsList key={`cash-${activeTab}-${reloadKey}`} activeTab={activeTab} searchTerm={searchTerm} />
        ) : activeTab === "pending" ? (
          <PendingApprovalsPage key={`pending-${reloadKey}`} searchTerm={searchTerm} />
        ) : activeTab === "approved" ? (
          <ApprovalHistoryPage key={`approved-${reloadKey}`} outcome="APPROVED" title="Approved" breadcrumbLabel="Approved" searchTerm={searchTerm} />
        ) : (
          <ApprovalHistoryPage key={`rejected-${reloadKey}`} outcome="REJECTED" title="Rejected" breadcrumbLabel="Rejected" searchTerm={searchTerm} />
        )}
      </div>
=======
              onSearch={(value) => setSearchTerm(value || "")}
              placeholder="Search by report number or merchant/category..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "pending" ? (
        <PendingApprovalsPage key={`pending-${reloadKey}`} searchTerm={searchTerm} hideHeader noPadding />
      ) : activeTab === "approved" ? (
        <ApprovalHistoryPage
          key={`approved-${reloadKey}`}
          outcome="APPROVED"
          title="Approved"
          breadcrumbLabel="Approved"
          searchTerm={searchTerm}
          hideHeader
          noPadding
        />
      ) : (
        <ApprovalHistoryPage
          key={`history-${reloadKey}`}
          title="History"
          breadcrumbLabel="History"
          searchTerm={searchTerm}
          hideHeader
          noPadding
          allowOutcomeFilter
        />
      )}
>>>>>>> 6a1e43b2b17d8368043b7d5982e4776d74ad1373
    </div>
  );
}

