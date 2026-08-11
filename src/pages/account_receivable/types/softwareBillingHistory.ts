// Type reference for Epic 4 Phase 7 (Billing History & Duplicate Prevention). Not enforced by
// a build-time type-checker (no tsconfig.json in this repo) — documentation/IDE hints only,
// mirroring the existing precedent at src/pages/account_receivable/types/toolPricing.ts.
//
// Read-only, backend-sourced record of a prior invoice line for an RMS asset. Used only to
// decide selection eligibility (duplicate prevention) and to populate the billing history
// dialog — never edited, never used to derive amounts.
export interface SoftwareBillingHistoryItem {
  historyId: string;
  assetId: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  quantity: number;
  amount: number;
  currencyCode: string;
  billedAt: string;
}
