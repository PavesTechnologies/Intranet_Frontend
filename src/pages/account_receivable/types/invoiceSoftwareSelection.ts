// Type reference for Epic 4 Phase 4 (Invoice Software Selection). Not enforced by a
// build-time type-checker (no tsconfig.json in this repo) — documentation/IDE hints only,
// mirroring the existing precedent at src/pages/account_receivable/types/toolPricing.ts.
//
// Each row joins an RMS-assigned asset with its AR Tool Pricing (unitPrice/currency) — the
// backend performs that join, this screen only renders it and lets Finance pick line items.
// selectionEligible/selectionReason are backend-computed (e.g. false when no active Tool
// Pricing exists for the asset) and must not be re-derived on the frontend.
import type { BillingBasis } from "./toolCatalog";

export interface InvoiceSoftwareSelectionItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
  quantity: number;
  billingBasis: BillingBasis;
  assignmentStartDate: string;
  assignmentEndDate?: string;
  unitPrice: number;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  description?: string;
  selectionEligible: boolean;
  selectionReason?: string;
  selected: boolean;
}
