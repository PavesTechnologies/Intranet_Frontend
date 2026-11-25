import React from "react";
import { ApprovalStatusBadge, expenseStatusKey } from "./approvalStatus";

/**
 * An expense report's status on the review panel, the report detail page and the AP review. It uses the same status
 * names and colours as the My Approvals table (approvalStatus.jsx), so a report reads the same everywhere. What the
 * shared name does not say (the approval level, who asked for a correction) is shown as a short second line.
 */

// An approver's Needs Correction and a Finance query both leave a report AWAITING_CORRECTION;
// ApprovalStatusResponse.correctionRequestedBy ("APPROVER" | "FINANCE") says which it was.
const correctionLabel = (correctionRequestedBy, status) =>
  correctionRequestedBy === "FINANCE" || status === "QUERY_RAISED"
    ? "Finance asked for a correction"
    : correctionRequestedBy === "APPROVER"
    ? "Manager asked for a correction"
    : status === "POLICY_REJECTED"
    ? "Policy check failed"
    : "Correction requested";

export default function ApprovalStatusPill({ status, label, correctionRequestedBy, paymentRoutingStatus }) {
  const statusKey = expenseStatusKey({ reportStatus: status, paymentRoutingStatus });
  const detail =
    statusKey === "SENT_BACK"
      ? correctionLabel(correctionRequestedBy, String(status || "").toUpperCase())
      : label && !/^pending (manager|finance)/i.test(label)
      ? label
      : null;
  return <ApprovalStatusBadge statusKey={statusKey} detail={detail} />;
}
