// Type reference for Epic 4 Phase 3 (RMS Asset Integration). Not enforced by a build-time
// type-checker (no tsconfig.json in this repo) — documentation/IDE hints only, mirroring the
// existing precedent at src/pages/account_receivable/types/toolPricing.ts.
//
// This is the shape future Invoice pages will consume to know which RMS project assets are
// eligible for billing. RMS is the source of truth for the asset and assignment window;
// billableEligible reflects RMS's own eligibility rule (e.g. a VPN seat assigned to a project
// but not billable) rather than anything AR derives locally.
import type { BillingBasis } from "./toolCatalog";

export interface ProjectBillableAsset {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
  quantity: number;
  billingBasis: BillingBasis;
  assignmentStartDate: string;
  assignmentEndDate?: string;
  billableEligible: boolean;
}
