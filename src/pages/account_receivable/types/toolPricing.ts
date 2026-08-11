// Type reference for Epic 4 Phase 2 (Tool Pricing) — supersedes the earlier Tool Catalog
// design. Not enforced by a build-time type-checker (no tsconfig.json in this repo) —
// documentation/IDE hints only, mirroring the existing precedent at
// src/pages/account_receivable/types/toolCatalog.ts.
//
// RMS is the source of truth for Software/Tool assets — AR no longer creates or maintains a
// Tool master. BillingBasis is still imported from ./toolCatalog: that file's name predates
// this rename, but its BillingBasis export is a cross-cutting enum also used by Project Tool
// Assignment and Tool Charge Acquisition, so it stays put rather than being duplicated here.
import type { BillingBasis } from "./toolCatalog";

// A Software/Tool asset as selected from RMS. Read-only from AR's perspective — AR never
// creates, edits or deletes assets, only looks them up for pricing. Matches the real RMS
// contract; only the transport is mocked (see services/rmsAssetService.ts).
export interface RmsAsset {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
}

// Response model. assetCode/assetName/currencyCode are denormalized by the backend for
// display — the frontend must render them as-is and never derive or join them locally, and
// must never persist a local lookup copy of them after save. The backend is the source of
// truth; a fresh getAll() after every mutation is what keeps the table correct.
export interface ToolPricingItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  description?: string;
  billingBasis: BillingBasis;
  currencyId: string;
  currencyCode: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}

// Create/update payload. AR stores only commercial information referencing RMS/Currency
// Master by id — no assetCode, assetName or currencyCode are ever submitted.
export interface ToolPricingItemInput {
  assetId: string;
  description?: string;
  billingBasis: BillingBasis;
  currencyId: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}
