import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function InvoiceStatusPage() {
  return (
    <ModulePlaceholder
      title="Invoice Status"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Client Billing", to: "/expense-management/client-billing/billable-expenses" },
        { label: "Invoice Status" },
      ]}
      description="Track invoice status for billed client expenses."
    />
  );
}
