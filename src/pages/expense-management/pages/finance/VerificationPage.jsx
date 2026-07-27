import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function VerificationPage() {
  return (
    <ModulePlaceholder
      title="Verification"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Finance", to: "/expense-management/finance/verification" },
        { label: "Verification" },
      ]}
      description="Verify submitted expenses against policy before reimbursement."
    />
  );
}
