// Option lists for the Tool Catalog screen (Epic 4 Phase 2, Story 4.1).

// Backend enum (Billing Basis) — must match exactly, no additional values.
export const BILLING_BASIS_OPTIONS = [
  { value: "ONE_TIME", label: "One Time" },
  { value: "RECURRING", label: "Recurring" },
];

export const TOOL_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];
