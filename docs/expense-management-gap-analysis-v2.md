# Expense Management: Gap Analysis v2 (after Stage 1 verification)

This replaces the first-pass gap analysis. It is based on the Stage 1 verification in [stage1-reconciliation-carry-forward-verification.md](stage1-reconciliation-carry-forward-verification.md), which read the code and ran the existing unit tests. Nothing was run end to end against a database or a browser.

Task IDs (CA-, ER-, ST-, UI-, NOT-, DOC-, QA-) follow the client's breakdown. Defect IDs are DEF-nn.

---

## 1. Verified completed requirements

These are confirmed by code reading and by passing tests in the targeted run.

| Requirement | Evidence | Scope of confirmation |
|---|---|---|
| CA-01 (backend) ₹500 multiple rule | `CashAdvanceServiceImpl.validateRoundAmount` on request and reduced approval | Backend rule confirmed. Configurability is open (decision #1). |
| ER-05 future-date validation | `ExpenseDatePolicy`, `SubmissionDeadlinePolicy` | Client confirmed in demo. Not re-tested in this stage. |
| ER-01 / ER-03 offset mechanics (multiple advances, partial, multiple reports) | `CashAdvanceAdjustmentServiceImpl.create`, `CashAdvanceBalanceCalculator`, `CashAdvanceAllocationRulesTest` (40), `CashAdvanceAdjustmentServiceImplTest` (10), `CashAdvanceAdjustmentReversalTest` (16) | Passes. The cap that protects the report is missing (DEF-01). |
| Duplicate offset prevention | Idempotency key, per-(advance, report) check, DB unique key `uk_cash_advance_adjustment_active_offset` (V39) | Code confirmed. MySQL concurrency tests not run. |
| Balance recomputed from records | `CashAdvanceBalanceRules.ledgerBalance`, `CashAdvanceBalanceLedgerTest` (15) | Passes. |
| 30-day expense window | `CashAdvanceExpenseWindow`, `CashAdvanceExpenseWindowTest` (10) | Passes. Overdue sweep does not use it (DEF-04). |
| Carry-forward transfers exactly once | `CashAdvanceCarryForwardService.approve` returns early when already applied; `applyBalances` runs once; `CashAdvanceCarryForwardServiceTest` (34) | Passes, but only when the feature flag is on (see Remaining). |
| Carry-forward pending until approval (propose path) | `propose` writes `PROPOSED` and leaves balances unchanged | Passes. |
| Salary deduction request and payroll confirmation | `SalaryDeductionService.create / recordResult`, `SalaryDeductionServiceTest` (41) | Passes. Auto-escalation issue in DEF-07. |
| Zero payroll result handled as failure | `PAYROLL_FAILED`, balance unchanged | Passes. Rejection as a distinct outcome is missing (DEF-10). |
| Recovery notice and grace period | `CashAdvanceRecoveryService`, `CashAdvanceRecoveryServiceTest` (21) | Passes. |
| Overdue marking (nightly) | `CashAdvanceOverdueScheduler`, `processOverdueAdvances` | Marks overdue. Durability and the rule are defective (DEF-03, DEF-04). |
| Payroll month window | `PayrollMonthPolicy`, `PayrollMonthPolicyTest` (5) | Passes. |

Frontend: 131 tests pass across the cash-advance, finance and API folders. 7 tests fail for network reasons (DEF-09), so the advance request and approval screens are not verified by tests.

---

## 2. Remaining implementation tasks

Grouped by the client's task IDs. Priority reflects the client's critical-path order.

### Critical (finance integrity, blocks sign-off)
| Task | What is left | Depends on |
|---|---|---|
| ER-01, ER-03 | Cap offsets at the report's payable amount on the server (DEF-01). Lock down `update` (DEF-02). | Nothing |
| CA-03 | Amendment and re-approval workflow for an approved amount (currently only reduced approval at manager stage). Confirm finance cannot change the amount at disbursement and add an audit row to every amount change. | Nothing |
| ST-01, ST-02 | Manager approval for carry-forward (DEF-05, DEF-06). Explicit Finance action before a ready amount applies. Approval UI for Finance and for the manager. Reject and cancel paths in UI. Feature flag decision and rollout. | Decisions #7, #9, #11 |
| ST-03 | Finance review before any automatic payroll request (DEF-07). No-trip default recommendation. Payroll acknowledgement and confirmation upload in the UI. | Decisions #8, #9 |
| ER-02 | Replace the single report-to-advance link with adjustment rows as the source of truth (DEF-08). Show all linked advances on the report. | Nothing |

### High
| Task | What is left |
|---|---|
| CA-02 | Verify previous-advance list with settlement status and the approval confirmation popup. The popup test fails for network reasons (DEF-09). |
| CA-04 | Employee-level advance ledger screen; verify duplicate-adjustment display. |
| CA-05 | Cash acknowledgement form, signatures, upload, and the rule that completion requires the upload. Not started. Decision #12. |
| CA-06, CA-07 | Verify mandatory-field validation, duplicate transaction reference checks, and proof upload. Partly in place. |
| ER-04 | Verify bulk approval and item-level rejection reasons; verify excluded items are not counted in verified totals. |
| ER-06 | Per-receipt trip-window validation with the exact invalid date shown; tolerance setting (none found). |
| ER-07 | Backdated / supplementary claim: new child record linked to the original settled report, approval routing, duplicate receipt prevention, audit history. Not started. Decisions #4, #5, #6. |
| ST-04 | Zero-expense settlement path, so a zero-expense advance is not shown as an ordinary ₹0 report. Not started. |
| ST-05, D5 | Month-end review queue, settlement-period filter, Finance notification about pending records. Not started. Decision #13. |
| DEF-03, DEF-04 | Make overdue a durable status and base it on the expense window. |
| UI-01 | Finish role dashboard work already in progress on `loki` (uncommitted files). |
| UI-02 | Verify status tabs and counts on finance queues. |

### Medium
| Task | What is left |
|---|---|
| CA-08, NOT-01 to NOT-04 | Verify email content and status. Finance notification for carry-forward and payroll confirmation. Duplicate notification prevention. |
| C5 / DEF-10 | Distinct payroll rejection outcome and re-queue behaviour. Decision #10. |
| UI-03 | Terminology and heading pass. Not started. |
| ARCH-02 | Make ₹500 denomination, carry-forward eligibility, and the 30-day window configurable per organisation. |

### Documentation and testing (before handover)
| Task | What is left |
|---|---|
| DOC-01 to DOC-03 | Functional requirements, workflow diagrams with success and failure paths, role and login documentation. Not started. |
| QA-01 | Independent functional test in a shared environment, with fresh accounts for each role. Needs deployment. |
| Test hygiene | Mock the network in the 3 failing frontend test files (DEF-09). Run the MySQL concurrency and migration tests against a test database. |

### Not assessed in this stage
AI-01, AI-02, and ARCH-01 / ARCH-03. These remain analysis tasks.

---

## 3. Newly identified defects

| ID | Severity | Summary | Where |
|---|---|---|---|
| DEF-01 | High | An offset is not capped at the report's remaining payable amount. A ₹5,000 offset against a ₹1,000 report is accepted, and ₹4,000 is cleared against no expense. | `CashAdvanceAdjustmentServiceImpl.create` |
| DEF-02 | High | `PUT /xms/finance/reimbursements/{id}` sets the amount and target report and advance with no balance check, no recalculation of advance or report balances, no audit row, and no duplicate check on the new target. | `CashAdvanceAdjustmentServiceImpl.update`, `CashAdvanceAdjustmentMapper.updateEntity` |
| DEF-03 | Medium | `OVERDUE` is set with `setStatus` and is not a derivable status, so any balance recompute clears it until the next nightly sweep. | `CashAdvanceServiceImpl.processOverdueAdvances`, `CashAdvanceBalanceLedger.statusFor` |
| DEF-04 | Medium | Overdue uses the user-entered settlement date, not the 30-day expense window. An advance issued near month-end can be marked overdue early. | `processOverdueAdvances`, `CashAdvanceMapper` (settlement date) |
| DEF-05 | High | The ready carry-forward path transfers the amount as `SYSTEM` when the destination advance is approved, with no carry-forward approval. | `CashAdvanceCarryForwardService.applyReadyForDestination` |
| DEF-06 | High | Manager cannot approve or reject carry-forward. Approve and reject are Finance-only on the server, and no UI calls them. | `CashAdvanceCarryForwardController`, `carryForwardApi.js` |
| DEF-07 | High | After the grace period, the recovery scheduler creates and emails a payroll salary-deduction request with no Finance review. | `CashAdvanceRecoveryService.escalateDueCases`, `SalaryDeductionService.initiateForRecoveryCase` |
| DEF-08 | Medium | `expense_report.cash_advance_id` holds one advance, but a report can be settled against several. | V32 migration, `ExpenseReport` entity |
| DEF-09 | Medium | Seven frontend tests make unmocked network calls and fail on timeout or `ECONNRESET`. They cover the advance request and approval screens. | `RequestAdvancePage.test.jsx`, `RequestAdvanceSlice1.test.jsx`, `CashAdvanceApprovalsList.test.jsx` |
| DEF-10 | Low | Payroll rejection is recorded as a zero result with a note, not as its own outcome, and the recovery case is not re-queued. | `SalaryDeductionService.recordResult` |

Also noted, not yet confirmed as defects:
- The carry-forward feature flag defaults to off, so none of the carry-forward behaviour is reachable in a default deployment. Confirm this is intended before the demo.
- `CashAdvanceRecoveryControllerTest` did not appear in the surefire output for the targeted run. Confirm it runs.

---

## 4. Client decisions still required

| # | Decision | Blocks |
|---|---|---|
| 1 | ₹500 fixed or configurable | Configurability task (ARCH-02) |
| 4 | Backdated claims need manager and finance approval | ER-07 |
| 5 | Who can start a backdated claim | ER-07 |
| 6 | Link backdated claims to the original settled report | ER-07 |
| 7 | Carry-forward eligibility rule | ST-01, ST-02 |
| 8 | Salary deduction mandatory for overdue no-trip advances | ST-03, DEF-07 |
| 9 | Who approves carry-forward and deduction | ST-02, ST-03, DEF-05, DEF-06 |
| 10 | What happens when payroll rejects | DEF-10, C5 |
| 11 | Carry-forward auto-applies, or needs Finance action | DEF-05 |
| 12 | Cash acknowledgement signatures | CA-05 |
| 13 | Unprocessed month-end records | ST-05 |
| 14 | Partial approval triggers partial settlement | ER-04 |

Recommended defaults (for discussion, not yet confirmed): #1 configurable; #4 yes, both; #6 yes, as a child record; #8 default recommendation with Finance override; #9 Finance approves carry-forward, Finance then payroll for deduction; #10 return to Finance as "Salary Deduction Pending"; #11 requires Finance action after manager approval; #12 both employee and finance; #13 carry forward, never auto-close.

---

## 5. Recommended implementation sequence

1. **Close the finance-integrity defects first (DEF-01, DEF-02).** Small change, high impact. Add tests for "offset above payable" and "update changes amount". Nothing else should be built on offsets until these are fixed.
2. **Settle the carry-forward and deduction decisions (#7, #9, #11, #8, #10).** These determine the shape of DEF-05, DEF-06, DEF-07. Do not change the code before they are answered.
3. **Carry-forward approval path (ST-01, ST-02, DEF-05, DEF-06).** Route the ready path through a `PROPOSED` record, add the manager approval and rejection endpoints and UI, then decide the feature-flag rollout.
4. **Salary deduction review (ST-03, DEF-07, DEF-10).** Require Finance review before any payroll request. Add the no-trip default recommendation and the payroll acknowledgement UI.
5. **Overdue and month-end (DEF-03, DEF-04, ST-05).** Derive overdue from the expense window and make it durable. Build the month-end queue and the Finance notification.
6. **Reconciliation traceability (ER-02, DEF-08).** Adjustment rows as source of truth, and the full chain shown on both report and advance.
7. **Disbursement evidence (CA-05, CA-06, CA-07).** Acknowledgement form and duplicate reference checks, once decision #12 is answered.
8. **Backdated claims (ER-07).** Use the existing deadline-override code as the starting point, and decide #4 to #6 first.
9. **Test hygiene and database verification (DEF-09, MySQL tests).** Mock the network in the failing tests and run the concurrency tests against a real database. Do this in parallel with steps 1 to 4, since it protects them.
10. **Terminology, dashboard and notifications (UI-01 to UI-03, NOT-01 to NOT-04).**
11. **Documentation and independent test (DOC-01 to DOC-03, QA-01).** Only after the workflows above are stable.
12. **AI assistant and architecture (AI-01, AI-02, ARCH-01 to ARCH-03).** Last.
