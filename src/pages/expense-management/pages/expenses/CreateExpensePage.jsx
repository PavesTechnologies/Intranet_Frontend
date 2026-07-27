import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function CreateExpensePage() {
  return (
    <ModulePlaceholder
      title="Create Expense"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Expenses", to: "/expense-management/expenses/my" },
        { label: "Create Expense" },
      ]}
      description="Submit a new expense claim for approval."
    />
  );
}
