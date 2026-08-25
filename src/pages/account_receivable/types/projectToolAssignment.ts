// Type reference for Epic 4 (Tool / Software / License Billing) Phase 3, Story 4.2 — Project
// Tool Assignment. Not enforced by a build-time type-checker (no tsconfig.json in this repo) —
// documentation/IDE hints only, mirroring the existing precedent at
// src/pages/account_receivable/types/toolCatalog.ts.
//
// Billing Basis belongs solely to ToolCatalog and is inherited through the assigned Tool — the
// Assignment table no longer stores it. The response DTO still returns billingBasis (populated
// server-side from ToolCatalog.billingBasis) for display, so ProjectToolAssignment keeps the
// field; ProjectToolAssignmentInput (the create/update payload) does not.
import type { BillingBasis } from "./toolCatalog";

export interface ProjectToolAssignment {
  id: string;
  projectId: string;
  toolId: string;
  quantity: number;
  billingBasis: BillingBasis;
  remarks?: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface ProjectToolAssignmentInput {
  projectId: string;
  toolId: string;
  quantity: number;
  remarks?: string;
  startDate: string;
  endDate: string;
  active: boolean;
}
