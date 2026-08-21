// LeavePolicy.jsx
import React from "react";
import LeavePolicyViewer from "./LeavePolicyViewer";
import PageHeader from "../../../components/ui/PageHeader";

export default function LeavePolicy() {
  return (
    <div className="min-h-screen  bg-gray-50 py-8 px-4">
      <PageHeader title="Leave Policies" className="!mb-8" />
      <LeavePolicyViewer />
    </div>
  );
}
