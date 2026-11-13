# Cash advance and expense workflows: UI decisions

Written for: the product owner, the Finance and Manager leads, and the frontend and backend developers who build the Cash Advance and Expense screens.

## 1. Decisions taken

These follow the recommendations in the workflow notes. Change any of them and the UI rows below update with it.

| # | Question | Decision used for the UI |
|---|---|---|
| D1 | Employee has an open advance | Employee requests the full amount needed. The system shows each open advance and its outstanding balance. The employee does not choose any adjustment. |
| D2 | Who handles the existing balance | Manager recommends (full advance, or adjust against the new advance). Finance makes the final financial decision and authorises the disbursement. |
| D3 | Refund before a new advance | Not added. The employee is not asked to refund first. |
| D4 | Outstanding limit | Hybrid: a standard limit by grade, with Finance-authorised exceptions. **The limit values are not defined yet**, so the UI shows the exposure warning only once the backend returns a limit. |
| D5 | Forgotten expense lines | Stage-based. Before Manager approval: the employee corrects the same report. After Manager approval but before Finance closes: Finance returns it for correction. After settlement: a supplementary report linked to the original advance. |
| D6 | Set-off against an advance | Only as a Finance-authorised, separate, traceable adjustment. Never a silent reduction of a payment. |

## 2. Rules the UI must respect

- Cash advance ledger and reimbursement ledger stay separate. They connect only through a verified allocation record (a specific report offset against a specific advance).
- Outstanding is shown from confirmed transactions, never from the amount requested or approved.
- A closed advance is never edited. Anything new against it is a new record.
- Submitted amounts and approved amounts are shown separately. An approval never overwrites the submitted figure.
- Every decision screen states who decides, what the system already knows, and what happens after the click.

## 3. Screens and their state

| Screen | What it does now | Change in this round |
|---|---|---|
| Request advance (`RequestAdvancePage.jsx`) | Shows one total outstanding figure and a warning. | **Done.** Lists each open advance with its balance. When an amount is entered, shows the total owed if approved in full and says Manager and Finance decide the existing balance. |
| Manager approval (`CashAdvanceApprovalsList.jsx`, decision popup) | Manager picks a decision. | **Done (workflow 1).** Lists every open advance with what it owes. Four options: full amount, reduced, set off an earlier balance, defer or reject. Reason required for a set-off, a reduction, or any amount above the limit. The set-off picker shows the trip name, and the amount is capped at the lower of the earlier balance and the request. |
| Finance approval (`CashAdvanceApprovalPanel.jsx` with `ManagerDecisionSummary.jsx`) | Finance sees Approve and Reject only. | **Done (workflow 1).** Shows the manager's recommendation and reason, the live exposure (checked when Finance opens it), any exposure exception and whether it is already authorised, and the set-off: the source advance, the amount, and whether the carry-forward is in place. Finance can propose the carry-forward for exactly the recommended amount. Disbursement waits until it is in place. |
| Finance offset (`CashAdvanceOffsetSection.jsx`) | Finance types part of an advance number. The system offsets the smaller of the report total and the outstanding balance. | **Done.** Finance picks one open advance from a list, sees the split before recording (covered by the advance, paid to the employee, advance still owed afterwards), then records it. Only the selected advance is touched. |
| Finance review (`FinanceReviewPanel.jsx`) | Line-level review and actions. | **Next.** Add the receipt query states (R01 to R12) and the Finance decision on existing balance. |
| Settlement (`SettlementPage.jsx`) | Settle and repayment flow. | **Next.** Show closed advances as read-only history, with supplementary claims linked to them. |

## 4. Scenario map

Status key: **UI done**, **UI next** (screen change planned), **Backend** (needs server rule or data first), **Policy** (needs a company decision).

### E: Employee entry mistakes

| ID | Scenario | UI treatment | Status |
|---|---|---|---|
| E01 | Forgot line items | Before approval: "Add missing expense" on the same report. After approval: "Create supplementary report" linked to the original advance. | UI next, Backend |
| E02 | Wrong amount | Before approval: edit in place. After: amendment with reason; original amount stays visible struck through. | UI next |
| E03 | Wrong receipt | Replace file; old version kept under "Previous receipts". | UI next |
| E04 | Same receipt twice | Warning at upload: "This receipt matches an existing expense." Block only on an exact match. | Backend |
| E05 | Receipt in another person's name | Flag "Receipt name does not match you" for Finance. | Backend |
| E06 | Lost original receipt | "I don't have this receipt" with reason and optional alternative proof. Routed for approval. | UI next |
| E07 | Unreadable receipt | Reject at upload with "Upload a clearer copy". | UI next |
| E08 | Wrong expense date | Date is editable before approval; outside trip dates shows a reason field. | UI next |
| E09 | Wrong category | Change category before approval; history kept. | UI next |
| E10 | Report submitted twice | Submit button disabled after first click; server rejects a second submission with the existing report number. | Backend |
| E11 | Advance not linked | Settlement cannot be submitted until an advance is chosen or "No advance" is confirmed. | UI next |
| E12 | Expenses for someone else's trip | Only the owner can link; others see a clear "Not your trip" message. | Backend |

### R: Receipt and bill checks (Finance)

| ID | Scenario | UI treatment | Status |
|---|---|---|---|
| R01 | Entered amount differs from receipt | Side-by-side "Entered ₹2,000 · Receipt ₹1,500" with a query action. | UI next |
| R02 | Receipt date differs | Same side-by-side pattern. | UI next |
| R03 | Receipt used in two reports | Duplicate badge linking to the other report. | Backend |
| R04 | Suspicious receipt | "Flag for investigation" action, separate from rejection. | UI next |
| R05 | Mixed personal and business items | Item-level include or exclude. | Backend |
| R06 | Partly illegible | Query: request replacement or alternative proof. | UI next |
| R07 | Foreign language | Optional translation note field. | UI next |
| R08 | No vendor on receipt | Missing-document query. | UI next |
| R09 | Not a business expense | Reject with reason. | UI done (existing reject) |
| R10 | Wrong reporting period | Date check against the reporting rules. | Policy |
| R11 | Re-upload after rejection | New version shown; old version kept. | UI next |
| R12 | Upload works but save fails | Retry screen that shows the file is not attached yet. | Backend |

Receipt verification status is shown as its own badge, separate from report status: **Pending · Verified · Query raised · Rejected**.

### P: Policy and amount checks

| ID | Scenario | UI treatment | Status |
|---|---|---|---|
| P01 | Over category limit | Amber warning on the line; reviewer sees the excess. | Existing (policy banner) |
| P02 | Over daily allowance | Same warning, with the daily total. | Backend |
| P03 | Personal expense | Excluded amount shown separately as not claimable. | UI next |
| P04 | Outside trip dates | Reason required; routed as an exception. | UI next |
| P05 | Future date | Blocked at entry. | UI next |
| P06 | Non-working day | Policy note only. | Policy |
| P07 | Above the advance | Shown as "Reimbursable beyond the advance" in the reimbursement ledger. | Existing |
| P08 | Same expense in another project | Duplicate check. | Backend |
| P09 | Already paid by the company | Blocked with the payment reference. | Backend |
| P10 | Category disabled later | Historical category kept, marked "No longer in use". | UI next |
| P11 | Over project budget | Exception route. | Existing (budget check) |
| P12 | Tax or service charge | Tax shown as its own line; policy decides if it is claimable. | Policy |

### A: Several reports against one advance

| ID | Scenario | UI treatment | Status |
|---|---|---|---|
| A01 | Several reports for one advance | Advance page lists each report and the amount it has allocated. | UI next |
| A02 | Allocations exceed the amount received | Blocked: "Only ₹X is left to allocate." | Backend |
| A03 | Two reports submitted together | Server re-checks the balance; the second one shows "Balance changed, please review". | Backend |
| A04 | One report against two advances | Not allowed by default. Finance can split only with a policy setting. | Policy |
| A05 | Closed advance selected | Closed advances are not offered in the picker. | UI done (picker lists open advances only) |
| A06 | Supplementary report | Shows "Linked to CA-…" and the original report. | UI next |
| A07 | One report rejected, another approved | Balance uses approved reports only. | Backend |
| A08 | Several partial disbursements | Advance shows each disbursement with its date. | UI next |
| A09 | Advance changed after a report | Revalidation prompt before approval. | Backend |
| A10 | One advance across trips | Trip name shown on each allocation. | UI done (picker shows trip name) |

### F: Manager and Finance verification

| ID | Scenario | UI treatment | Status |
|---|---|---|---|
| F01 | Manager on leave | Shows "Delegated to ..." and the alternate's name. | Backend |
| F02 | Manager approves without checking receipts | Finance still verifies; Finance queue shows "Not yet verified". | Existing |
| F03 | Wrong amount approved | Correction with reason; both figures kept. | UI next |
| F04 | Valid expense rejected | "Request reconsideration" action for the employee. | UI next |
| F05 | Finance query after approval | Returns to the employee; approval history kept. | Existing |
| F06 | Partial approval of lines | Submitted and approved amounts shown in separate columns. | Existing |
| F07 | Whole report rejected | Reason required; advance balance unchanged. | Existing |
| F08 | Double click on approve | Button disabled while saving; server idempotency key. | UI done for offset; Backend for others |
| F09 | Two Finance users on one report | Lock notice: "Being reviewed by ...". | Backend |
| F10 | Category changed by Finance | Old and new category shown. | UI next |
| F11 | Approved but AP not paid | Status "Approved · Waiting for payment". | UI done (dashboard) |
| F12 | New documents during verification | New version flagged for re-check. | UI next |

## 5. Open items that need a decision

1. **Outstanding limit values (D4):** the grade-based limit numbers and who may authorise an exception.
2. **Forgotten-expense cut-offs (D5):** the exact stage where Manager approval counts as "approved" for correction purposes.
3. **Advances across trips (A04, A10):** whether one report may cover two advances.
4. **Late submissions:** the deadline and whether supplementary reports reset it. The current proposal is that they do not.

## 6. Next steps in order

1. Manager decision popup: show all open advances and the four decision options (D1, D2).
2. Settlement page: read-only closed advances with linked supplementary claims (A06).
3. Employee expense editing: E01, E02, E08, E09 before approval; supplementary report after approval.
4. Receipt query states R01 to R12 in Finance review.
5. Backend rules marked **Backend** above, starting with the duplicate checks (E04, R03, P08, P09).

## 7. Workflow A: Cash Advance (status)

Done in this round:
- **Retry without duplicates:** If submit fails after the draft is created, the retry updates that same draft. It no longer creates a second one. The message says the request is saved as a draft.
- **Rejection reason:** Stored on the advance and shown to the employee and approvers. Cleared when the request is sent again.
- **Deferred requests:** Show the deferral reason, the date, and a "Send to manager again" action. Previously the status showed as Disbursement and its badge showed the raw word "DEFERRED".
- **Request again:** After a rejection, the request page opens with the earlier title, purpose, amount, currency, cost centre and notes filled in. Dates are not copied.

Still open in Workflow A:
- A deferred request can't be sent again once its settlement due date has passed, and the employee has no way to change that date.
- Needed-by date isn't checked against the trip start date.
- Cost Centre Owner stage and Finance disbursement screen have not been reviewed in this round.
- The retry fix on the request page has no unit test.

## 8. Slice 1 review: status and open points

Done:
- Both request types, the calculation preview, the conditional justification and the compact outstanding summary.
- Submit is disabled until a preview has been calculated for the current amount, type and currency. Changing any of them drops the preview. The confirmation dialog shows the calculated cash and total.
- Preview checks the whole form first, so the calculation is only made of valid input.
- Submitted requests are read-only: only a draft can be edited. The query workflow reopens a request in Slice 4.
- Cash Advance + Outstanding cannot be approved or disbursed until its rollover exists. The rollover is created inside Finance approval, in the same transaction, so there is no circular wait. The refusals are safety stops and are removed when the rollover step is built.
- A justification is required whenever the employee has any open balance and selects Complete New, including balances that are not eligible for rollover (for example, expenses still awaiting approval). The only way to skip it is to have no open balance at all.

Employee profile:
- Department and designation names are left blank (not shown) until a name lookup exists. The employee cache holds only their IDs.
- Future integration: resolve department and designation names from the employee master (synchronised employee data) through the existing employee sync. Raw IDs must never be shown as labels.

Amount rule (multiples of 500):
- This rule predates Slice 1: the backend and the form already enforced it. The preview applies the same check.
- No approved policy for it was found in the code or the design documents. It is kept until Finance confirms or removes it. Removing it changes existing behaviour, so it is not removed without that confirmation.

Migration V42:
- Verified on MySQL 8.0.46 (the production version) against a fixture table with existing rows: the six columns are added, the rows are unchanged, the migration can be run twice, and legacy NULL request types are read as Complete New.
- Not verified: a full replay of V1 to V41 on an empty database. The earlier review found that V1 to V38 cannot be replayed on a schema built by the entity mappings, so that check is not possible yet.
- V1 to V38 match the last commit. V39 to V41 are not in the commit (they came from earlier work); they were not edited in Slice 1.

Still open:
- Browser verification of both request types (no browser automation was available in this session).

## 9. Slice 2: supporting documents

Rules:
- Optional. At most 5 documents per request, each at most 5 MB.
- Formats: PDF, JPG, JPEG, PNG and DOCX. Checked by extension, declared type, and the file's actual bytes (a DOCX must be a ZIP that contains the Word body).
- Categories: travel itinerary, client approval, project approval, meeting invitation, estimated expense breakdown, other.
- Only the owner can add or remove documents, and only while the request is a draft. The owner, the assigned manager, Finance and Admin can list them.
- Removal is a soft delete. The file is removed from storage only after the removal commits.

Storage:
- Files are stored in object storage under the advance and employee, never in MySQL. Only the metadata row is kept (table cash_advance_document, migration V43).
- If the metadata cannot be saved, the stored file is removed. The same happens if the transaction does not commit.

Frontend:
- The first document saves the draft if none exists yet (it needs a title and an amount first).
- Save Draft now updates the existing draft instead of creating another one. Before this, every save created a new draft.

Known limitations:
- Documents cannot be opened or downloaded from the screens yet. A download endpoint is needed before this is complete.
- A stored file that cannot be removed after a removal is logged, not retried. A cleanup job is needed for those.
- Some browsers send DOCX files with a generic type. Those are refused, since the type is checked strictly.
- Files are not scanned for malware.
- Uploads run one after another, not in parallel.
- Global handler change: a body that cannot be read, and a missing multipart part, now return 400 instead of 500 (this affects every endpoint).
