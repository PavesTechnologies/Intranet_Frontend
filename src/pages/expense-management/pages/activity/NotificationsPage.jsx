import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function NotificationsPage() {
  return (
    <ModulePlaceholder
      title="Notifications"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Activity", to: "/expense-management/activity/notifications" },
        { label: "Notifications" },
      ]}
      description="Notifications related to your expense activity."
    />
  );
}
