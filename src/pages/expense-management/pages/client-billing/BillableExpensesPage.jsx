import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function BillableExpensesPage() {
  return (
    <ModulePlaceholder
      title="Billable Expenses"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Client Billing", to: "/expense-management/client-billing/billable-expenses" },
        { label: "Billable Expenses" },
      ]}
      description="Expenses marked as billable to a client."
    />
  );
}
