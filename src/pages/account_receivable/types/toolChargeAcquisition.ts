// Type reference for Epic 4 (Tool / Software / License Billing) Phase 4, Story 4.3 — Tool
// Charge (Billing Data) Acquisition. Not enforced by a build-time type-checker (no tsconfig.json
// in this repo) — documentation/IDE hints only, mirroring the existing precedent at
// src/pages/account_receivable/types/projectToolAssignment.ts. Billing Basis is the same
// backend enum used by Tool Catalog / Project Tool Assignment — reused via import.
import type { BillingBasis } from "./toolCatalog";

export interface ToolChargePreviewRequest {
  projectId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

// One previewed, backend-calculated tool charge line. quantity, unitPrice and
// calculatedAmount are exactly what the backend returns — the frontend never derives or
// recomputes any of them.
export interface ToolChargePreviewRecord {
  projectId: string;
  projectName?: string;
  toolCode: string;
  toolName: string;
  billingBasis: BillingBasis;
  quantity: number;
  unitPrice: number;
  calculatedAmount: number;
  currency: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}
