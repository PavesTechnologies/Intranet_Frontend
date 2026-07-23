import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function MyExpensesPage() {
  return (
    <ModulePlaceholder
      title="My Expenses"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Expenses", to: "/expense-management/expenses/my" },
        { label: "My Expenses" },
      ]}
      description="View and track the status of expenses you've submitted."
    />
  );
}
