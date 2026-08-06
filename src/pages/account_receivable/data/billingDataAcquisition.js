// Static placeholder data — will be replaced by the real TMS/contract/milestone/recurring/
// expense/tool source systems once Epic 1 endpoints exist. Every record carries a date field
// so mockAcquisitionProviders can filter by the billing period the user selects — picking a
// period with no matching dates below is what surfaces the "no transactions found" state.
export const MOCK_TRANSACTIONS = {
  "BC-2026-001": {
    labor: [
      { id: "LAB-1001", employee: "John Smith", workDate: "2026-07-02", hours: 8, rate: 1800, approvalStatus: "Approved" },
      { id: "LAB-1002", employee: "John Smith", workDate: "2026-07-03", hours: 7.5, rate: 1800, approvalStatus: "Approved" },
      { id: "LAB-1003", employee: "Meera Joshi", workDate: "2026-07-03", hours: 8, rate: 1650, approvalStatus: "Approved" },
      { id: "LAB-1004", employee: "Meera Joshi", workDate: "2026-07-08", hours: 6, rate: 1650, approvalStatus: "Pending Approval" },
      { id: "LAB-1005", employee: "John Smith", workDate: "2026-07-10", hours: 8, rate: 1800, approvalStatus: "Approved" },
    ],
    expense: [
      { id: "EXP-1001", description: "Client on-site travel", expenseDate: "2026-07-05", category: "Travel", amount: 18500, approvalStatus: "Approved" },
      { id: "EXP-1002", description: "Cloud sandbox environment", expenseDate: "2026-07-12", category: "Infrastructure", amount: 9400, approvalStatus: "Approved" },
    ],
    tool: [
      { id: "TL-1001", toolName: "Jira Premium", chargeType: "Recurring", quantity: 12, unitPrice: 850, amount: 10200 },
      { id: "TL-1002", toolName: "Figma Enterprise Seat", chargeType: "One-Time", quantity: 2, unitPrice: 4500, amount: 9000 },
    ],
  },
  "BC-2026-002": {
    contract: [
      { id: "CTR-1001", schedule: "Milestone 2 of 4", plannedInvoiceDate: "2026-07-15", amount: 6250000, status: "Ready" },
      { id: "CTR-1002", schedule: "Change Request #3", plannedInvoiceDate: "2026-07-28", amount: 850000, status: "Ready" },
    ],
    expense: [
      { id: "EXP-2001", description: "Regulatory audit support", expenseDate: "2026-07-18", category: "Compliance", amount: 32000, approvalStatus: "Approved" },
    ],
    tool: [],
  },
  "BC-2026-004": {
    recurring: [
      {
        id: "REC-4001",
        recordDate: "2026-07-01",
        billingPeriod: "Jul 2026",
        retainerAmount: 450000,
        proration: "Full Month",
        plan: "Retainer",
        billingCycle: "Monthly",
        nextBillingDate: "2026-08-01",
        amount: 450000,
      },
    ],
    expense: [
      { id: "EXP-4001", description: "Robotics field calibration kit", expenseDate: "2026-07-09", category: "Equipment", amount: 27500, approvalStatus: "Approved" },
      { id: "EXP-4002", description: "On-site support travel", expenseDate: "2026-07-21", category: "Travel", amount: 12300, approvalStatus: "Approved" },
    ],
    tool: [
      { id: "TL-4001", toolName: "Asset Tracking Suite", chargeType: "Recurring", quantity: 1, unitPrice: 15000, amount: 15000 },
    ],
  },
  "BC-2026-008": {
    recurring: [
      {
        id: "REC-8001",
        recordDate: "2026-07-01",
        billingPeriod: "Jul 2026",
        retainerAmount: 0,
        proration: "N/A",
        plan: "Patient Portal — Growth Tier",
        billingCycle: "Monthly",
        nextBillingDate: "2026-08-01",
        amount: 185000,
      },
    ],
    expense: [
      { id: "EXP-8001", description: "Accessibility compliance review", expenseDate: "2026-07-14", category: "Compliance", amount: 21000, approvalStatus: "Approved" },
    ],
    tool: [
      { id: "TL-8001", toolName: "Analytics Add-on", chargeType: "Recurring", quantity: 1, unitPrice: 8000, amount: 8000 },
    ],
  },
  "BC-2026-011": {
    milestone: [
      { id: "MS-11001", milestone: "Claims Intake Module Go-Live", completionDate: "2026-07-06", amount: 2100000, status: "Completed" },
      { id: "MS-11002", milestone: "Adjudication Engine UAT Sign-off", completionDate: "2026-07-24", amount: 1650000, status: "Completed" },
      { id: "MS-11003", milestone: "Fraud Detection Model Rollout", completionDate: "2026-08-20", amount: 1900000, status: "Pending" },
    ],
    expense: [
      { id: "EXP-11001", description: "Actuarial consulting", expenseDate: "2026-07-17", category: "Consulting", amount: 45000, approvalStatus: "Approved" },
    ],
    tool: [
      { id: "TL-11001", toolName: "Fraud Detection Model License", chargeType: "One-Time", quantity: 1, unitPrice: 60000, amount: 60000 },
    ],
  },
};
