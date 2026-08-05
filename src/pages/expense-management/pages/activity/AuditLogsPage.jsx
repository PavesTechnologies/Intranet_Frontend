import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function AuditLogsPage() {
  return (
    <ModulePlaceholder
      title="Audit Logs"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Activity", to: "/expense-management/activity/notifications" },
        { label: "Audit Logs" },
      ]}
      description="Audit trail of changes across the expense management module."
    />
  );
}
