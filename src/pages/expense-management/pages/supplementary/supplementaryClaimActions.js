import { SUPP_STATUS } from "@/pages/expense-management/api/supplementaryClaimApi";

/**
 * Which actions a screen may offer for a claim. Pure, so the rules can be tested without rendering.
 * The backend re-checks every action; a hidden button is never the only protection.
 *
 * @param {object} claim  the claim as returned by the API
 * @param {"employee"|"manager"|"finance"} mode  the screen the user is on
 */
export function claimActions(claim, mode) {
  const status = claim?.status;
  const items = Array.isArray(claim?.items) ? claim.items : [];
  const isEmployee = mode === "employee";
  const acknowledged = Boolean(claim?.employeeConfirmedAt);
  const needsAcknowledgment = Boolean(claim?.createdOnBehalf) && !acknowledged;

  const editable = isEmployee && (status === SUPP_STATUS.DRAFT || status === SUPP_STATUS.CLARIFICATION_REQUIRED);
  // Every expense needs at least one receipt before the claim can be submitted or resubmitted.
  const receiptsComplete = items.length > 0 && items.every((i) => Array.isArray(i.receipts) && i.receipts.length > 0);

  return {
    canEditItems: editable,
    canAcknowledge: isEmployee && status === SUPP_STATUS.DRAFT && needsAcknowledgment,
    canSubmit:
      isEmployee && status === SUPP_STATUS.DRAFT && !needsAcknowledgment && receiptsComplete,
    canResubmit: isEmployee && status === SUPP_STATUS.CLARIFICATION_REQUIRED && receiptsComplete,
    canCancel:
      isEmployee &&
      [SUPP_STATUS.DRAFT, SUPP_STATUS.PENDING_MANAGER, SUPP_STATUS.CLARIFICATION_REQUIRED].includes(status),
    canManagerReview: mode === "manager" && status === SUPP_STATUS.PENDING_MANAGER,
    canFinanceReview: mode === "finance" && status === SUPP_STATUS.PENDING_FINANCE,
  };
}

/** A decision that needs a written reason. Reject and clarify both require one; approval does not. */
export const DECISIONS_NEEDING_COMMENT = ["reject", "clarify"];

export const MIN_COMMENT_LENGTH = 5;
