import React from "react";
import classNames from "classnames";
import { CheckCircle2, Clock, AlertTriangle, MessageSquareWarning } from "lucide-react";

const META = {
  APPROVED: { label: "Approved", tone: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  NEEDS_CORRECTION: { label: "Needs Correction", tone: "bg-orange-100 text-orange-800", Icon: MessageSquareWarning },
  POLICY_WARNING: { label: "Policy Warning", tone: "bg-amber-100 text-amber-800", Icon: AlertTriangle },
  PENDING: { label: "Pending", tone: "bg-gray-100 text-gray-700", Icon: Clock },
  VERIFIED: { label: "Verified", tone: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  QUERIED: { label: "Queried", tone: "bg-orange-100 text-orange-800", Icon: MessageSquareWarning },
};

/**
 * Four line-item review states an approver needs to tell apart at a glance (spec §3): a line is
 * either already decided (Approved / Needs Correction), still open with a policy issue attached
 * (Policy Warning), or just plain awaiting review (Pending). `review` is this line's entry from
 * LineItemReviewResponse[] (useLineItemReviews) if one exists yet; `hasPolicyIssue` covers both the
 * full `policyWarnings` shape and the queue's slimmer `policyViolations` shape - callers pass a
 * plain boolean so this stays agnostic to which shape they had on hand.
 */
export function deriveLineReviewState(review, hasPolicyIssue) {
  if (review?.status === "APPROVED") return "APPROVED";
  if (review?.status === "NEEDS_CORRECTION") return "NEEDS_CORRECTION";
  if (review?.status === "VERIFIED") return "VERIFIED";
  if (review?.status === "QUERIED") return "QUERIED";
  if (hasPolicyIssue) return "POLICY_WARNING";
  return "PENDING";
}

export default function LineReviewStatusBadge({ state, className = "" }) {
  const meta = META[state] || META.PENDING;
  const { Icon } = meta;
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", meta.tone, className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
