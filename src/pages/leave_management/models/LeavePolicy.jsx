// LeavePolicy.jsx
import React from "react";
import LeavePolicyViewer from "./LeavePolicyViewer";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/patterns/PageContainer";

export default function LeavePolicy() {
  return (
    <PageContainer density="comfortable">
      <PageHeader title="Leave Policies" className="!mb-8" />
      <LeavePolicyViewer />
    </PageContainer>
  );
}
