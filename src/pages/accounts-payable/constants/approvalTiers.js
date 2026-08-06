export const APPROVAL_TIERS = [
  { id: "tier1", tier: "Level 1", label: "Level 1 · under $10,000", minAmount: 0, maxAmount: 9999.99, approverRole: "AP_Approver" },
  { id: "tier2", tier: "Level 2", label: "Level 2 · $10,000–$50,000", minAmount: 10000, maxAmount: 49999.99, approverRole: "AP_Manager" },
  { id: "tier3", tier: "Level 3", label: "Level 3 · over $50,000", minAmount: 50000, maxAmount: Infinity, approverRole: "AP_Admin" },
];

export const getApprovalTierForAmount = (amount) =>
  APPROVAL_TIERS.find((tier) => amount >= tier.minAmount && amount <= tier.maxAmount) ||
  APPROVAL_TIERS[APPROVAL_TIERS.length - 1];

export const APPROVAL_DECISION = {
  APPROVE: "Approve",
  REJECT: "Reject",
  RETURN: "Return for Correction",
};
