import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function RequestAdvancePage() {
  return (
    <ModulePlaceholder
      title="Request Advance"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
        { label: "Request Advance" },
      ]}
      description="Request a cash advance ahead of an upcoming expense."
    />
  );
}
