## Stage 1 Verification: Reconciliation, Carry-Forward, Salary Deduction, Month-End

**Method.** Read-only. No source, migration, or config was changed. Code was traced from controller to service to entity and migration, and frontend screens were traced to their API calls. Automated tests were run without modification:

- Backend: `./mvnw -o test` on 18 targeted test classes (offline). Exit 0. 17 classes reported 270 tests with 0 failures and 0 errors; `CashAdvanceRecoveryControllerTest` did not appear in the surefire output, so it was not confirmed. The MySQL concurrency and migration tests were not run because no database is available.
- Frontend: `vitest run` on the cash-advance, finance, and approval test folders. 15 files passed. 3 files failed (7 tests), and 2 tests were skipped.

**Status key.** PASS, PARTIAL, FAIL, NOT IMPLEMENTED, NOT VERIFIED, as defined in the brief.

**Caveat.** Nothing was run end to end against a database or a browser. "PASS" means the code path and its unit tests were confirmed by reading and running them. Runtime behaviour is not proven.

---

## Test run summary

| Suite | Result | Notes |
|---|---|---|
| CarryForwardServiceTest | 34 pass | Propose, approve, reject, reverse, ready |
| SalaryDeductionServiceTest | 41 pass | Create, payroll result, cancel |
| CashAdvanceRecoveryServiceTest | 21 pass | Notice, escalation |
| CashAdvanceReconciliationServiceTest / CalculatorTest | 11 / 13 pass | Run lifecycle |
| CashAdvanceAdjustmentServiceImplTest / ReversalTest | 10 / 16 pass | Offsets, reversal |
| CashAdvanceAllocationRulesTest | 40 pass | |
| CashAdvanceBalanceLedgerTest / CalculatorTest | 15 / 7 pass | |
| CashAdvanceExpenseWindowTest | 10 pass | 30-day window |
| PayrollMonthPolicyTest | 5 pass | |
| CashAdvanceServiceImplTest / Exposure | 33 / 7 pass | |
| CashAdvanceWorkflowE2eTest | 1 pass | Ran about 290 s |
| Controller tests (carry-forward, reconciliation) | 4 / 2 pass | |
| Frontend cash-advance, finance, API tests | 131 pass, 7 fail, 2 skipped | See below |

**Frontend failures (7 tests, NOT VERIFIED).** The failures are 5-second timeouts and `ECONNRESET` / `socket hang up`, which points to unmocked network calls in the test setup. They affect:

- `RequestAdvancePage.test.jsx`: submit disabled state, successful submission, error display.
- `RequestAdvanceSlice1.test.jsx`: preview through the server, and the mandatory preview before submit.
- `CashAdvanceApprovalsList.test.jsx`: the approval confirmation modal and remarks.

These are the tests that would cover CA-01 frontend validation and the CA-02 approval popup. Their behaviour is not established.

---

## A. Advance reconciliation

### A1. Multiple cash advances for one employee: PASS
- **Expected:** each advance has its own balance and history; the employee's total is the sum.
- **Existing:** each advance is its own `cash_advance` row with its own balance. `CashAdvanceBalanceCalculator` and `CashAdvanceBalanceLedger` work per advance. Carry-forward is allowed only between advances of the same employee and currency.
- **Backend:** `CashAdvanceBalanceCalculator`, `CashAdvanceBalanceLedger.applyBalance / recordChange`, `CashAdvanceCarryForwardService.assertSameEmployeeAndCurrency`.
- **Frontend:** `MyAdvancesPage.jsx`, `pages/cash-advance/components/MoneyMovements.jsx`.
- **Tables:** `cash_advance`, `audit_log`.
- **Tests:** `CashAdvanceBalanceLedgerTest` (15), `CashAdvanceBalanceCalculatorTest` (7), `CashAdvanceAllocationRulesTest` (40): all pass.
- **Missing / defects:** none found.

### A2. One advance settled through multiple expense reports: PASS
- **Existing:** `CashAdvanceAdjustmentServiceImpl.create` checks duplicates per (advance, report) pair only, so one advance can be offset against many reports.
- **Tables:** `cash_advance_adjustment`. Unique key `uk_cash_advance_adjustment_active_offset` on `active_offset_key` (V39), which is NULL for reversed rows.
- **Tests:** `CashAdvanceAdjustmentServiceImplTest` (10), `CashAdvanceAdjustmentReversalTest` (16): pass.
- **Defect:** see **DEF-01** below. A report can also be offset against several advances, which the single `expense_report.cash_advance_id` link cannot represent (see **A7**).

### A3. Partial advance adjustment: PASS (backend), PASS (frontend)
- **Existing:** any positive `adjustedAmount` up to the advance's current balance is accepted (`@Positive`, balance check in `create`). `CashAdvanceOffsetSection.jsx` L47 caps the offset at `min(total, outstanding)`.
- **Tests:** covered by the adjustment test classes above.

### A4. Expenses exceeding the advance: PARTIAL
- **Expected (ER-03):** ₹50,000 advance, ₹55,000 expenses → ₹50,000 adjusted, ₹5,000 payable.
- **Existing:** `ReimbursementCalculator.reimbursable` is `max(0, total − active offsets)`. `refreshReimbursable` recomputes the payable amount after each offset. The frontend computes the adjusted amount (`min(total, outstanding)`) and the payable remainder.
- **Gap:** the adjustment amount is supplied by the caller. The backend does not compute `min(report reimbursable, advance balance)` itself, so the automatic calculation exists only in the UI. There is no test that asserts the ₹50,000 / ₹55,000 example end to end.
- **Verdict:** PARTIAL.

### A5. Remaining outstanding balance: PASS
- **Existing:** `CashAdvanceBalanceRules.ledgerBalance(advance, offsets, repayments)` is recomputed from records on every offset, so a stored value that drifted is corrected.
- **Tests:** `CashAdvanceBalanceRulesTest`, `CashAdvanceBalanceCalculatorTest`: pass.

### A6. Duplicate adjustment prevention: PASS (code), NOT VERIFIED (database)
- **Existing, three layers:**
  1. Idempotency key on `create`: a retry with the same key returns the original row (`findByIdempotencyKey`). Reusing a key for a different request is refused.
  2. Application check: refuses a second active offset for the same (advance, report).
  3. Database: unique key on `active_offset_key` (V39).
- **Transaction:** `create` runs at READ_COMMITTED after `findByIdForUpdate` on the advance, so two offsets on one advance run one at a time.
- **Not verified:** the MySQL concurrency tests (`CashAdvanceConcurrencyMysqlTest`, `CashAdvanceDisbursementRepaymentMysqlTest`) were not run because no database is available.
- **Defect:** the duplicate check covers the same advance only, not the same report across two advances (see **DEF-01**).

### A7. Advance-to-expense reference tracking: PARTIAL
- **Existing:** `expense_report.cash_advance_id` (V32) is a single foreign key. Each offset row in `cash_advance_adjustment` holds both `advance_id` and `report_id`, so the full chain is traceable through the adjustment rows.
- **Frontend:** `ExpenseReportDetailPage.jsx` and `CashAdvanceDetailPage.jsx` read the linked records. Navigation between them was not confirmed by running the UI.
- **Gap:** `expense_report` can hold only one advance reference, but the offset logic allows a report to be settled against several advances. The single column misrepresents that case. No reconciliation-run reference is shown on the advance record.
- **Verdict:** PARTIAL.

---

## B. Carry-forward

**Feature flag.** `expense.carry-forward.enabled` defaults to `false` (`application.properties` L144). While it is off, every carry-forward write returns "Carry-forward is disabled until Finance confirms the review-cycle rules." Nothing in the database or UI turns it on by default.

**Two mechanisms exist, and they behave differently:**
1. **Propose / approve / reject / reverse** (`CashAdvanceCarryForwardService`, table `cash_advance_carry_forward`). The record starts as `PROPOSED`, and `approve` moves it to `APPLIED` and transfers the balance.
2. **Ready** (`markReady`, `applyReadyForDestination`). The source advance stores `carry_forward_ready_amount`. When the next INR advance for that employee is approved, the amount is applied automatically with actor `SYSTEM`.

The UI uses only mechanism 2 (see B5).

### B1. Finance selects carry forward: PARTIAL
- **Existing:** `CarryForwardPanel.jsx` ("Carry forward" button, reason required) calls `carryForwardApi.markReady`. `POST /xms/cash-advance-carry-forwards/ready` allows FINANCE, FINANCE_EXECUTIVE, ADMIN, and GENERAL.
- **Gap:** the reason and the acting Finance user are recorded (`recordChange`), but there is no Finance-selected action of type "Carry Forward vs Salary Deduction" with a choice screen. Salary deduction is a separate panel.
- **Tests:** `CashAdvanceCarryForwardControllerTest` (4) and `CashAdvanceCarryForwardServiceTest` (34): pass. No frontend test for `CarryForwardPanel.jsx`.

### B2. Amount remains pending until approval: PASS for `PROPOSED`, FAIL for the ready path
- **Propose:** creates a `PROPOSED` row and does not touch either balance. Verified by code and `CashAdvanceCarryForwardServiceTest`.
- **Ready path:** `markReady` sets `carry_forward_ready_amount`, and the balance does not move. The amount transfers automatically when the next advance is approved, with no separate carry-forward approval. This conflicts with ST-02, which requires manager approval before transfer.

### B3. Manager approves carry-forward: NOT IMPLEMENTED (as a manager action)
- **Existing:** `approve` calls `requireFinance()`. The controller permits only ADMIN, FINANCE, and FINANCE_EXECUTIVE. No MANAGER role can approve.
- **Frontend:** `carryForwardApi.approve` and `carryForwardApi.propose` have no callers outside tests. Finance cannot approve from the UI at all.
- **Tests:** approve is covered at service level (`CashAdvanceCarryForwardServiceTest`). The "requester cannot approve own carry-forward" rule is tested.

### B4. Amount transfers exactly once: PASS (service and test)
- **Existing:** `applyBalances` runs once per approval. `approve` returns early when the row is already `APPLIED`, so a retry does not transfer twice. `applyReadyForDestination` caps the amount at the source's outstanding balance and at the destination's remaining capacity, then decrements the ready amount.
- **Transaction:** `@Transactional`. Advances are locked in ascending id order (`lockAdvancesInOrder`) to prevent deadlock. The carry-forward row is locked first (`findByIdForUpdate`).
- **Tables:** `cash_advance` (source `carried_out_amount`, destination `carried_in_amount`), `cash_advance_carry_forward`, `audit_log`.
- **Defect:** see **DEF-05** (the ready path transfers without an approval step).

### B5. Previous settlement closes correctly: NOT VERIFIED (closure label), PASS (balance)
- **Existing:** `balanceLedger.applyBalance(source, newBalance, ...)` recomputes the status from the balance through `statusAfterBalance`. When the balance reaches zero and no reimbursement is owed, the status should move to a closed state. I did not read `CashAdvanceBalanceRules.statusAfterBalance`, so the exact closed label is not confirmed.
- **Frontend:** `CarryForwardPanel.jsx` shows the ready amount and the outstanding balance. The closed-state display was not traced.

### B6. Manager rejects carry-forward: NOT IMPLEMENTED
- **Existing:** `reject` is Finance-only and works only on `PROPOSED` rows. There is no manager rejection, and the ready path has no rejection step. The only way to withdraw a ready amount is `cancelReady` (employee owner or Finance).
- **Frontend:** no reject button exists. `carryForwardApi.reject` has no callers.

### B7. Pending carry-forward remains available next month: PASS (persistence), PARTIAL (visibility)
- **Existing:** a `PROPOSED` row and a ready amount have no expiry. No scheduler touches `CashAdvanceCarryForward`, and `carry_forward_ready_amount` persists until applied or cancelled.
- **Gap:** there is no month-end queue or Finance notification for pending items (missing; see the month-end section).

---

## C. Salary deduction

### C1. Advance with zero expenses: PARTIAL
- **Existing:** `SalaryDeductionService.create` allows a request for any status in `RECOVERABLE_STATUSES` with a positive balance. It does not check whether expenses were submitted.
- **Missing (ST-03 / ST-04):** no automatic "no-trip" default recommendation, and no zero-expense settlement type. A zero-expense advance is handled as an ordinary advance with an outstanding balance.
- **Tests:** `SalaryDeductionServiceTest` (41): pass. The frontend `salaryDeduction.test.js` passed.

### C2. Advance with partial expenses: PASS
- **Existing:** `requireAmount(amount, balance, decimals, false)` caps the request at the current balance, and at the requested amount on payroll result.

### C3. Payroll deduction request: PASS
- **Existing:** `create` locks the advance (`findByIdForUpdate`), refuses a second open request, refuses while a recovery case is open, requires a configured payroll email, saves `PENDING_SEND`, and enqueues an email through `EmailOutboxService`. `syncEmail` moves the request to `SENT_TO_PAYROLL` only after the email status is `SENT`.
- **Tables:** `salary_deduction_request`, `outbound_email`, `audit_log`.
- **Frontend:** `SalaryDeductionPanel.jsx`, `pages/cash-advance/components/salaryDeduction.js`.

### C4. Payroll confirmation: PASS
- **Existing:** `recordResult` locks the advance and the request, refuses a second result, requires `SENT_TO_PAYROLL` (or cancelled after send), caps the actual amount at the requested amount, requires the processed month to match, and requires a reference or evidence file. It posts the deduction through `CashAdvancePayrollPosting.post`, moves the request to `PAYROLL_CONFIRMED`, closes the linked recovery case as `PAYROLL_RECORDED`, and queues a confirmation email to payroll.
- **Tables:** `salary_deduction_request`, `cash_advance` (balance), `cash_advance_recovery_case`, `audit_log`, `outbound_email`.
- **Tests:** `SalaryDeductionServiceTest` (41): pass.
- **Gap:** the evidence upload path depends on `CashAdvancePayrollPosting.storeEvidence`, which was not traced.

### C5. Failed or rejected payroll processing: PARTIAL
- **Existing:** a zero actual amount sets `PAYROLL_FAILED`, leaves the balance unchanged, and closes the recovery case as `PAYROLL_RECORDED`. Because `PAYROLL_FAILED` is not "open", Finance can create a new request.
- **Gap:** payroll has no separate "rejected" outcome. Rejection is recorded as a zero result with a free-text note, and the recovery case is not re-queued automatically. Client decision #10 is still open.
- **Frontend:** `PAYROLL_FAILED` is shown in `salaryDeduction.js`, `PaymentRequestPanel.jsx`, and `CashAdvanceDetailPage.jsx`.

---

## D. Month-end

### D1. Advance issued near month-end: PASS (window), FAIL (overdue decision)
- **Window:** `CashAdvanceExpenseWindow` runs 30 days from the expected trip end date, or from `disbursedAt` when there is no trip end. It is not anchored to the calendar month, so an advance issued on the 27th is not tied to month-end. `CashAdvanceExpenseWindowTest` (10) passes.
- **Overdue:** `processOverdueAdvances` uses `settlementDueDate`, which is taken from the user-entered `settlementDueDate` or `neededByDate` (`CashAdvanceMapper` L84). It never calls `CashAdvanceExpenseWindow`. See **DEF-04**.

### D2. Advance still within its 30-day submission period: PASS
- **Existing:** `isLocked` returns false while the window is open, and returns true once it has ended unless Finance reopens it or extends the deadline. Tests pass.
- **Gap:** the nightly overdue sweep ignores this window (see DEF-01).

### D3. Overdue advance: PARTIAL
- **Existing:** `CashAdvanceOverdueScheduler` runs at 01:00 daily. It marks an active advance with a positive balance as `OVERDUE` and publishes `CASH_ADVANCE_OVERDUE`.
- **Defect:** `OVERDUE` is set with a direct `setStatus`, and `CashAdvanceBalanceRules.statusAfterBalance` / `CashAdvanceBalanceLedger.statusFor` never produce `OVERDUE`. Any later balance change, such as an offset, repayment, or `refreshStatus`, recomputes the status and clears `OVERDUE` until the next nightly sweep. A carry-forward can therefore run during that gap, although `assertSourceCanGiveBalance` refuses `OVERDUE`. See **DEF-03**.

### D4. Finance takes no action: PARTIAL
- **Existing:** the overdue sweep only marks status and never closes an advance, so pending records are not auto-closed.
- **Defect:** `CashAdvanceRecoveryService.escalateDueCases` runs hourly. After the grace period, it creates a `SalaryDeductionRequest` in `PENDING_SEND` and queues an email to payroll with no Finance review step (`initiateForRecoveryCase`, `requestedBy = SYSTEM`). This is an automatic payroll action. See **DEF-07**.

### D5. Pending record continues into the following month: PASS (state), NOT IMPLEMENTED (queue)
- **Existing:** open recovery cases, `OVERDUE` advances, and ready carry-forwards all persist across months. `PayrollMonthPolicy` gives a rolling window of eligible payroll months.
- **Missing:** the month-end settlement review queue (ST-05), the settlement-period filter, and the Finance notification about pending records. A search of both repositories found no month-end queue or month-end notification.

---

## New defects

| ID | Scenario | Severity | Finding |
|---|---|---|---|
| **DEF-01** | A2, A4 | High | **Offset is not capped at the report's remaining reimbursable amount.** `CashAdvanceAdjustmentServiceImpl.create` checks only the advance balance. Example: a report with ₹1,000 payable, and an advance with ₹5,000 outstanding. `POST` with `adjustedAmount = 5,000` is accepted. The advance balance drops by ₹5,000, while `ReimbursementCalculator.reimbursable` floors the report at ₹0. ₹4,000 is cleared against no expense. The frontend caps the amount, so only direct API calls, or any other caller, reach this. Whether `CashAdvanceOffsetSection`'s `reportTotal` is gross or net of prior offsets was not confirmed. |
| **DEF-02** | A1–A6 | High | **`PUT /xms/finance/reimbursements/{id}` changes the offset without any checks.** `CashAdvanceAdjustmentServiceImpl.update` sets `adjustedAmount` straight from the request (`CashAdvanceAdjustmentMapper.updateEntity`). It does not check the balance or the report cap, does not recalculate the advance balance or status, does not recalculate the report's reimbursable amount, and writes no audit row. It also accepts a new `advanceId` and `reportId`, which bypasses the duplicate check. Finance can therefore move an offset from one report to another or change its amount, and the stored balances drift. |
| **DEF-03** | D3 | Medium | **`OVERDUE` status is not durable.** It is set with `setStatus` and is not a value the balance rules can derive, so any later recompute clears it. |
| **DEF-04** | D1 | Medium | **Overdue uses the user-entered settlement date, not the expense window.** The sweep ignores `CashAdvanceExpenseWindow`. |
| **DEF-05** | B2, B4 | High | **Ready carry-forward transfers without an approval step.** `applyReadyForDestination` applies the amount as `SYSTEM` when the destination is approved, and no separate carry-forward approval is required. The approval is implied by approving the next advance, which does not match ST-02. |
| **DEF-06** | B3, B6 | High | **No manager approval or rejection of carry-forward.** `approve` and `reject` are Finance-only on the server, and no UI calls them. |
| **DEF-07** | D4 | High | **Automatic payroll salary-deduction request without Finance review.** `escalateDueCases` creates and emails a payroll request with no Finance action. ST-03 requires Finance to review. |
| **DEF-08** | A7 | Medium | **Single advance reference on the expense report.** `expense_report.cash_advance_id` cannot represent a report settled against several advances. |
| **DEF-09** | Test | Medium | **Frontend tests make unmocked network calls.** Seven tests across three files time out or fail with `ECONNRESET`. This hides regressions in the advance request and approval screens. |
| **DEF-10** | C5 | Low | **Payroll rejection is not a separate outcome.** It is recorded as a zero result, and the recovery case is not re-queued. |

Test coverage note for the carry-forward UI: no test exists for `CarryForwardPanel.jsx`, and none of the carry-forward API functions for approval are exercised by the UI.

---

## Verification result by scenario

| ID | Scenario | Result |
|---|---|---|
| A1 | Multiple advances per employee | PASS |
| A2 | One advance through multiple reports | PASS (see DEF-01 for the cap) |
| A3 | Partial adjustment | PASS |
| A4 | Expenses exceed advance | PARTIAL |
| A5 | Remaining outstanding balance | PASS |
| A6 | Duplicate adjustment prevention | PASS (code); NOT VERIFIED (MySQL) |
| A7 | Advance-to-expense reference | PARTIAL |
| B1 | Finance selects carry forward | PARTIAL |
| B2 | Amount pending until approval | PASS (propose); FAIL (ready path) |
| B3 | Manager approves carry-forward | NOT IMPLEMENTED |
| B4 | Transfers exactly once | PASS |
| B5 | Previous settlement closes | NOT VERIFIED (label); PASS (balance) |
| B6 | Manager rejects carry-forward | NOT IMPLEMENTED |
| B7 | Pending persists to next month | PASS (state); NOT IMPLEMENTED (queue) |
| C1 | Zero-expense advance | PARTIAL |
| C2 | Partial expenses | PASS |
| C3 | Payroll deduction request | PASS |
| C4 | Payroll confirmation | PASS |
| C5 | Failed / rejected payroll | PARTIAL |
| D1 | Advance issued near month-end | PASS (window); FAIL (overdue decision) |
| D2 | Within 30-day period | PASS |
| D3 | Overdue advance | PARTIAL (status not durable) |
| D4 | Finance takes no action | PARTIAL (auto payroll request) |
| D5 | Pending continues to next month | PASS (state); NOT IMPLEMENTED (queue) |

---

## Recommended changes (no code changed in this stage)

1. **DEF-01 / DEF-02:** in `create`, cap `adjustedAmount` at the report's reimbursable amount, and make `update` run the same validation and recalculation as `create`, or disallow `update` on amount and target. Add tests for "offset larger than report payable" and "update changes amount".
2. **DEF-05 / DEF-06 / B3:** decide whether carry-forward needs manager approval (client decision #9). If yes, add a manager role and an approval endpoint, and route the ready path through a `PROPOSED` record instead of auto-applying.
3. **DEF-07:** require a Finance action before a recovery case creates a payroll request, or add a configuration flag that keeps the automatic path off until decided.
4. **DEF-03 / DEF-04:** make `OVERDUE` a derived status (based on the expense window and settlement date), or store it as a separate flag that `statusAfterBalance` preserves. Use `CashAdvanceExpenseWindow` in the overdue sweep.
5. **DEF-08:** replace the single `expense_report.cash_advance_id` with the adjustment rows as the source of truth, and show all linked advances on the report.
6. **DEF-09:** mock the network layer in the three failing test files, and re-run them.
7. **Missing UI:** add the carry-forward approval and rejection screen for Finance and the manager, and the month-end review queue (ST-05).
8. **Verify on a database:** run the MySQL concurrency and migration tests (`CashAdvanceConcurrencyMysqlTest`, `CashAdvanceDisbursementRepaymentMysqlTest`) against a test database.

---

## Client decisions still required (these block some verdicts)

| # | Decision | Effect on this stage |
|---|---|---|
| 7 | Eligibility rule for carry-forward | Needed before B1 and B2 can be finalised |
| 8 | Is salary deduction mandatory for overdue no-trip advances? | Needed for C1 and D4 (DEF-07 is currently automatic) |
| 9 | Who approves carry-forward and deduction? | Needed for B3 and D6. Server currently implies Finance only |
| 10 | What happens when payroll rejects? | Needed for C5 |
| 11 | Carry-forward auto-apply or explicit Finance action? | Needed for D5 |
| 13 | What if Finance does not process a month-end settlement? | Needed for D5 queue behaviour |
| 14 | Partial approval triggers partial settlement? | Affects A4 |
