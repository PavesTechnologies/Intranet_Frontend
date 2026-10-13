// Maps an advance status to its stage on the 7-stage lifecycle stepper.
// Kept out of the component file so the stepper can hot-update under Vite Fast Refresh.

export const getStageIndex = (statusStr) => {
  const upper = (statusStr || "").toUpperCase().trim();
  switch (upper) {
    case "DRAFT":
    case "SUBMITTED":
    case "REQUESTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_MANAGER_APPROVAL":
    case "PENDING_COST_CENTER_APPROVAL":
    case "PENDING_COST_CENTER":
    case "PENDING_FINANCE_APPROVAL":
    case "PENDING_FINANCE":
      return 1;
    case "APPROVED_REQUEST":
      return 2;
    // APPROVED means Finance approved it but has not yet disbursed it, so stage 3 is the current stage
    case "APPROVED":
    case "DISBURSED":
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "PROCESSING":
      return 3;
    case "RECONCILIATION_PENDING":
    case "RECONCILIATION PENDING":
      return 4;
    case "SUBMITTED_FOR_REVIEW":
    case "SUBMITTED FOR REVIEW":
    case "EXPENSE_SUBMITTED":
    case "EXPENSE SUBMITTED":
    case "UNDER_REVIEW":
    case "UNDER REVIEW":
      return 5;
    case "EXPENSE_VERIFIED":
    case "EXPENSE VERIFIED":
    case "SETTLEMENT_PENDING":
    case "SETTLEMENT PENDING":
    case "PARTIALLY_SETTLED":
    case "PARTIALLY_ADJUSTED":
    case "PARTIALLY ADJUSTED":
    case "ADJUSTED":
      return 6;
    case "SETTLED":
    case "CLOSED":
      return 7;
    case "REJECTED":
    case "CANCELLED":
      return -1;
    default:
      return 3;
  }
};

