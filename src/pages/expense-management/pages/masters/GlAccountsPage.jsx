import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function GlAccountsPage() {
  return (
    <ModulePlaceholder
      title="GL Accounts"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "GL Accounts" },
      ]}
      description="Manage GL account mappings for expense postings."
    />
  );
}
