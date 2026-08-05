import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function InvoiceHandoffPage() {
  return (
    <ModulePlaceholder
      title="Invoice Handoff"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Client Billing", to: "/expense-management/client-billing/billable-expenses" },
        { label: "Invoice Handoff" },
      ]}
      description="Hand off billable expenses for client invoicing."
    />
  );
}
