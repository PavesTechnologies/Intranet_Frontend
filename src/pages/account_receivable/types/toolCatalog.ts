// Type reference for Epic 4 (Tool / Software / License Billing) Phase 2, Story 4.1 — Tool
// Catalog. Not enforced by a build-time type-checker (no tsconfig.json in this repo) — used
// for documentation/IDE hints only, mirroring the existing precedent at
// src/pages/account_receivable/types/projectToolBilling.ts.

// Backend enum (Billing Basis) — must match exactly, no additional values.
export type BillingBasis = "ONE_TIME" | "RECURRING";

export interface ToolCatalogItem {
  id: string;
  toolCode: string;
  toolName: string;
  description?: string;
  billingBasis: BillingBasis;
  currency: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}

export interface ToolCatalogItemInput {
  toolCode: string;
  toolName: string;
  description?: string;
  billingBasis: BillingBasis;
  currency: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}
