import React, { useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import SearchInput from "@/components/filter/Searchbar";
import FormSelect from "@/components/forms/FormSelect";

import CashAdvanceApprovalsList from "@/pages/expense-management/approval-engine/components/CashAdvanceApprovalsList";

export default function CashAdvanceApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const breadcrumbs = [
    {
      label: "Expense Management",
      to: "/expense-management/dashboard",
    },
    {
      label: "Cash Advance",
      to: "/expense-management/cash-advance/my",
    },
    {
      label: "My Approvals",
    },
  ];

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

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

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">
            Cash Advance Approvals
          </h1>

          <p className="mt-0.5 text-xs text-gray-500">
            Review and manage cash advance approval requests from
            your team.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReload}
          title="Reload current tab data"
          className="self-start rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 lg:self-auto"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Search
            </label>

            <SearchInput
              value={searchTerm}
              onSearch={(value) => setSearchTerm(value || "")}
              placeholder="Search by advance title, employee ID, or purpose..."
              className="!px-3 !py-1.5 !text-xs"
            />
          </div>

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

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />

        <div>
          <p className="font-semibold">Approval checks</p>

          <p className="mt-0.5">
            Approvers should review the requested amount together
            with the employee&apos;s current outstanding advance
            balance. Delegation or escalation for an unavailable
            manager must remain backend-authoritative.
          </p>
        </div>
      </div>

      <CashAdvanceApprovalsList
        key={`cash-approvals-${activeTab}-${reloadKey}`}
        activeTab={activeTab}
        searchTerm={searchTerm}
      />
    </div>
  );
}