import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function PaymentStatusPage() {
  return (
    <ModulePlaceholder
      title="Payment Status"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Finance", to: "/expense-management/finance/verification" },
        { label: "Payment Status" },
      ]}
      description="Monitor the payment status of processed reimbursements."
    />
  );
}
