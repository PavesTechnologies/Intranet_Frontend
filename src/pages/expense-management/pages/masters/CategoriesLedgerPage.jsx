import React, { useState } from "react";
import { Layers, BookOpen, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ExpenseCategoriesPage from "./ExpenseCategoriesPage";
import GlAccountsPage from "./GlAccountsPage";

export default function CategoriesLedgerPage() {
  const [activeTab, setActiveTab] = useState("categories"); // "categories" | "glAccounts"
  const [reloadKey, setReloadKey] = useState(0);

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Categories & Ledger Account" },
  ];

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Scope a custom style to hide child component breadcrumbs to prevent duplicates */}
      <style>{`
        .categories-ledger-container nav[aria-label="Breadcrumb"] {
          display: none !important;
        }
      `}</style>

      <Breadcrumb items={breadcrumbs} />

      {/* Modern Tabs Selector */}
      <div className="border-b border-gray-200 bg-white rounded-xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex space-x-1 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "categories"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Layers size={16} />
            Expense Categories
          </button>
          <button
            onClick={() => setActiveTab("glAccounts")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "glAccounts"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <BookOpen size={16} />
            GL Accounts
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
      <div className="categories-ledger-container">
        {activeTab === "categories" ? (
          <ExpenseCategoriesPage key={`categories-${reloadKey}`} />
        ) : (
          <GlAccountsPage key={`gl-${reloadKey}`} />
        )}
      </div>
    </div>
  );
}
