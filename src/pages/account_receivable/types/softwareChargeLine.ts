// Type reference for Epic 4 Phase 5 (Software Charge Generation). Not enforced by a
// build-time type-checker (no tsconfig.json in this repo) — documentation/IDE hints only,
// mirroring the existing precedent at src/pages/account_receivable/types/toolPricing.ts.
//
// A SoftwareChargeLine is a preview only — the backend is the sole source of
// calculatedAmount. Nothing here feeds invoice subtotal/tax/grand total yet.
import type { BillingBasis } from "./toolCatalog";

export interface SoftwareChargeLine {
  assetId: string;
  assetCode: string;
  assetName: string;
  billingBasis: BillingBasis;
  quantity: number;
  unitPrice: number;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  assignmentStartDate: string;
  assignmentEndDate?: string;
  description?: string;
  calculatedAmount: number;
}
