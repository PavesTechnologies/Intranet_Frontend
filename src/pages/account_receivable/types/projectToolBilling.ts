// Type reference for Epic 4 (Tool / Software / License Billing) Phase 1. Not enforced by a
// build-time type-checker (no tsconfig.json in this repo) — used for documentation/IDE hints
// only, mirroring the existing precedent at src/pages/airs/campaigns/types/campaignTypes.ts.
// The actual step component and service stay .jsx/.ts (no JSX in this file).

export type ProrationRule = "NONE" | "DAILY" | "MONTHLY";

export interface ProjectToolBillingConfig {
  toolBillingEnabled: boolean;
  allowOneTimeCharges: boolean;
  allowRecurringCharges: boolean;
  defaultProrationRule: ProrationRule;
}
