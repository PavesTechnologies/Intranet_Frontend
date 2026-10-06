import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";
import CashAdvanceApprovalsList from "@/pages/expense-management/approval-engine/components/CashAdvanceApprovalsList";

export default function CashAdvanceApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
    { label: "My Approvals" },
  ];

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  const statusFilterOptions = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">Cash Advance Approvals</h1>
          <p className="text-xs text-gray-500 mt-0.5">Review and manage cash advance approval requests from your team.</p>
        </div>

        <button
          onClick={handleReload}
          title="Reload current tab data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition self-start lg:self-auto animate-none"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter and Search Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchInput
              value={searchTerm}
              onSearch={(value) => setSearchTerm(value || "")}
              placeholder="Search by advance title, employee ID, or purpose..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>
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

      {/* Reused CashAdvanceApprovalsList */}
      <CashAdvanceApprovalsList
        key={`cash-approvals-${activeTab}-${reloadKey}`}
        activeTab={activeTab}
        searchTerm={searchTerm}
      />
    </div>
  );
}
