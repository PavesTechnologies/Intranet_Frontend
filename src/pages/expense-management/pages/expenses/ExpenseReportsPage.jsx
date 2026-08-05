import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ExpenseReportsPage() {
  return (
    <ModulePlaceholder
      title="Expense Reports"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Expenses", to: "/expense-management/expenses/my" },
        { label: "Expense Reports" },
      ]}
      description="Consolidated expense reports for your team."
    />
  );
}
