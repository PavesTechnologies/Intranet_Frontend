import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function AllExpensesPage() {
  return (
    <ModulePlaceholder
      title="All Expenses"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Expenses", to: "/expense-management/expenses/my" },
        { label: "All Expenses" },
      ]}
      description="View expense submissions across the team."
    />
  );
}
