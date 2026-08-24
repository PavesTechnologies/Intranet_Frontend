import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PendingApprovalsPage from "./PendingApprovalsPage";
import ApprovalHistoryPage from "./ApprovalHistoryPage";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "rejected"
  const [reloadKey, setReloadKey] = useState(0);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Approvals" },
  ];

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Scope custom styles to hide child component breadcrumbs & headers, and remove child outer padding */}
      <style>{`
        .approvals-tab-container nav[aria-label="Breadcrumb"] {
          display: none !important;
        }
        .approvals-tab-container h1 {
          display: none !important;
        }
        .approvals-tab-container > div {
          padding: 0 !important;
        }
      `}</style>

      <Breadcrumb items={breadcrumbs} />

      <h1 className="text-xl font-semibold text-gray-900 mt-3 mb-4">My Approvals</h1>

      {/* Modern Tabs Selector */}
      <div className="border-b border-gray-200 bg-white rounded-xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex space-x-1 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "pending"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Clock size={16} />
            Pending
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "approved"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <CheckCircle2 size={16} />
            Approved
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "rejected"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <XCircle size={16} />
            Rejected
          </button>
        </div>

        <button
          onClick={handleReload}
          title="Reload current tab data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition mr-1"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tab Content container */}
      <div className="approvals-tab-container">
        {activeTab === "pending" ? (
          <PendingApprovalsPage key={`pending-${reloadKey}`} />
        ) : activeTab === "approved" ? (
          <ApprovalHistoryPage key={`approved-${reloadKey}`} outcome="APPROVED" title="Approved" breadcrumbLabel="Approved" />
        ) : (
          <ApprovalHistoryPage key={`rejected-${reloadKey}`} outcome="REJECTED" title="Rejected" breadcrumbLabel="Rejected" />
        )}
      </div>
    </div>
  );
}
