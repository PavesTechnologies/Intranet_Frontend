# Expense Management: Gap Analysis Against Client Task Breakdown

**Scope and method.** This is a first-pass static review. It checks which entities, services, endpoints and screens exist in the two repos (`intranet-fe` and `Expense_Management_Service`) and reads the key rule code where it matters. It does not run the app or the test suites. Where a status says *Verify*, the code path exists but its behaviour against the requirement has not been tested.

**Status legend**
- **Present**: implemented and the core rule is visible in code.
- **Partial**: some of the pieces exist, but at least one listed task is not covered.
- **Verify**: the code path exists; behaviour against the requirement is unconfirmed.
- **Missing**: no implementation found.
- **Not assessed**: analysis-only item, out of scope for this pass.

---

## 1. Cash Advance Management

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| CA-01 | Multiples-of-₹500 denomination | **Present** (rule fixed, not configurable) | Backend: `ADVANCE_ROUND_BLOCK = 500` and `validateRoundAmount` in `CashAdvanceServiceImpl.java` (~L1579). Applied to new requests and to manager reduced approvals. Frontend: `RequestAdvancePage.jsx` L132, L540. **Gaps:** rule is a constant, not organisation-configurable (decision #1); no API-level rejection test confirmed. |
| CA-02 | Show outstanding advance to manager before approval | **Partial** | `CashAdvanceExposure`, `OutstandingBalanceSummary.jsx`, `CashAdvanceApprovalPanel.jsx` exist. Exposure limit triggers a justification. **Verify:** previous-advance list with settlement status, and the confirmation popup. |
| CA-03 | Approved amount is authoritative; no silent finance reduction | **Partial** | Manager `APPROVE_REDUCED` path exists with a justification and a round-amount check. `disbursedAmount` is stored separately (`amount - carriedIn`). **Gaps:** no formal amendment / re-approval workflow; finance-side disbursement must be checked to confirm it cannot change the amount; audit trail for amount changes not confirmed. |
| CA-04 | Multiple advances, cumulative balances, employee ledger | **Partial** | `CashAdvanceBalanceLedger`, `CashAdvanceBalanceCalculator`, `CashAdvanceBalanceDriftService`, `CashAdvanceReconciliationLine`, `settlementCycles.js`. **Verify:** employee-level ledger screen and duplicate-adjustment prevention. |
| CA-05 | Signed cash acknowledgement form | **Missing** | No acknowledgement form, signature capture, or upload found. The "acknowledg" hits in the backend are Kafka consumer acks and the `receivedByName` disbursement field, not this feature. |
| CA-06 | Bank transfer disbursement | **Partial** | `CashAdvanceDisbursement` record has `transactionReference`, `transferDate`, `transferDetails`. `RecordDisbursementModal.jsx`. **Verify:** mandatory-field validation, proof upload (`CashAdvanceDocument`, V37), duplicate-reference check. |
| CA-07 | UPI disbursement | **Partial** | Fields `upiTransactionId` and `payeeUpiId` exist in the disbursement record. **Verify:** screenshot upload, date, duplicate check. |
| CA-08 | Disbursement email with reference and delivery status | **Partial** | `CashAdvanceEmailService` / `CashAdvanceEmailTemplate`, `OutboundEmail` entity with status. Client said this already works. **Verify:** email content covers all listed fields. |

## 2. Expense Reports and Reconciliation

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| ER-01 | Automatic advance adjustment against verified expenses | **Present** (verify numbers) | `CashAdvanceAdjustment` entity, `CashAdvanceAllocationRules`, `CashAdvanceReconciliationService`, `CashAdvanceReconciliationCalculator`. Idempotency added in V39. **Verify:** the ₹5,000 / ₹5,500 example end to end. |
| ER-02 | Unique reference-based reconciliation trail | **Partial** | `CashAdvanceReconciliationRun` and `Line` entities; reconciliation controller. **Verify:** cross-navigation between advance and expense report, and who performed each reconciliation. |
| ER-03 | Partial and multi-report settlement | **Partial** | Allocation rules and balance calculator support it. **Verify:** ₹50,000 advance vs ₹55,000 expenses → ₹50,000 adjusted, ₹5,000 payable. |
| ER-04 | Whole-report and line-item approval | **Partial** | `ApprovalLineItemReview`, `LineItemReviewPanel.jsx`, `LineItemReviewRequest`. **Verify:** bulk approve, item-level rejection reasons, and that pending or rejected items are excluded from verified totals. |
| ER-05 | No future-dated expenses | **Present** | `ExpenseDatePolicy`, `SubmissionDeadlinePolicy`, `expenseDateRange.js`. Client confirmed it works in the demo. Needs a regression test only. |
| ER-06 | Receipts inside the trip window | **Partial** | `tripStartDate` on reports and `expectedTripStartDate` on advances. **Verify:** per-receipt validation against trip dates, the invalid-date message, and tolerance configuration (none found). |
| ER-07 | Backdated / supplementary expense exception | **Missing** | No supplementary-claim entity, workflow, or link to a settled report. `ExpenseDeadlineOverrideService` and `DeadlineOverrideRequest` exist. That is a per-report deadline extension, not a child claim, but it is a reasonable starting point to reuse. |

## 3. Carry-Forward and Salary Deduction

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| ST-01 | Carry-forward vs salary deduction choice | **Partial** | `CashAdvanceCarryForward` entity, `CarryForwardPanel.jsx`, `CarryForwardDecisionRequest`, `CashAdvanceCarryForwardService`. **Verify:** pending state before approval, and the reason and actor are recorded. |
| ST-02 | Carry-forward approval and transfer | **Partial** | Service exists. **Verify:** pending record, manager notification, transfer only after approval, and single deduction. Rejection and cancellation handling not confirmed. |
| ST-03 | Salary deduction, default for no-trip advances | **Partial** | `SalaryDeductionRequest` entity, `SalaryDeductionService`, `SalaryDeductionPanel.jsx`, `SalaryDeductionEmailTemplate`, `PayrollMonthPolicy`. **Gaps:** no automatic "no trip / no expense" default recommendation found; payroll acknowledgement and confirmation-document upload not confirmed. |
| ST-04 | Zero-expense settlement | **Verify** | Not found under that name. Needs checking in `SettlementPage` / `SettleBalancePanel`. It must not appear as a ₹0 expense report. |
| ST-05 | Month-end review queue, 30-day window, no auto-closure | **Partial** | `CashAdvanceOverdueScheduler`, `CashAdvanceRecoveryScheduler`, `CashAdvanceRecoveryCase`, `PayrollMonthPolicy`. **Verify:** queue screen, filtering by settlement period, and carry-over of unactioned records. |

## 4. Finance UI, Roles and Terminology

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| UI-01 | Logged-in role, department, role-based actions | **Partial, in progress** | Uncommitted files on `loki`: `RoleDashboard.jsx`, `QuickActions.jsx`, modified `DashboardPage.jsx`, and a test. Department display and full role matrix not confirmed. |
| UI-02 | Status filters, search, counts, date filters | **Partial** | `AdvancedFilterPage`, `SavedFiltersControl`, `FilterPanel`, `ReimbursementsPage`. **Verify:** Pending / In Progress / Completed / Rejected tabs and counts. |
| UI-03 | Renamed headings, status labels, no test names | **Missing** | No terminology pass found. Needs a copy review across the cash-advance screens. |

## 5. Notifications

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| NOT-01 | Manager approval email with outstanding info | **Partial** | `ApprovalReminderEmailService`, `NotificationEventListener`. **Verify:** outstanding balance and justification are in the body. |
| NOT-02 | Finance notifications (carry-forward, payroll confirmation, exception review) | **Partial** | Event listener exists. Only the carry-forward and exception triggers need checking; the exception trigger depends on ER-07. |
| NOT-03 | Payroll requests with response tracking | **Partial** | Salary deduction email template exists. Payroll response tracking not confirmed. |
| NOT-04 | Notification log, sent/failed status, retry, de-duplication | **Partial** | `OutboundEmail` with status, `EmailOutboxService`, `Notification` / `NotificationRead` entities. **Verify:** retry for failed sends and duplicate prevention. |

## 6. Documentation and Testing

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| DOC-01 | Functional Requirement Document | **Missing** | Only `docs/cash-advance-ui-workflows.md` exists (already modified in the working tree). |
| DOC-02 | Workflow diagrams with success and failure paths | **Missing** | None found. |
| DOC-03 | Role and login documentation | **Missing** | Test credentials must not go in the repo. Put them in a secure channel. |
| QA-01 | Independent functional testing in a shared environment | **Missing** | Needs deployment and a test team. Out of repo scope. |

## 7. AI Assistant and Architecture

| ID | Requirement | Status |
|---|---|---|
| AI-01, AI-02 | Enterprise and contextual assistant | **Not assessed.** Analysis task. |
| ARCH-01, ARCH-02, ARCH-03 | Workflow review, configurable rules, codebase review | **Not assessed.** Analysis task. Several of its items are the same gaps listed above. |

---

## Blocking business decisions

Recommended defaults are for discussion. Nothing here should be built until the client confirms it.

| # | Question | Recommended default until confirmed |
|---|---|---|
| 1 | ₹500 multiples fixed or configurable? | Keep the constant, but move it to `SystemConfiguration` so it is configurable per organisation. |
| 2 | Multiple open advances per employee? | Allow it. The ledger already supports it. |
| 3 | One advance across several expense reports? | Allow it. The allocation rules already support it. |
| 4 | Do backdated claims need manager and finance approval? | Yes, both. |
| 5 | Who can start a backdated claim? | Employee, with manager or finance able to raise one on their behalf. |
| 6 | Link backdated claims to the original settled report? | Yes, as a child record. Do not reopen the parent. |
| 7 | Carry-forward eligibility rule? | Undecided. Needs a policy value per organisation. |
| 8 | Is salary deduction mandatory for overdue no-trip advances? | Default recommendation, with finance able to override. |
| 9 | Who approves carry-forward and deduction? | Finance manager, then payroll for deductions. |
| 10 | Payroll rejects a deduction? | Return the record to finance as "Salary Deduction Pending". |
| 11 | Carry-forward auto-applies or needs finance action? | Needs finance action after manager approval. |
| 12 | Cash acknowledgement signatures: employee, finance, or both? | Both, because the employee receives cash and finance hands it over. Confirm. |
| 13 | Unprocessed month-end records? | Carry them into the next month. Never auto-close. |
| 14 | Partial approval triggers partial settlement? | Settle only the approved lines. Confirm. |

## Suggested order of work

1. **Verify before building.** Run the existing ER-01 and ST-01/ST-02 scenarios end to end, and record the results. Most "Partial" rows will change to "Present" or to a specific bug.
2. **Close the finance-safety gaps** (CA-03 amendment and audit trail, CA-02 confirmation popup).
3. **Disbursement evidence** (CA-05 acknowledgement, duplicate-reference checks for CA-06 and CA-07).
4. **Backdated claims** (ER-07), starting from the existing deadline-override code.
5. **Terminology and dashboard** (UI-03, finish UI-01 and UI-02).
6. **Documentation and independent test pass** (DOC-01 to DOC-03, QA-01).
7. **AI assistant analysis** (AI-01, AI-02) after the workflows are stable.
