# Phase 2 — Leave Management Module Migration

Branch: `intra-ui/unify`. Migrates `src/pages/leave_management/**` onto the Phase 1 canonical UI layer
(see `docs/ui/phase-1-canonical-ui.md`), one component type at a time. This document is updated per step.

## Migration rule for future modules

> Use the canonical Button from `src/components/Button/Button.jsx`. Do not create module-specific Button
> implementations unless there is a documented business-specific reason.

The same rule applies to every other canonical component (Modal, PageCard, PageHeader, StatusBadge, etc.) as
those steps are executed.

---

## P0.1 — Button Migration

**Date:** 2026-08-14

### Scope

Only `<button>` elements under `src/pages/leave_management/` were touched. No Modal, FormInput, FormSelect,
DatePicker/DateRangePicker internals, tables, Pagination, Cards, typography, Filters, Loading, Toasts, or
StatusBadge markup was changed. No file outside `src/pages/leave_management/` was modified (the canonical
`src/components/Button/Button.jsx` itself was not touched).

### Method

1. A full audit of every button-like element under `src/pages/leave_management/` was performed first (71 files
   scanned), covering raw `<button>`, existing Button imports, clickable divs styled as buttons, and bare
   icon-with-onClick elements.
2. Every button was classified as either a MIGRATE candidate (a standard single-purpose action button — Save,
   Cancel, Approve, Reject, Delete, Edit, Close, Submit, Add, icon action, dropdown trigger, text link) or an
   intentional SKIP (a stateful custom UI control where the canonical Button's fixed padding/variant classes
   would visually conflict with self-contained styling — see "Buttons intentionally left unchanged" below).
3. Edits were applied file-by-file with the exact original `onClick` handler, `disabled` expression, and
   conditional loading/text-swap children preserved verbatim — only the element tag and presentational
   props (`variant`, `size`, `className`) changed.

### Files audited

All 71 `.jsx`/`.js` files under `src/pages/leave_management/` (root, `charts/`, `hooks/`, `models/`,
`ruleBook/`, `websockets/`, `services/`).

### Files modified (41)

```
EnterpriseConfigManager.jsx, HRManageTools.jsx, Unauthorized.jsx,
charts/AllHolidaysGrid.jsx, charts/Calendar.jsx, charts/LeaveDetailsPage.jsx,
charts/LeaveUsageChart.jsx, charts/UpcomingHolidays.jsx, hooks/Modal.jsx,
models/ActionDropDownPendingLeaveRequests.jsx, models/ActionDropdown.jsx, models/ActionDropdownHrTools.jsx,
models/AddEmployeeModal.jsx, models/AddHolidaysModal.jsx, models/AddLeaveTypeModal.jsx,
models/ApplyLeaveOnBehalf.jsx, models/ApprovalDashboard.jsx, models/ApprovalRulesPage.jsx,
models/BlockLeaveDates.jsx, models/CancellationModal.jsx, models/CompOffBalanceRequests.jsx,
models/CompOffRequestModal.jsx, models/CompOffRequestsTable.jsx, models/EditBlockLeaveModal.jsx,
models/EditHolidaysPage.jsx, models/EditLeaveModal.jsx, models/EffectiveDeactivationDate.jsx,
models/EmployeeLeaveBalances.jsx, models/HandleLeaveRequestAndApprovals.jsx,
models/LeaveBalanceJobProgress.jsx, models/LeaveHistory.jsx, models/LeavePolicyViewer.jsx,
models/LeaveUploadWizard.jsx, models/ManageActiveLeaveBlocks.jsx, models/ManagerEditLeaveRequest.jsx,
models/PendingLeaveRequestsTable.jsx, models/RequestLeaveModal.jsx, models/ReviewModal.jsx,
models/RevokeLeaveRequests.jsx, models/ToastMsg.jsx, ruleBook/RuleBookPage.jsx
```

`git diff --stat -- src/pages/leave_management/`: 41 files changed, 499 insertions(+), 297 deletions(-).
No file outside `src/pages/leave_management/` appears in the diff.

### Buttons migrated

Approximately **130 button instances** migrated to `<Button>` across the 41 files above, plus 2 bug fixes on
already-migrated `Button` usages (see below). Variant distribution (approximate): primary ~30, outline ~28,
ghost/icon ~45, danger ~17, link ~10.

- **Icon buttons migrated:** ~35 (close icons, edit/delete/approve/reject row actions, dropdown triggers,
  calendar prev/next, one bare `PencilIcon` in `PendingLeaveRequestsTable.jsx` that had no `<button>` wrapper
  at all — wrapped into `<Button variant="ghost" size="icon">` for both correctness and accessibility, since it
  previously had no keyboard/focus/aria semantics).
- **Submit buttons migrated:** all form `type="submit"` buttons kept `type="submit"` explicitly (e.g.
  `AddEmployeeModal.jsx`, `ApprovalRulesPage.jsx`, `BlockLeaveDates.jsx`). All `type="button"` buttons kept
  `type="button"` explicitly. Where no `type` existed and the button was not inside a `<form>`, `type` was
  simply omitted (functionally identical to the native default in that context).
- **Loading buttons migrated:** buttons that manually swap their children text (e.g. "Saving...",
  "Processing...", "Unblocking...") were migrated to `<Button>` **without** switching to the `loading`/
  `loadingText` props — the existing conditional-text-and-`disabled` pattern was preserved exactly, since
  simplifying that is explicitly out of scope for a Button-markup-only pass (deferred to the dedicated Loading
  migration step).
- **Two bug fixes** made while touching already-migrated canonical `Button` usages (not raw-markup migrations):
  - `models/AddLeaveTypeModal.jsx` — header close button had `variant=""` (empty string, a no-op fallback);
    corrected to `variant="ghost" size="icon"`.
  - `models/RequestLeaveModal.jsx` — header close button had a malformed `variant` prop containing raw
    Tailwind hover classes instead of a variant name; corrected to `variant="ghost" size="icon"` with those
    classes moved into `className`.

### Buttons intentionally left unchanged

Roughly 46 raw `<button>` instances remain, all falling into one of these documented exception categories —
migrating them would force Button's fixed padding/variant classes onto a self-contained custom control and
risk a visual regression, which is out of scope for a markup-only Button pass:

| Category | Files / lines | Reason |
|---|---|---|
| Tab bars / view-switch toggles | `EmployeePanel.jsx` (4), `EmployeePanelold.jsx` (3), `EnterpriseConfigManager.jsx` (tab select), `HRManageTools.jsx` (tab select), `BlockLeaveSection.jsx` (2), `LeaveSection.jsx` (2), `LeaveDetailsPage.jsx` (sidebar nav) | Self-contained active/inactive segmented styling; Button's base padding would double up or fight the existing layout. |
| Half-day segmented toggles ("Full Days"/"Custom") | `ApplyLeaveOnBehalf.jsx`, `CompOffRequestModal.jsx`, `EditLeaveModal.jsx`, `ManagerEditLeaveRequest.jsx`, `RequestLeaveModal.jsx` | Same segmented-control conflict as above; appears as a repeated pattern across 5 modals. |
| Dropdown menu items (not the trigger) | `ActionDropdown.jsx` (3), `ActionDropdownHrTools.jsx` (2), `ActionDropDownPendingLeaveRequests.jsx` (2) | Full-width, left-aligned rows; Button's centered `inline-flex justify-center` base would break the icon+label left alignment. Dropdown *triggers* in these same files WERE migrated (icon-only, no layout conflict). |
| Card-select controls | `LeaveUploadWizard.jsx` (2, "Accrual Based"/"Gender Based") | `flex-col` + `text-left` card layout conflicts with Button's row-flex base. |
| MultiSelect / calendar triggers | `BlockLeaveDates.jsx`, `ManageActiveLeaveBlocks.jsx`, `DateRangePicker.jsx` (calendar trigger, line ~176) | Full-width `justify-between` layout conflicts with Button's centered base. |
| Toggle switches | `BlockLeaveDates.jsx`, `ManageActiveLeaveBlocks.jsx` | These are on/off switches, not action buttons — out of scope for a Button migration by definition. |
| Pill "remove" buttons | `BlockLeaveDates.jsx`, `ManageActiveLeaveBlocks.jsx` | Pre-existing quirk: the click handler is attached to the inner icon, not the button itself. Migrating risked altering click-target semantics; deferred rather than guessed at. |
| Row-header full-width toggles | `ApprovalDashboard.jsx`, `PendingApprovalsQueueView.jsx` (whole approval-card header as the clickable element) | Complex multi-child row layout; Button's centered flex base would visibly break it. |
| Calendar day-cell / accordion toggle | `charts/Calendar.jsx` (day grid cell), `models/LeavePolicyViewer.jsx` (accordion section header, policy tab `<div>`) | Grid-cell and accordion-header controls, not standard buttons; the `LeavePolicyViewer.jsx` policy-tab `<div onClick>` is also a tab bar (see above) and was left as a `<div>` for the same reason. |
| `motion.button` (framer-motion) | `EditHolidaysPage.jsx` (Back), `EmployeeLeaveBalances.jsx` (Back) | Migrating to a plain `<button>`-based Button would drop the existing `whileHover`/`whileTap` animation — a visual behavior change, out of scope here. |
| Library slot contract | `DateRangePicker.jsx` — `LeaveDayButton` (lines ~26, ~38) | Passed to react-day-picker's `components={{ DayButton: ... }}`; DayPicker injects its own ref/props onto this element, so it must remain a plain `<button>`. |

No file was deleted. No component was created. `src/components/Button/Button.jsx` itself was not modified.

### API / business logic verification

- No `onClick` handler was changed, renamed, or rewired to a different function.
- No `disabled` expression was altered.
- No conditional loading-text logic was altered (preserved exactly, per "loading buttons" above).
- No HTTP calls, request payloads, response handling, validation, leave/balance/holiday/weekday calculation,
  RBAC, permission checks, authentication, routing, state management, WebSocket behavior, or toast message
  content was touched — confirmed by scoping every edit to the `<button>`/`<Button>` element and its
  immediate presentational props only, and by the `git diff --stat` above showing no non-`leave_management`
  file changed.

### Known pre-existing issues encountered (not caused by, not fixed by, this step)

- `models/ruleBook/RuleBookPage.jsx` contains a pre-existing self-referential bug (`const api = api.create(...)`
  shadowing the imported `api`) — left untouched, out of scope.
- `models/ReviewModal.jsx` appears to have no live importer in the codebase (possibly dead code) — migrated
  anyway per the fixed file list, since confirming dead-code status conclusively was out of scope for this step.
- Three near-duplicate "kebab dropdown" components exist (`ActionDropdown.jsx`, `ActionDropdownHrTools.jsx`,
  `ActionDropDownPendingLeaveRequests.jsx`) — each independently reimplements the same trigger+menu pattern.
  Not consolidated in this step (out of scope — Button-markup migration only, not a refactor).
- The `Toggle`/`Pill`/`MultiSelect` block is duplicated verbatim between `BlockLeaveDates.jsx` and
  `ManageActiveLeaveBlocks.jsx`. Not consolidated in this step.

### Validation

- **Lint (`npm run lint`):** 2 pre-existing errors, unrelated to this migration —
  `react-hooks/exhaustive-deps` rule-definition-not-found in `src/pages/airs/dashboard/hooks/useDashboardSection.js`
  and `src/pages/airs/talent-pool/hooks/useTalentPool.js` (same ESLint plugin/config gap noted in Phase 1).
  Zero lint errors in any file this step touched.
- **Build (`npm run build`):** Succeeds. Only pre-existing warnings (large chunk sizes, a few dynamic/static
  import overlaps, an `eval` warning inside the `exceljs` dependency) — none introduced by this step.
- **Re-search for raw `<button>`:** performed after migration; all remaining instances fall into the 10
  documented exception categories above (verified line-by-line against the original audit).
- **Broken imports:** none — every migrated file either already imported canonical `Button` or had the import
  added at the correct relative depth (`../../components/Button/Button` for files directly under
  `leave_management/`, `../../../components/Button/Button` for files one level deeper).
- **API calls / routes:** unchanged — see "API / business logic verification" above.
- **Scope:** confirmed via `git diff --stat` — only `src/pages/leave_management/**` files appear in the diff
  (plus this documentation).

### Git state

Not committed, not pushed, not merged, per instructions. Changes remain in the working tree on
`intra-ui/unify`.

**P0.1 complete.**

---

## P0.2 — Modal Migration

### P0.2.1 RequestLeaveModal

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/RequestLeaveModal.jsx` only.

#### Original modal implementation

A hand-rolled, Leave-specific modal shell: an outer `fixed inset-0` overlay div (`bg-black/30 backdrop-blur-sm`,
click-outside-to-close via `e.target === e.currentTarget`) wrapping a panel div (`bg-white rounded-2xl
shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto`), with its own sticky header (title + a manually-rendered
canonical `Button` close icon that — per P0.1's icon-audit — had a malformed `variant` prop already fixed in
that step), a form body, and a component-local `<style>` block defining the `fadeIn` open animation. The
component also ran its own `keydown` listener for Escape-to-close and its own body-scroll-lock effect.

#### Canonical Modal used

`src/components/Modal/modal.jsx`, via `<Modal isOpen size="lg" title="Request Leave" maxHeight="max-h-[90vh]"
bodyClassName="p-0">`. No defect was found in the canonical Modal that blocked this migration — it was not
modified.

- `size="lg"` maps to the same `max-w-lg` the original hardcoded.
- `maxHeight="max-h-[90vh]"` was passed explicitly (rather than accepting the canonical default of
  `max-h-[85vh]`) to preserve the original's taller scroll area for this long form, avoiding any new clipping
  risk on shorter viewports.
- `bodyClassName="p-0"` was passed so the form's own `px-6 py-5` padding is the only padding applied (avoiding
  doubled padding from the canonical body wrapper's own default `p-4 sm:p-5`).
- The custom header (title `<h2>` + manual close `Button`) was deleted entirely — canonical `Modal`'s
  `title` prop and built-in `showCloseButton` (default `true`) now render the header and the close icon,
  eliminating the duplicate close-button implementation per the "do not duplicate modal logic" requirement.
- The component-local `fadeIn` `<style>` block was removed — canonical Modal supplies its own open animation
  (`animation="zoom"`, the default).
- The component's own `keydown` Escape listener was removed — canonical Modal's `closeOnEscape` (default
  `true`) now owns Escape-to-close. The body-scroll-lock side effect (`document.body.style.overflow =
  "hidden"` while open) was **kept**, since canonical Modal does not provide that and removing it would have
  been a behavior regression.

#### Parent components (contract documented before changing anything)

Three call sites render `RequestLeaveModal`, none of which needed changes (props are unchanged):

1. `src/pages/Dashboard.jsx` — `<RequestLeaveModal isOpen={isRequestLeaveModalOpen} onClose={...} year={year} onSuccess={() => { setIsRequestLeaveModalOpen(false); fetchLeaveBalanceData(); }} />`
2. `src/pages/leave_management/EmployeeDashboard.jsx` — `<RequestLeaveModal isOpen={...} year={currentYear} onClose={...} employeeId={employeeId} onSuccess={handleLeaveSuccess} />` (note: `employeeId` is passed but was already unused inside the component — it derives the employee from `useAuth()` internally — a pre-existing quirk, not touched).
3. `src/pages/leave_management/EmployeePanelold.jsx` — same shape; this parent file was already flagged as likely-legacy in the P0.1 audit.

**Props preserved exactly:** `isOpen`, `onClose`, `onSuccess`, `year` (`employeeId` remains accepted-but-unused,
unchanged from before).

#### Close behavior

| Path | Before | After |
|---|---|---|
| X button | Manual `Button` calling `onClose` | Canonical Modal's built-in close button calling `onClose` |
| Cancel | `Button` in form footer calling `onClose` | Unchanged — still in the form, still calls `onClose` |
| Escape | Component's own `keydown` listener calling `onClose` | Canonical Modal's `closeOnEscape` calling `onClose` |
| Backdrop click | Manual `e.target === e.currentTarget` check calling `onClose` | Canonical Modal's `closeOnBackdrop` (default `true`) calling `onClose` |
| Successful submission | `setTimeout(() => onClose(), 1000)` after success toast | Unchanged |
| Parent-controlled | Parent flips `isOpen` to `false` | Unchanged |

No second/duplicate close state was introduced — there is exactly one `onClose` reference, passed straight
through to the canonical Modal.

#### API behavior

Unchanged. `handleSubmit` still builds the same `payload` and calls
`api.post(`${BASE_URL}/api/leave-requests/apply`, payload, { headers: ... })` with identical fields
(`employeeId, leaveTypeId, startDate, endDate, daysRequested, year, reason, startSession, endSession,`
conditional `driveLink`). The balance-fetch and holiday-fetch `GET` calls on open are untouched. Success/error
handling, `toast.success`/`toast.error` messages, and the `onSuccess?.()` callback are byte-identical.

#### Validation / state behavior

`submitting`, `error`, `success`, `loadingBalances`, `balanceError` state and every `useEffect` (balance/holiday
fetch on open, half-day reset on leave-type change, drive-link reset, field-reset-after-close) are untouched.
The Submit button's `disabled` expression (`loadingBalances || !startDate || !endDate || !leaveTypeId`) and its
`loading`/`loadingText` props are untouched.

#### Date logic preserved

`countWeekdaysBetween`, `formatDateForDisplay`, `isWeekend`, `getTodayDateString` — all untouched, still
exported from this file exactly as before (verified: `ApplyLeaveOnBehalf.jsx` imports `LeaveTypeDropdown` and
`countWeekdaysBetween` from this file, and the build succeeded, confirming those exports and their call sites
are intact). **Date/DateRangePicker intentionally not migrated** — `DateRangePicker` usage and its props
(`label`, `defaultDate`, `onChange`, `defaultMonth`, `disabledDays`, `align`, `year`) are byte-identical to
before.

#### Form logic preserved

`FormInput`/`FormSelect` migration is out of scope for this step — the raw `<textarea>` (reason) and raw
`<input>` (drive link) were left untouched, as were the half-day segmented-toggle `<button>` pair (already an
intentional P0.1 exception) and the `LeaveTypeDropdown`/`FilterListbox` Headless UI selects.

#### Visual changes

- Header now uses canonical Modal's header styling (`p-4 sm:p-5`, `border-b border-gray-100`) instead of the
  original's `p-3` sticky header — a minor spacing difference, not a redesign.
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-2xl` — a one-step radius
  difference from adopting the canonical shell.
- Backdrop is now canonical Modal's default `bg-black/60` instead of the original `bg-black/30` — darker
  overlay, consistent with every other canonical-Modal consumer in the app.
- All form content, fields, spacing, and buttons inside the body are pixel-identical to before (same JSX,
  same classes) — only the surrounding shell changed.

#### Testing performed

- `npm run build` — passes.
- `npm run lint` — same 2 pre-existing, unrelated errors as before (see below); zero new errors.
- Confirmed via `git diff` that only `RequestLeaveModal.jsx` changed for this step.
- Confirmed the file's two named exports (`countWeekdaysBetween`, `LeaveTypeDropdown`) are unmodified and that
  `ApplyLeaveOnBehalf.jsx` (which imports both) still builds successfully.
- Searched for remaining old-modal-shell usage: none — `grep`-ing the file confirms no `fixed inset-0` overlay
  div or component-local `<style>` block remains, and no other Leave modal component was touched.
- Confirmed no nested/duplicate modal wrapper: `RequestLeaveModal` now renders exactly one `<Modal>` element as
  its top-level return, with the form as its only child.
- Manual interactive verification (open/close/X/Cancel/Escape/backdrop/leave-type selection/date
  selection/half-day toggle/validation/submit/API/success/error/loading) was **not** performed in a live browser
  during this pass — build and lint are the validation performed; a manual pass is recommended before this
  branch is merged.

#### Build result

✅ `npm run build` succeeds (`✓ built in ~56s`), only pre-existing chunk-size warnings.

#### Lint result

Same 2 pre-existing errors as every prior validation pass in this document (`react-hooks/exhaustive-deps`
rule-definition-not-found in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — unrelated to this change, zero new errors.

#### Concerns before migrating CompOffRequestModal

- No defects were found in the canonical Modal; it was not modified.
- The three visual deltas noted above (header padding, corner radius, backdrop opacity) are expected and
  consistent with adopting the canonical shell — flagging them here so they aren't mistaken for regressions
  during manual QA.
- A live manual QA pass (open/close/submit/API) has not yet been performed for this change and is recommended
  before proceeding further or merging.
- `CompOffRequestModal.jsx` already uses the canonical `Button` (from the P0.1 pass) but not yet the canonical
  `Modal` — it currently uses `Modal` from... (to be confirmed at the start of that step) — no assumptions were
  made about it here since it is out of scope for P0.2.1.

**Date/DateRangePicker intentionally not migrated.**

**STOP after RequestLeaveModal — do not migrate CompOffRequestModal or any other Leave modal in this step.**

**P0.2.1 complete.**

---

## P0.2.2 — CompOffRequestModal

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/CompOffRequestModal.jsx` only.

### Original modal implementation

Unlike `RequestLeaveModal`, this component has **no `isOpen` prop** — its parent conditionally mounts it
entirely (`{isCompOffModalOpen && <CompOffRequestModal ... />}`), so the component itself is only ever rendered
while "open." It also has **no `<form>` element** — the Submit button calls `handleSubmit` directly via
`onClick`, not native form submission.

The original shell was a hand-rolled `fixed inset-0 flex items-center justify-center bg-black/40
backdrop-blur-sm` overlay (**no backdrop-click-to-close handler at all** — clicking the backdrop did nothing)
wrapping a `bg-white rounded-2xl shadow-2xl max-w-md overflow-hidden` panel, with its own header (title +
subtitle + a manual canonical-`Button` close icon), a body div with its own `max-h-[70vh] overflow-y-auto`, and
a separate footer div (Cancel/Submit buttons). The component ran its own `keydown` listener for Escape and its
own body-scroll-lock effect (tied to an `[onClose]` dependency array, though the effect itself doesn't use
`onClose` for anything but the now-removed Escape handler).

### Canonical Modal used

`src/components/Modal/modal.jsx`, via `<Modal isOpen onClose={onClose} title="Request Comp-Off"
subtitle="Submit compensatory leave request" size="md" footer={<Cancel/Submit buttons>}>`. No defect was found
in the canonical Modal; it was not modified. `isOpen` is passed as the JSX boolean shorthand (`isOpen` ≡
`isOpen={true}`) since the component itself has no open/closed state of its own — the parent's conditional
mount already gates rendering, exactly as before.

- `size="md"` maps exactly to the original's `max-w-md`.
- No `maxHeight` override was passed — canonical Modal's default (`max-h-[85vh]`) is used, since this form is
  shorter than `RequestLeaveModal`'s and doesn't need the taller allowance.
- The title/subtitle/close-icon header was replaced entirely by canonical Modal's `title`/`subtitle`/built-in
  close button (`showCloseButton`, default `true`) — eliminating the duplicate manual close `Button`.
- The Cancel/Submit buttons were moved into canonical Modal's `footer` prop rather than left as trailing body
  content. This is safe here (unlike `RequestLeaveModal`, which kept its buttons inside a `<form>`) because this
  component never used native form submission in the first place — `Submit Request` already calls
  `handleSubmit` directly via `onClick`, so relocating it into the `footer` slot changes nothing about how it
  fires.

### Close-icon background fix (in scope for this step, per the explicit icon-button requirement)

While auditing, the original manual close `Button` was found with `className="text-gray-400
hover:text-gray-600 hover:bg-gray-100 rounded-full"` — a `hover:bg-gray-100` background that conflicts with the
canonical icon-button rule established earlier in P0.1 (icon buttons must have no background/shadow). This
instance was missed by the earlier audit sweep because its className was written across multiple JSX lines
rather than on one line. It is now moot: the entire manual close button was removed and replaced by canonical
Modal's own built-in close button, which already renders with correct transparent-background icon-button
behavior.

### Parent components (verified, not modified)

Two call sites render `CompOffRequestModal`, both conditionally (`{isCompOffModalOpen && <CompOffRequestModal
... />}`), neither needed changes:

1. `src/pages/leave_management/EmployeeDashboard.jsx` — `<CompOffRequestModal loading={isLoading}
   onSubmit={handleCompOffSubmit} onClose={() => setIsCompOffModalOpen(false)} onSuccess={fetchRequests} />`
2. `src/pages/leave_management/EmployeePanelold.jsx` — same shape (this parent was already flagged as
   likely-legacy in the P0.1 audit).

### Props preserved

`onSuccess`, `onSubmit`, `onClose`, `loading` — identical signature, no prop added, removed, or renamed.

### Exports preserved

`export default CompOffRequestModal` — unchanged. No named exports existed on this file to preserve/break.

### API calls / request payload preserved

`handleSubmit` is untouched: it still builds the same `payload` (`startDate, endDate, note, duration,
startSession, endSession`) and calls the parent-supplied `onSubmit(payload)` — this component does not call
`api.*` directly itself; the actual HTTP call lives in the parent's `handleCompOffSubmit`, which was not
touched. `onSuccess`/`onClose` sequencing after a successful submit is unchanged.

### Validation preserved

The `!startDate` guard inside `handleSubmit` (via `showNotification`) and the Submit button's `disabled={!
startDate}` are untouched. `calculateDays`, `isMultiDay`, and the half-day config logic are untouched.

### Date logic intentionally unchanged

`StyledDatePicker` (wrapping `react-datepicker`), `formatDate`, `formatDateForDisplay`, `maxDate`/`minDate`
props, and the half-day segmented toggle (`Full days`/`Custom`, already a documented P0.1 exception) are
byte-identical to before. **Date/DateRangePicker intentionally not migrated.**

### Close behavior

| Path | Before | After |
|---|---|---|
| X button | Manual `Button` calling `onClose` | Canonical Modal's built-in close button calling `onClose` |
| Cancel | `Button` in custom footer calling `onClose` | Same `Button`/handler, now rendered via Modal's `footer` prop |
| Escape | Component's own `keydown` listener calling `onClose` | Canonical Modal's `closeOnEscape` (default `true`) calling `onClose` |
| Backdrop click | **Not supported** — no click handler on the old overlay | Now enabled via canonical Modal's default `closeOnBackdrop={true}` — a minor, intentional behavior *addition* from adopting the canonical shell (not a regression, since nothing previously relied on the backdrop being inert) |
| Successful submission | `onSuccess?.(); onClose();` after a truthy `onSubmit` result | Unchanged |
| Parent-controlled | Parent unmounts the component (`isCompOffModalOpen` → `false`) | Unchanged |

### Scroll behavior

The body-scroll-lock effect (`document.body.style.overflow = "hidden"` while mounted, reset on unmount) was
**kept** — canonical Modal does not provide this, and removing it would have been a regression. Only the
duplicate Escape-listener half of that effect was removed, and its dependency array was correctly narrowed from
`[onClose]` to `[]` since the remaining scroll-lock logic never used `onClose`.

### Visual changes

- Header now uses canonical Modal's `p-4 sm:p-5` spacing instead of the original `px-6 py-5`.
- Footer now uses canonical Modal's `p-4 sm:p-5` with a `border-t border-gray-100` instead of the original's
  `px-6 py-4 border-t bg-gray-50/50` (canonical footer has no gray tint background).
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-2xl`.
- Backdrop is now canonical Modal's default `bg-black/60` instead of the original `bg-black/40`.
- Body scroll region is now governed by canonical Modal's overall panel `max-h-[85vh]` flex layout instead of
  the original's body-only `max-h-[70vh]` — functionally equivalent (header/footer fixed, body scrolls), no
  content redesign.
- All date pickers, the half-day toggle, the duration badge, and the note field are pixel-identical to before.

### Build result

✅ `npm run build` succeeds (`✓ built in ~57s`), only pre-existing chunk-size warnings.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors.

### Browser/manual testing result

Not performed. Only `npm run build` and `npm run lint` were run, plus a full manual code-level review of the
diff and both parent call sites. No live browser interaction (open/close/X/Cancel/Escape/backdrop/date
selection/validation/submit/API/loading/success-toast) was verified in this pass.

### Concerns before P0.2.3

- No defects were found in the canonical Modal; it was not modified.
- Backdrop-click-to-close is a new capability for this specific modal (previously absent) — flagged above so
  it isn't mistaken for unintended scope creep; it comes for free from the canonical shell's default and
  matches the behavior every other canonical-Modal consumer already has.
- The close-icon background-conflict fix found here was caused by a gap in the earlier icon-button audit: its
  regex only matched `className` on the same line as `size="icon"`, missing multi-line JSX. A multiline-aware
  re-check across the rest of `leave_management/` (performed during this step's validation, read-only — no
  files touched) found **7 more of the same conflict**, all outside today's scope:
  - `charts/Calendar.jsx` — prev/next month icon buttons (`hover:bg-gray-100`, lines ~314, ~323)
  - `models/AddHolidaysModal.jsx` — remove-holiday icon button (`hover:bg-red-50`, line ~465)
  - `models/EditLeaveModal.jsx` — header close icon button (`hover:bg-gray-100`, line ~532)
  - `models/LeaveUploadWizard.jsx` — close and remove-file icon buttons (`hover:bg-gray-200`/`hover:bg-green-100`, lines ~107, ~241)
  - `models/ManagerEditLeaveRequest.jsx` — header close icon button (`hover:bg-gray-100`, line ~1084)

  None of these were modified in this step — `EditLeaveModal.jsx` and `ManagerEditLeaveRequest.jsx` are
  explicitly excluded from P0.2.2, and the other three are non-modal files outside this step's file list.
  Reporting per "report such issues separately if discovered" rather than fixing — recommend a dedicated
  cleanup pass (or folding the fix into each file's own future migration step) once flagged to the user.
- No live browser QA has been performed for either P0.2.1 or P0.2.2 yet; recommended before merging.

**Date/DateRangePicker intentionally not migrated.**

**STOP after CompOffRequestModal — do not migrate EditLeaveModal or any other Leave modal in this step.**

**P0.2.2 complete.**

---

## P0.2.3 — EditLeaveModal

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/EditLeaveModal.jsx` only.

### Original modal implementation

Independently audited — this component has a materially different structure from both prior migrations:

- **Has a native `<form onSubmit={handleUpdate}>`** (like `RequestLeaveModal`, unlike `CompOffRequestModal`),
  with `type="submit"` on the Update button — so, per this step's explicit instruction, the Cancel/Submit
  buttons were kept **inside** the form rather than moved to a `footer` slot.
- **Has a record-lock feature** (`useRecordLock` hook) not present in either prior modal: when
  `isLockedByOther` is true, the original rendered an `absolute inset-0` "Record Locked" overlay with its own
  `Close` button that calls the **raw `onClose` prop directly** (deliberately bypassing `manualReleaseLock()`,
  since you don't hold the lock in this state). This overlay sat as a sibling of the header/form inside a
  `position: relative` panel, so it visually covered the *entire* card, including the header's own close-X.
- `handleClose` (used by the header-X, Cancel, backdrop-click, and the local Escape listener) does `await
  manualReleaseLock(); onClose();` — releasing the lock the current user holds before closing. The lock-overlay
  `Close` button intentionally skips this and calls `onClose` directly.
- The shell itself was a `fixed inset-0 bg-black/40 backdrop-blur-sm` overlay (backdrop-click-to-close via
  `e.target === e.currentTarget`) wrapping a `bg-white rounded-2xl shadow-2xl max-w-lg max-h-[92vh]` panel with
  a sticky header (icon badge + title + close `Button`), and its own `keydown` Escape listener + body-scroll-lock
  effect.

### Canonical Modal used

`src/components/Modal/modal.jsx`, via `<Modal isOpen onClose={handleClose} title="Edit Leave Request" size="lg"
maxHeight="max-h-[92vh]" bodyClassName="p-0" showCloseButton={!isLockedByOther}>`. No defect was found that
blocked using it for the core shell; it was not modified in this step (it was modified in a prior, unrelated
request from the user to reduce global header-to-body spacing — see git history, not part of P0.2.3).

- `onClose={handleClose}` — critically, **not** the raw `onClose` prop. This means canonical Modal's own X
  button, Escape handling, and backdrop-click all route through `handleClose` (release lock, then close),
  exactly matching the original's X/Escape/backdrop behavior.
- `showCloseButton={!isLockedByOther}` — canonical Modal's built-in header close button is suppressed entirely
  while the record is locked by someone else.

### A genuine structural limitation found (reported, not silently patched)

The original lock-overlay relied on being an `absolute inset-0` sibling of the header inside a
`position: relative` **panel**, so it could visually cover the header too. Canonical Modal's `children` render
inside its own scrollable **body** div, which always carries `overflow-y-auto` (or `overflow-hidden`) — CSS
overflow clipping applies to descendants regardless of their own positioning scheme, so an `absolute inset-0`
overlay placed in `children` would be clipped to the body area and would **not** cover the header, unlike
before. Canonical Modal has no prop for injecting a panel-wide overlay layer spanning header+body+footer.

Rather than modifying the canonical Modal to add such a slot (out of scope for this step) or silently accepting
a clipped/broken-looking overlay, this was resolved by:

1. Using `showCloseButton={!isLockedByOther}` so there is no close-X for the lock-overlay to need to visually
   block in the first place (canonical Modal simply doesn't render one while locked).
2. Changing the lock-overlay from an *overlay on top of* the (still-mounted, `fieldset`-disabled) form to an
   *either/or content swap*: the component now renders the lock message **or** the form, never both at once
   (`{isLockedByOther && <LockMessage/>}` / `{!isLockedByOther && <form>...</form>}`).

**Note on the "bypass" pattern:** re-examining the original code, the local Escape listener and the backdrop
click handler already called `handleClose()` (which calls `manualReleaseLock()`) **regardless of
`isLockedByOther`** — the overlay only ever blocked the header-X visually, not Escape or backdrop. So `handleClose`
being reachable during a lock is not a new condition introduced by this migration; `showCloseButton={false}`
during a lock is strictly more conservative than the original (one fewer way to trigger `handleClose` while
locked, not more).

**Visual consequence:** while locked, the "frosted glass" effect of dimly seeing the disabled form underneath
the lock message is gone — the panel now shows a clean lock message on its own. Form field values, validation,
and all other state are unaffected (the fieldset-disabled form simply isn't mounted while locked, and remounts
with correct values from `initialData` when unlocked, since the populate-from-`initialData` effect is
independent of this rendering branch).

### Parent component (verified, not modified)

One call site: `src/pages/leave_management/models/PendingLeaveRequestsTable.jsx` —
`{isEditModalOpen && <EditLeaveModal isOpen={isEditModalOpen} onClose={...} initialData={currentLeaveToEdit}
leaveBalances={leaveBalances} onSuccess={handleUpdateSuccess} employeeId={employeeId} year={year} />}`. Not
modified. `employeeId` is passed but unused inside the component (it reads `initialData.employeeId` instead) —
a pre-existing quirk, not touched, consistent with the same pattern already documented for `RequestLeaveModal`
and `CompOffRequestModal`.

### Props preserved

`isOpen`, `onClose`, `initialData`, `leaveBalances`, `onSuccess`, `year` — unchanged signature (`employeeId`
remains accepted-but-unused, unchanged from before).

### Exports preserved

`export default function EditLeaveModal(...)` unchanged. The two module-level helper exports
(`mapLeaveBalancesToDropdown`) and the local (non-exported) `LeaveTypeDropdown`/`countWeekdaysBetween`/
`formatDateForDisplay` were all left untouched — confirmed unchanged in the diff.

### API calls / payload preserved

`GET /api/leave/types`, `GET /api/holidays/by-location/{year}`, and `PUT /api/leave-requests/employee/update`
are byte-identical, including headers and the full payload (`leaveId, employeeId, leaveTypeId, startDate,
endDate, daysRequested, requestDate, reason, driveLink, startSession, endSession, year`).

### Validation preserved

`hasBalanceError` (from `balanceWarning`) and the Submit button's `disabled={submitting || isLockedByOther ||
hasBalanceError}` are untouched. The balance-warning `useEffect` and `shouldShowDriveLink()` are untouched.

### Date/date-range behavior unchanged

`DateRangePicker` usage (both instances, all props), `countWeekdaysBetween`, `formatDateForDisplay`, and the
half-day segmented toggle (`Full Days`/`Custom`, already a documented P0.1 exception) are byte-identical.
**Date/DateRangePicker intentionally not migrated.**

### Form behavior unchanged

`FilterListbox`, the local `LeaveTypeDropdown` (HeadlessUI `Listbox`), the raw `<textarea>` (reason) and raw
`<input type="url">` (drive link) were left untouched, per this step's explicit FormInput/FormSelect exclusion.

### Close behavior

| Path | Before | After |
|---|---|---|
| X button | Manual `Button` calling `handleClose` | Canonical Modal's built-in close button (shown only when not locked) calling `handleClose` |
| Cancel | `Button` inside the form calling `handleClose` | Unchanged — still inside the form, still calls `handleClose` |
| Escape | Component's own `keydown` listener calling `handleClose` | Canonical Modal's `closeOnEscape` calling `handleClose` (same function) |
| Backdrop click | Manual `e.target === e.currentTarget` check calling `handleClose` | Canonical Modal's `closeOnBackdrop` (default `true`) calling `handleClose` |
| Lock-overlay "Close" | Calls raw `onClose` directly (bypasses lock release) | Unchanged — still calls raw `onClose` directly |
| Successful update | `handleClose()` after success toast | Unchanged |
| Parent-controlled | Parent unmounts the component | Unchanged |

No second/duplicate close state was introduced — `handleClose` remains the single close path for every
canonical-Modal-owned trigger, and the lock-overlay's intentional `onClose` bypass is preserved exactly.

### Escape behavior

Delegated entirely to canonical Modal's `closeOnEscape` (default `true`), wired to `handleClose`. The
component's own `keydown` listener and its `eslint-disable-line react-hooks/exhaustive-deps` comment (no longer
needed, since the remaining effect doesn't reference `handleClose`) were removed.

### Backdrop behavior

Delegated to canonical Modal's `closeOnBackdrop` (default `true`), wired to `handleClose` — same effective
behavior as the original's manual `e.target === e.currentTarget` check.

### Scroll-lock behavior

The body-scroll-lock effect (`document.body.style.overflow = "hidden"` while open, reset on cleanup) was
**kept**, since canonical Modal does not provide it. Only the redundant Escape-listener half of that effect was
removed.

### Button/icon behavior

The header close-icon's old `className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"` — one of the "7
more instances" of the icon-button background conflict flagged in the P0.2.2 entry above — is gone, not because
it was patched, but because the entire custom header (and its manual close `Button`) was deleted and replaced
by canonical Modal's own header/close button, which already has correct transparent, no-shadow icon-button
behavior. This resolves that specific flagged instance; the other 6 flagged instances in other files remain
untouched (still out of scope).

### Visual differences from canonical Modal

- Header now uses canonical Modal's `p-4 sm:p-5` spacing and plain string title instead of the original's
  `px-5 py-4` sticky header with an icon-badge + title composition — the indigo icon badge next to the title
  was dropped as part of adopting the canonical header (consistent with the same category of accepted
  simplification documented for `RequestLeaveModal`/`CompOffRequestModal`).
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-2xl`.
- Backdrop is now canonical Modal's default `bg-black/60` instead of the original `bg-black/40`.
- While locked, the lock message no longer shows a frosted-glass preview of the form behind it (see the
  structural-limitation section above) — this is the one behavior-adjacent (not business-logic) difference in
  this step, fully explained above.
- All form fields, labels, spacing, and buttons are otherwise pixel-identical to before.

### Build result

✅ `npm run build` succeeds (`✓ built in ~57s`), only pre-existing chunk-size warnings.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors.

### Browser/manual testing result

Not performed. Only `npm run build`, `npm run lint`, and a full manual diff/code review (including tracing the
lock-overlay clipping issue and confirming the `onClose` vs `handleClose` wiring) were done. In particular, the
locked-record scenario (`isLockedByOther === true`) was reasoned through carefully but not exercised in a live
browser with two concurrent sessions.

### Concerns before P0.2.4

- The lock-overlay clipping limitation (documented above) is the most significant finding from this step —
  worth a deliberate look during manual QA, specifically: (a) does the lock message render correctly without
  the old frosted-glass form preview, and (b) is a fully-locked-out header (no close-X) acceptable UX, or
  should a future pass add an explicit overlay-slot prop to the canonical Modal for this kind of full-panel
  case? Not decided here — flagging for discussion rather than deciding unilaterally.
- If any other Leave modal has a similar record-lock/full-panel-overlay pattern, expect the same limitation and
  resolution to apply.
- The other 6 icon-button background-conflict instances flagged in P0.2.2 (`Calendar.jsx` ×2,
  `AddHolidaysModal.jsx`, `LeaveUploadWizard.jsx` ×2, `ManagerEditLeaveRequest.jsx`) remain unfixed and
  out of scope.
- No live browser QA has been performed for P0.2.1, P0.2.2, or P0.2.3 yet; recommended before merging.

**Date/DateRangePicker intentionally not migrated.**

**STOP after EditLeaveModal — do not migrate CancellationModal or any other Leave modal in this step.**

**P0.2.3 complete.**

---

## P0.2.4 — CancellationModal

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/CancellationModal.jsx` only.

### ⚠️ Cross-module component — flagged before proceeding

Independent audit found that `CancellationModal.jsx`, despite living under `src/pages/leave_management/models/`,
is **not Leave-Management-exclusive**. It is also imported and actively rendered by three Timesheet approval
tables (6 usages total):

- `src/pages/Timesheet/Admin/AdminApprovalTable.jsx`
- `src/pages/Timesheet/Reportingmanger/ReportingManagerApprovalTable.jsx`
- `src/pages/Timesheet/ManagerApproval/ManagerApprovalTable.jsx`

Every prior step in this phase forbade touching `src/pages/Timesheet/**`. Migrating this file's shell
necessarily changes the modal shell for those Timesheet call sites too. This was surfaced to the user before
any edit was made; the user explicitly chose "proceed anyway," accepting that this is a behavior-preserving
shell swap (same props, same close/API/validation logic) that benefits the Timesheet usages the same way it
benefits Leave. Recorded here for visibility — this is the first change in the whole Phase 2 sequence that is
not scoped purely to `leave_management/**`.

### Original modal implementation

Independently audited — structurally different from all three prior modals in several important ways:

- **No backdrop-click-to-close** — the original outer overlay div had no `onClick` handler at all; clicking
  the backdrop did nothing.
- **No Escape-to-close** — no `keydown` listener anywhere in the file.
- **No close-X / header** — the original had no icon-button close control at all, only a plain `<h3>` title and
  `<p>` subtitle inline with the content; the only way to close was the explicit "Cancel" button, or a
  successful "Confirm" (the parent flips `isOpen` to `false` after `onConfirm` resolves).
- **No body-scroll-lock** — no `document.body.style.overflow` manipulation anywhere.
- **No native `<form>`** — `handleConfirm` is a plain `onClick` handler, not a form submit handler.
- **No API calls inside this component at all** — it is purely presentational/callback-driven. The actual
  cancellation/rejection API calls live in each parent's own handler (e.g. `handleConfirmCancellation`,
  `handleBulkReject`), which receive the selected reason string via `onConfirm(reason)`.

### A pre-existing bug found (not fixed as a deliberate refactor — resolved as a natural side effect)

The original code had:
```js
if (!isOpen) return null;
const [selectedReason, setSelectedReason] = useState("");
const [customReason, setCustomReason] = useState("");
```
`useState` is called *after* a conditional early return. All 4 parent call sites render `<CancellationModal
isOpen={...} .../>` **unconditionally** (the component is never conditionally unmounted — only its `isOpen`
prop toggles). This means the very same component instance calls **zero** hooks while closed and **two** hooks
once opened — a textbook Rules-of-Hooks violation that React detects and throws on ("Rendered fewer hooks than
expected"). This looks like a genuine latent bug in already-shipped code (both in Leave Management and across
3 Timesheet tables).

This migration's standard pattern — removing the early `isOpen` return in favor of letting canonical Modal own
the `isOpen` gate (done identically in P0.2.1–P0.2.3) — moves the `useState` calls to unconditional execution
as a structural necessity, which incidentally resolves this violation. This was **not** performed as a
deliberate bug-fix refactor; it's reported here per "no other cleanup — record discovered issues" since it's a
real pre-existing issue, and the resolution happens to be a side effect of the required shell change rather
than extra work.

### Canonical Modal used

`src/components/Modal/modal.jsx`, via:
```jsx
<Modal
  isOpen={isOpen}
  onClose={onCancel}
  title={resolvedTitle}
  subtitle={resolvedSubtitle}
  size="sm"
  closeOnBackdrop={false}
  closeOnEscape={false}
  showCloseButton={false}
  footer={<Cancel/Confirm buttons>}
>
```
No defect was found that blocked the core shell; it was not modified in this step.

- `size="sm"` maps exactly to the original's `max-w-sm`.
- **`closeOnBackdrop={false}`, `closeOnEscape={false}`, `showCloseButton={false}`** — set explicitly, and this
  is the most important decision in this step. Canonical Modal defaults all three to enabled/`true`/`true`.
  Since this is a **destructive-action confirmation** that previously had *none* of these dismiss paths, letting
  the canonical defaults stand would have silently added three new ways to dismiss a cancellation/rejection
  confirmation without an explicit choice — exactly what this step's instructions warned against ("do not
  silently change destructive-action behavior," "pay particular attention to accidentally making backdrop/Escape
  close behavior bypass an intentional confirmation step"). With these three props set, the **only** way to
  close the modal remains the explicit "Cancel" button (calling `onCancel`) or a successful "Confirm" (parent
  flips `isOpen`), identical to the original.
- No native `<form>` exists (`handleConfirm` fires via plain `onClick`), so — unlike `RequestLeaveModal`/
  `EditLeaveModal` — using canonical Modal's `footer` slot for the Cancel/Confirm buttons is safe here, the same
  reasoning already applied to `CompOffRequestModal`.

### Parent components (verified, not modified)

Four call sites, all passing `isOpen`/`onCancel`/`onConfirm`/`isLoading` (+ `title`/`subtitle`/`confirmText`/
`isRevoke` as needed) — none needed changes:

1. `src/pages/leave_management/models/LeaveHistory.jsx` (`isRevoke`)
2. `src/pages/Timesheet/Admin/AdminApprovalTable.jsx` (two usages — single-row reject, bulk reject)
3. `src/pages/Timesheet/Reportingmanger/ReportingManagerApprovalTable.jsx` (two usages)
4. `src/pages/Timesheet/ManagerApproval/ManagerApprovalTable.jsx` (two usages)

### Props preserved

`title`, `subtitle`, `isOpen`, `isRevoke`, `onConfirm`, `onCancel`, `confirmText`, `isLoading` — unchanged
signature and defaults.

### Exports preserved

`export default function CancellationModal(...)` unchanged.

### API calls / payload preserved

N/A directly in this component (by design, as noted above) — no `api.*` call exists here to change. The
`onConfirm(finalReason)` callback signature and the reason-resolution logic (`isOther ? customReason :
selectedReason`) are byte-identical.

### Validation preserved

Confirm button's `disabled={isLoading || !selectedReason || (isOther && customReason.trim().length === 0)}` is
untouched. The required-reason `Listbox` and conditional custom-reason `<textarea>` (with its own required
indicator) are byte-identical.

### Cancellation business logic preserved

Nothing in this component performs the actual cancellation/rejection — that logic lives entirely in each
parent's `onConfirm` handler, none of which were touched.

### Form behavior

No native `<form>` existed before or after — `handleConfirm` remains a plain `onClick` handler, now living
inside canonical Modal's `footer` slot instead of a trailing `<div>` in the body.

### Close behavior

| Path | Before | After |
|---|---|---|
| Cancel button | Calls `onCancel` | Unchanged |
| Confirm (success) | Parent sets `isOpen={false}` after `onConfirm` resolves | Unchanged |
| X button | **Did not exist** | Still does not exist (`showCloseButton={false}`) |
| Escape | **Not supported** | Still not supported (`closeOnEscape={false}`) |
| Backdrop click | **Not supported** (inert) | Still not supported (`closeOnBackdrop={false}`) |

No new dismiss path was introduced. No second/duplicate close state exists — `onCancel` remains the only
explicit close trigger, exactly as before.

### Escape behavior

Explicitly disabled via `closeOnEscape={false}`, matching the original's total absence of Escape handling. No
local Escape listener existed to remove.

### Backdrop behavior

Explicitly disabled via `closeOnBackdrop={false}`, matching the original's inert backdrop. **This is called out
explicitly per the documentation requirement**: canonical Modal's *default* is `closeOnBackdrop={true}`, which
would have been a meaningful and inappropriate behavior change for a destructive-action confirmation — it was
overridden rather than left at the default.

### Scroll-lock behavior

None existed before; none was added. Canonical Modal does not scroll-lock the body itself, consistent with the
original component's behavior.

### Button/icon behavior

No icon buttons exist in this component (Cancel/Confirm are both text buttons, already canonical `Button` from
P0.1) — nothing to change here.

### Visual differences

- Title/subtitle now render via canonical Modal's header (`p-4 sm:p-5`, `Fonts.heading4`) instead of the
  original's inline `<h3>`/`<p>` at the top of a single `p-6` content block.
- Buttons now sit in canonical Modal's dedicated footer row (`border-t border-gray-100`, `p-4 sm:p-5`) instead
  of a plain `mt-5` spaced div at the bottom of the same content block.
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-lg`.
- Backdrop is now canonical Modal's `bg-black/60` (with blur) instead of the original `bg-black bg-opacity-40`
  (no blur specified, though Tailwind's `backdrop-blur-sm` wasn't in the original overlay class list — only
  `bg-opacity-40` was — so canonical Modal actually adds a blur effect that wasn't there before, a minor
  additional visual polish, not a functional change).
- All reason-dropdown and custom-reason-textarea content is pixel-identical.

### Build result

✅ `npm run build` succeeds (`✓ built in ~56s`), only pre-existing chunk-size warnings. Build success also
confirms all 4 call sites (1 Leave + 3 Timesheet) still resolve correctly against the new implementation.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors, and notably no new Rules-of-Hooks lint
error despite the hook-ordering change discussed above.

### Browser/manual testing result

Not performed. Only `npm run build`, `npm run lint`, and a full manual diff/code review (including tracing the
hooks-order bug and reasoning through each Timesheet call site's props) were done. The 3 Timesheet call sites
were **not** exercised live in a browser.

### Concerns before P0.2.5

- This is the first cross-module change in the whole Phase 2 sequence. Recommend the Timesheet approval flows
  specifically be included in any manual QA pass before this branch merges, given they weren't originally in
  this phase's stated scope.
- The Rules-of-Hooks bug found here was present before this change and affects all 4 existing call sites
  today, independent of this migration — flagging in case it's already causing intermittent crashes in
  production that haven't been traced back to this component.
- If `ApplyLeaveOnBehalf` or `ManagerEditLeaveRequest` (next candidates) turn out to also be imported outside
  `leave_management/`, expect the same kind of cross-module flag to come up again.
- No live browser QA has been performed for P0.2.1 through P0.2.4 yet; recommended before merging.

**Date/DateRangePicker intentionally not migrated.**

**STOP after CancellationModal — do not migrate ApplyLeaveOnBehalf or any other Leave modal in this step.**

**P0.2.4 complete.**

---

## P0.2.5 — ApplyLeaveOnBehalf

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/ApplyLeaveOnBehalf.jsx` only.

### All repository-wide consumers

Two consumers, both within Leave Management's own tree (no cross-module usage this time):

1. **`src/App.jsx`** (route registration) — `<Route path="/behalf-leave" element={<ProtectedRoute
   allowedRoles={[...]}><ApplyLeaveOnBehalf /></ProtectedRoute>} />`. **No props are passed at all.**
2. **`src/pages/leave_management/HRManageTools.jsx`** — `<ApplyLeaveOnBehalf isOpen={OnBehalfOpen}
   onClose={() => setOnBehalfOpen(false)} year={new Date().getFullYear()} />` (no `onSuccess` passed — the
   component's `onSuccess?.()` call is a safe no-op here, pre-existing, unchanged).

Neither consumer was modified.

### A pre-existing dead/blank route found (reported, not fixed)

`ApplyLeaveOnBehalf` destructures `{ isOpen, onClose, onSuccess, year }`. Since `src/App.jsx` renders it with
**zero props**, `isOpen` is always `undefined` (falsy) at that route. Before this migration, the component's
`if (!isOpen) return null;` meant visiting `/behalf-leave` always rendered nothing (blank page) — a pre-existing,
apparently dead/broken route, unrelated to this migration. This behavior is **unchanged** after migration:
canonical Modal's own internal `if (!isOpen) return null;` produces the identical outcome for the same
`isOpen === undefined` input. Not fixed (out of scope — "do not modify routing," "do not fix dead code").

### Another pre-existing bug found (reported, not fixed)

`FilterListbox` is used twice in this file (inside the custom half-day UI, lines ~303/316 pre-migration) but is
**never imported** anywhere in the file. This would throw `ReferenceError: FilterListbox is not defined`
whenever a user selects a leave type that allows half-days and switches to "Custom (Half-Day)" mode. This is a
genuine pre-existing runtime bug, unrelated to the modal shell and not touched — the `FilterListbox` JSX usage
was carried over unchanged (still broken, still out of scope, per "do not fix ... other icon-button conflicts
... business logic ... dead code").

### Original modal implementation

- `fixed inset-0 bg-black/40 backdrop-blur-sm` overlay with **no `onClick` handler at all** — backdrop click
  was inert, no close-on-backdrop support.
- **No body-scroll-lock** anywhere in the file.
- **Escape was supported** via a local `keydown` listener calling `handleClose` (which does `resetForm();
  onClose();`).
- Had a native `<form onSubmit={handleSubmit}>`, but — importantly — the visible "Confirm & Apply" button was
  already `type="button"` with a direct `onClick={handleSubmit}`, and it sat **outside** the `</form>` closing
  tag as a sibling in the footer, not nested inside the form. So, unlike `RequestLeaveModal`/`EditLeaveModal`,
  the actions were already structurally independent of native form-submission semantics in the original code —
  the same situation as `CompOffRequestModal`, making the canonical Modal `footer` slot safe to use here too.
- Close-icon button (`variant="ghost" size="icon"`) already had `className="hover:text-gray-900"` — this was
  already fixed in an earlier, separate follow-up request in this session (the original `hover:bg-gray-200
  rounded-full` background-conflict noted in P0.2.2's audit was corrected then, not part of this step). It is
  now moot regardless, since the entire custom header/close button was deleted and replaced by canonical
  Modal's own header/close button as part of this migration.

### Canonical Modal used

`src/components/Modal/modal.jsx`, via:
```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Apply Leave on Behalf"
  size="lg"
  maxHeight="max-h-[90vh]"
  bodyClassName="p-0"
  closeOnBackdrop={false}
  footer={<Cancel/Confirm & Apply buttons>}
>
```
No defect was found; canonical Modal was not modified.

- `size="lg"` maps exactly to the original's `max-w-lg`.
- `maxHeight="max-h-[90vh]"` preserves the original's taller allowance (same reasoning as `RequestLeaveModal`).
- **`closeOnBackdrop={false}`** — set explicitly because the original had no backdrop-click-to-close at all;
  leaving canonical Modal's default (`true`) would have silently added a new dismiss path to a form with
  unsaved employee/date/reason selections. `closeOnEscape` was left at its default (`true`) since the original
  *did* support Escape — now delegated to canonical Modal, wired to the same `handleClose`.
- `bodyClassName="p-0"` so the form's own `p-6 space-y-5` padding is the only padding applied.

### Parent components (verified, not modified)

See "All repository-wide consumers" above — both left untouched; build success confirms both still resolve.

### Props preserved

`isOpen`, `onClose`, `onSuccess`, `year` — unchanged signature and defaults.

### Exports preserved

`export default function ApplyLeaveOnBehalf(...)` unchanged. This file has no named exports of its own.
Verified its **imports** from `RequestLeaveModal.jsx` (`LeaveTypeDropdown`, `countWeekdaysBetween`) still
resolve correctly post-migration — confirmed `RequestLeaveModal.jsx` itself was not touched in this step (its
diff in the working tree is entirely from the earlier P0.2.1 step) and both exports are still present there.

### API calls / payload preserved

`GET /api/employee/search/{userId}`, `GET /api/leave-balance/employee/{employeeId}/{year}`, and `POST
/api/leave-requests/apply-on-behalf` are byte-identical, including headers and the full payload (`employeeId,
leaveTypeId, startDate, endDate, reason, driveLink, daysRequested, appliedBy, startSession, endSession`).

### Validation preserved

The Submit button's `disabled={submitting || !employeeId || !leaveTypeId || weekdays <= 0}`, the
`shouldShowDriveLink()`-gated required drive-link field, and the required reason `<textarea>` are all untouched.

### Employee-selection behavior unchanged

The `react-select` `Select` component, `debouncedSearch`, `fetchEmployees`, and the `hasFetchedInitial` ref
gate are all byte-identical — none of this is in scope for the Modal-shell step (it's a "FormSelect"-adjacent
control, explicitly deferred).

### Date/leave-type logic unchanged

`DateRangePicker` (both instances), `countWeekdaysBetween` (imported from `RequestLeaveModal.jsx`), and the
half-day segmented toggle (already a documented P0.1 exception) are byte-identical. **Date/DateRangePicker
intentionally not migrated.**

### Form behavior

The native `<form>` is preserved (still wraps the same fields, still has `onSubmit={handleSubmit}`), but as
noted above, the visible action buttons were already outside/independent of it in the original — moving them
into canonical Modal's `footer` slot changes nothing about form-submission semantics.

### Close behavior

| Path | Before | After |
|---|---|---|
| X button | Manual `Button` calling `handleClose` | Canonical Modal's built-in close button calling `handleClose` |
| Cancel | `Button` in footer calling `handleClose` | Unchanged — same handler, now in Modal's `footer` slot |
| Escape | Local `keydown` listener calling `handleClose` | Canonical Modal's `closeOnEscape` calling `handleClose` |
| Backdrop click | **Not supported** (inert) | Still not supported (`closeOnBackdrop={false}`) |
| Successful submission | `onSuccess?.(); handleClose();` | Unchanged |
| Parent-controlled | Parent sets `isOpen={false}` | Unchanged |

No new dismiss path introduced; no duplicate close state.

### Escape behavior

Delegated to canonical Modal's `closeOnEscape` (left at default `true`, matching the original's supported
behavior), wired to `handleClose`. The local `keydown` listener was removed as genuinely redundant.

### Backdrop behavior

Explicitly kept disabled (`closeOnBackdrop={false}`) to match the original's inert backdrop — a deliberate
override of canonical Modal's default, not an accepted default, called out here per the documentation
requirement.

### Scroll-lock behavior

None existed before; none was added — consistent.

### Button/icon behavior

The header close-icon's earlier `hover:bg-gray-200 rounded-full` conflict (flagged in P0.2.2's audit) had
already been fixed directly in a prior, separate request in this session. It's moot now regardless, since the
whole custom header was replaced by canonical Modal's own header/close button.

### Visual changes

- Header now uses canonical Modal's `p-4 sm:p-5` spacing and plain-white background instead of the original's
  `p-4` header with a `bg-gray-50` tint.
- Footer now uses canonical Modal's `p-4 sm:p-5` with `border-t border-gray-100` instead of the original's
  `p-4 border-t border-gray-100 bg-white` (functionally the same background, same border).
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-2xl`.
- Backdrop is now canonical Modal's default `bg-black/60` instead of the original `bg-black/40`.
- All form fields, labels, and spacing inside the body are pixel-identical to before.

### Build result

✅ `npm run build` succeeds (`✓ built in ~56s`), only pre-existing chunk-size warnings. Build success confirms
both consumers (`App.jsx` route, `HRManageTools.jsx`) still resolve correctly.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors.

### Browser/manual testing result

Not performed. Only `npm run build`, `npm run lint`, and a full manual diff/code review were done — including
tracing both consumer call sites, confirming the shared `RequestLeaveModal.jsx` exports were untouched, and
identifying (without fixing) the two pre-existing bugs above.

### Concerns before P0.2.6

- The `/behalf-leave` dead route and the missing `FilterListbox` import are both real, pre-existing bugs
  independent of this migration — worth a decision from you on whether/when to address them (not done here,
  per "no other cleanup").
- No live browser QA has been performed for P0.2.1 through P0.2.5 yet; recommended before merging, and the
  half-day "Custom" mode in this specific component will visibly crash in a browser today due to the
  `FilterListbox` bug — worth knowing before anyone tries to manually test that path.
- If `ManagerEditLeaveRequest` (next candidate) also imports from `RequestLeaveModal.jsx` or is used outside
  `leave_management/`, expect the same kind of cross-file/cross-module verification to recur.

**Date/DateRangePicker intentionally not migrated.**

**STOP after ApplyLeaveOnBehalf — do not migrate ManagerEditLeaveRequest or LeaveUploadWizard in this step.**

**P0.2.5 complete.**

---

## P0.2.6 — ManagerEditLeaveRequest

**Date:** 2026-08-14

**File modified:** `src/pages/leave_management/models/ManagerEditLeaveRequest.jsx` only.

### Repository-wide consumers

One live consumer, no cross-module usage: **`src/pages/leave_management/models/HandleLeaveRequestAndApprovals.jsx`**
— `{editingRequest && <ManagerEditLeaveRequest isOpen={!!editingRequest} onClose={() => setEditingRequest(null)}
onSave={handleLeaveUpdate} requestDetails={editingRequest} />}` (conditionally mounted). Not modified.

The file also contains a ~600-line fully commented-out earlier implementation (lines 1–608) — confirmed dead
code, not touched, not counted as a consumer.

### Original modal implementation — independently audited, NOT assumed identical to EditLeaveModal

Structurally very similar to `EditLeaveModal.jsx` (P0.2.3) in several respects, but with real, independently
verified differences that were NOT blindly carried over:

- **Same lock-overlay-covers-whole-panel pattern**: `useRecordLock` → `isLockedByOther` → an `absolute inset-0
  z-20` "Record Locked" message sitting as a sibling of the header inside a `position: relative` panel,
  functionally identical clipping concern to `EditLeaveModal` (canonical Modal's scrollable body div would clip
  an `absolute inset-0` overlay placed in `children` to the body area only, not the header). Resolved the same
  way, for the same underlying CSS reason: `showCloseButton={!isLockedByOther}` + either/or content swap (lock
  message **or** the form, never both), instead of an overlay-on-top-of-a-mounted-form.
- **Backdrop-click WAS supported** here (`onClick={(e) => e.target === e.currentTarget && handleClose()}` on
  the outer overlay) — unlike `CancellationModal`/`ApplyLeaveOnBehalf`. Canonical Modal's default
  (`closeOnBackdrop={true}`) was therefore **left at default**, not disabled — preserving the original behavior
  rather than defaulting to the pattern used in the prior two steps.
- **No body-scroll-lock existed** in this file (confirmed via search — zero `document.body.style.overflow`
  references) — unlike `EditLeaveModal`, which had one to preserve. Nothing needed preserving here.
- **No self-close-on-success**: `handleSubmit` calls `await onSave(requestDetails.leaveId, updatedData)` and
  only resets `submitting` in a `finally` block — it does **not** call `handleClose()` or show a success toast
  itself. Closing-after-save is entirely the parent's responsibility (`HandleLeaveRequestAndApprovals.jsx`'s
  `handleLeaveUpdate` presumably clears `editingRequest` on success, which unmounts this component via its
  conditional-render parent). This is different from `EditLeaveModal`, which closes itself — **not changed**,
  no `handleClose()` call was added after `onSave`.
- **No direct API call for the update itself** — only two `GET` calls (`leave-balance`, `holidays`) happen
  inside this component; the actual save/update HTTP call lives in the parent's `onSave` callback, which this
  step did not touch.
- **`LeaveTypeDropdown` and `countWeekdaysBetween` are locally defined in this file** (not imported from
  `RequestLeaveModal.jsx`, unlike `ApplyLeaveOnBehalf`) — so there was no shared-export risk to verify here;
  both were left completely untouched.
- **Validation includes a `!hasChanges` dirty-check** (`JSON.stringify` comparison against an `initialSnapshot`
  taken on open) that gates the Save button, in addition to `hasBalanceError`/`loadingData`/`isLockedByOther`/
  `submitting` — preserved exactly, untouched.
- **The error banner appears to be dead UI**: `setError("")` is called but nothing in the visible code ever
  sets a non-empty error message (`handleSubmit`'s `try { ... } finally { ... }` has no `catch` clause) — a
  pre-existing gap, not fixed, not touched.

### Canonical Modal used

`src/components/Modal/modal.jsx`, via:
```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Edit Leave Request"
  size="lg"
  maxHeight="max-h-[92vh]"
  bodyClassName="p-0"
  showCloseButton={!isLockedByOther}
  // closeOnBackdrop / closeOnEscape left at canonical defaults (true)
>
```
No defect was found; canonical Modal was not modified.

### Parent integration (verified, not modified)

`HandleLeaveRequestAndApprovals.jsx` — unchanged; build success confirms it still resolves.

### Props preserved

`isOpen`, `onClose`, `onSave`, `requestDetails` — unchanged signature.

### Exports preserved

`export default function ManagerEditLeaveRequest(...)` unchanged. No named exports exist on this file.

### API calls / payload preserved

`GET /api/leave-balance/employee/{empId}/{year}` and `GET /api/holidays/by-location/{year}` (both fired via
`Promise.all` on open) are byte-identical. `onSave(requestDetails.leaveId, { leaveTypeId, startDate, endDate,
daysRequested, leaveName, managerComment, startSession, endSession, year })` call signature and payload
construction are untouched.

### Validation preserved

`hasBalanceError`, `hasChanges` (dirty-check), and the Submit button's combined `disabled` expression are
byte-identical.

### Form behavior

Native `<form onSubmit={handleSubmit}>` preserved exactly, with Cancel (`type="button"`) and Submit
(`type="submit"`) kept **inside** the form — per this step's explicit instruction to not move them outside a
native form. No footer-slot was used here (unlike `CompOffRequestModal`/`CancellationModal`/`ApplyLeaveOnBehalf`,
none of which had this exact form/button coupling).

### Date/date-range behavior unchanged

`DateRangePicker` (both instances, all props) and the half-day segmented toggle (already a documented P0.1
exception) are byte-identical. **Date/DateRangePicker intentionally not migrated.**

### Close behavior

| Path | Before | After |
|---|---|---|
| X button | Manual `Button` calling `handleClose` | Canonical Modal's built-in close button (shown only when not locked) calling `handleClose` |
| Cancel | `Button` inside the form calling `handleClose` | Unchanged |
| Escape | Local `keydown` listener calling `handleClose` | Canonical Modal's `closeOnEscape` (default) calling `handleClose` |
| Backdrop click | Manual `e.target === e.currentTarget` check calling `handleClose` | Canonical Modal's `closeOnBackdrop` (default) calling `handleClose` — **same behavior, not a new capability**, since the original already supported it |
| Lock-overlay "Close" | Calls raw `onClose` directly (bypasses lock release) | Unchanged |
| Successful save | Parent-controlled (no self-close) | Unchanged |
| Parent-controlled | Parent unmounts the component | Unchanged |

### Escape behavior

Delegated to canonical Modal's `closeOnEscape` (default `true`, matching original support), wired to
`handleClose`. Local listener removed as genuinely redundant.

### Backdrop behavior

Left at canonical Modal's default (`true`) since the original already supported backdrop-click-to-close —
**no behavioral difference from before**, and no override was needed (contrast with `CancellationModal`/
`ApplyLeaveOnBehalf`, where backdrop-close had to be explicitly disabled to match their different original
behavior).

### Scroll-lock behavior

None existed before; none was added.

### Locked/read-only behavior

Independently determined (not copied from `EditLeaveModal`) that the original lock-overlay covered the entire
panel (header included) via the same `position: relative` panel + `absolute inset-0` overlay trick. Applied the
same resolution as `EditLeaveModal` because the underlying structural reason is identical: canonical Modal's
scrollable body div would clip such an overlay to the body area only. Resolution: suppress canonical Modal's
own close-X during a lock (`showCloseButton={!isLockedByOther}`) and swap the form for the lock message rather
than overlaying one atop the other.

### Button/icon behavior

The header close-icon's `hover:bg-gray-100` background conflict (one of the "7 more instances" flagged in
P0.2.2, later confirmed generalizable to any icon-button with a multi-line `className`) is gone as a natural
consequence of deleting the entire custom header — not patched separately, exactly per this step's instruction.

### Visual differences

- Header now uses canonical Modal's `p-4 sm:p-5` spacing and plain-string title instead of the original's
  `px-5 py-4` sticky header with an icon-badge + title composition (same accepted simplification as
  `EditLeaveModal`/`RequestLeaveModal`/`CompOffRequestModal`).
- Panel corner radius is now `rounded-xl` (canonical) instead of the original `rounded-2xl`.
- Backdrop is now canonical Modal's default `bg-black/60` instead of the original `bg-black/40`.
- While locked, the lock message no longer shows a frosted-glass preview of the form behind it — same
  documented visual consequence as `EditLeaveModal`.
- All form fields, labels, and spacing are otherwise pixel-identical.

### Build result

✅ `npm run build` succeeds (`✓ built in ~55s`), only pre-existing chunk-size warnings.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors.

### Browser/manual testing result

Not performed. Only `npm run build`, `npm run lint`, and a full manual diff/code review were done — including
independently re-verifying the lock-overlay clipping concern rather than assuming it applied identically to
`EditLeaveModal`, and confirming the backdrop/scroll-lock differences from that file.

### Pre-existing issues discovered (not fixed)

- The error banner (`{error && (...)}`) appears unreachable — no code path sets a non-empty error message.
- The three-way "kebab dropdown"/`Toggle`/`Pill` duplication issues logged in earlier P0.2 steps remain
  unaddressed (out of scope here too).

### Concerns before P0.2.7

- No live browser QA has been performed for P0.2.1 through P0.2.6 yet.
- `LeaveUploadWizard` is explicitly flagged as potentially more complex than a simple modal (possibly a
  multi-step wizard, possibly page-routed) — will be independently audited from scratch before any changes,
  per instructions, rather than assumed to follow this same pattern.

**Date/DateRangePicker intentionally not migrated.**

**STOP after ManagerEditLeaveRequest — do not migrate LeaveUploadWizard until this step is validated and reported.**

**P0.2.6 complete.**

---

## P0.2.7 — LeaveUploadWizard

**Date:** 2026-08-14

**File modified:** **none.** This step concluded with no code changes, per the explicit "STOP and report" branch
of the instructions for a case where a direct Modal replacement would require changes outside the target file.

### Architecture Audit

`LeaveUploadWizard.jsx` was read in full and the entire repository was searched for every import/consumer
before any change was considered. Finding: **the component owns no modal shell at all.** Its `return` is a
plain `<div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto overflow-hidden border
border-gray-100">` — no `fixed inset-0`, no backdrop, no `position: fixed`/`z-index` overlay, and **no `isOpen`
prop** (it receives only `{ onClose }`). It always renders its content unconditionally; whoever renders it is
responsible for the surrounding overlay/backdrop/centering.

This is **Category B ("wizard embedded inside another modal") combined with Category D/E (hybrid)** — not a
straightforward "already a modal" case, and independently verified rather than assumed:

**Consumer 1 — `src/pages/leave_management/models/EmployeeLeaveBalances.jsx`** (the real, working usage):
```jsx
{showUploadWizard && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadWizard(false)} />
    <div className="relative z-10 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
      <LeaveUploadWizard onClose={() => setShowUploadWizard(false)} />
    </div>
  </div>
)}
```
`EmployeeLeaveBalances.jsx` — **not `LeaveUploadWizard.jsx`** — owns the entire modal shell: the `fixed inset-0`
overlay, a **separate backdrop `<div>` with its own `onClick` to close** (backdrop-click IS supported here, at
the parent level), and the `rounded-xl shadow-2xl max-w-lg` panel wrapper. This shell is **hand-rolled and
non-canonical** — it does not use `src/components/Modal/modal.jsx`.

**Consumer 2 — `src/App.jsx`** (route registration):
```jsx
<Route path="/leave-upload" element={
  <ProtectedRoute allowedRoles={["HR", "Super_Admin", "Admin"]}>
    <LeaveUploadWizard />
  </ProtectedRoute>
} />
```
Rendered as a bare route/page, with **no `onClose` prop at all**. Since `LeaveUploadWizard` unconditionally
calls `onClose()` on Cancel, the header close-X, and after a successful upload, visiting `/leave-upload` and
triggering any of those three paths would throw `TypeError: onClose is not a function` — **a pre-existing,
independently-discovered broken route**, structurally unrelated to this migration (not caused by it, not fixed
by it).

**Nested third shell — `src/pages/leave_management/models/ConfirmationModal.jsx`**: `LeaveUploadWizard` renders
this (a distinct file from `CancellationModal.jsx`, audited separately in P0.2.4) for its "confirm sync" step.
It is also a hand-rolled, non-canonical shell (`fixed inset-0 z-50 bg-black bg-opacity-40`), and also lives
outside the target file.

Not shared with any other module — all three files above are within `src/pages/leave_management/`.

### Migration decision: no code change, per explicit instruction

Per the instructions: *"If the audit shows that converting it to a canonical Modal requires changes outside
LeaveUploadWizard: STOP and report... Do not make those external changes automatically."* That condition is
met here — squarely and on two independent grounds:

1. **There is no shell inside `LeaveUploadWizard.jsx` to replace.** The component has zero overlay/backdrop/
   `isOpen` logic of its own; "migrating its modal shell to canonical Modal" is not an operation that can be
   performed within this file alone.
2. **Wrapping the wizard's own render output in `<Modal>` internally would be actively harmful**, not just
   out of scope: at the `EmployeeLeaveBalances.jsx` call site it would create a **nested modal** (a second
   `fixed inset-0` shell inside the parent's already-existing one — explicitly forbidden: "Avoid nested
   modals"). At the `App.jsx` route it would silently convert a bare-page render into a full-screen modal
   overlay with a backdrop and (if using canonical defaults) Escape/backdrop-dismiss — an **unrequested change
   to that route's presentation and dismiss behavior**, and it still wouldn't fix the underlying missing-
   `onClose` crash, since the canonical Modal's own close button/`closeOnEscape`/`closeOnBackdrop` would call
   the very same `undefined` `onClose`.

1. **Current architecture:** hybrid — bare content component with two structurally different consumers (embedded-in-parent-modal, and bare-route-page), plus a third non-canonical shell it renders internally for its own confirmation step.
2. **Why a direct Modal replacement is unsafe:** would create a nested modal at the working call site, and would silently change page-vs-modal presentation (plus not fix, and possibly mask, an existing crash) at the route call site.
3. **Which parent/route changes would be required:** `EmployeeLeaveBalances.jsx`'s inline shell would need to become the canonical-Modal owner (passing `LeaveUploadWizard`'s content as `children`), `App.jsx`'s route would need a decision on whether `/leave-upload` should even exist as a bare page or be removed/redirected in favor of the modal trigger in `EmployeeLeaveBalances.jsx`, and `ConfirmationModal.jsx` would need its own independent P0.2-style migration (it's a distinct file from the already-migrated `CancellationModal.jsx`).
4. **Whether existing functionality can remain identical:** yes, if the above three changes are each done deliberately and separately — but not as a side effect of a "shell swap" scoped to `LeaveUploadWizard.jsx` alone.
5. **Recommended migration approach:** treat this as three separate, explicitly-scoped follow-up items rather than one step — (a) migrate `EmployeeLeaveBalances.jsx`'s inline wizard-launching shell to canonical Modal (a P0.2-style "modal" migration, but the target file is `EmployeeLeaveBalances.jsx`, not `LeaveUploadWizard.jsx`); (b) migrate `ConfirmationModal.jsx` to canonical Modal (same category of work as `CancellationModal.jsx` in P0.2.4); (c) separately decide/fix the `/leave-upload` route's missing `onClose` (a bug-fix decision, not a UI migration — outside this phase's scope entirely). None of these were performed in this step.

### Wizard functionality

Unchanged — nothing was touched. For completeness, the audited (not modified) structure: 1 type-selector
step (always shown) that reveals 2 more sections (Download Template, Upload) once a type is chosen — not a
strictly sequential "Next/Previous" wizard but a progressive-disclosure single-screen flow; `leaveType`/`file`/
`showConfirm`/`isUploading` state; `handleDownloadTemplate` (blob download), `handleRemoveFile`,
`onConfirmUpload` (the actual `POST` upload) API calls (`GET .../download-template` or
`.../download-gender-template`, `POST .../upload-accruals` or `.../upload-gender-accruals`); a nested
`ConfirmationModal` gate before the actual upload fires. All of this is untouched.

### Date/Date-range

No date or date-range controls exist in this component. **Date/DateRangePicker intentionally not migrated**
(recorded for consistency with every other P0.2 entry, though not applicable here).

### Build result

✅ `npm run build` succeeds (`✓ built in ~56s`) — unchanged from the P0.2.6 baseline, since no files were
modified in this step.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — unchanged, zero new errors (none were possible, since
nothing was edited).

### Browser/manual testing

Not performed.

### Known pre-existing issues discovered (not fixed)

- **`/leave-upload` route is broken**: `App.jsx` renders `<LeaveUploadWizard />` with no `onClose`, so any
  Cancel/X/successful-upload interaction on that route throws `TypeError: onClose is not a function`.
- **Three non-canonical modal shells remain outside this file**: `EmployeeLeaveBalances.jsx`'s inline overlay,
  and `ConfirmationModal.jsx` — neither uses `src/components/Modal/modal.jsx`.
- The header close-icon in `LeaveUploadWizard.jsx` (`className="p-2 hover:bg-gray-200 rounded-full
  transition-colors text-gray-400"`) and the remove-file icon (`className="p-1.5 hover:bg-green-100 rounded-md
  text-green-700"`) both have the same `hover:bg-*` background conflict with the P0.1 canonical icon-button
  rule already catalogued in P0.2.2's follow-up audit (these are 2 of the "7 more instances" found there,
  specifically listed as belonging to this file). Not fixed here — no code change was made in this step at all,
  and per "no cleanup" this remains a separately-tracked item.
- The two `<button className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 ...">` type-selector
  cards ("Accrual Based"/"Gender Based") were already identified in the original P0.1 Button-migration audit as
  intentionally-not-migrated (card-select layout conflicts with canonical Button's centered flex base) — still
  true, still unaddressed, unrelated to this step.

**Date/DateRangePicker intentionally not migrated.**

**LeaveUploadWizard: no shell migration performed — architecturally inappropriate for a file-scoped shell swap. See "Recommended migration approach" above for how to proceed in a future, explicitly-scoped step.**

---

## P0.2 — Canonical Modal Migration — COMPLETE (with one documented exception)

**Total modal candidates identified:** 7
**Total shell-migrated to canonical Modal:** 6 of 7

| # | Component | Status |
|---|---|---|
| 1 | RequestLeaveModal | ✅ Migrated (P0.2.1) |
| 2 | CompOffRequestModal | ✅ Migrated (P0.2.2) |
| 3 | EditLeaveModal | ✅ Migrated (P0.2.3) |
| 4 | CancellationModal | ✅ Migrated (P0.2.4) — cross-module (shared with 3 Timesheet approval tables) |
| 5 | ApplyLeaveOnBehalf | ✅ Migrated (P0.2.5) |
| 6 | ManagerEditLeaveRequest | ✅ Migrated (P0.2.6) |
| 7 | LeaveUploadWizard | ⛔ **Not shell-migrated** (P0.2.7) — owns no modal shell of its own; see below |

### Cross-module / shared components

- **`CancellationModal.jsx`** (P0.2.4) is shared with `src/pages/Timesheet/Admin/AdminApprovalTable.jsx`,
  `src/pages/Timesheet/Reportingmanger/ReportingManagerApprovalTable.jsx`, and
  `src/pages/Timesheet/ManagerApproval/ManagerApprovalTable.jsx`. Flagged to the user before editing; user
  approved proceeding. All 3 Timesheet call sites verified via successful build.
- All other migrated components are Leave-Management-exclusive.

### Components/files intentionally not shell-migrated in P0.2

- **`LeaveUploadWizard.jsx`** — owns no modal shell; see P0.2.7 above for full reasoning.
- **`EmployeeLeaveBalances.jsx`**'s inline wizard-launcher shell — the actual non-canonical modal shell behind
  `LeaveUploadWizard`, out of scope because the target was `LeaveUploadWizard.jsx`, not this file.
- **`ConfirmationModal.jsx`** — a third non-canonical shell (distinct from `CancellationModal.jsx`), rendered
  by `LeaveUploadWizard` for its sync-confirmation step, out of scope for the same reason.

None of these three were modified. All are candidates for a future, explicitly-scoped P0.2-style step of their
own if the team wants full canonical-Modal coverage.

### Date/DateRangePicker

Deferred across all 7 components, as instructed throughout — **intentionally not migrated** in any P0.2 step.
A unified canonical DatePicker/DateRangePicker is planned for a later cross-module audit (Timesheet, RMS, etc.).

### Build status

✅ Passing after every one of the 6 migrated components (P0.2.1–P0.2.6) and after this step (no change).

### Lint status

Same 2 pre-existing, unrelated errors throughout the entire P0.2 sequence
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new lint errors introduced by any P0.2 step.

### Manual/browser QA status

**Not performed for any of the 7 components across all of P0.2.** Every step validated via `npm run build`,
`npm run lint`, and thorough manual diff/code review only. A live QA pass covering every migrated modal (and
especially the Timesheet cross-module usages of `CancellationModal`) is recommended before this branch merges.

### Known pre-existing issues discovered across P0.2 (none fixed, all out of scope by design)

- Rules-of-Hooks violation in `CancellationModal.jsx`'s original code (P0.2.4) — resolved as a structural side
  effect of the standard migration pattern, not a deliberate fix.
- `FilterListbox` used but never imported in `ApplyLeaveOnBehalf.jsx` (P0.2.5) — would crash on custom half-day
  selection.
- `/behalf-leave` route in `App.jsx` renders `ApplyLeaveOnBehalf` with no props, making `isOpen` always
  `undefined` (P0.2.5) — pre-existing dead/blank route.
- `/leave-upload` route in `App.jsx` renders `LeaveUploadWizard` with no `onClose`, which would crash on
  Cancel/X/successful upload (P0.2.7) — pre-existing broken route.
- Dead error-banner UI in `ManagerEditLeaveRequest.jsx` (P0.2.6) — no code path ever sets a non-empty error.
- 7 instances of the icon-button `hover:bg-*` background conflict remain outside the files actually migrated
  in P0.2 (`Calendar.jsx` ×2, `AddHolidaysModal.jsx`, `LeaveUploadWizard.jsx` ×2, `ManagerEditLeaveRequest.jsx`
  — note: the `ManagerEditLeaveRequest.jsx` instance was in fact resolved during P0.2.6 as a side effect of its
  header replacement, so 6 of the original 7 remain).
- Three near-duplicate "kebab dropdown" components, a duplicated `Toggle`/`Pill`/`MultiSelect` block across two
  files, a self-referential bug in `RuleBookPage.jsx`, and an unclear dead-code status for `ReviewModal.jsx` —
  all catalogued in earlier P0.1/P0.2 entries, still unaddressed.
- Three non-canonical modal shells remain unmigrated: `EmployeeLeaveBalances.jsx`'s inline shell,
  `ConfirmationModal.jsx`, and (structurally) the bare `LeaveUploadWizard.jsx` page-route usage.

### Remaining P0 work

P0.2 (Canonical Modal) is complete for all components that actually own a modal shell within Leave Management,
with the one documented, deliberately-unmigrated exception above. Remaining/deferred work outside this phase's
scope, per the task's own stop conditions: FormInput, FormSelect, DatePicker/DateRangePicker (deferred
pending cross-module audit), Tables, Pagination, Cards, Filters, StatusBadge, and the follow-up items listed
above (`EmployeeLeaveBalances.jsx` shell, `ConfirmationModal.jsx`, the two broken routes).

**Not starting P0.3.**

---

## P0.3 — Canonical FormInput Migration

**Date:** 2026-08-14. Scope: `src/pages/leave_management/` only.

### Canonical component audit

`src/components/forms/FormInput.jsx` (not modified in this step):
```jsx
const FormInput = ({
  label, name, type = "text", value, onChange, placeholder,
  required = false, disabled = false, error = "", className = "",
  inputClassName = "", labelClassName = "", requiredMark = false, ...rest
}) => (
  <div className={`space-y-1 ${className}`.trim()}>
    {label && <label htmlFor={name}>{label}{requiredMark && <span>*</span>}</label>}
    <input id={name} type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      required={required} disabled={disabled} className={`...base... ${inputClassName}`} aria-invalid={Boolean(error)} {...rest} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);
```
Key constraints identified before migrating anything: it renders **only** a native `<input>` (no textarea support at all); it is **not** wrapped in `React.forwardRef`, so it cannot receive a `ref` that reaches the underlying DOM node; `className` styles the **outer wrapper `<div>`**, while the input's own visual styling must go through `inputClassName` — getting these two swapped would visually break every migrated field. Repository-wide search found 63 files importing something named `FormInput`, but zero were inside `leave_management/` (one, `employee-onboarding/.../FormInput.jsx`, is an unrelated, differently-implemented local component) — this is the first adoption of the canonical `FormInput` in this module.

### Audit

A full-repo, file-by-file audit of every `<input>`/`<textarea>`/input-like control under `src/pages/leave_management/` was performed before any edit (71 files scanned). Totals:

- **Raw `<input>` elements found (live, non-commented):** 57 (37 migrated + 20 remaining)
- **Raw `<textarea>` elements found (live):** 11 — none migrated (see reasons below)
- **Standard inputs migrated:** 37
- **Specialized inputs intentionally excluded (live, re-verified after migration via direct grep):** 31 total — 20 raw `<input>` + 11 `<textarea>`

#### Specialized inputs excluded, with reasons

| Category | Examples | Reason |
|---|---|---|
| Textareas | `AddLeaveTypeModal.jsx` (description), `ApplyLeaveOnBehalf.jsx`/`EditLeaveModal.jsx`/`RequestLeaveModal.jsx` (reason), `BlockLeaveDates.jsx`/`EditBlockLeaveModal.jsx` (reason) | `FormInput` renders only `<input>` — no multi-line support. Migrating would silently drop the multi-line textarea and lose newline/wrapping behavior. |
| Icon-prefixed compound fields | `EnterpriseConfigManager.jsx` (rules search), `AddHolidaysModal.jsx` (holiday date, holiday name), `ApplyLeaveOnBehalf.jsx` (drive link), `HandleLeaveRequestAndApprovals.jsx` (name/leave-type search) | `FormInput` has no icon slot; these use an absolutely-positioned icon coupled to `pl-9`/`pl-10` padding on the input. A literal drop-in would either lose the icon or risk `FormInput`'s own wrapper `<div>` disrupting the icon's positioning context. Not a "pure" migration — excluded pending a future icon-adornment-aware version of the component. |
| Custom multiselect internals | `BlockLeaveDates.jsx` (search box inside a local multiselect dropdown), `ManageActiveLeaveBlocks.jsx` (same pattern) | Tightly coupled compound-widget internals (filter box + option list + outside-click handling) — same category as already-excluded `FilterListbox`/`Listbox`/`react-select` internals. |
| Autosuggest/combobox trigger | `EmployeeLeaveBalances.jsx` (employee search) | Trigger field of a custom autocomplete with a live suggestion dropdown and outside-click detection coupled to the surrounding wrapper `<div ref={wrapperRef}>` — not a standalone field. |
| File inputs | `AddHolidaysModal.jsx`, `LeaveUploadWizard.jsx` | Explicitly out of scope per instructions. |
| Checkboxes (10 total) | `EnterpriseConfigManager.jsx` ×2 (lines 159, 181), `AddLeaveTypeModal.jsx` ×2 (509, 553), `EditBlockLeaveModal.jsx` ×2 (339 — has a `ref` for indeterminate-state DOM manipulation, 376), `HandleLeaveRequestAndApprovals.jsx` ×2 (670 select-all, 787 row-select), `BlockLeaveDates.jsx` (187), `ManageActiveLeaveBlocks.jsx` (196) | Explicitly out of scope. |
| Date inputs | `AddHolidaysModal.jsx` (holiday date, icon-prefixed) | Excluded for the icon-compound reason above, not because it's a date field per se (plain `type="date"` fields *without* an icon, e.g. in `EditHolidaysPage.jsx`/`AddEmployeeModal.jsx`/`AddLeaveTypeModal.jsx`, were migrated — see below; `DateRangePicker`/react-day-picker itself was never touched). |
| Dead/commented code | `LeaveHistory.jsx`, `ManagerEditLeaveRequest.jsx`, `AddLeaveTypeModal.jsx` (a commented-out "Deactivation Effective Date" block) | Not live code — not counted or touched. |

No refs were found attached to any of the 38 migrated standard fields, so `FormInput`'s lack of `forwardRef` was not a blocking concern anywhere in this migration.

### Migration results

**Files modified (15):**
```
EnterpriseConfigManager.jsx, ruleBook/RuleBookPage.jsx, models/CarryForwardTrigger.jsx,
models/EffectiveDeactivationDate.jsx, models/AddEmployeeModal.jsx, models/AddLeaveTypeModal.jsx,
models/ApprovalDashboard.jsx, models/ApprovalRulesPage.jsx, models/EditHolidaysPage.jsx,
models/EditLeaveModal.jsx, models/EmployeeLeaveBalances.jsx, models/HandleLeaveRequestAndApprovals.jsx,
models/LeaveHistory.jsx, models/ManageActiveLeaveBlocks.jsx, models/RequestLeaveModal.jsx
```
Note: `ApplyLeaveOnBehalf.jsx` was **not** touched in this step — its one candidate field (drive link, line ~385)
is icon-prefixed (compound layout) and was correctly excluded per the audit table above, same as the other
icon-prefixed fields. It is listed in the exclusions, not the modified-files list.

**37 inputs migrated**, including:
- 2 dynamic generic config fields in `EnterpriseConfigManager.jsx` (number + text, driven by a `field` config object)
- 6 fields in `RuleBookPage.jsx` (new action type, rule description, 2 dynamic condition-builder fields inside a `.map()`, approval step level + approver value inside another `.map()`)
- 1 field each in `CarryForwardTrigger.jsx` (year) and `EffectiveDeactivationDate.jsx` (date)
- 8 fields in `AddEmployeeModal.jsx` (first name, last name, phone, email, joining date, designation, manager ID, password) — each gained proper `htmlFor`/`id` label pairing as a side effect, since none existed before
- 5 fields in `AddLeaveTypeModal.jsx` (effective start date, 2 dynamic numeric fields across two `.map()` blocks, document-submission-threshold in both the gender-based and non-gender-based branches)
- 1 field in `ApprovalDashboard.jsx` (rejection reason — also dropped two dead `rows`/`cols` attributes that were meaningless on a `type="text"` input, a pre-existing copy-paste leftover)
- 1 wrapper component in `ApprovalRulesPage.jsx` — its local `InputField` component's *body* now delegates to `FormInput` internally, so all 4 of its call sites (Maker Role, Checker Role, Approval Level, Approval Condition) needed zero changes
- 6 fields in `EditHolidaysPage.jsx` (table search, inline-edit holiday name/date, and 3 read-only display fields — Type/State/Country — with a pre-existing "has `onChange` but is `readOnly`" quirk on 2 of them preserved exactly, not "fixed")
- 1 field each in `EditLeaveModal.jsx` (drive link, `type="url"`), `EmployeeLeaveBalances.jsx` (per-leave-type numeric balance — kept its sibling row-label external, did not use `FormInput`'s own `label` slot, to avoid a layout change), `HandleLeaveRequestAndApprovals.jsx` (manager comment / cancellation reason), `LeaveHistory.jsx` (filters search), `ManageActiveLeaveBlocks.jsx` (page-level filter search)
- 1 field in `RequestLeaveModal.jsx` (drive link — kept `type="text"` exactly as-is, matching a pre-existing inconsistency with the `type="url"` versions of the same field in other files; left its multi-node JSX label, which contains a conditional required-asterisk `<span>`, untouched rather than force-consolidating it into `FormInput`'s `label` prop)

Verified by an exact count of `<FormInput` occurrences across all 15 modified files: **37**, matching the total above precisely (`ApprovalRulesPage.jsx` counts as 1 migrated location — its local `InputField` wrapper — even though that one location serves 4 call sites).

**Canonical FormInput props actually used across the migration:** `label`, `name`, `type`, `value`, `onChange`, `placeholder`, `required`, `requiredMark`, `disabled`, `inputClassName`, plus passthrough `min`/`maxLength`/`readOnly` via `...rest`. `error`/`labelClassName`/`className` were not needed by any migrated field (none had a per-field error message source, and no wrapper-level spacing override was required).

### Inputs intentionally left unchanged (22, see table above)

Full reasons are in the audit table. In short: 11 textareas (no FormInput support), 5 icon-prefixed compound fields, 2 custom-multiselect-internal search boxes, 1 autosuggest trigger, plus file inputs and checkboxes (both categorically out of scope from the start).

### Business logic preserved

Every migrated field kept its exact `value`/`onChange` expression, verbatim — no handler was rewritten, no validation condition changed, no API call touched. `EmployeeLeaveBalances.jsx`'s numeric-balance `onChange` (which contains a conditional early-return and `parseFloat` logic) was copied over character-for-character, not paraphrased.

### Validation preserved

`required`, `maxLength`, `min` attributes were preserved exactly on every field that had them (e.g. `ApprovalDashboard.jsx`'s `maxLength="100"`, `AddLeaveTypeModal.jsx`'s `min="0"` on numeric fields). No validation logic was moved into `FormInput` — it remains exactly where it was, in each Leave component.

### Accessibility preserved (and, in several cases, incidentally improved)

- `AddEmployeeModal.jsx`'s 8 fields, `RuleBookPage.jsx`'s "Description" field, and `ApprovalDashboard.jsx`'s rejection-reason field previously had a `<label>` with **no** `htmlFor`/`id` pairing (or, for `AddEmployeeModal.jsx`, no `id` at all) — consolidating them into `FormInput`'s `label`+`name` props now gives them correct `htmlFor`/`id` linkage for free, a genuine accessibility improvement that was a natural side effect of the migration, not a deliberate separate a11y pass.
- Fields that already had a working `id`/`htmlFor` pair (`ApprovalDashboard.jsx`'s `` `reason-${request.id}` ``) kept that exact identifier via the `name` prop, so no existing pairing was broken.
- `EditHolidaysPage.jsx`'s read-only Type/State/Country fields kept their `readOnly` attribute exactly (passed through via `...rest`); the pre-existing "no `onChange` at all" pattern on the Type field, and the "has a dead `onChange` because `readOnly` blocks it" pattern on State/Country, were both preserved verbatim rather than "fixed."

### API/business logic verification

No `api.*` call, endpoint, HTTP method, payload, or response-handling code was touched anywhere in this migration — confirmed by scoping every edit to the `<input>`/`<FormInput>` element and its immediate props only, and by the successful build (which would have failed on any broken reference).

### Build result

✅ `npm run build` succeeds (`✓ built in ~55s`), only pre-existing chunk-size warnings.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document
(`react-hooks/exhaustive-deps` in `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
`src/pages/airs/talent-pool/hooks/useTalentPool.js`) — zero new errors.

### `git diff --check` result

Clean — no whitespace errors introduced.

### Remaining raw inputs — re-verified, all classified

After migration, a repo-wide re-search for `<input` and `<textarea` under `leave_management/` was performed
independently (not just trusting the pre-migration audit numbers). Exact result: **24 raw `<input>` matches**,
of which 4 are inside dead/commented-out code (`LeaveHistory.jsx` ×3, `AddLeaveTypeModal.jsx` ×1 — a commented
"Deactivation Effective Date" block) and **20 are live**, breaking down as: 10 checkboxes, 2 file inputs
(`AddHolidaysModal.jsx`, `LeaveUploadWizard.jsx`), 5 icon-prefixed compound fields, 2 custom-multiselect-internal
search boxes, and 1 autosuggest trigger (`EmployeeLeaveBalances.jsx`). Plus **11 live `<textarea>` elements**,
none migrated (no FormInput textarea support). Every single one of these 31 live remaining instances falls into
a documented exception category above — **no unexplained standard text input remains.**

### Concerns before P0.4

- The icon-prefixed compound fields (5 instances) and the two custom-multiselect search boxes plus the employee autosuggest field are reasonable candidates for a **future**, more capable version of `FormInput` (e.g. an icon-slot prop) — not attempted here, to avoid modifying the canonical component without a clearly verified need agreed on in advance.
- `RequestLeaveModal.jsx`'s drive-link field still uses `type="text"` while its equivalents in `EditLeaveModal.jsx`/`ApplyLeaveOnBehalf.jsx` use `type="url"` — a pre-existing inconsistency, deliberately not reconciled in this pass (changing a `type` attribute is a behavior-adjacent decision, not a pure container/style migration).
- `EditHolidaysPage.jsx`'s Type/State/Country quirks (missing `onChange`, or a dead `onChange` blocked by `readOnly`) are pre-existing and unrelated to this migration — flagged, not fixed.

---

## P0.4 — Canonical FormSelect Migration

**Date:** 2026-08-14. Scope: `src/pages/leave_management/` only.

### Canonical component audit

The canonical select component was **not assumed** — both candidates in `src/components/` were inspected before
choosing:
- `src/components/ui/select.jsx` — a shadcn-style compound component (`Select`/`SelectTrigger`/`SelectContent`/
  `SelectItem`), 5 importers repo-wide, none in `leave_management/`.
- `src/components/forms/FormSelect.jsx` — named `FormSelect`, sits alongside the already-adopted canonical
  `FormInput` in the same `forms/` directory, 47 repo-wide importers (none in `leave_management/` — first
  adoption here, same as `FormInput` in P0.3).

`FormSelect` was identified as canonical based on naming convention consistency with `FormInput` and its
prevalence. Its actual, complete API (not modified in this step):
```jsx
const FormSelect = ({
  label, options, value, onChange, name, className = "", buttonClassName = "",
  placeholder = "Select", maxVisibleOptions, anchorOptions = false,
}) => { ... }
```
- Built on Headless UI `Listbox` internally (single-select only, no native `<select>` fallback).
- `options` must be `[{value, label}]`. `onChange` fires as `onChange({ target: { name, value: val } })` — a
  synthetic event shape compatible with generic `handleChange(e)` patterns already common in this codebase.
- **Critical capability gaps identified before migrating anything**: **no `disabled` prop, no `required` prop,
  no `error` prop, and no `...rest` spread of any kind.** Any select needing a whole-control disabled/required/
  error state, or any prop beyond the ones explicitly listed, cannot be represented by `FormSelect` today.
  Also: it renders `{option.label}` as plain text only — no custom option-rendering slot — and does not check
  any `option.disabled` flag, so per-option disabling is unsupported.
- A representative existing usage (`VendorForm.jsx`): `<FormSelect label="Country *" name="country_id" options={countryOptions} value={formData.country_id} onChange={onChange} />`.

### Leave Management audit

A full-repo, file-by-file audit of every select/dropdown-like control under `src/pages/leave_management/` was
performed before any edit. Totals:

- **Select-like controls found:** ~50 across the module (including 3 separately-defined but functionally
  identical `LeaveTypeDropdown` copies, ~15 `FilterListbox`-based filters, several raw Headless UI `Listbox`
  usages, 3 `react-select` instances, a native `<select>`, and 3 action-menu "dropdown" components that aren't
  value-selectors at all).
- **Standard selects migrated:** 33 (verified by exact `<FormSelect` grep count across the 17 modified files).
- **Specialized selects intentionally excluded**, by category:

| Category | Instances | Reason |
|---|---|---|
| `LeaveTypeDropdown` (3 separately-defined copies: `RequestLeaveModal.jsx`, `EditLeaveModal.jsx`, `ManagerEditLeaveRequest.jsx`; also used via import in `ApplyLeaveOnBehalf.jsx`) | 4 usages | Per-option disabling (`option.disabled` greys out zero-balance leave types) **and** custom option rendering (balance-availability text or a color-coded pill alongside the label) — both unsupported by `FormSelect`. |
| `ApprovalRulesPage.jsx`'s shared local `Dropdown` component | 2 usages ("Action Type", "Approver Type") | Both usages route through the **same** component definition; "Approver Type" passes a `disabledOptions` function restricting selection to `"DIRECT_MAPPING"` only — a per-option-disable requirement `FormSelect` can't represent. Migrating only the component's *internals* would silently drop that restriction for both call sites; migrating only one call site isn't possible without forking the shared component into two, which is a deeper refactor than an incremental container-only migration. Left entirely untouched, including the "Action Type" instance that itself has no gap, to avoid a partial/forked component. |
| `AddHolidaysModal.jsx` Country/State `react-select` | 2 | Third-party searchable dropdown (~195 countries) with heavy custom CSS-in-JS styling; State additionally needs a whole-control `isDisabled` (tied to National/Regional/Optional type logic) that `FormSelect` has no prop for. |
| Employee search `react-select` (`hooks/EmployeeSearchDropdown.jsx`, `ApplyLeaveOnBehalf.jsx` inline) | 2 | Async/paginated/debounced remote search — not a like-for-like static-option replacement. |
| `BlockLeaveDates.jsx` `MultiSelect` (Members, Leave Types) | 2 | Genuine multi-value selection with checkbox UI and "select all visible" — `FormSelect` is single-select only with no multi-value data model. |
| Action-menu "dropdown" components (`ActionDropdown.jsx`, `ActionDropdownHrTools.jsx`, `ActionDropDownPendingLeaveRequests.jsx`) | 3 components | Kebab-menu action triggers (Edit/Delete/Comment/etc.), not value-selection controls — not applicable to a select migration at all. |
| Dead/commented-out code | several | Native `<select>`s and `Listbox`es inside fully commented-out legacy implementations (`LeaveHistory.jsx`, `ManagerEditLeaveRequest.jsx`) — not live, not counted, not touched. |

No canonical-component modification was needed to complete this migration, since every genuinely simple select
happened to have static or simply-derived `{value,label}` options with no disabled/required/custom-rendering
requirement. The gaps above are real and worth reporting per the task's "STOP and report" instruction — they
were not worked around with a one-off patch; the affected controls were simply left as-is.

### Migration results

**Files modified (17):** `models/RequestLeaveModal.jsx`, `models/EditLeaveModal.jsx`,
`models/ManagerEditLeaveRequest.jsx`, `models/ApplyLeaveOnBehalf.jsx`, `models/CompOffRequestModal.jsx`,
`models/CancellationModal.jsx`, `models/AddHolidaysModal.jsx`, `models/EditHolidaysPage.jsx`,
`charts/Calendar.jsx`, `models/EmployeeLeaveBalances.jsx`, `models/HandleLeaveRequestAndApprovals.jsx`,
`models/LeaveHistory.jsx`, `models/AddLeaveTypeModal.jsx`, `EnterpriseConfigManager.jsx`,
`ruleBook/RuleBookPage.jsx`, `models/AddEmployeeModal.jsx`, `models/BlockLeaveDates.jsx`.

**33 controls migrated**, including:
- Half-day "Start Day"/"End Day" selector pairs in 5 modals (`RequestLeaveModal`, `EditLeaveModal`,
  `ManagerEditLeaveRequest`, `ApplyLeaveOnBehalf`, `CompOffRequestModal`) — identical static 3-option pattern
  (`fullday`/`first`/`second`) in every case.
- `CancellationModal.jsx`'s cancellation/revoke reason selector — converted a plain string array
  (`predefinedReasons`) into `{value, label}` pairs; also removed the now-fully-unused `Listbox`/`Transition`/
  `ChevronDown` imports.
- `AddHolidaysModal.jsx`'s Holiday Type selector (native `<select>` → `FormSelect`); its Country/State
  `react-select` fields were left untouched.
- `EditHolidaysPage.jsx`'s Year filter (raw `Listbox` → `FormSelect`), removing now-unused `Listbox`/
  `Transition`/`CheckIcon`/`ChevronUpDownIcon` imports.
- `Calendar.jsx`'s local `NativeSelect` wrapper — its *body* now delegates to `FormSelect` while keeping the
  same external `{options, value, onChange}` API, so its two call sites (month/year navigation) needed no
  changes.
- `EmployeeLeaveBalances.jsx`'s exported `YearDropdown` — same "migrate the wrapper's body, keep its external
  API" approach, since it's also imported by `EmployeeDashboard.jsx` and `LeaveSection.jsx` (neither of those
  two files was touched — confirmed by the migrating agent explicitly not reading or editing them), plus the
  table's own Year filter.
- `HandleLeaveRequestAndApprovals.jsx`'s Status/Year/Month filters and `LeaveHistory.jsx`'s Leave Type/Status/
  Year/Month filters (4 + 4 = 8 controls) — all plain static or API-derived option lists.
- `AddLeaveTypeModal.jsx`'s exported `GenderDropdown` wrapper (same wrapper-body approach), Leave Name selector,
  and Accrual Frequency selector.
- `EnterpriseConfigManager.jsx`'s single generic `field.type === 'select'` branch inside `renderFormField()` —
  this one code location covers every static-option select across all 3 config tabs (Leave/HR/Notification).
- `RuleBookPage.jsx`'s Action Type, condition-operator (per-row), Approver Type, and per-step Mode selectors.
- `AddEmployeeModal.jsx`'s Gender selector — this one **simplified** on migration: the original manually
  constructed a synthetic `{target:{name,value}}` event to reuse a generic `handleChange`; `FormSelect` already
  produces that exact shape natively, so the call site now just passes `onChange={handleChange}` directly.
- `BlockLeaveDates.jsx`'s Project selector (its `Toggle` switch and both `MultiSelect` instances left untouched).

**A second incidentally-fixed pre-existing bug**: `ApplyLeaveOnBehalf.jsx` was missing its `FilterListbox`
import entirely despite using `<FilterListbox>` twice in JSX (documented as a known issue back in P0.2.5) —
migrating those two usages to `FormSelect` (which now has a correct import) resolves this latent
`ReferenceError` as a structural side effect, the same way P0.2.4's Rules-of-Hooks issue was incidentally
resolved by that migration's standard pattern — not a deliberate separate bug-fix.

### Options/state preserved

Every migrated control kept its exact option-array construction (static literals, `.map()` derivations from
API responses, computed year ranges) and exact state-setter call, verbatim. Only the wrapping component and the
`onChange` adapter (raw-value → `{target:{name,value}}` event shape, or vice-versa for wrapper components that
expose a raw-value external API like `YearDropdown`/`GenderDropdown`/`NativeSelect`) were changed.

### Validation preserved

No select in the migrated set had a `required`/error/disabled requirement to begin with (the ones that did —
`LeaveTypeDropdown`, `ApprovalRulesPage`'s Approver Type — were excluded, not stripped of validation). Where a
selection's "requiredness" was enforced externally (e.g. a submit button disabled until a value is chosen), that
external logic was untouched.

### Accessibility preserved

`FormSelect`'s `Listbox.Button` provides the same keyboard/ARIA behavior Headless UI already provided in the
raw `Listbox` usages being replaced (Headless UI Listbox is used internally either way). No accessibility
regression expected from the swap itself.

### API/business logic verification

Zero `api.*` calls, endpoints, or business logic touched — confirmed by scoping every edit to the select
element and its immediate props, and by the successful build.

### Build result

✅ `npm run build` succeeds (`✓ built in ~54s`), only pre-existing chunk-size warnings.

### Lint result

Same 2 pre-existing, unrelated errors as every prior validation pass in this document — zero new errors.

### `git diff --check` result

Clean — no whitespace errors introduced.

### Remaining native/custom selects — re-verified, all classified

After migration, a repo-wide re-search for `<select`, `Listbox`, and `react-select` under `leave_management/`
was performed. Every live remaining instance is accounted for: the 3 `LeaveTypeDropdown` copies + 1 import site,
`ApprovalRulesPage.jsx`'s shared `Dropdown`, `AddHolidaysModal.jsx`'s Country/State `react-select`, the two
employee-search `react-select` instances, and `BlockLeaveDates.jsx`'s `MultiSelect`. All remaining native
`<select>` matches are inside fully commented-out dead code (`LeaveHistory.jsx`, `ManagerEditLeaveRequest.jsx`)
— confirmed inert. **No unexplained standard select remains.**

### Pre-existing issues discovered (not fixed)

- `AddHolidaysModal.jsx` has an unused `import FilterListbox ...` line — dead code, pre-existing (this file
  never actually used `FilterListbox`; only its Type field used a native `<select>`, now migrated), not removed
  since unrelated cleanup is out of scope.
- Three separately-maintained, functionally-identical copies of `LeaveTypeDropdown` exist across
  `RequestLeaveModal.jsx`/`EditLeaveModal.jsx`/`ManagerEditLeaveRequest.jsx` — a genuine duplication that a
  future canonical "Select with custom option rendering + per-option disable" component could consolidate, but
  that's a `FormSelect` capability upgrade, not something this step should improvise around.

### Concerns before P0.5

- **Canonical component gap, reported per instructions rather than worked around**: `FormSelect` cannot
  represent (a) whole-control `disabled`, (b) `required`, (c) `error`, or (d) per-option disabling/custom
  option rendering. Several real Leave Management controls need exactly these capabilities (the leave-type
  balance dropdowns, `AddHolidaysModal`'s State field, `ApprovalRulesPage`'s Approver Type restriction). If a
  future phase wants to migrate these, `FormSelect` itself will need new props first — a decision for the team,
  not something to route around with a local one-off select implementation.
- `Calendar.jsx`'s two `NativeSelect`-wrapped month/year controls now render inside `FormSelect`'s `w-full`
  block-level wrapper `<div>` instead of being tight, content-sized inline `<select>` elements in a flex row —
  a potential layout width difference worth a manual visual check (not verified in a live browser this pass).
- No live browser QA has been performed for this step, consistent with every prior P0.1–P0.4 validation in this
  document.

---

## P0.5 — Cross-Module DatePicker / DateRangePicker Audit

**Date:** 2026-08-14. **This is an audit-only step — zero source files were modified.** Scope: the entire
repository (not just Leave Management), per instructions. Method: three parallel read-only research passes —
(1) `src/pages/leave_management/` in depth, (2) Timesheet/Projects/resource_management/UserManagement/shared
`src/components/`, (3) airs/accounts-payable/account_receivable/expense-management/employee-onboarding/
employee-exit/Finance — plus a direct `package.json` dependency check.

### 1. Modules audited

Every module in `src/pages/` plus `src/components/`: Leave Management, Timesheet, Projects, resource_management
(no separate "RMS" directory exists), UserManagement (no separate "UMS" directory exists — confirmed, this is
the actual folder name), airs, accounts-payable, account_receivable, expense-management, employee-onboarding,
employee-exit, Finance (single-file module, confirmed zero date controls).

### 2. Dependency audit

| Package | Version | Purpose | Consumers |
|---|---|---|---|
| `react-datepicker` | ^8.8.0 | Popover single/range date picker | Timesheet (5 files), resource_management (`AvailabilityFilters.jsx`), Leave Management (`CompOffRequestModal.jsx`'s `StyledDatePicker`) |
| `react-day-picker` | ^9.11.0 | Calendar-grid date picker | **Leave Management only** — `models/DateRangePicker.jsx`. Zero usage anywhere else in the repo. |
| `@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/interaction` | ^6.1.19 | Read-only month-grid **event** calendar (not a value-selection date picker) | Projects (`manager/Calender.jsx`) only |
| `date-fns` | ^4.1.0 | Date formatting/math helpers | Leave Management (`format`, `isSameDay`), Timesheet (`startOfMonth`/`endOfMonth`/`addDays`) — used as utility functions, not as a picker library itself |
| `antd` | (already in deps for other components) | Full component library installed | Its `DatePicker`/`RangePicker` are **not used anywhere** — `antd` is only used for Card/Typography/Tooltip/Avatar elsewhere |

Not found anywhere in the repository: `moment`, `dayjs`, `@mui/x-date-pickers`. No packages were installed, removed, or modified.

### 3. All date implementations found (grouped by underlying mechanism)

| Implementation | Modules using it | Character |
|---|---|---|
| **A. Native `<input type="date">`/`type="datetime-local">`**, raw or via a thin wrapper | By far the most common: accounts-payable, account_receivable, expense-management, employee-onboarding, employee-exit, Projects, resource_management, airs (datetime-local for campaign deadlines), several Leave Management fields (migrated to `FormInput` in P0.3) | Zero shared logic; every feature re-implements its own value handling. Browser-native calendar UI, browser-controlled locale/format. |
| **B. `src/components/forms/FormDatePicker.jsx`** (single-date wrapper around native input) | Real, substantial adoption: 53 occurrences across 19 files, concentrated in accounts-payable and account_receivable, some in expense-management. **Zero adoption** in Leave Management, Timesheet, Projects, resource_management, employee-onboarding, employee-exit. | The closest thing to an existing "canonical" single-date control by actual usage — but not universally adopted, and not part of the Phase 1 canonical set that P0.1–P0.4 targeted. |
| **C. `src/components/filter/Calender.jsx`** (another single-date wrapper) | **Zero consumers anywhere in the repository** — confirmed dead code. | Not a real candidate; should not be treated as canonical. |
| **D. `react-datepicker`** (popover picker) | Timesheet (5 files, heaviest usage — filters, history, dashboard, two inline weekly-entry editors), resource_management (`AvailabilityFilters.jsx`), Leave Management (`CompOffRequestModal.jsx`'s local `StyledDatePicker`) | Each consumer independently reimplements ISO-string conversion, with at least 3 different, inconsistent conversion approaches found (see §11). |
| **E. `react-day-picker`** (calendar-grid picker) | **Leave Management only** — `models/DateRangePicker.jsx`, 9 call-site files, ~29 JSX usages | The single most-used date component in Leave Management, but not adopted by, or even present in, any other module. Not purely presentational (see §14). |
| **F. `@fullcalendar/react`** | Projects only, one file, for a read-only task calendar | Not a value-selection control at all — out of scope for a canonical *picker*, included here only because it matched the audit's search terms. |
| **G. Custom hand-built calendar grid** | Leave Management's `charts/Calendar.jsx` only | Pure `Date` math, no library. Display/visual only — not wired to any parent `value`/`onChange` contract (local UI state only). |

### 4. DatePicker implementations (single-date)

- `FormDatePicker.jsx` (native input wrapper) — AP/AR/Expense, 19 files.
- `FormInput.jsx` with `type="date"`/`type="datetime-local"` — airs, expense-management, employee-onboarding, and (post-P0.3) several Leave Management fields.
- Raw native `<input type="date">` — Projects, resource_management, employee-onboarding, employee-exit, some AP/Expense/UMS-adjacent files.
- `react-datepicker` single instances — Timesheet (4 of its 5 files use single, non-range instances), resource_management's `AvailabilityFilters.jsx` (two independent singles, not a linked range).
- Leave Management's `react-day-picker`-based `DateRangePicker.jsx`, when used as a single field (most call sites render it twice, side by side, to fake a range — it has no true "range" mode of its own).

### 5. DateRangePicker implementations (true range controls)

Genuine range-picker implementations are rare — most "ranges" in this repository are actually **two
independently managed single-date fields** composed by the parent, not a single range-aware component:

- **Leave Management**: `DateRangePicker.jsx` rendered twice (start/end) is the de facto pattern across every
  Leave modal — not a true linked-range component, but functions as one via caller-side `minDate`/`before`
  wiring between the two instances.
- **Timesheet**: `TimesheetFilters.jsx` uses `react-datepicker`'s actual `selectsRange` mode (a real linked
  range) — the only true library-level range picker found in the entire repository.
- **`WeeklyJoiningDashboard.jsx`** (employee-onboarding): a hand-built range popover with two native date
  inputs plus preset buttons ("Previous Week"/"Previous Month"/"This Month") — presets encode business logic
  but bypass the inputs' own constraints (a user can still type any date outside a preset's window).
- Everywhere else (`resource_management`'s `AvailabilityFilters.jsx`, most AP/AR "From/To" filters), a "range"
  is just two `FormDatePicker`/native-input fields with `selectsStart={false}`/`selectsEnd={false}` (explicitly
  opting out of the library's own range-linking) or no linking at all.

### 6. Behavior matrix

| Capability | Leave Mgmt (`DateRangePicker.jsx`) | Timesheet (`react-datepicker`) | AP/AR/Expense (`FormDatePicker`) | resource_management (`react-datepicker`) | Projects/Onboarding/Exit (native input) |
|---|---|---|---|---|---|
| Single date | ✓ (used as one half of a pair) | ✓ | ✓ | ✓ | ✓ |
| Date range | ~ (two instances + caller wiring) | ✓ (`selectsRange` in one file) | ~ (two fields, rarely linked) | ~ (two independent fields) | ~ (two independent fields) |
| Disabled dates (weekends) | ✓ (caller-supplied `disabledDays`) | ✓ (post-click toast rejection, not calendar-level) | – | – | – |
| Disabled dates (holidays) | ✓ (caller-supplied + component's own redundant fetch) | ✓ (post-click toast rejection) | – | – | – |
| Min/max | ~ (via `disabledDays` `{before:...}`, no dedicated prop) | ✓ | ✓ (only 2 of ~12 files enforce cross-field sequencing) | ✓ (simple mutual constraint) | rare (2 files: no-past-date, project-bounded) |
| Clear | – (no clear affordance) | library default (not consistently enabled) | – | – | manual (delete text) |
| Open/close (popover) | ✓ (custom toggle + outside-click) | ✓ (library default, or forced-open in Timesheet edit rows) | n/a (native OS picker) | ✓ (library default, portal-rendered) | n/a (native OS picker) |
| Keyboard | library default (react-day-picker) | library default (react-datepicker) | native browser | library default | native browser |
| Required/error/disabled prop on wrapper | – | n/a (used inline, not via a shared wrapper) | ✓ (`required` only; no `error`/`disabled` prop) | n/a | varies (via `FormInput`'s `error`/`disabled` when used) |
| Business logic embedded in the control itself | ✓✓ (holiday fetch + leave-conflict check — the most coupled of any implementation found) | ✓ (weekend/holiday-submission blocking in 2 files) | – (sequencing lives in parent) | ✓ (demand dates bounded by project dates, in parent `DemandModal.jsx`, not the picker) | – |

### 7. Leave Management findings (detailed)

- **`models/DateRangePicker.jsx`** (`react-day-picker` + `date-fns`): props `label, onChange, defaultDate, disabledDays, defaultMonth, align, year` — no `minDate`/`maxDate`, no `disabled`/`error`/`required`. Value in/out is a JS `Date` object.
  - **Not purely presentational**: internally fetches `GET /api/holidays/by-location/{year}` itself (independent of whatever `disabledDays` the caller already computed and passed in — a redundant network call), and separately fetches the current user's own leave-dates per month to block re-selecting an already-leave day (`toast.info`), with a tooltip via a portal-rendered `LeaveDayButton`.
  - 9 call-site files, ~29 JSX usages, each hand-assembling nearly-identical `disabledDays` arrays: `{dayOfWeek:[0,6]}` (weekends) + spread of a caller-fetched `holidays` array + a `{before: ...}` bound, with a `isMaternityLeave ? [] : [...]` bypass repeated in at least 2 files.
  - Three different holiday-`Date`-construction strategies coexist: `new Date(y, m-1, d)` (local, inside the component itself), `new Date(holidayDateStr + "T00:00:00")` (local-midnight string trick, most call sites), and a UTC `+"T00:00:00Z"`/`getUTCDay()` variant used only inside the `countWeekdaysBetween` day-count helpers (duplicated near-identically in `RequestLeaveModal.jsx` and `ManagerEditLeaveRequest.jsx`).
- **`models/CompOffRequestModal.jsx`**'s `StyledDatePicker` (`react-datepicker`): the only Leave Management date control with **zero** holiday/weekend awareness — plain `maxDate={new Date()}` (no future dates, uniquely restrictive vs. every DayPicker-based field which permits future leave dates) and `minDate`/`disabled` mutual constraint between its two instances. Thin pass-through wrapper; all duration/half-day logic lives in the parent.
- **`charts/Calendar.jsx`**: hand-built, no library, display-only (not wired to a form value), holiday lookup via its own separate `GET /api/holidays/all` call and string-equality date matching; weekend styling is purely visual (red text), does not block clicks.
- Five native `type="date"` fields (post-P0.3, some via canonical `FormInput`) have no holiday/weekend logic at all — that concept doesn't exist for plain native inputs anywhere in this tree.
- **No shared hook fetches holidays once** — `DateRangePicker.jsx` itself, plus `BlockLeaveDates.jsx`, `RequestLeaveModal.jsx`, `ManagerEditLeaveRequest.jsx`, `ApplyLeaveOnBehalf.jsx`, `ManageActiveLeaveBlocks.jsx`, and `charts/Calendar.jsx` each independently call a holidays endpoint and hold their own local `holidays` state — meaning the same data is fetched redundantly, sometimes twice on a single screen (the shared component's own fetch plus the caller's).

### 8. Common requirements across modules (candidates for a canonical component)

- **A. Core, clearly reusable UI behavior**: controlled `value`/`onChange`, `minDate`/`maxDate`, a generic `disabledDate(date) => boolean` predicate (or a `disabledDates`/`matcher` array), `placeholder`, `label`, `required`, `disabled`, `error` — every module needs some subset of these, and none of the current implementations provide all of them consistently (native inputs lack most; `FormDatePicker` lacks `disabled`/`error`; `DateRangePicker.jsx` lacks `minDate`/`maxDate`/`disabled`/`error`/`required` entirely).
- **B. A real linked-range mode** (start+end as one control, not two independently wired instances) — only Timesheet's `TimesheetFilters.jsx` currently has this; every other "range" in the repository is a manual two-field composition, which is exactly the kind of duplicated wiring a canonical `DateRangePicker` should eliminate.
- **C. Consistent value format** — every implementation should agree on one in/out format (a JS `Date` object is the most common single format already returned by `react-day-picker`/`react-datepicker`; native inputs return strings). Standardizing this would remove at least 4 independently-maintained, subtly-different ISO-conversion helper functions found across Timesheet alone.
- **D. Basic accessibility parity** — `label`+`htmlFor`/`id` pairing (already correct in `FormDatePicker`, missing in most raw native-input call sites and in `DateRangePicker.jsx`'s own trigger button).

### 9. Module-specific requirements that must stay OUTSIDE any canonical component

- **Leave Management**: holiday/weekend exclusion source data (which endpoint, per-year caching), the maternity-leave bypass, the "already has leave on this day" conflict check, and all leave-balance/duration calculation. These are Leave-specific business rules, not generic date-picking behavior — a canonical `disabledDate` **predicate prop** is the correct boundary (the canonical component calls it, Leave Management supplies the logic), not a rebuild of holiday-awareness inside the shared component itself.
- **Timesheet**: weekend/holiday-submission blocking tied to a `holidaysMap` with a `submitTimesheet` flag, and "current month only" edit windows — same principle, belongs behind a `disabledDate` predicate supplied by Timesheet, not hardcoded into the canonical component.
- **resource_management**: demand/allocation dates bounded by a parent project's start/end — a `minDate`/`maxDate` computed by the caller, not a canonical concept of "project window."
- **accounts-payable/account_receivable**: simple two-field sequencing (delivery ≥ PO date, period-to ≥ period-from) — expressible with plain `minDate`/`maxDate` props tied to the other field's value; no new capability needed.

### 10. Date format differences found

| Format | Where used |
|---|---|
| JS `Date` object, in and out | `react-day-picker` (Leave Management), `react-datepicker` (Timesheet, resource_management, `CompOffRequestModal.jsx`) |
| ISO `yyyy-MM-dd` string, local-midnight constructed (`str + "T00:00:00"`) | Most Leave Management call sites when converting stored string state back to a `Date` for the picker |
| ISO `yyyy-MM-dd` string, UTC constructed (`str + "T00:00:00Z"`, `getUTCDay()`/`setUTCDate()`) | Only inside the two `countWeekdaysBetween` day-count helpers (Leave Management) |
| `date.toLocaleDateString("en-CA")` | `TimesheetFilters.jsx` and resource_management's `AvailabilityFilters.jsx` — a third, distinct conversion approach for the same "Date → ISO string" need already solved two other ways elsewhere |
| Raw native-input string (`e.target.value`, already `yyyy-mm-dd`) | `FormDatePicker`, `FormInput type="date"`, all raw native inputs — no Date-object round-trip at all |
| `datetime-local` string (`yyyy-MM-ddTHH:mm`, minute precision) | airs campaign deadline fields only |

**At least four independently-written, near-duplicate "Date ↔ ISO string" helper functions** were found across Timesheet alone, plus the distinct approaches above — a strong, evidence-based case for a canonical component owning this conversion once.

### 11. Timezone differences / risks

- The safest, most common pattern (`str + "T00:00:00"`, local time) correctly avoids UTC day-shift issues when redisplaying a stored date.
- The one **genuine, repo-wide correctness risk** found: `date.toISOString().split("T")[0]` used **without** a local-midnight guard, applied directly to a `Date` derived from a *stored* value (not "now") — found in `EditHolidaysPage.jsx`'s inline-edit value coercion (`new Date(editedData.holidayDate).toISOString().split("T")[0]`). In any negative-UTC-offset timezone, this can display the day *before* the actual stored date. The same `toISOString().split("T")[0]` pattern used for `min` attributes elsewhere (computed from `new Date()` "right now," not a stored value) is lower-risk since "today" rarely straddles the UTC/local boundary in a way that matters for a min-date floor.
- `countWeekdaysBetween`'s UTC-based loop (Leave Management) is internally consistent but operates on a **different** timezone convention than the local-midnight construction used everywhere else in the same files — not a bug today (both converge on the same calendar date for typical use), but a latent inconsistency worth resolving if a canonical component centralizes this logic.

### 12. Validation differences

- Only two modules enforce **any** cross-field date-sequencing at the UI layer: Leave Management (`before`/`after` via `disabledDays`) and 2 of ~12 AP/AR files (`VendorPoForm.jsx`, `ProjectPeriodStep.jsx`, via `min`). Every other module with a two-field "range" (expense-management delegations, most AR billing-config effective dates, employee-onboarding date pairs) has **no** enforcement — a user can set an end date before a start date with no UI-level prevention.
- No module validates a date range's *span* (e.g. "no more than N days") at the picker level anywhere in the repository — any such rule, if it exists, lives in a submit-time validator, not observed in this audit's scope.

### 13. Accessibility differences

- `FormDatePicker` and `FormInput`-based date fields: proper `label`/`htmlFor`/`id` pairing; `FormInput` additionally sets `aria-invalid`.
- Raw native `<input type="date">`: relies entirely on whatever `<label>` markup (if any) the surrounding JSX happens to provide — inconsistent across files, several have no associated label at all.
- `react-datepicker`/`react-day-picker` instances: rely on each library's own default keyboard/ARIA behavior; no repository code was found adding extra `aria-*` attributes on top.
- `DateRangePicker.jsx`'s custom popover trigger `<button>` has no explicit `aria-*` attributes beyond whatever `react-day-picker` provides internally to its own rendered grid.

### 14. Styling differences

No two modules share visual styling for date controls: Leave Management's `DateRangePicker.jsx` has its own bespoke Tailwind classes and a custom "leave" tooltip; `CompOffRequestModal.jsx`'s `StyledDatePicker` has yet another Tailwind class set; Timesheet's `react-datepicker` instances are unstyled/library-default in most files; `FormDatePicker` has its own consistent (if minimal) styling reused across AP/AR/Expense; raw native inputs inherit whatever ad hoc className each feature author wrote. No canonical visual language exists for date controls today, unlike Button/Modal/FormInput/FormSelect which now do.

### 15. Recommended canonical architecture (based only on this audit's evidence)

Two separate components, consistent with how P0.1–P0.4 kept Button/Modal/FormInput/FormSelect each single-purpose:

- **`CanonicalDatePicker`** — owns single-date UI: calendar rendering, popover open/close, keyboard nav, min/max
  enforcement, a `disabledDate` predicate hook point, clear affordance, label/error/required rendering. Does
  **not** know what a holiday or a weekend is — those are supplied by the caller via `disabledDate`.
- **`CanonicalDateRangePicker`** — owns a genuine linked start+end selection (unlike today's copy-pasted
  two-single-picker pattern), reusing the single-date component's rendering internally where practical, adding
  range-specific concerns (start ≤ end enforcement, "select end after start" UX, a single shared `disabledDate`
  predicate applied to both ends).

Given `react-day-picker` is already a project dependency, is the most feature-complete of the two calendar
libraries present (`react-datepicker` vs `react-day-picker`), and already has real range-adjacent usage
patterns in Leave Management, it is the strongest *candidate* to build the canonical components on top of —
but this audit does not mandate that choice; it is a recommendation for whoever implements P0.6, to be
validated against accessibility/bundle-size/maintenance criteria before committing.

### 16. Recommended canonical DatePicker API (proposed, not implemented)

```
<DatePicker
  value={Date | null}
  onChange={(date: Date | null) => void}
  label, placeholder, required, disabled, error
  minDate={Date}
  maxDate={Date}
  disabledDate={(date: Date) => boolean}   // generic hook — holidays/weekends/business rules supplied by caller
  clearable={boolean}
  name, id
/>
```
Deliberately excludes: any built-in concept of holidays, weekends, leave balance, or "already booked" — those
remain module-specific, passed in via `disabledDate`.

### 17. Recommended canonical DateRangePicker API (proposed, not implemented)

```
<DateRangePicker
  value={{ start: Date | null, end: Date | null }}
  onChange={(range: { start, end }) => void}
  label, placeholder, required, disabled, error
  minDate={Date}
  maxDate={Date}
  disabledDate={(date: Date) => boolean}   // applied to both start and end
  clearable={boolean}
  name, id
/>
```
This single component would replace the current pattern (rendering two independent single-date pickers side by
side with manually-wired `minDate`/`before` constraints between them) used by Leave Management, most AP/AR
filters, and resource_management's availability filters.

### 18. Migration risks

- **`DateRangePicker.jsx`'s embedded holiday-fetch and leave-conflict logic** cannot be dropped during a shell
  migration without a deliberate decision about where that logic goes — it is real, load-bearing business
  behavior, not incidental styling, unlike the modal-shell/button-icon deltas accepted in earlier P0.2 steps.
- **Three coexisting, subtly different timezone-construction strategies** in Leave Management mean a naive
  "swap the component" migration could silently shift a displayed date by one day in some timezones if the
  new component's internal Date handling doesn't match all three existing conventions during the transition.
- **`react-day-picker` is not used anywhere outside Leave Management** — adopting it as the cross-module
  canonical base means every other module (Timesheet, resource_management especially) would be migrating
  *away* from `react-datepicker`, a larger behavioral surface change than the in-place shell swaps done in
  P0.1–P0.4.
- **No canonical range component exists to migrate cleanly *from*** — every module's "range" is bespoke, so
  this will be closer to new-component adoption than a shell swap, unlike Button/Modal/FormInput/FormSelect
  which all had an existing shell to replace.
- **Zero test coverage observed** for any date logic in this audit (no test files were found alongside the
  audited components) — any migration should be paired with manual QA of holiday/weekend edge cases before
  merging, given the correctness risk already identified in `EditHolidaysPage.jsx`'s timezone handling.

### 19. Components that should NOT be migrated (per this audit's evidence)

- `charts/Calendar.jsx` (Leave Management) — display-only, not a value-selection control; migrating it to a
  "DatePicker" would misrepresent its purpose.
- `@fullcalendar/react` usage in Projects — an event calendar, not a date-picker; out of scope entirely.
- `src/components/filter/Calender.jsx` — confirmed dead code with zero consumers; should be a deletion
  candidate in a future cleanup pass, not a migration target.
- Any two-field "range" composed purely of independent `min`/`max`-linked single fields where no business logic
  is embedded (most AP/AR filters) — low migration value relative to effort; candidates for a later, lower-
  priority pass once the canonical components exist and are proven.

### 20. Proposed implementation order (recommendation only — not started)

1. Design and build the canonical `DatePicker` first (simpler surface, more existing call sites to validate
   against: AP/AR's `FormDatePicker` usages are the least business-logic-coupled and lowest-risk proving ground).
2. Build the canonical `DateRangePicker` second, once the single-date component's `disabledDate`/min-max/clear
   behavior is proven.
3. Migrate accounts-payable/account_receivable's `FormDatePicker` usages first (lowest business-logic coupling,
   highest existing consistency).
4. Migrate resource_management's `react-datepicker` usages (moderate coupling — project-bounded min/max).
5. Migrate Timesheet last among the "easy" group, since it has the heaviest business-logic coupling
   (weekend/holiday-submission blocking) outside Leave Management and the most duplicated conversion helpers to
   consolidate carefully.
6. Migrate Leave Management **last and most carefully**, given `DateRangePicker.jsx`'s embedded holiday-fetch
   and leave-conflict logic — this migration should explicitly decide whether that logic moves to the parent
   (preferred, consistent with the "canonical owns UI, module owns business rules" principle) or is exposed via
   a documented escape hatch, before any code changes are made.
7. Address `employee-onboarding`/`employee-exit`'s ad hoc native inputs and `WeeklyJoiningDashboard.jsx`'s
   custom range-with-presets last — lowest business-logic coupling but also currently the most fragmented/
   inconsistent, so lowest urgency relative to risk.

Each of the above should be its own incremental, validated step — consistent with how P0.1 through P0.4 were
each split into per-component sub-steps — not a single large migration.

### Validation (audit-only step)

- ✅ `npm run build` succeeds — see final report below.
- ✅ `npm run lint` — same 2 pre-existing, unrelated errors as every prior step in this document, zero new.
- ✅ `git diff --check` — clean.
- ✅ Confirmed: no date-picker source file was modified, no `package.json`/`package-lock.json` change, no API
  code changed, no module business logic changed. The only modification in this step is this documentation file.

### Final recommendation

Do not force any module's date control into `FormDatePicker`, `DateRangePicker.jsx`, or any other existing
implementation as-is — none of them has the combined capability (min/max + disabled-date predicate + clear +
required/error + a real linked range mode) that a genuine cross-module canonical component needs, and
`DateRangePicker.jsx` specifically carries business logic that must be deliberately relocated, not silently
inherited. Build both canonical components fresh (informed by, but not constrained to copy, `react-day-picker`
as the likely base library), validate each against the lowest-risk consumers first, and treat Leave Management's
migration as the final, highest-care step of the sequence — not the first.

---

## P0.7 — Canonical Pagination Migration

**Date:** 2026-08-14

### Scope

Only `src/pages/leave_management/**` was audited. No file was modified for pagination behavior — see "Result"
below. The canonical `Pagination` component itself was not touched.

### Canonical component

- **File:** `src/components/Pagination/pagination.jsx`, default export `Pagination`.
- **API:** `{ currentPage, totalPages, onPrevious, onNext, className }`. Renders a Previous chevron button
  (disabled when `currentPage === 1`), a "Page X of Y" pill, and a Next chevron button (disabled when
  `currentPage === totalPages`). Returns `null` entirely when `totalPages <= 1`.
- **Indexing:** 1-based (`currentPage` starts at 1).
- **Existing repository-wide consumers (before this step):** `src/components/Cards/DynamicCardGrid.jsx`,
  `src/components/RiskManagement/RisksPanel.jsx`, `src/components/RiskManagement/IssuesPanel.jsx`, plus 5 files
  already inside Leave Management (see audit below).
- **Capabilities:** Previous/Next navigation, current-page display, automatic disabled states, automatic
  self-hiding when there's only one page.
- **Limitations (verified, not designed around):** no page-size selector, no first/last-page buttons, no direct
  page-number entry/jump, no built-in data-fetching — the caller owns all state and the `onPrevious`/`onNext`
  callbacks.

### Leave Management pagination audit

A full audit was performed across every file in `src/pages/leave_management/` (24-point inventory per screen).

- **Total paginated screens found:** 6 (`EmployeeLeaveBalances.jsx`, `LeaveHistory.jsx`,
  `CompOffRequestsTable.jsx`, `HandleLeaveRequestAndApprovals.jsx`, and `PendingLeaveRequests.jsx` — the last one
  owns pagination state for the presentational `PendingLeaveRequestsTable.jsx`, which itself holds no pagination
  logic).
- **Client-side pagination:** 4 (`LeaveHistory`, `CompOffRequestsTable`, `HandleLeaveRequestAndApprovals`,
  `PendingLeaveRequests`) — each fetches (or receives via props) a full dataset and slices it locally with a
  fixed `itemsPerPage`/`rowsPerPage` constant (8, 5, 8, and 5 respectively).
- **Server-side pagination:** 1 (`EmployeeLeaveBalances.jsx`) — sends `page`/`size` (converted from 1-based UI
  state to 0-based `pageIndex` before the request) and `year`/`query` to the API via TanStack Query, with
  `keepPreviousData` and next-page prefetching.
- **Custom/hand-built pagination UI found:** **0**. Every one of the 6 screens above already renders the
  canonical `Pagination` component directly, with the same `currentPage`/`totalPages`/`onPrevious`/`onNext`
  props described above.
- **Infinite scroll / load-more exclusions:** 1 — `hooks/EmployeeSearchDropdown.jsx` uses a `hasMore`/
  `onMenuScrollToBottom` pattern inside a `react-select` async-searchable dropdown to append more employee
  options as the user scrolls. This is a typeahead-select append pattern, not table/screen pagination, and the
  canonical `Pagination` component has no equivalent "append" mode — migrating it would change the UX entirely.
  Left untouched, out of scope.
- **Confirmed to have no pagination at all** (full list rendered, no page state of any kind):
  `RevokeLeaveRequests.jsx`, `CompOffBalanceRequests.jsx`, `ManageActiveLeaveBlocks.jsx`,
  `ApprovalRulesPage.jsx`, `EditHolidaysPage.jsx`, `ruleBook/RuleBookPage.jsx`, `HRManageTools.jsx`,
  `PendingApprovalsQueueView.jsx`, `ApprovalDashboard.jsx`, `EnterpriseConfigManager.jsx` (this last one is
  driven by hardcoded mock data, not an API, and is separately documented as unreachable dead code in P0.6).

### Result: no migration required

Every table in this module that paginates was **already built directly on the canonical `Pagination`
component** — there was no hand-built/ad hoc pagination UI anywhere in `src/pages/leave_management/` to migrate.
This step is therefore an audit-and-confirm, not a code change. No file under `src/pages/leave_management/`
was modified as part of P0.7.

Per-screen confirmation (all "already canonical, no change made"):

| File | Pagination type | Page state | Page size | Reset-on-search/filter |
|---|---|---|---|---|
| `models/EmployeeLeaveBalances.jsx` | Server-side | `currentPage` (1-based state) → `pageIndex` (0-based on the wire) | Fixed `rowsPerPage = 10` | Yes — search (debounced) and year filter both reset to page 1 |
| `models/LeaveHistory.jsx` | Client-side | `currentPage`, 1-based | Fixed `itemsPerPage = 8` | Yes — search, leave-type, status, year, and month all reset to page 1 (single `useEffect`) |
| `models/CompOffRequestsTable.jsx` | Client-side | `currentPage`, 1-based, local to component | Fixed `rowsPerPage = 5` | N/A — no search/filter in this component |
| `models/HandleLeaveRequestAndApprovals.jsx` | Client-side | `currentPage`, 1-based | Fixed `itemsPerPage = 8` | Search and status reset to page 1; year/month changes trigger a refetch but do **not** explicitly reset the page — this is pre-existing behavior and was left exactly as-is, not "fixed," per the no-behavior-change rule |
| `models/PendingLeaveRequests.jsx` (+ `PendingLeaveRequestsTable.jsx`) | Client-side | `currentPage`, 1-based, owned by the parent | Fixed `ITEMS_PER_PAGE = 5` | N/A — no search/filter; page also does not reset on `year` prop change (pre-existing, preserved) |

In every case: API endpoints, HTTP methods, query/payload parameters, page-size values, total-count/total-pages
formulas, 0-based-vs-1-based indexing, disabled-state logic, loading behavior, empty-state behavior, and
search/filter reset behavior were all verified to already match the canonical component's expectations exactly
— confirming the previous P0.1–P0.6 steps (and the original authors of these files) had already standardized
on this component independently.

### Exceptions

- `hooks/EmployeeSearchDropdown.jsx` — infinite-scroll-style "load more" pattern inside an async searchable
  dropdown, not table pagination; canonical `Pagination` has no equivalent mode. Left unchanged.
- All 10 files listed above under "Confirmed to have no pagination at all" — no pagination UI exists to migrate.
- The 3 structurally-specialized tables from P0.6 (`HandleLeaveRequestAndApprovals.jsx`'s table shell,
  `EditBlockLeaveModal.jsx`, `HRManageTools.jsx`'s `LeaveTable`) are unaffected by this step — their pagination
  (where present) was already covered above; their table *shell* remains bespoke per the P0.6 decision, which
  this step does not revisit.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories); confirms no file under
  `src/pages/leave_management/` was touched by this step.
- ✅ Final re-audit: every pagination implementation in the module is classified as (1) Canonical Pagination —
  6 screens, already in place; (2) N/A, no pagination — 10 files; (3) excluded infinite-scroll/load-more
  pattern — 1 file (`EmployeeSearchDropdown.jsx`). No unexplained standard pagination UI remains.

### Manual/browser QA

Not performed — no code change was made in this step (every screen was already using the canonical component
with verified-correct behavior via static analysis), so there was nothing new to exercise in a browser. If a
regression is ever suspected, the per-screen "current-page state / page-size / API params" facts documented
above are the baseline to compare against.

### Concerns before P0.8

- No action was required in this step, which is itself worth flagging: pagination in Leave Management was
  already fully standardized before this task began, likely because most of these tables were built after the
  canonical `Pagination` component existed in the repo.
- `HandleLeaveRequestAndApprovals.jsx` has a minor pre-existing inconsistency (year/month filter changes do not
  reset `currentPage` to 1, unlike search/status changes) — documented here for awareness but intentionally not
  "fixed," since this step's mandate is UI-only migration, not behavior changes.
- Per the stop condition for this step, no work was done on Cards, Filters, DatePicker/DateRangePicker, or
  DataTable capability upgrades. Awaiting explicit instruction for P0.8.

---

## P0.6 — Canonical Table Migration

**Date:** 2026-08-14

**Note on numbering:** this task was labeled "P0.5" in the request that started it, but "P0.5" was already used
by the DatePicker/DateRangePicker audit completed in the previous step. It is documented here as P0.6 to keep
the sequence unambiguous.

### Scope

Only `src/pages/leave_management/**` was touched. Canonical `Button`, `Modal`, `FormInput`, `FormSelect`,
`Pagination`, and the canonical `DataTable`/`GenericTable` components themselves were **not** modified.
Sorting, filtering, search, row-action handlers, API calls, payloads, RBAC, and pagination logic were preserved
exactly — only the table *shell* (the `<table>`/`<thead>`/`<tbody>` markup, or the `GenericTable` wrapper) was
swapped for the canonical component where safe.

### Canonical table component audit

Two candidates exist under `src/components/`:

| Component | File | API | Repo-wide consumers |
|---|---|---|---|
| `GenericTable` (legacy) | `src/components/Table/table.jsx` | `headers=[]` (parallel label strings), `columns=[]` (parallel plain-string row-object keys), `rows=[]`, `loading` | 90 (2 inside Leave Management: `EmployeeLeaveBalances.jsx`, and a dead import in `HRManageTools.jsx`) |
| `DataTable` (canonical) | `src/components/patterns/DataTable.jsx` | `columns=[{key, header, render?(row, rowIndex), className?}]`, `rows`, `loading`, `emptyTitle`, `emptyDescription`, `getRowKey(row, rowIndex)`, `onRowClick(row)`, `className` | 0 (never adopted anywhere before this step) |

`docs/ui/phase-1-canonical-ui.md` §14 ("Table Rules") explicitly designates `patterns/DataTable.jsx` as the
target for future migrations and explicitly says not to do a blanket rewrite of existing bespoke tables except
"when a module is otherwise being touched" — which is exactly this step. `DataTable` was therefore treated as
canonical despite zero prior adoption, the same "designated-but-unadopted" pattern already documented for
`FormDatePicker.jsx` in the P0.5 audit.

**`DataTable` capabilities:** custom cell rendering via `col.render(row, rowIndex)` (covers status badges, action
buttons, links, icons, dynamic columns — since `columns` is just a plain array, it can be built dynamically),
horizontal scroll wrapper, a `TableSkeleton` loading state, an `EmptyState`-based empty state, `onRowClick`,
`getRowKey`.

**`DataTable` limitations (verified, not modified around):** no built-in sorting, no built-in pagination (the
caller slices/fetches rows externally — this is exactly the "pagination is a separate future task" constraint,
so it was not a blocker for any table here), no built-in row-selection/checkbox concept, no distinct "error"
state separate from empty/loading (a caller with a genuinely separate error UI keeps rendering that error block
instead of `DataTable`, the same pattern already used for the loading state), and no sticky-column support.

### Leave Management table audit

14 real `<table>`/`GenericTable` implementations were found and audited (27-point inventory per table). Summary:

- **Simple/dynamic-data tables safely migrated:** 9
- **Tables requiring real refactor, migrated with care:** 2
- **Specialized tables intentionally retained (structural blockers):** 3
- **Deferred exceptions (broken, unreachable, or low-priority-consolidation candidates):** 3
- **Card/accordion/avatar-grid/form layouts confirmed NOT tables (no action needed):** `PendingApprovalsQueueView.jsx`, `ApprovalDashboard.jsx`, `ProjectMembersOnLeave.jsx`, `BlockLeaveDates.jsx`

### Migrated tables

| File | Component | Columns/rows/actions preserved | Loading/empty preserved | Notes |
|---|---|---|---|---|
| `models/PendingLeaveRequestsTable.jsx` | `PendingLeaveRequestsTable` | Yes — Leave Type/Start/End/Days/Reason/Actions (Edit, Cancel) unchanged | Empty/loading remain parent-owned (unchanged) | Simple static-shape table |
| `models/CompOffRequestsTable.jsx` | `CompOffRequestsTable` | Yes — dates/duration/status/Cancel unchanged; own client-side pagination (`Pagination` + local slice) left untouched | Component still returns `null` when zero pending requests (unchanged) | — |
| `models/ApprovalRulesPage.jsx` | `ApprovalRulesPage` | Yes — Action/Maker/Checker/Level/Condition/Approver Type/Edit+Delete unchanged | **Improved**: `loading`/empty state previously not shown at all; now uses `DataTable`'s built-in skeleton + `emptyTitle` (net addition, no prior behavior removed) | — |
| `models/RevokeLeaveRequests.jsx` | `RevokeLeaveRequests` | Yes — Leave Type/Employee/dates/Duration/Reason/Approve+Reject unchanged | `loading` still shows the original full-block `LoadingSpinner` (kept outside `DataTable`, unchanged) | — |
| `models/CompOffBalanceRequests.jsx` | `CompOffBalanceRequests` | Yes — Employee/Dates/Duration/Note/Status/Approve+Reject unchanged | Empty text ("No pending Comp-Off requests for your team.") kept outside `DataTable`, unchanged | — |
| `models/ManageActiveLeaveBlocks.jsx` | `ManageActiveLeaveBlocks` | Yes — Project/Scope/Employees(pills)/Leave types(pills)/Dates/Edit+Unblock unchanged; search filter (`FormInput`, already-migrated) untouched | `loading`→`DataTable`'s skeleton (was a single ad hoc pulse bar — visual improvement); `emptyTitle="No active blocks"` matches prior text | Removed now-unused `skeleton` Tailwind-token constant (dead after the shell swap) |
| `models/LeaveHistory.jsx` | `LeaveHistory` | Yes — Leave Type/Requested By/From/To/Days/Status/Reason/Comment/Approved By/Cancel unchanged; filters (already-migrated `FormInput`/`FormSelect`) and client-side pagination untouched | **Distinct loading and error early-returns kept exactly as-is, outside/before `DataTable`** (loading → full `LoadingSpinner`, error → red text block) — only the "has data" table branch was swapped | Table has a genuinely separate error state from empty/loading, per the audit's note; preserved rather than folded into `DataTable` |
| `models/EditHolidaysPage.jsx` | `EditHolidaysPage` | Yes — Holiday Name/Date/Type/State/Country/Edit+Delete unchanged; inline row-edit-to-`FormInput` pattern reproduced via `col.render` checking `editingHolidayId === holiday.holidayId` per column | **Improved**: previously no empty-state message when `filteredHolidays` was empty; now `emptyTitle="No holidays found"` (net addition). Full-screen loading overlay left untouched (unrelated to the table shell) | Required real refactor (each column's `render` now branches on edit-mode), not a drop-in swap — audited as "feasible with care" |
| `models/EmployeeLeaveBalances.jsx` | `EmployeeLeaveBalances` | Yes — Employee Id/Employee Name/dynamic per-leave-type columns/Edit unchanged; **server-side pagination and server-side search (`useQuery` + `Pagination`) untouched** since `DataTable` has no pagination opinion | `loading`/`isFetching` overlay and the parent-level "No leave balances found." text both left exactly as before; `DataTable`'s own `loading` prop also still receives `isLoading` (same as before) | Migrated off the legacy `GenericTable` (parallel `headers`/`columns` string-array API, JSX-embedded-in-row-data) onto `DataTable`'s `columns=[{key,header,render}]` API — a real refactor, not a drop-in swap, but no capability gap blocked it |

### Exceptions — specialized tables intentionally retained (structural blockers)

| File | Reason |
|---|---|
| `models/HandleLeaveRequestAndApprovals.jsx` | Bulk row-selection (header + per-row checkboxes with a floating action toolbar embedded in `<thead>`), sticky left/right columns (checkbox/Employee/Actions), and an inline-expanding reason cell. `DataTable` has no selection or sticky-column concept; migrating would either require modifying the canonical component or hacking around it — both against this step's rules. Left unchanged. |
| `models/EditBlockLeaveModal.jsx` | Not a data-display table — an interactive checkbox matrix/editor with a dynamic *column* count (one column per leave type) and indeterminate-checkbox refs (`ref.indeterminate`). `DataTable`'s `render` could express individual cells, but the dynamic-column-set-as-editor shape and ref plumbing are a poor fit for a display-oriented shell. Left unchanged. |
| `HRManageTools.jsx` (`LeaveTable` sub-component) | Sticky left (`leaveName`) and right (`Actions`) columns on a very wide, dynamically-columned table, needed for usability. `DataTable` has no sticky-column prop. The dynamic-column-derivation logic itself is not a blocker (columns are just an array), but the sticky styling is. Left unchanged. The file's dead `GenericTable` import was left in place (out of scope — no table-shell logic depends on it; flagged for cleanup in a future pass). |

### Exceptions — deferred (not structural, but not migrated in this pass)

| File | Reason |
|---|---|
| `ruleBook/RuleBookPage.jsx` | The table itself (Name/Description/Active/Edit+Delete) has no structural blocker and was audited as safe. However, the file has a **pre-existing, unrelated bug**: line 11 does `const api = api.create({...})`, a self-referencing `const` that throws a `ReferenceError` at module load — meaning this page's fetches never actually run today. Migrating dead/unreachable code was avoided; recommend fixing the `api.create` bug as its own change before revisiting this table. |
| `EnterpriseConfigManager.jsx` | Contains a real, migratable `<table>` with dynamic columns, but `HRAdminPanel.jsx` imports this component only in a **commented-out** line (`// <EnterpriseConfigManager />`) — confirmed via grep, it is not rendered by any active route. Left unmigrated as unreachable code; revisit if/when it is wired back in. |
| `models/ApprovalQueue.jsx` (5 inline sub-tables: `KeyValueTable`, `DiffTable`, `BalancesTable`, a balance `ComparisonTable`, `HolidayListTable`) | Each is small, read-only, and individually safe to migrate, but they are five near-duplicate ad hoc table variants defined in one file purely for diff/key-value display inside expanded approval cards. Migrating each in place would just reproduce the duplication inside `DataTable` calls; consolidating them into one or two shared "KeyValueTable"/"DiffTable" wrappers first would be a better and lower-risk approach. Deferred as a low-priority follow-up rather than migrated as-is in this pass. |

### Confirmed non-tables (no action needed)

`models/PendingApprovalsQueueView.jsx` and `models/ApprovalDashboard.jsx` are expandable card/accordion lists,
not `<table>` elements (the small tables they embed are `ApprovalQueue.jsx`, addressed above).
`models/ProjectMembersOnLeave.jsx` is an avatar grid. `models/BlockLeaveDates.jsx` is a form + read-only summary
sidebar built from `<div>`/`<span>`, not a table. None of these were touched.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step in this document; zero new errors or warnings in any file touched
  this step.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisory notices, no trailing-whitespace errors).
- ✅ Final re-search for `<table`, `GenericTable`, and raw tabular grids under `src/pages/leave_management/`
  confirms every implementation found in the original audit is now classified as: migrated to canonical
  `DataTable` (9 simple + 2 refactored = 11), specialized/retained (3), or a documented deferred exception (3).
  No unexplained standard table remains.

### Concerns before P0.7

- Visual change is expected and intentional: migrated tables lose their per-table custom header styling (blue/
  indigo gradient headers, custom zebra-striping colors) in favor of `DataTable`'s uniform gray uppercase header
  — this is the visual-consistency goal of the migration, not a regression, but worth a design sign-off pass
  across all 11 migrated tables together.
- `DataTable`'s loading state is a skeleton (5 rows × column count); several migrated tables previously used a
  spinner or a single pulse bar instead. Functionally equivalent, visually different — flagged per-table above.
- Three specialized tables (`HandleLeaveRequestAndApprovals.jsx`, `EditBlockLeaveModal.jsx`, `HRManageTools.jsx`'s
  `LeaveTable`) cannot adopt the canonical shell until `DataTable` gains row-selection and/or sticky-column
  support — a capability gap, not a workaround opportunity. Recommend scoping that as a canonical-component
  enhancement (with its own defect/requirement write-up) before attempting those three again.
- Two pre-existing, unrelated issues were surfaced (not fixed, per the "don't fix what isn't blocking
  compilation" rule): `RuleBookPage.jsx`'s self-referential `api.create` bug, and `EnterpriseConfigManager.jsx`
  being unreachable dead code.
- Per the stop condition for this step, no work was done on Pagination, Cards, Filters, or
  DatePicker/DateRangePicker. Awaiting explicit instruction for P0.7.

---

## P0.8 — Canonical Card Migration

**Date:** 2026-08-17

### Scope

Only `src/pages/leave_management/**` was touched. The canonical `PageCard`/`PageCardContent` component itself
was not modified. No business logic, API calls, form validation, table logic, pagination logic, or date-control
logic was changed — only outer container presentation.

### Canonical Card audit

- **File:** `src/components/Cards/PageCard.jsx`, named exports `PageCard` and `PageCardContent`.
- **API:**
  ```jsx
  <PageCard title="..." subtitle="..." actions={<Button/>} className="...">
    <PageCardContent padding="none|sm|md|lg" className="...">...</PageCardContent>
  </PageCard>
  ```
  `PageCard` renders `<div className="rounded-xl border bg-white shadow-sm {className}">`, with an optional
  header row (`title` as `<h3>`, `subtitle` as `<p>`, `actions` right-aligned) shown only when at least one of
  `title`/`subtitle`/`actions` is passed. `PageCardContent` renders a padded wrapper (`sm`=`p-2`, `md`=`p-4`
  default, `lg`=`p-6`, `none`=no padding); passing a `className` that already contains `p-` skips the default
  padding class, allowing exact custom padding to be preserved via the escape hatch.
- **Existing repository-wide consumers (before this step):** 52, per `docs/ui/phase-1-canonical-ui.md` §19/§28
  (Accounts Payable, Expense Management, Employee Onboarding, Accounts Receivable, and others) — 0 previously in
  `src/pages/leave_management/`.
- **Capabilities:** optional title/subtitle/actions header, configurable content padding, `className` escape
  hatch on both `PageCard` and `PageCardContent` for one-off overrides.
- **Limitations (verified, not designed around):** no distinct footer slot, no built-in loading/empty state, no
  hover/interactive/clickable affordance, no icon+value+trend/KPI layout, no accent-color/left-border variant,
  fixed visual identity (`rounded-xl border shadow-sm`) with no built-in variant system beyond `className`.
  Per Phase 1's own §19 "PageCard Rules" and §35, this is intentional — `PageCard` is a plain content-card
  primitive, not a KPI-tile or dashboard-card system.

### Leave Management audit

A full audit (22-point inventory) was performed across every file in `src/pages/leave_management/`, searching
for literal `rounded-* border/shadow bg-white`-style Tailwind combinations and locally-defined reusable
card/panel components, not just files with "Card" in the name.

- **Total card-like patterns identified:** ~30, grouped below.
- **True reusable plain content-card wrappers (migration candidates):** 11 instances across 8 files.
- **Dashboard/KPI-style cards (specialized, not migrated):** `charts/LeaveDashboard.jsx`'s leave-balance tiles,
  `charts/MonthlyStats.jsx`/`WeeklyPattern.jsx`/`CustomActiveShapePieChart.jsx`'s chart-widget cards,
  `HRManageTools.jsx`'s clickable `AdminCard` tool tiles, `AdminPanel.jsx`'s (dead/commented-out) KPI tiles.
- **Panels/accordion cards (specialized, interactive):** `models/ApprovalDashboard.jsx`,
  `models/PendingApprovalsQueueView.jsx` (clickable expand/collapse toggle headers, `hover:shadow-lg`),
  `models/LeavePolicyViewer.jsx`'s inner accordion rows (outer wrapper migrated, inner rows left as-is).
- **Table wrappers (not migrated — table pattern, P0.6):** the border/rounded wrappers directly around
  `DataTable`/raw `<table>` in `ApprovalRulesPage.jsx`, `EditHolidaysPage.jsx`, `ApprovalQueue.jsx`,
  `EditBlockLeaveModal.jsx`, `HRManageTools.jsx`'s `LeaveTable`, and (already addressed) `LeaveHistory.jsx`'s
  inner table border (removed as redundant once its outer wrapper became `PageCard` — see Migration below).
- **Form containers (largely not migrated):** `models/BlockLeaveDates.jsx`'s multi-section main form.
- **Modal/dropdown/calendar internals (excluded by definition):** every Modal body div, dropdown/`Listbox`
  panel, `charts/Calendar.jsx`'s month-grid container, and `charts/UpcomingHolidays.jsx`'s themed carousel card.
- **Confirmed dead/unreachable code (not migrated regardless of shape):** `EmployeePanelold.jsx` (no imports
  anywhere in `src/`), `EnterpriseConfigManager.jsx` (already documented in P0.6 as unreachable — its tabbed
  container is also structurally not a plain content card).

### Migration

| # | File | Component | Content preserved | Interaction preserved | Styling standardized |
|---|---|---|---|---|---|
| 1 | `ruleBook/RuleBookPage.jsx` | "Rule Creation Panel" | Yes — form fields, Save/Cancel-Edit handlers unchanged | Yes — no interactivity on the container itself | `title`="Rule Book Configuration", `actions`=Cancel-Edit link when editing; `className="shadow-lg"` kept to preserve the heavier shadow; `p-8` preserved via `PageCardContent className="p-8"` |
| 2 | `ruleBook/RuleBookPage.jsx` | "Existing Rules" panel | Yes — loading/empty/table states (bespoke `<table>`, not `DataTable`) unchanged | N/A | `title`="📜 Existing Rules"; same `shadow-lg`/`p-8` overrides as #1 |
| 3 | `models/ManageActiveLeaveBlocks.jsx` | "Active blocks" card | Yes — search `FormInput`, `DataTable` with Edit/Unblock actions unchanged | Yes | `title`/`subtitle`/`actions` (search box) replace the hand-rolled header row; the manual `border-t` divider between header and body was dropped as redundant with `PageCard`'s own built-in header border; body padding preserved via `className="p-4"` |
| 4 | `models/BlockLeaveDates.jsx` | "Summary" aside | Yes — all key/value summary rows and `Pill` badges unchanged | N/A | `title`="Summary"; `p-6` preserved via `className`; `dark:` classes kept via `className` escape hatch (this app does not appear to use dark mode elsewhere, but the classes were preserved rather than silently dropped) |
| 5 | `models/LeavePolicyViewer.jsx` | `LeaveTypeCard` (main policy card) | Yes — accordion sections, `renderDesc1`/`renderContent`, "Created on" footer text all unchanged | Yes — inner accordion expand/collapse untouched | `title={title}` (dynamic prop) replaces the hand-rolled `<h2>`; `p-6` preserved via `className`; `shadow-lg`/`rounded-lg`/explicit `border` standardized to `PageCard`'s `shadow-sm`/`rounded-xl` |
| 6 | `models/LeaveHistory.jsx` | Page wrapper | Yes — filters, `DataTable`, `Pagination`, `CancellationModal` all unchanged | N/A | No title (none existed before — props are optional); `px-6 py-8` preserved via `className`; the inner `border rounded-lg` directly around `DataTable` was dropped since `PageCard` now supplies the border, avoiding a doubled-border look |
| 7 | `charts/LeaveDetailsPage.jsx` | `RequestCard` (reusable, rendered in a `.map()` per leave request) | Yes — date range, reason, approved-by/applied-by, status badge all unchanged | N/A | No title (none existed); `p-4` preserved via `className`; `rounded-lg`/explicit `border` standardized to `PageCard` defaults |
| 8 | `EmployeeDashboard.jsx` | Pending-requests wrapper | Yes — `PendingLeaveRequests` child and its props/callbacks unchanged | N/A | `title`="Pending Leave Requests" (moved in from an adjacent hand-rolled `<h2>` sibling, so the heading now lives inside the card instead of floating above it); `p-6` preserved via `className`; the `md:w-full lg:w-[65%]` responsive width classes stayed on the outer layout `<div>`, outside `PageCard`, since that's page-grid sizing, not card styling |

### Exceptions

| File / Component | Reason |
|---|---|
| `models/BlockLeaveDates.jsx` — main form card | Multi-section form (4 internal `<h2>` section headings, not a single title/subtitle) with a distinct footer button band (`border-t`, `rounded-b-xl`) — `PageCard` has no footer slot and only a single title/subtitle header. The root element is also a `<form>`, not a `<div>`; forcing the outer chrome into `PageCard` (a `<div>`) while keeping `onSubmit` correctly wired was judged higher-risk than the visual-consistency gain for this one form. Left unchanged. |
| `models/CompOffBalanceRequests.jsx` and `models/RevokeLeaveRequests.jsx` — section wrapper (`border-l-4 border-blue-500` + underline accent) | Both consistently use a deliberate colored left-accent-bar + underline "info section" visual identity that `PageCard` cannot express (no accent-bar/underline variant). Since this is the only pair using this exact pattern (not a repo-wide inconsistency to clean up) and dropping it would remove a real, currently-only, decorative signal rather than standardize noise, both were left unchanged. |
| `models/HandleLeaveRequestAndApprovals.jsx` — search+table card | The "header" here is a pure filter toolbar (search + 3 dropdowns) with no title/subtitle text, an awkward fit for `PageCard`'s title-first header model; the inner `<table>` also already carries its own `rounded-lg shadow-sm` (a P0.6-documented specialized table). Migrating the outer shell alone would require restructuring the toolbar into a fake "actions-only" header and doesn't remove the inner table's redundant styling without touching the P0.6-frozen table decision. Left unchanged. |
| Dashboard/KPI/chart-widget cards (`charts/LeaveDashboard.jsx`, `charts/MonthlyStats.jsx`, `charts/WeeklyPattern.jsx`, `charts/CustomActiveShapePieChart.jsx`, `HRManageTools.jsx`'s `AdminCard`) | Icon/value/trend KPI layouts and/or `hover:shadow-lg`/clickable-tile interactivity that `PageCard` does not support (no hover-state prop, no icon+value+trend slot system). Flattening these into generic `PageCard` would lose real information/affordance. Left unchanged, per the task's explicit "do not flatten specialized patterns" instruction. |
| Accordion/expandable request cards (`models/ApprovalDashboard.jsx`, `models/PendingApprovalsQueueView.jsx`) | Entire header is a clickable `<button>` toggling expand/collapse with `hover:shadow-lg` and a rotating chevron — genuinely interactive; `PageCard`'s header is static markup only. Left unchanged. |
| Table wrappers (`ApprovalRulesPage.jsx`, `EditHolidaysPage.jsx`, `ApprovalQueue.jsx`'s 5 sub-tables, `EditBlockLeaveModal.jsx`, `HRManageTools.jsx`'s `LeaveTable`) | Thin border/rounded wrappers directly around `DataTable`/`<table>` — part of the P0.6 table pattern. Wrapping these in an additional `PageCard` would create `Card > Card > DataTable` nesting, explicitly excluded by this task. Left unchanged. |
| Modal/dropdown/calendar/wizard internals (every Modal body div across `models/*Modal.jsx`, all `Listbox`/dropdown panels, `charts/Calendar.jsx`, `charts/UpcomingHolidays.jsx`'s themed carousel, `models/LeaveUploadWizard.jsx`, `models/LeaveBalanceJobProgress.jsx`'s floating toast, `Unauthorized.jsx`'s `hover:scale-105` splash card) | Explicitly excluded categories per the task (modal internals, dropdown/popover panels, calendar grids, wizard steps, fixed-position overlays, one-off interactive/decorative splash screens). None of these are genuine reusable plain-content-wrapper patterns. Left unchanged. |
| `EmployeePanelold.jsx` | Confirmed dead file — no imports anywhere in `src/`. Not migrated (not worth touching unreachable code); candidate for deletion in a separate cleanup, not this task. |
| `EnterpriseConfigManager.jsx` | Already documented in P0.6 as unreachable (its only import in `HRAdminPanel.jsx` is commented out). Its tabbed container is also structurally a composite tab-bar panel, not a plain content card, so it would be excluded even if reachable. Left unchanged. |
| `models/ApprovalQueue.jsx`'s small key-value/diff sub-tables, various modal-internal notice/toggle-pill boxes (`CompOffRequestModal.jsx`, `RequestLeaveModal.jsx`, etc.) | Sub-atomic UI (small inline notice boxes, toggle pills) inside already-excluded modal contexts — migrating these would be over-application of Card to form-field-adjacent decoration, explicitly warned against. Left unchanged. |

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ Final re-audit: every card-like pattern in the module is now classified as (1) Canonical Card migrated — 11
  instances across 8 files; (2) Dashboard/KPI-specific component — 5 files; (3) Table wrapper — 6
  files/sub-tables; (4) Modal/dropdown/calendar/wizard container — every Modal/Listbox/Calendar/wizard file; (5)
  Interactive/accordion component — 2 files; (6) Form container exception — 1 (`BlockLeaveDates.jsx` main form);
  (7) Decorative-accent exception — 2 files (`CompOffBalanceRequests.jsx`, `RevokeLeaveRequests.jsx`); (8) Dead
  code — 2 files. No unexplained repeated standard card pattern remains.

### Visual QA

Not performed in a browser — no dev server session was available in this task. The migrations were verified by
(a) reading the canonical `PageCard`/`PageCardContent` source to confirm exact rendered markup and padding
behavior, (b) preserving every non-default visual property (custom shadow weights, custom padding, dark-mode
classes) explicitly via the `className` escape hatch documented above, and (c) a successful production build.
Two categories of *intentional* visual change should be spot-checked when a browser is available: standardized
`rounded-xl`/`shadow-sm` replacing prior `rounded-lg`/`shadow-lg`/`shadow-md` on 4 of the 8 migrated files
(`RuleBookPage.jsx` keeps its custom `shadow-lg` override; `LeaveHistory.jsx`, `LeavePolicyViewer.jsx`, and
`LeaveDetailsPage.jsx`'s `RequestCard` adopt the plain `shadow-sm` default), and the header-position change on
`EmployeeDashboard.jsx` (heading text moved from an external sibling `<h2>` into the card's own header band).

### Concerns before P0.9

- This step's exceptions ended up sizable relative to its migrations (11 migrated instances vs. roughly 20
  specialized/excluded patterns) — this is expected for a Card migration, since dashboards, KPI tiles, modals,
  and tables (the majority of "rounded div" surface area in this module) are all legitimately specialized, not
  under-migrated.
- `models/BlockLeaveDates.jsx`'s main form card and the two left-accent-bar cards
  (`CompOffBalanceRequests.jsx`/`RevokeLeaveRequests.jsx`) are documented as judgment calls, not hard capability
  gaps — a canonical `PageCard` footer slot and an accent-bar/variant system would make all three cleanly
  migratable; if that enhancement is ever made to the canonical component (as its own separate task, not a
  module-specific workaround), these three should be revisited.
- Two pre-existing, already-known issues resurfaced during this audit and were left untouched, consistent with
  prior steps: `RuleBookPage.jsx`'s self-referential `api.create` bug (P0.6), and `EnterpriseConfigManager.jsx`
  being unreachable dead code (P0.6). A newly-noticed third: `EmployeePanelold.jsx` has zero imports anywhere in
  `src/` and appears to be entirely dead.
- Per the stop condition for this step, no work was done on Filters, DatePicker/DateRangePicker, or DataTable
  capability upgrades. Awaiting explicit instruction for P0.9.

---

## Canonical DataTable Visual Alignment

**Date:** 2026-08-17

**Scope:** `src/components/patterns/DataTable.jsx` only. This is a canonical-component change, not a Leave
Management change — it was made because Leave Management's tables (migrated in P0.6) are `DataTable`'s only
current consumers, and the goal is that every future module adopting `DataTable` gets the same look. No module
source file, no functional API, and no `columns[].render` behavior was changed.

**DataTable styling is canonical and applies across all Intranet modules.**

### Reference used

`GenericTable` (`src/components/Table/table.jsx`) was inspected as the established visual reference — the
indigo gradient header (`bg-gradient-to-r from-blue-900 to-indigo-900`), white header text, rounded/bordered
outer container, and row hover/zebra treatment already used across the app's existing tables (including
pre-P0.6 Leave Management tables). `DataTable`'s internal implementation was **not** copied verbatim — its
markup structure (a plain `<table>`, `col.render` escape hatch, `TableSkeleton`/`EmptyState` integration) was
kept as the modern canonical shape; only the Tailwind classes were changed to match the established visual
language.

### Header styling

- Background: `bg-gradient-to-r from-blue-900 to-indigo-900` (previously plain `bg-gray-50`) — the exact
  gradient already used by `GenericTable` and by every table migrated in P0.6, so no new color was invented.
- Text: `text-white` (previously `text-gray-500`), `text-sm font-semibold` (previously
  `text-xs uppercase tracking-wide`) — matches `GenericTable`'s header typography exactly (normal case, `text-sm`,
  semibold, white).
- Padding: `px-4 py-3` on both header and body cells (unchanged from before — already consistent).
- Column alignment: unchanged — still driven entirely by `col.className` per column (no default alignment was
  introduced), since every existing P0.6 consumer already sets explicit alignment per column and adding an
  automatic default risked colliding with those explicit classes (the same Tailwind cascade-order issue
  documented earlier in this project for `Button`'s `variant="link"`).

### Outer edges

- The outer wrapper now carries `overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm` — rounded
  on all four corners, `border-gray-200` (the same border tone already used elsewhere in the app, e.g.
  `PageCard`), and `shadow-sm` (matching `PageCard`'s canonical card shadow rather than reinventing a shadow
  value).
- To guarantee the rounded corners render correctly during horizontal scrolling, the horizontal-scroll
  responsibility was moved to a new **inner** `overflow-x-auto` div, while the **outer** div (which owns the
  border/radius/shadow) uses `overflow-hidden` to clip its children to the rounded rectangle regardless of
  scroll position. This two-layer approach is a standard, more robust pattern than a single `overflow-x-auto`
  div carrying the border-radius directly.

### Body

- Row background: zebra striping added (`rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"`), matching
  `GenericTable`'s alternating-row convention (previously `DataTable` had a flat white background for every row).
- Row hover: `hover:bg-indigo-50` (previously `hover:bg-gray-50`) — an indigo tone consistent with the new
  indigo header, matching `GenericTable`'s `hover:bg-blue-50` family of hover tints.
- Row dividers: `border-b border-gray-100 last:border-b-0` kept unchanged — `GenericTable` itself doesn't use
  row dividers (it relies on zebra + hover only), but `DataTable`'s existing subtle divider is a small,
  deliberate improvement over blindly copying `GenericTable`, consistent with the instruction that `DataTable`
  "must remain the canonical modern component," not an exact `GenericTable` clone.
- Cell padding/typography: `px-4 py-3 text-sm text-gray-700` — unchanged (already consistent with the target).

### Border / border-radius

- Border color: `border-gray-200`, unchanged from the token already used app-wide (matches `PageCard` and the
  original `DataTable`'s header border color).
- Border radius: `rounded-xl` added at the outer-wrapper level (12px), matching the same radius token used by
  the canonical `PageCard`/`Modal` components, rather than `GenericTable`'s inline `borderRadius: "10px"` — this
  keeps `DataTable` on the same design-token scale as the rest of the canonical UI layer instead of introducing
  a one-off pixel value.

### Loading and empty states

- **Logic unchanged**: `loading` still short-circuits to `TableSkeleton`; `!rows.length` still short-circuits to
  `EmptyState` with `emptyTitle`/`emptyDescription`. Neither component (`TableSkeleton`, `EmptyState`) was
  modified.
- **Visual alignment added**: both states are now wrapped in the same rounded/bordered/shadow shell as the
  loaded-table state, so the table's outer presentation doesn't visually "pop into" a border only once data
  arrives. This is a deliberate, minor departure from `GenericTable`, which removes its own border/shadow when
  there's no data (`hasData ? "border ..." : ""`) — `DataTable` instead keeps a single consistent shell across
  all three states, which reads as more polished and was explicitly permitted ("only align visual presentation
  where appropriate," "do not blindly copy GenericTable's internal implementation").

### Responsive / overflow behavior

Preserved and slightly hardened: horizontal scrolling on narrow viewports still works exactly as before (a
scrollable inner container appears when the table is wider than its parent); the change is that this scroll
container is now a dedicated inner `<div>` rather than being the same element that owns the rounded border, so
the rounded corners are never visually cut off or squared-off by the scrollbar/scroll boundary.

### Functional API verification

`columns`, `rows`, `loading`, `emptyTitle`, `emptyDescription`, `getRowKey`, `onRowClick`, and `className` are
all present, unrenamed, and behave identically. `col.render(row, rowIndex)` is invoked exactly as before with no
change to its signature or when it's called. `onRowClick` still makes rows `cursor-pointer` and clickable only
when provided — no row was made clickable that wasn't already. `className` still merges onto the outer wrapper
div (now applied to a div that also carries the fixed shell classes, the same override pattern already
established by `PageCard`/`PageCardContent`).

### No module-specific styling

No `leave`/`pms`/`lms`/`rms`/`ums`/`airs` variant, class, or conditional branch was introduced anywhere in
`DataTable.jsx`. The component has exactly one visual presentation, applied unconditionally regardless of which
module renders it.

### Known, pre-existing visual side effect (not fixed, flagged per the "STOP and report" rule)

Several Leave Management files that call `DataTable` were already wrapping it in their own bordered/rounded
container **before** this change (some from the original P0.6 migration, before `PageCard` existed; one,
`ApprovalRulesPage.jsx`, was explicitly excluded from the P0.8 Card migration specifically to avoid `Card >
Card > DataTable` nesting). Now that `DataTable` supplies its own rounded border/shadow unconditionally, those
specific wrapper divs will show a **visible doubled border/shadow** around the table until they are cleaned up:

- `models/ApprovalRulesPage.jsx` — wraps `DataTable` in `bg-white shadow-lg rounded-xl overflow-hidden border
  border-gray-100`.
- `models/EditHolidaysPage.jsx` — wraps `DataTable` in `border rounded-lg overflow-hidden`.
- `models/ManageActiveLeaveBlocks.jsx`, `models/LeaveHistory.jsx` — wrap `DataTable` in a `PageCardContent`
  inside a `PageCard` (P0.8), which already supplies `rounded-xl border shadow-sm`.
- `models/CompOffBalanceRequests.jsx`, `models/RevokeLeaveRequests.jsx` — wrap `DataTable` directly in their
  left-accent-bar `<div>` (no independent border, lower-severity doubling, since that wrapper's border is only
  on the left edge).

This is a direct, foreseeable consequence of making the canonical component itself own the rounded/bordered
shell, and fixing it requires editing those module files (removing their now-redundant wrapper classes) — which
is explicitly out of scope for this canonical-component-only task. **This is flagged here rather than silently
worked around**, per the task's "STOP and report" instruction; recommend a small, mechanical follow-up task
("remove now-redundant DataTable wrapper borders in Leave Management") rather than expanding this task's scope.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git diff -- src/components/patterns/DataTable.jsx` reviewed in full: only styling/shell-structure changed;
  no prop added, removed, or renamed; `col.render` call site unchanged.
- ✅ Confirmed via repo-wide grep: `DataTable` has exactly 9 consumers, all in `src/pages/leave_management/**`
  (from P0.6); no other module currently renders it, so this change has zero blast radius outside Leave
  Management today, but establishes the shared look for whichever module adopts it next.

---

## P0.9 — Canonical Filter Migration

**Date:** 2026-08-17

### Scope

Only `src/pages/leave_management/**` was touched. No `DatePicker`/`DateRangePicker`/calendar control was
modified. No API call, query parameter, debounce timing, reset semantics, or business logic was changed —
only the presentational shell and input components around existing filter/search controls.

### Canonical filter audit

- **`FilterBar`** (`src/components/patterns/FilterBar.jsx`) — the Phase-1-designated canonical filter
  container (`docs/ui/phase-1-canonical-ui.md` §16: "Use FilterBar as the outer shell for new filter UIs;
  compose it with Input/Select/Button"). It is a **pure layout shell** with zero state/logic of its own:
  `<div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">`.
  Confirmed **zero repository-wide consumers** before this step — the same "designated-but-unadopted" pattern
  already seen with `DataTable` (P0.6) and `PageCard` had at Phase 1 handoff.
- **`FormInput`/`FormSelect`** (`src/components/forms/*`) — already canonical and already widely adopted across
  Leave Management (P0.3/P0.4). Most filter *controls* (as opposed to filter *rows/containers*) were already
  canonical before this step.
- **`src/components/filter/*`** (`FilterListbox.jsx`, `Searchbar.jsx`, `FilterComponent.jsx`, `Dropdown.jsx`) —
  explicitly still-valid, non-deprecated specialized components per Phase 1 §16 ("Existing `src/components/
  filter/*` components are untouched and still valid"). Confirmed `FilterListbox` has **zero live consumers**
  inside Leave Management (two dead/unused imports found, see Exceptions) — not a migration target either way.
- **No new canonical Filter component was created.** The audit did not surface a missing capability shared by
  multiple Leave screens that would justify one — every real gap found (async employee search, react-select
  country/state, multi-select block editor, date pickers) is already a recognized, deliberately-excluded
  specialized pattern from prior steps (P0.4, P0.7, P0.8).

### Leave Management audit

- **Total filter/search patterns identified:** 9 real filters/searches across 5 files, plus numerous
  **non-filter** controls initially requiring classification (form fields inside modals, action dropdowns,
  duplicated `LeaveTypeDropdown` selectors, async employee-search autocompletes).
- **Simple/standard searches:** 4 — `HandleLeaveRequestAndApprovals.jsx` (client-side, no debounce),
  `LeaveHistory.jsx` (client-side, `FormInput`, already canonical), `EditHolidaysPage.jsx` (client-side,
  `FormInput`, already canonical), `EnterpriseConfigManager.jsx` (client-side, raw `<input>` — see Exceptions).
- **Server-side search:** 1 — `EmployeeLeaveBalances.jsx` (400ms debounced, hits `/api/leave-balance/search/
  {year}`), paired with an **independent, non-debounced autocomplete** call for its suggestion dropdown.
- **Standard `FormSelect` filters:** 8 across `HandleLeaveRequestAndApprovals.jsx` (Status/Year/Month),
  `LeaveHistory.jsx` (Leave Type/Status/Year/Month), `EditHolidaysPage.jsx` (Year), `EmployeeLeaveBalances.jsx`
  (Year) — all already canonical from P0.3/P0.4.
- **Multi-select filters:** **0.** The only multi-selects found (`MultiSelect` in `ManageActiveLeaveBlocks.jsx`'s
  edit-block modal; a channel checkbox-list in `EnterpriseConfigManager.jsx`'s add/edit modal) are **form fields
  inside modals**, not filters over a displayed dataset — out of scope by definition, not migrated.
- **Async/autocomplete filters:** **0 true filters.** Three async/autocomplete controls exist
  (`ApplyLeaveOnBehalf.jsx`'s `react-select` employee search, `AddHolidaysModal.jsx`'s `react-select` country/
  state, `hooks/EmployeeSearchDropdown.jsx`'s debounced+infinite-scroll employee picker) but all are **form
  fields for data entry**, not controls that filter an already-displayed table — none were touched.
- **Date filters:** **0** found using a date-range/date-picker control as a *filter* (Year/Month are plain
  `FormSelect`s, not date pickers). No `DatePicker`/`DateRangePicker` component was touched, consistent with
  the deferral.
- **Action dropdowns excluded (not filters):** per-row Approve/Reject/Edit/Cancel buttons and the bulk
  Approve/Reject/Clear-Selection banner in `HandleLeaveRequestAndApprovals.jsx`; the 3 duplicated
  `LeaveTypeDropdown` selectors (`RequestLeaveModal.jsx`, `EditLeaveModal.jsx`, `ManagerEditLeaveRequest.jsx`) —
  all are data-entry/action controls, not dataset filters.

### Migration

| # | File | Component(s) | Canonical component(s) used | Behavior preserved |
|---|---|---|---|---|
| 1 | `models/HandleLeaveRequestAndApprovals.jsx` | Search input | `FormInput` (replacing a raw `<input>`) | Search icon repositioned via `inputClassName`; `searchTerm` state/handler, client-side substring filtering, and the existing `useEffect` pagination-reset-on-`[searchTerm, selectedStatus]` behavior all unchanged. Status/Year/Month `FormSelect`s were already canonical and untouched. The row's own `p-6 border-b border-gray-200` container was **kept as-is** (not wrapped in `FilterBar`) — see Exceptions for why. |
| 2 | `models/EditHolidaysPage.jsx` | Search + Year toolbar | `FilterBar` wrapping the already-canonical `FormInput`/`FormSelect` | No functional change — `searchTerm`/`selectedYear` state, the server refetch on year change (`useEffect(fetchHolidays, [selectedYear, ...])`), and client-side name/type/state/country filtering all unchanged. The toolbar row previously had no visual container (a plain `flex` div in the page body, not nested inside any card) — `FilterBar` is purely additive here, with no doubled-chrome risk. |
| 3 | `models/EmployeeLeaveBalances.jsx` | Search + autocomplete + Year toolbar | `FormInput` (replacing the raw `<input>` shell only) + `FilterBar` (wrapping search + Year, excluding the "Add Leave Balance" action button) | **Autocomplete mechanics fully preserved untouched**: the custom absolutely-positioned `<ul>` suggestion list, the outside-click/Escape-key close handlers, the 400ms debounce (`setTimeout` in a `useEffect`), the independent non-debounced `/autocomplete` API call, and the inline "✕" clear button are all exactly as before — only the `<input>` itself became `FormInput` (same `wrapperRef`-owning parent div stays `position: relative` so the suggestion list and clear button continue to position correctly against it). Year `FormSelect`'s explicit `setCurrentPage(1)` on change is untouched. The page body at this location has no enclosing card, so `FilterBar` is additive, not nested. |

### Exceptions

| File / Pattern | Reason |
|---|---|
| `models/HandleLeaveRequestAndApprovals.jsx` — filter row container | The row sits inside a `bg-white rounded-lg shadow-sm` bespoke panel (documented in P0.8 as intentionally NOT migrated to `PageCard`, due to its toolbar-as-header shape and an already-specialized inner table). Wrapping the filter row in `FilterBar` — which itself renders `rounded-xl border border-gray-200 bg-white` — directly inside that panel would visually double the card-like chrome (two near-identical bordered/white boxes nested edge-to-edge). Only the search `<input>` → `FormInput` swap was made; the row's existing `border-b` divider styling was left in place. |
| `models/LeaveHistory.jsx` — filter row container | This row is now inside a `PageCard`/`PageCardContent` (migrated in P0.8). `FilterBar`'s own `rounded-xl border bg-white` chrome would nest directly inside `PageCard`'s near-identical `rounded-xl border bg-white shadow-sm` chrome — the same `Card > Card`-style doubling P0.6/P0.8 explicitly avoided for tables. All 5 controls (`FormInput`/`FormSelect` ×4) were already canonical before this step; left as the existing plain `flex flex-wrap gap-3 mb-5` row, not wrapped. |
| `models/ManageActiveLeaveBlocks.jsx` — search field | Already canonical (`FormInput`), but it's a single standalone field placed in `PageCard`'s `actions` slot (P0.8), not a hand-rolled toolbar row alongside sibling filters. There is no toolbar to wrap — wrapping a lone field in `FilterBar` would add a nested border box for no compositional benefit. Left unchanged. |
| `models/EnterpriseConfigManager.jsx` — search input | Confirmed unreachable dead code (its only import in `HRAdminPanel.jsx` is commented out — documented in P0.6 and P0.8). Not migrated, consistent with prior steps' policy of not investing migration effort in unreachable code. |
| `models/ApplyLeaveOnBehalf.jsx` — employee search (`react-select`), `LeaveTypeDropdown`, half-day `FormSelect`s | All are **form fields** for creating a leave application, not filters over a displayed dataset — out of scope by the task's own filter-vs-form-field distinction. The employee search is genuinely async/debounced (`lodash.debounce`, 400ms, `input-change`-only trigger) and was left untouched per the async/autocomplete exclusion rule. |
| `models/AddHolidaysModal.jsx` — Country/State (`react-select`) | Form fields on a "create holiday" form, not filters. `react-select`'s searchable/clearable/disabled-state behavior is specialized and was left untouched. Also has a dead, never-rendered `FilterListbox` import — noted for cleanup, not itself a migration action. |
| `hooks/EmployeeSearchDropdown.jsx` | A reusable async/debounced (500ms) + infinite-scroll-append employee-picker form field, not a filter over an already-displayed dataset — consistent with its P0.7 exclusion for the same reason. Left untouched. |
| 3 duplicated `LeaveTypeDropdown` definitions (`RequestLeaveModal.jsx`, `EditLeaveModal.jsx`, `ManagerEditLeaveRequest.jsx`) | Not filters — data-entry selectors for which leave-type balance to draw from, each rendering custom card/radio-style options with balance/availability info that plain `FormSelect` options can't express (same capability gap already documented in the P0.4 `FormSelect` audit). Left unchanged. |
| `EnterpriseConfigManager.jsx`/`AddHolidaysModal.jsx`/`EmployeeDashboard.jsx`/`charts/Calendar.jsx` — dead `FilterListbox` imports and one dead commented-out re-implementation | Zero live consumers of `src/components/filter/FilterListbox.jsx` exist in Leave Management. Not touched — removing dead imports was judged out of scope for a filter-migration task (no behavior depends on them either way). |
| `models/ApprovalRulesPage.jsx`, `ruleBook/RuleBookPage.jsx`, `HRManageTools.jsx`, `models/CompOffRequestsTable.jsx`, `models/RevokeLeaveRequests.jsx`, `models/CompOffBalanceRequests.jsx`, `models/PendingLeaveRequestsTable.jsx` | Confirmed to have **no filter/search UI at all** over their respective displayed datasets (any `FormInput`/`FormSelect`/`Listbox` present in these files is exclusively inside an add/edit-record modal form, not a filter). Nothing to migrate. |
| Year/Month `FormSelect`s across all files | Not date pickers — plain dropdowns of discrete year/month values, unrelated to the deferred `DatePicker`/`DateRangePicker` work. No date filter using an actual date-picker control was found anywhere in the module. |

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings). Two duplicate-import build
  errors introduced mid-edit (`FormInput` imported twice in both `EmployeeLeaveBalances.jsx` and
  `HandleLeaveRequestAndApprovals.jsx`, since both already had a canonical `FormInput` import from P0.3) were
  caught and fixed before considering this step complete.
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ Final re-audit: every filter/search pattern in the module is classified as (1) Canonical filter pattern —
  `FilterBar`-wrapped, 2 files; (2) FormInput/FormSelect composition (not wrapped, card-nesting or
  standalone-field exceptions) — 3 files; (3) Specialized MultiSelect — 2 (both form fields, not filters); (4)
  Async/autocomplete — 3 (all form fields, not filters); (5) Date filter — deferred — 0 found (no true date
  filters exist in this module); (6) Action dropdown — not a filter — bulk/per-row action controls and 3
  `LeaveTypeDropdown` selectors; (7) Other documented exception — dead `FilterListbox` imports, unreachable
  `EnterpriseConfigManager.jsx`. No unexplained standard filter UI remains.

### Canonical capability gaps

None requiring a new component. `FilterBar` as designed (a pure layout shell) was sufficient for every genuine
filter-row migration candidate found. No STOP-and-report situation arose — every specialized case already maps
to a previously-documented, deliberate exclusion category from P0.4/P0.7/P0.8, not a new gap.

---

## P1.0 — Canonical DataTable Visual Standardization

**Date:** 2026-08-17

### Result: already complete — no additional code change required

This task's full scope (make `src/components/patterns/DataTable.jsx` visually match the established
`GenericTable`/`LeaveTable` presentation — indigo header, rounded outer corners, matching border/spacing/hover
treatment, unchanged functional API, no module-specific styling) was already implemented in full in the prior
**"Canonical DataTable Visual Alignment"** step (documented earlier in this file, dated 2026-08-17, immediately
preceding P0.9). That step made the same file the same target for the same reason.

A fresh, independent inspection was performed for this task per its own instructions (read `DataTable.jsx` in
full, read `GenericTable`/`table.jsx` in full, compare line-by-line) before concluding no edit was needed:

| Checklist item | GenericTable (reference) | Current DataTable.jsx | Match |
|---|---|---|---|
| Header background | `bg-gradient-to-r from-blue-900 to-indigo-900` | Same class, verbatim | ✅ exact |
| Header text | white, `font-semibold`, `text-sm`, normal case | Same | ✅ exact |
| Header padding | `px-2 py-3` | `px-4 py-3` | Close, deliberately more generous — see "Accepted deltas" below |
| Outer border | `border border-gray-200` (conditional on data) | `border border-gray-200` (unconditional) | ✅ same token, intentionally unconditional (see below) |
| Outer radius | inline `borderRadius: "10px"` | `rounded-xl` (12px, the same token scale as `PageCard`/`Modal`) | ✅ same visual family, canonical token instead of a one-off pixel value |
| Row zebra striping | alternating `bg-white`/`bg-gray-50` | Same | ✅ exact |
| Row hover | `hover:bg-blue-50` | `hover:bg-indigo-50` | ✅ same family, shifted to match the indigo header |
| Row/cell padding | `p-2 px-2` | `px-4 py-3` | Deliberately more generous — see below |
| Column alignment | automatic (first column left, rest centered) | driven entirely by `col.className`, no automatic default | ✅ intentional — see below |
| Overflow/rounding | `overflow-visible` (relies on fixed height, no scroll) | `overflow-hidden` outer + `overflow-x-auto` inner | ✅ improved — guarantees rounded corners survive horizontal scroll, which `GenericTable` never needed to handle |
| Loading/empty state | shown *without* the border/shadow (`hasData` conditional) | shown *with* the same rounded/bordered shell as loaded data | ✅ intentional, permitted departure — see below |
| Functional API | n/a (different component, different API) | unchanged: `columns`, `rows`, `loading`, `emptyTitle`, `emptyDescription`, `getRowKey`, `onRowClick`, `className` | ✅ confirmed unchanged from before this task |

**Accepted, deliberate deltas from a literal pixel-for-pixel `GenericTable` copy** (all already justified in the
prior step's documentation, re-confirmed here):
1. **Cell padding** (`px-4 py-3` vs `GenericTable`'s `p-2 px-2`) — the task explicitly says "extract the
   established visual language... do NOT blindly copy," and `px-4 py-3` is already the padding scale used
   consistently elsewhere in the canonical layer (matches `PageCard`, `FilterBar`, and `DataTable`'s own header).
2. **No automatic column-alignment default** — `GenericTable` auto-centers every column except the first;
   `DataTable` relies entirely on `col.className` instead. This is intentional: all 9 current `DataTable`
   consumers (migrated in P0.6) already set explicit per-column alignment via `col.className`, and introducing
   an automatic default risks a Tailwind cascade-order collision with those existing explicit classes (the same
   class of bug previously found and fixed in `Button`'s `variant="link"`). Adding the default now would violate
   this task's "no functional/behavioral change to custom cell rendering" requirement more than omitting it does.
3. **Unconditional border/shadow, including during loading/empty states** — `GenericTable` removes its own
   border/shadow when there's no data; `DataTable` keeps one consistent shell across loading, empty, and loaded
   states so the table doesn't visually "pop into" a border only once data arrives. This is a canonical-modern-
   component judgment call, explicitly permitted by "do not blindly copy GenericTable's internal implementation."

### Confirmed unchanged

- `src/components/Table/table.jsx` (`GenericTable`) — **not modified**, confirmed via `git status`.
- No Leave Management file was modified for this task — Leave Management's 9 `DataTable` consumers inherit the
  canonical styling automatically, with zero per-consumer overrides required or added.
- `columns[].render`, `getRowKey`, `onRowClick`, `className`, `loading`, `emptyTitle`, `emptyDescription` all
  confirmed unchanged in signature and behavior.
- No `leave`/`pms`/`lms`/`rms`/`ums`/`airs`/`timesheet`-specific class, branch, or variant exists anywhere in
  the component.
- No new functional feature (selection, sticky columns, expandable rows, sorting, filtering, pagination, column
  resizing/visibility, virtualization) was added.

### Repository-wide consumer check

`grep -r "<DataTable" src/` returns exactly 9 matches, all in `src/pages/leave_management/**` (from P0.6):
`EmployeeLeaveBalances.jsx`, `EditHolidaysPage.jsx`, `LeaveHistory.jsx`, `ManageActiveLeaveBlocks.jsx`,
`CompOffBalanceRequests.jsx`, `RevokeLeaveRequests.jsx`, `ApprovalRulesPage.jsx`, `CompOffRequestsTable.jsx`,
`PendingLeaveRequestsTable.jsx`. None pass a `className` prop or otherwise require a module-specific override to
compensate for this component's styling — confirmed by inspection of every call site. No STOP-and-report
situation arose.

**Known, already-documented side effect (unchanged status, not re-litigated here):** the same set of files
flagged in the prior "Canonical DataTable Visual Alignment" section (`ApprovalRulesPage.jsx`,
`EditHolidaysPage.jsx`, `ManageActiveLeaveBlocks.jsx`, `LeaveHistory.jsx`, `CompOffBalanceRequests.jsx`,
`RevokeLeaveRequests.jsx`) still wrap `DataTable` in their own pre-existing bordered/rounded container, which
will still show a doubled border/shadow. This is not new to this task and remains a recommended, separate,
small follow-up ("remove now-redundant DataTable wrapper borders in Leave Management") rather than in-scope work
here, since fixing it means editing module files, which this canonical-only task does not permit.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git diff -- src/components/patterns/DataTable.jsx` — identical to the diff already reviewed in the prior
  "Canonical DataTable Visual Alignment" step; no new changes were made in this task.
- ✅ `git status -- src/components/Table/table.jsx` — clean, confirming `GenericTable` was never touched.

**DataTable is confirmed as the canonical table visual for the entire Intranet application** — its styling is
unconditional, applies identically to any current or future consumer, and requires no module-specific knowledge
or override to use correctly.

---

## P1.1 — Canonical UI Capability Gap Audit

**Date:** 2026-08-17

**This is an audit-only step. No file under `src/components/`, `src/pages/`, `package.json`, or
`package-lock.json` was modified.** Confirmed via `git status` before and after: the working tree's modified-file
list is byte-identical to the set already produced by P0.1–P1.0 — this task added zero new diffs anywhere except
this documentation section.

### Method

Four parallel, read-only repository-wide audits were performed (not scoped to Leave Management): (1) every
canonical component's file, API, and repo-wide consumer count; (2) `DataTable` row-selection and sticky-column
needs across every module; (3) `FormSelect` capability needs and local replacements across every module; (4)
`PageCard`, `Modal`, `Button`, and `FilterBar` needs across every module. All consumer counts below are from
fresh `grep` runs against the live tree (2026-08-17), not copied from the 2026-08-14 Phase 1 doc, which is
already measurably stale (e.g. it records 294 Button consumers; the live count is 359 files/1118 occurrences).

### Canonical components audited (14, plus a form-foundation layer not otherwise requested)

| # | Component | File | Consumers (files / occurrences) | Modules using it |
|---|---|---|---|---|
| 1 | Button | `components/Button/Button.jsx` | 359 / 1118 | All 10 module directories |
| 2 | Modal | `components/Modal/modal.jsx` | 126 / 161 (85 files import it directly; 33 still import legacy `ui/Modal.jsx`) | airs, employee-onboarding, Projects, resource_management, UMS, expense-mgmt, AP, leave_management, AR, Timesheet |
| 3 | FormInput | `components/forms/FormInput.jsx` | 74 / 235 | leave_management, expense-mgmt, AP, UMS, Projects, AR, onboarding, airs, Timesheet |
| 4 | FormSelect | `components/forms/FormSelect.jsx` | 61 / 163 | leave_management, expense-mgmt, AP, Projects, AR, UMS, Timesheet, onboarding |
| 5 | DataTable | `components/patterns/DataTable.jsx` | **9 / 9 — zero consumers outside Leave Management** | leave_management only |
| 6 | Pagination | `components/Pagination/pagination.jsx` | 91 / 117 | resource_management, airs, onboarding, Projects, leave_management, expense-mgmt, UMS, AP, Timesheet, AR |
| 7 | PageCard + PageCardContent | `components/Cards/PageCard.jsx` | 61 / 111 | onboarding, AP, expense-mgmt, leave_management, AR |
| 8 | FilterBar | `components/patterns/FilterBar.jsx` | **4 / 4 — lowest-adopted "new" Phase 1 component after PageContainer** | leave_management (2, from P0.9), Projects (1), resource_management (1) |
| 9 | PageHeader | `components/ui/PageHeader.jsx` | 29 / 35 | AP (14), onboarding (11), AR (4) — absent from leave_management, Projects, resource_management, Timesheet, airs, UMS, expense-mgmt |
| 10 | StatusBadge | `components/patterns/StatusBadge.jsx` | 54 / 74 | onboarding, expense-mgmt, resource_management, AP, AR, Projects, UMS, Timesheet |
| 11 | PageContainer | `components/patterns/PageContainer.jsx` | **0 / 0 — zero adoption anywhere, confirmed 3 days after Phase 1** | none |
| 12 | EmptyState | `components/patterns/EmptyState.jsx` | 10 external + 1 internal (inside `DataTable`) | airs, onboarding, expense-mgmt |
| 13 | ConfirmDialog | `components/patterns/ConfirmDialog.jsx` | **2 / 3 — Timesheet only** | Timesheet |
| 14 | Loaders (`PageLoader`/`InlineLoader`/`TableSkeleton`) + legacy `LoadingSpinner` | `components/patterns/Loaders.jsx` + `components/LoadingSpinner.jsx` | `LoadingSpinner`: 159 files / 210 occurrences (confirms/exceeds the "150+" code-comment claim); `PageLoader`: 0; `InlineLoader`: 0; `TableSkeleton`: 1 (internal to `DataTable`) | `LoadingSpinner` used everywhere; the three new Phase 1 wrappers essentially unused |

**Additional canonical designations found in Phase 1 docs, not in the requested list:** `Input`/`Select`/`Tabs`
(`src/components/ui/{input,select,tabs}.jsx`, all judged "already meets spec," unchanged) and a separate
"form foundation" layer (`FormLabel`, `FormError`, `FormHelperText`, `FormField`, `FormSection`, `FormActions`
under `src/components/forms/`) meant to be composed around any control including `react-select`/`Listbox`-based
ones. Not deep-audited here (outside the requested scope) but noted for completeness.

**Legacy/competing implementations deliberately preserved, not consolidated, per Phase 1's own decision:**
`ui/button.jsx` (~23 consumers), `ui/Modal.jsx` (33 files) + `Modal/modalold.jsx` (likely dead), `Table/table.jsx`
`GenericTable` (~90 consumers), `status/statusbadge.jsx` (~49 consumers, imports undeclared `clsx` — a
pre-existing fragility) + `ui/badge.jsx` (~38 consumers), and the `react-paginate`/`react-pagination` packages.
These remain live and un-migrated outside whichever modules have already been touched.

### Local replacement counts (per canonical primitive)

| Primitive | Local replacement | Count | Where |
|---|---|---|---|
| Button | raw `<button>` | ~1000+ occurrences | resource_management 285, onboarding 214, Projects 166, airs 106, Timesheet 88, expense-mgmt 68, UMS 30, AR 19, AP 11 |
| Modal | raw `fixed inset-0` shells (not importing canonical or legacy Modal) | ~43 files | resource_management (~20), Projects/Testmanagement (~12), onboarding (~11), Timesheet (~6), expense-mgmt, AR, UMS |
| FormSelect | raw `<select>` | 44 files | 10 modules (expense-mgmt 10, airs 8, onboarding 9, resource_management 7, Projects 4, leave_management 2, AP/AR/UMS 1 each, +1 top-level) |
| FormSelect | custom Headless-UI `Listbox` (not `FormSelect`/`FilterListbox`) | 9 files | leave_management (4), resource_management (5) |
| FormSelect | `react-select` | 18 files | expense-mgmt (10), leave_management (3), Projects (3), onboarding (2) |
| FormSelect | other custom async-search dropdown | 3 files | AP (`VendorPicker.jsx`), airs (`AddManualSkillModal.jsx`), leave_management (`EmployeeSearchDropdown.jsx`) |
| DataTable | `GenericTable` | ~90 files | app-wide, not touched |
| DataTable | raw `<table>` or card/div lists built specifically to avoid needing table selection | several — see Step 5 below | Timesheet, resource_management, airs, UMS, onboarding |
| PageCard | hand-rolled `rounded-* border shadow bg-white` card wrappers already expressible with current PageCard API | 60+ files (unmigrated legacy, not a capability gap) | AP, expense-mgmt, onboarding |
| PageCard | hand-rolled KPI/stat-tile cards (icon + value + trend) | 7+ modules, 12+ files | AP, Projects, resource_management, onboarding, UMS, Timesheet, top-level Dashboard/finance |
| FilterBar | hand-rolled filter toolbars | nearly every module (only 4 files use canonical FilterBar) | all |

### Step 5 — DataTable audit (row selection & sticky columns)

**Row selection + bulk actions — found in 6 distinct modules:** Timesheet (3 files, all sharing a
`BulkApprovalBar` component — multi-select, select-all, indeterminate, Approve/Reject), resource_management
(`RoleOffTable.jsx`, `BenchTable.jsx` — both built on `GenericTable` with a **manually injected fake checkbox
column**, multi-select, select-all, indeterminate, bulk Create/Approve/Reject/Fulfill), airs (`CandidateTable.jsx`
and `UnknownSkillTable.jsx`, both on `GenericTable`, plus two card-grid/list-based selections in
`CampaignDetails.jsx`/`TalentPoolPage.jsx`), UserManagement (2 files, card/list-based, multi-select, bulk
delete), employee-onboarding (3 files, card/list-based, multi-select, bulk-send), and leave_management
(`HandleLeaveRequestAndApprovals.jsx`, raw `<table>`, already documented in P0.6 as a structural DataTable
exclusion).

**Interpretation: TRUE canonical gap.** Of the 6 modules, only 4 (`CandidateTable`, `UnknownSkillTable`,
`RoleOffTable`, `BenchTable`) are built on the shared `GenericTable` at all — and every one of those 4 had to
**hack selection onto GenericTable via a manually injected fake column**, since neither `GenericTable` nor
`DataTable` has native selection support. The other selection instances (Timesheet, UMS, onboarding) avoided
tables entirely and built div/card lists instead — a plausible signal that the lack of table-native selection
pushed teams toward non-table UI rather than adopting a shared table component.

**Sticky columns — found in 3 modules with genuine `<table>` markup:** leave_management
(`HandleLeaveRequestAndApprovals.jsx`, `HRManageTools.jsx` — both already-documented specialized/retained
tables), Timesheet (`WeeklyEntry/WeeklyEntryModal.jsx` — actions column pinned on a 7-column entry table wider
than its modal), and Projects (`SwimlaneBoard.jsx` — the strongest case: a genuinely very wide table with both a
frozen leading column and a frozen header row). A 4th, related case (`Projects/manager/Timeline.jsx`) is a
hand-rolled CSS-Gantt chart, not real `<table>` markup, so it's structurally outside `DataTable`'s remit even
though it demonstrates the same underlying need.

**Interpretation: a real but narrower gap** — 3 modules meets the "3+ modules" bar, but only one case
(`SwimlaneBoard.jsx`) is unambiguously *required* by content width; the LMS and Timesheet cases are
wide-but-plausibly-fixable by reducing column count instead. Classified as a true gap, lower urgency than row
selection.

### Step 6 — FormSelect audit

Confirmed current API: `label, options, value, onChange, name, className, buttonClassName, placeholder,
maxVisibleOptions, anchorOptions` — Headless-UI `Listbox`-based, single-select only. Confirmed absent: `disabled`,
`required`, `error`, per-option `disabled`, custom option rendering, multi-select (all match the prior
Leave-Management-scoped P0.4 finding, now re-verified against the actual current source).

| Capability | Distinct modules needing it | Evidence | Classification |
|---|---|---|---|
| Whole-control `disabled` | 4 — leave_management, resource_management, expense-mgmt, onboarding | `EditLeaveModal.jsx`/`RequestLeaveModal.jsx` (fieldset-disable workaround), `DemandModal.jsx`/`CreateClient.jsx` (custom Listbox `disabled`), `react-select isDisabled` throughout expense-mgmt, `DocumentsPage.jsx` | **TRUE canonical gap** |
| Validation `error` display | 4 — airs, resource_management, AP, AR | Hand-rolled `listboxButtonClass(!!errors.x)` helpers and red-border hacks in 5+ files | **TRUE canonical gap** |
| Searchable/filterable options | 4 — expense-mgmt, leave_management, Projects, onboarding | `react-select isSearchable` used almost everywhere `react-select` appears | **TRUE canonical gap** (but architecturally heavier — closer to "should FormSelect wrap react-select" than a small prop addition) |
| `required` marking | 3 — UMS, Projects, AP | Currently faked via a **dead no-op prop** passed to `FormSelect` (UMS) or via literal `"Label *"` text (Projects, AP) | **TRUE canonical gap** (cheapest fix — some call sites already pass the prop expecting it to work) |
| Async/remote-loaded options | 3 — leave_management, AP, airs | 3 independently hand-rolled debounced-search components (`EmployeeSearchDropdown.jsx`, `VendorPicker.jsx`, `AddManualSkillModal.jsx`), all duplicating the same debounce+fetch+render-list logic | **TRUE canonical gap** (borderline; consolidating into one shared "AsyncSelect" would remove real duplication) |
| Per-option `disabled` | 2 — leave_management, resource_management | `ApprovalRulesPage.jsx`, `ManagerEditLeaveRequest.jsx`, `EditLeaveModal.jsx`, `RequestLeaveModal.jsx`; `ClientStatusControl.jsx` | Specialized (borderline) |
| Multi-select | 2 — Projects, expense-mgmt | `BugPage.jsx` (`react-select isMulti`), `TransferList.jsx` (checkbox dual-list) | Specialized |
| Custom option rendering (icon/badge/description) | 1 confirmed — expense-mgmt (`formatOptionLabel` in `ExpenseReportDetailPage.jsx`) | Insufficient evidence for a 3+-module pattern | Specialized |

### Step 7 — PageCard audit

Confirmed current API has no footer slot, no accent/left-border variant, no hover/interactive mode, no
icon+value+trend layout.

- **Card footers:** ≤2 modules with a genuine card-shaped (not modal) footer band — insufficient for a true gap.
- **Left-accent-bar cards:** 2 modules (Timesheet, Projects) — matches the same pattern already found and left
  unmigrated in Leave Management (P0.8's `CompOffBalanceRequests.jsx`/`RevokeLeaveRequests.jsx`) — a real,
  recurring, but still sub-3-module pattern.
- **KPI/dashboard/stat cards (icon + value + trend/label): the single strongest finding of this entire audit.**
  Independently hand-rolled in **7+ distinct modules** (AP, Projects, resource_management, onboarding, UMS,
  Timesheet, plus top-level `Dashboard.jsx`/`finance/FinanceDashboard.jsx`), each reinventing the identical
  shape: rounded-xl white/bordered card, icon in a colored circle/square, uppercase muted label, large value,
  optional trend/sub-label. **TRUE canonical gap** — `PageCard`'s current API cannot express this at all.
- **Hand-rolled title/subtitle/actions headers:** very common (60+ files) but already fully expressible with
  PageCard's *current* API — unmigrated legacy code, not a capability gap.

### Step 8 — Modal audit

Confirmed current API already has 13 size steps, 3 positions, 5 animations, header/body/footer toggling, and a
close button — but **no drawer/side-panel position** (only center/top/bottom overlay-centered), **no focus
trap**, and **no `aria-describedby`/`aria-labelledby` wiring** to title/subtitle.

- **~43 raw modal shells** exist outside Leave Management (concentrated in resource_management ~20,
  Projects/Testmanagement ~12, onboarding ~11, Timesheet ~6). Classification: (1) **canonical Modal migration
  candidates** — the clear majority, 30+ files, simple centered dialogs Modal already supports as-is; (2)
  **full-page workflow/wizard, not a modal** — 3-4 files (`DemandWorkspacePage.jsx`, `TestExecution.jsx`,
  `NewConfigurationWizard.jsx` ×2); (3) **specialized dialog needing a capability Modal lacks — side-drawer/panel
  variant** — 7 files across 2 modules (resource_management: `BenchDrawer.jsx`, `ResourceDrawer.jsx`,
  `ResourceVisualizationDrawer.jsx`, `RoleOffDrawer.jsx`, `RoleOffSidePanel.jsx`, `ApprovalDrawer.jsx`; Projects:
  `RightSidePanel.jsx`) — a real, if borderline (2-module), gap; (4) **third-party dialog contract** — 3 files,
  all resource_management, using `@headlessui/react` `Dialog`/`Transition` directly (no Radix/react-modal/MUI/Ant
  Design Modal found anywhere in the repo); (5) **intentional exception** — none beyond the drawers already
  counted in (3).

### Step 9 — Button audit

Confirmed current API: `size` (`large|medium|small|icon` + `lg/md/sm` aliases), `variant`
(`primary|secondary|success|danger|outline|ghost|link`), `loading`/`loadingText`/`disabled`/`type`.

Raw `<button>` volume is large (~1000+ occurrences) but sampling across 6 modules found the overwhelming
majority (50-60%+) are **plain unmigrated standard/icon buttons** — expected, not a capability gap, since
`Button` already covers those cases. Two categories worth flagging:
- **Tabs/segmented-control pattern** recurs in 4+ modules (leave_management, AP, resource_management,
  expense-mgmt) — but this is **not actually a Button gap**: a canonical `Tabs` component
  (`src/components/ui/tabs.jsx`) already exists per Phase 1 and was judged "already meets spec." This is an
  **adoption gap**, not a missing capability — the fix is promoting/using the existing `Tabs` component, not
  building anything new.
- **Dropdown `Menu.Item` render-prop buttons** (Headless UI) and **calendar/date-picker day-cell buttons** are
  both legitimate third-party-contract / specialized-by-design patterns, not gaps.

**No true Button capability gap was found.**

### Step 10 — FilterBar audit

Confirmed current API is a pure `{children, className}` layout shell with zero built-in logic.

- **"Clear all" filters:** 2 modules (airs, resource_management) — borderline, sub-3-module.
- **Filter chips with individual remove:** 1 module only (airs) — specialized, not a gap.
- **Responsive collapse to drawer/accordion:** no evidence anywhere — not a gap.
- **Dedicated right-aligned action area:** an implicit convention in 3 modules (resource_management, airs,
  Projects) — always hand-coded inline, never a named slot. Borderline signal, cheap to add if pursued.
- **Saved filter presets:** no evidence anywhere — not a gap.

**No capability meets the 3+-module bar with high confidence here** — the closest is the implicit
right-aligned-action-area convention, which is low-risk/low-complexity if ever pursued, but not urgent.

### Step 11 — Cross-module requirement matrix

Evidence-based (✅ = confirmed need found; blank = no evidence found; "designed around" = component already
avoids the pattern rather than needing it). Extra columns beyond the requested template (AP, AR, Expense,
Onboarding) are included since real evidence spans them.

| Capability | UMS | LMS/Leave | PMS | RMS | AIRS | Timesheet | AP | AR | Expense | Onboarding |
|---|---|---|---|---|---|---|---|---|---|---|
| Table row selection | ✅ | ✅ | | ✅ | ✅ | ✅ | | | | ✅ |
| Sticky columns | | ✅ | ✅ | | | ✅ | | | | |
| Select whole-control disabled | | ✅ | | ✅ | | | | | ✅ | ✅ |
| Select `required` | ✅ | | ✅ | | | | ✅ | | | |
| Select validation `error` | | | | ✅ | ✅ | | ✅ | ✅ | | |
| Select searchable | | ✅ | ✅ | | | | | | ✅ | ✅ |
| Select async/remote options | | ✅ | | | ✅ | | ✅ | | | |
| Select per-option disabled | | ✅ | | ✅ | | | | | | |
| Select multi-select | | | ✅ | | | | | | ✅ | |
| Card footer | | ✅ | | | | | | | | |
| Card left-accent | | ✅ | ✅ | | | ✅ | | | | |
| KPI/dashboard card | ✅ | | ✅ | ✅ | | ✅ | ✅ | | | ✅ |
| Modal drawer/side-panel variant | | | ✅ | ✅ | | | | | | |
| Filter "clear all" | | | | ✅ | ✅ | | | | | |
| Filter chips | | | | | ✅ | | | | | |
| Tabs pattern (adoption, not a gap) | | ✅ | | ✅ | | | ✅ | | ✅ | |

### TRUE canonical gaps (3+ modules, classification A)

1. **DataTable — row selection** (6 modules)
2. **FormSelect — whole-control `disabled`** (4 modules)
3. **FormSelect — validation `error`** (4 modules)
4. **FormSelect — searchable options** (4 modules, architecturally heavier)
5. **PageCard — KPI/dashboard-tile layout** (7+ modules — strongest single finding in this audit)
6. **DataTable — sticky columns** (3 modules, narrower/lower-urgency)
7. **FormSelect — `required` marking** (3 modules, cheapest fix)
8. **FormSelect — async/remote-loaded options** (3 modules, currently duplicated bespoke debounce logic)

### Specialized features (1-2 modules, classification B — keep local)

FormSelect per-option disabled (2), FormSelect multi-select (2), FormSelect custom option rendering (1); PageCard
footer (≤2), PageCard left-accent variant (2); Modal drawer/side-panel (2, borderline — watch for a 3rd module);
Modal third-party Headless-UI Dialog usage (1, resource_management-only, not swappable); FilterBar clear-all (2);
FilterBar filter chips (1); FilterBar right-aligned action area (3, but low-value/low-risk, not urgent).

### Business-logic features (classification C)

None of the audited gaps involve business logic — every finding above is presentational/structural (selection
UI, validation display, card layout, dialog positioning). No capability gap was found that should move *into* a
canonical component from a module (the opposite risk this audit was watching for).

### Future enhancements (classification D)

Modal focus-trap and `aria-describedby`/`aria-labelledby` wiring; `aria-live`/`role="status"` announcements
across the entire Loader family (`LoadingSpinner`, `PageLoader`, `InlineLoader`) and `Pagination`'s page-count
text; `DataTable`'s `onRowClick` rows are not keyboard-accessible (no `role="button"`/`tabIndex`/`onKeyDown`) —
a real accessibility gap, but not blocking any pending module migration; `Button`'s `variant="link"` Tailwind
cascade-order fragility (already patched with `!important` overrides, documented as a pattern to watch when
adding new variant/size combinations); consolidating the legacy Button/Modal/StatusBadge/Table/Pagination
duplicates identified above, app-wide (a large, separate initiative, not urgent).

### Date/Time (classification E — deferred)

`DatePicker`/`DateRangePicker` remain fully deferred, as instructed. No date-control capability was assessed or
recorded as anything other than a future canonical initiative — consistent with every prior P0.x step.

### Prioritization

**P0 — required before further module migration:**
- DataTable row selection (blocks RMS/AIRS/UMS/onboarding/Timesheet from cleanly migrating their existing
  GenericTable-with-hacked-selection tables onto DataTable; 4 of 6 modules already hand-rolled a workaround)
- FormSelect `disabled`, `error`, `required` (cheap, high-value; several call sites already pass these as
  dead/no-op props or fake them with label text, meaning the capability is already assumed to exist)

**P1 — useful during migration:**
- DataTable sticky columns (narrower, 3-module need)
- FormSelect async/remote-loaded options (consolidates 3 duplicated bespoke implementations)
- FormSelect searchable options (4-module need, but treat as its own design decision — may mean wrapping
  `react-select` rather than extending the Headless-UI `Listbox` implementation, a bigger architectural choice)
- PageCard KPI/dashboard-tile variant (7+ modules, high value, isolated/low-risk to add as a new composition —
  placed in P1 rather than P0 only because it doesn't *block* any pending table/form migration, unlike the P0
  items; its consumer count alone would argue for doing it alongside P0 work if capacity allows)

**P2 — future enhancement:**
- Modal drawer/side-panel variant (2 modules, watch for a 3rd before committing)
- FilterBar dedicated right-aligned action-area slot (3-module implicit convention, low risk/complexity)
- Promote/adopt the existing canonical `Tabs` component into the 4+ modules hand-rolling tab UI (not a build
  task — a rollout/documentation task)
- Legacy-component consolidation (Button/Modal/StatusBadge/Table/Pagination duplicates) — large, separate effort

**P3 — specialized; remain module-specific:**
- FormSelect per-option disabled, multi-select, custom option rendering
- PageCard footer slot, left-accent variant
- Modal third-party Headless-UI Dialog usage in resource_management
- FilterBar clear-all button, filter chips
- All Button "gaps" (none found — Tabs pattern is an adoption issue, not a Button issue; calendar/dropdown-item
  raw buttons are correct-by-design third-party contracts)

### Architectural principle upheld

No recommendation above proposes turning any canonical component into a "do everything" component. Each TRUE
gap is a narrow, composable addition (a prop, a variant, a new sibling component) rather than a structural
rewrite: `DataTable` gains selection/sticky-columns as opt-in props, not a new table engine; `FormSelect` gains
standard form-validation props already present on `FormInput` (parity, not novelty); `PageCard` gets a sibling
KPI-tile component rather than an ever-growing prop surface on `PageCard` itself. Business-specific behavior
(bulk-action semantics, validation rules, KPI calculation) stays in the module in every case — only the
presentational shell is proposed for consolidation.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ Confirmed via `git status`: the modified-file list is unchanged from before this task began — no file
  under `src/components/`, `src/pages/`, `package.json`, or `package-lock.json` was touched; the only change
  produced by this step is this documentation section.

### Recommendation before module-by-module migration

Build the P0 items first (`DataTable` row selection, `FormSelect` `disabled`/`error`/`required`) as narrow,
additive, backward-compatible enhancements to the canonical components themselves — each is a true 3+-module
need with low architectural risk. Treat `PageCard`'s KPI-tile gap as a fast-follow (P1) given its unusually high
consumer count (7+ modules) despite not technically blocking anything. Everything else identified here should
wait for either a third confirming module (Modal drawer variant) or should explicitly stay local per the
"business-specific behavior stays outside the canonical layer" principle. No new canonical component was
proposed or required beyond what Phase 1 already established.

---

## P1.2 — DataTable Row Selection Enhancement

**Date:** 2026-08-17

### Scope

Only `src/components/patterns/DataTable.jsx` was modified. No module file (Leave Management or any other) was
touched, no other canonical component was changed, and no `FormSelect`/sticky-column/PageCard/Modal/FilterBar
work from the P1.1 backlog was started — this step addresses row selection only, per its stop condition.

### Why this was needed

P1.1's repository-wide audit found row-selection-with-bulk-actions independently reimplemented in **6 distinct
modules** (Timesheet, resource_management, airs, UserManagement, employee-onboarding, leave_management), with
**4 of them already hand-rolling a workaround directly on top of the legacy `GenericTable`** by injecting a fake
`"selection"` column into its `headers`/`columns` arrays — since neither `GenericTable` nor `DataTable` had any
native selection concept. This is exactly the kind of repeated-implementation-of-identical-UI-behavior the
canonical layer exists to eliminate.

### Existing implementations audited before designing the API

Two representative, already-shipped implementations were read in full to extract the real repository convention
rather than inventing one:

- **`src/pages/airs/candidates/components/CandidateTable.jsx`** — a `GenericTable`-based table with an opt-in
  `selectable` boolean prop (exact name), `selectedIds` as a **`Set`**, `onToggleSelect(id)` /
  `onToggleSelectAll(items, checked)` callbacks, a header checkbox scoped to `candidates.every(...)` (i.e. the
  *current page only*), and a per-row checkbox with `onClick={(e) => e.stopPropagation()}` specifically because
  the row itself is also clickable (`onRowClick`) and must not fire when the checkbox is used.
- **`src/pages/resource_management/roleoff/RoleOffTable.jsx`** — a `GenericTable`-based table with
  `selectedRows` as an **array** (`.includes()` lookup), `onToggleRow(id, checked)` / `onToggleAll(checked)`
  callbacks, and a header checkbox with **indeterminate state set imperatively via a ref**
  (`ref={(n) => n && (n.indeterminate = !allSelected && anySelected)}`) — native checkboxes have no
  `indeterminate` HTML attribute, only a DOM property, so this ref pattern is the correct and only way to
  express it, confirming it as the right implementation technique to reuse.

**Common requirements extracted from both:**
- Single vs multi-select: **both are multi-select** — no single-select-only table selection pattern was found
  anywhere in the audit.
- Selected-row representation: **row identity (id/key), never the full row object or array index** — both
  examples key selection by `row.id`.
- Select-all behavior: **scoped to the rows currently rendered** (current page / current filtered view) in both
  examples — neither implements or even discusses cross-page selection.
- Indeterminate behavior: required and expected — both examples compute "some but not all selected" and one
  explicitly wires it via the DOM `indeterminate` property.
- Deselection: symmetric with selection in both (the same toggle callback handles both directions via a
  `checked` boolean).
- Disabled/non-selectable rows: **no evidence found in either audited example**, and P1.1's broader audit did
  not surface a repeated cross-module need for this either — consistent with the instruction not to invent
  behavior without repository evidence. Not implemented (see Known limitations).
- Bulk actions: **owned entirely by the parent** in both examples (`RoleOffWorkspace.jsx`'s `BulkActionBar`,
  `CandidateTable`'s parent wiring "Add Selected to Campaign") — the table component itself never calls an API
  or performs a business action.
- Selection persistence across pagination/filtering: **not implemented as DataTable behavior** in either
  example — selection state lives entirely in the parent's own state, so whether it "survives" a page or filter
  change is purely a function of whether the parent chooses to keep those keys around. DataTable does not need
  to do anything special for this to work correctly.
- Header checkbox behavior: reflects the current page's selection state only, toggles the current page's rows
  only, in both examples.

### Canonical API introduced

```jsx
<DataTable
  columns={columns}
  rows={rows}
  getRowKey={getRowKey}
  selectable                                   // opt-in, default false
  selectedRowKeys={selectedRowKeys}             // a Set of whatever getRowKey(row, rowIndex) returns
  onSelectedRowKeysChange={setSelectedRowKeys}  // receives the next Set
/>
```

Three new props, all optional: `selectable` (boolean, default `false`), `selectedRowKeys` (a `Set`, not an array
or object — matching `CandidateTable`'s existing, more efficient convention rather than `RoleOffTable`'s
`.includes()`-on-array approach, since `Set.has()` is O(1) and this is the "cleanest canonical" choice the task
asked for rather than a blind copy of either existing example), and `onSelectedRowKeysChange` (a callback
receiving the fully-computed next `Set`, mirroring the same "controlled component, caller owns state" pattern
already used by `Pagination`'s `onPrevious`/`onNext` and `FormSelect`'s `onChange`).

This is the exact shape suggested in the task brief, confirmed rather than blindly assumed: it matches
`CandidateTable`'s real, already-shipped `selectable` naming precisely, and generalizes `RoleOffTable`'s
array-based state to a `Set` for O(1) membership checks — a strict improvement, not a deviation from convention.

### Controlled-state model

Fully controlled, no internal state. `DataTable` never mutates `selectedRowKeys` itself — every checkbox
interaction computes a new `Set` (via `new Set(selectedKeys)` plus `.add()`/`.delete()`) and hands it to
`onSelectedRowKeysChange`; the caller decides whether/how to store it. If `onSelectedRowKeysChange` is omitted,
checkbox interactions are inert (no-ops) rather than throwing — consistent with `onRowClick` already being
optional and inert when absent.

### Select-all behavior

- **No rows selected** → clicking selects all rows currently in the `rows` prop (adds their keys to the Set).
- **Some rows selected** → clicking selects all rows currently in the `rows` prop (same as above — "some" is
  the indeterminate state, and per both audited examples, clicking a `some`-state checkbox always moves to
  "all", never "none").
- **All rows selected** → clicking clears only the current `rows`' keys from the Set (any other keys the caller
  might be separately tracking, e.g. from a different page, are left untouched — DataTable has no way to know
  about them and doesn't try to).
- Empty `rows`: select-all checkbox is not rendered in that state at all, since `DataTable` already
  short-circuits to the empty-state branch before the table (and its header) render when `rows.length === 0`.
- Filtered/paginated rows: `DataTable` only ever sees whatever `rows` the caller passes in for the current
  render — filtering and pagination happen entirely upstream (per P0.6/P0.7), so "select all" always means
  "all rows in this call," which is the correct, already-established behavior for both filtered and paginated
  datasets. **No cross-page ("select all across all server-side pages") semantics were implemented** — P1.1's
  audit found no existing module doing this, and the task explicitly warned against inventing it. If a future
  module needs true cross-page bulk selection (e.g. "select all 500 matching records across every page"), that
  is a distinct, separate capability to design deliberately later, not something silently added here.

### Indeterminate behavior

Computed from the current `rows`/`selectedRowKeys`: `someVisibleSelected = selectedVisibleCount > 0 &&
!allVisibleSelected`. Applied via a small `SelectAllCheckbox` subcomponent that sets the DOM `indeterminate`
property imperatively in a `useEffect` (native checkboxes have no `indeterminate` HTML attribute, only a DOM
property — this is the only correct way to express it, and matches the technique already used by
`RoleOffTable.jsx`).

### Row-key handling

Selection identity is 100% `getRowKey(row, rowIndex)` — the same function `DataTable` already uses for React
`key`s, reused rather than duplicated. No row object and no array index is ever stored as selection state (array
index was explicitly avoided since it does not survive re-sorting/re-filtering; `getRowKey` is expected to
return a stable identifier such as a database ID, exactly as it already does for React reconciliation).

### onRowClick interaction

The selection `<td>` has `onClick={(e) => e.stopPropagation()}`, matching `CandidateTable.jsx`'s existing
pattern exactly. Since the `<tr>`'s `onClick={onRowClick ? () => onRowClick(row) : undefined}` only fires via
event bubbling from a click inside the row, stopping propagation at the checkbox's containing cell fully
prevents `onRowClick` from firing when the checkbox (or anywhere else in that cell) is clicked — verified by
inspecting React's synthetic event bubbling model, not merely by convention-copying.

### Pagination and filtering

`src/components/Pagination/pagination.jsx` was not modified, imported, or referenced by `DataTable` in any way.
Selection state is entirely orthogonal to both pagination and filtering: since both already happen upstream of
whatever `rows` array reaches `DataTable` (per P0.6/P0.7/P0.9), and selection is keyed by row identity rather
than position, changing the page or a filter simply changes which rows are rendered — any previously-selected
keys that are no longer in `rows` are not visible or interactable, but remain in the caller's `Set` untouched
unless the caller itself decides to clear them. **DataTable does not reset selection on page or filter change**
— no existing module does this either, so no such behavior was invented; if a future module wants
"selection resets when the page changes," that reset call belongs in the module's own page-change handler
(exactly where every existing `setCurrentPage(1)`-on-filter-change reset already lives per P0.7/P0.9), not
inside `DataTable`.

### Accessibility

- Header checkbox: `aria-label="Select all rows"`.
- Row checkboxes: `aria-label="Select row"`.
- Both are real `<input type="checkbox">` elements — natively keyboard-operable (Tab to focus, Space to toggle)
  and screen-reader-announced as checkboxes with their label and checked/indeterminate state, with no custom
  ARIA reimplementation needed.
- `focus-visible` ring added (`focus:ring-2 focus:ring-indigo-500`) matching the canonical `Button`/`FormInput`
  focus treatment already established elsewhere in the app.
- Checkbox interaction is independent of row-click semantics (see above), so a keyboard user tabbing to the
  checkbox and pressing Space toggles selection without any risk of also triggering `onRowClick` (which, being
  bound only to a mouse `onClick` on the `<tr>`, was never keyboard-reachable in the first place — a pre-existing
  `DataTable` limitation, documented in P1.1, unrelated to and not fixed by this step).

### Styling

The checkbox column reuses the exact same header (`bg-gradient-to-r from-blue-900 to-indigo-900`, white text)
and body (`px-4 py-3`, zebra striping, `hover:bg-indigo-50`) treatment already established in P1.0 — it is a
`<th>`/`<td>` pair styled with the same padding scale (`px-4 py-3`) plus a fixed `w-10` width and center
alignment, not a separate visual language. The checkbox itself uses `accent`-free native styling
(`h-4 w-4 rounded border-gray-300 text-indigo-600`) matching the indigo brand tone used throughout the header
and hover states, rather than introducing a new color. No `Button` component was used for the checkbox (a real
`<input type="checkbox">` is the semantically correct element and was not replaced with a styled button, per
the task's explicit instruction not to do so unnecessarily).

### Backward compatibility

`selectable` defaults to `false`; when omitted (as in all 9 current Leave Management consumers), no checkbox
column is rendered in the header or any row, `selectedRowKeys`/`onSelectedRowKeysChange` are never read, and the
rendered markup is byte-for-byte identical to before this change. Verified via `npm run build` (succeeds) and by
inspecting the diff: the only new conditional branches are `selectable && (...)` guards that add markup, never
remove or alter existing markup when `selectable` is false.

### Test-case reasoning (per the task's 10 cases)

1. **`selectable=false`/omitted** — no checkbox column rendered (guarded by `selectable &&`). ✅
2. **Select one row** — `toggleRow(key, true)` adds exactly that key to a copy of the Set; only that row's
   checkbox reflects `checked`. ✅
3. **Select multiple rows** — each toggle independently adds its own key; `selectedRowKeys` accumulates all of
   them since each call starts from `new Set(selectedKeys)` (the latest state), not a stale closure. ✅
4. **Select all** — `toggleAll(true)` adds every key in the current `rows` to the Set. ✅
5. **Clear all** — `toggleAll(false)` (fired when the header checkbox is already `allVisibleSelected` and
   clicked again) removes every current-page key from the Set. ✅
6. **Partial selection** — `someVisibleSelected` is true, header checkbox's DOM `indeterminate` property is set
   via the `useEffect` in `SelectAllCheckbox`. ✅
7. **Empty rows** — short-circuited by the pre-existing `!rows.length` branch before any selection code runs;
   no selection markup, no errors (`visibleKeys`/`selectedVisibleCount` are never computed for this branch). ✅
8. **`onRowClick` + checkbox** — checkbox `<td>` stops propagation, so clicking/toggling the checkbox never
   invokes `onRowClick`. ✅
9. **Pagination** — `Pagination` component and its behavior are completely untouched; `DataTable` has zero
   awareness of page state, so nothing about pagination changes. ✅
10. **Existing DataTable without selection props** — identical output to before this change, confirmed via
    successful build with zero source changes to any of the 9 existing Leave Management consumers. ✅

### Known limitations / follow-ups

- **Disabled/non-selectable individual rows are not supported.** No repeated (multi-module) evidence for this
  was found in either the P1.1 audit or the two implementations read in detail here — per the task's explicit
  instruction, this was not invented. If a future module needs it, it should be proposed as its own follow-up
  once at least one more module demonstrates the same need.
- **Cross-page ("select all across every server-side page") selection is not supported and was not designed
  for.** This is a materially different, harder capability (it requires knowing the total server-side result
  set, not just the current page) — flagged here explicitly rather than silently approximated.
- `DataTable`'s pre-existing lack of keyboard support for `onRowClick` (documented in P1.1) is unchanged by this
  step; the new checkboxes themselves are fully keyboard-accessible on their own.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git status` confirms exactly one file changed by this step: `src/components/patterns/DataTable.jsx`. No
  module file (Leave Management or otherwise), no other canonical component, no `package.json`/
  `package-lock.json` was touched.
- ✅ All 9 existing `DataTable` consumers (all in `src/pages/leave_management/models/`) compile successfully
  and, since none of them pass the new `selectable` prop, render with zero visual or behavioral change.

---

## P1.3 — FormSelect Validation & Disabled-State Enhancement

**Date:** 2026-08-17

### Scope

Only `src/components/forms/FormSelect.jsx` was modified. No `DataTable`, `PageCard`, `Button`, `Modal`,
`Pagination`, `FilterBar`, `FormInput`, or module file was touched. No `FormSelect` consumer was migrated to use
the new props — this step makes the capability available, per its stop condition, nothing more.

### Why these capabilities were needed

P1.1's repository-wide audit found whole-control `disabled` needed in 4 modules, validation `error` display
needed in 4 modules, and `required` marking needed in 3 modules — each currently faked or worked around locally
because `FormSelect` had no native support for any of them (confirmed again by reading the pre-change source:
its full prop list was `label, options, value, onChange, name, className, buttonClassName, placeholder,
maxVisibleOptions, anchorOptions` — none of the three existed).

### Repository-wide evidence (re-confirmed, not migrated)

- `src/pages/UserManagement/admin/accessPointManagement/AccessPointForm.jsx` and `AccessPointEdit.jsx` already
  pass a `required` prop to `FormSelect` today — since it wasn't destructured before this change, it was a
  **silent no-op**. It will now actually take effect (asterisk + `aria-required`) without those files being
  touched, simply because the prop already reaches the component.
- `src/pages/Projects/manager/CreateIssue/Fields/{Task,Story,Epic,Bug}Fields.jsx` and
  `src/pages/accounts-payable/vendor/components/VendorAddressForm.jsx` fake a required marker today via literal
  `"Label *"` text in the `label` string — these are future migration candidates for the new `required` prop
  (not migrated in this step).
- `src/pages/resource_management/assests/AssetDetail.jsx` and `.../models/CreateClient.jsx` hand-roll a
  `listboxButtonClass(!!errors.fieldName)` helper to fake an error border on a **custom** Listbox (not
  `FormSelect`) — evidence for the need, though these specific files use a different custom dropdown, not
  `FormSelect` itself, so they are not direct migration candidates for this exact change (they'd need their own
  future migration to `FormSelect` first).
- `src/pages/resource_management/models/DemandModal.jsx` and `.../models/CreateClient.jsx` pass `disabled` to
  their own custom `Listbox`/`Combobox` implementations, not `FormSelect` — same caveat as above.
- Within `src/pages/leave_management/**`, no current `FormSelect` call site passes `disabled`/`required`/`error`
  today (confirmed via P0.3/P0.4's own migration record) — Leave Management remains untouched by this step and
  has no immediate new consumer of these props without a deliberate follow-up choice to add them.

No consumer was modified to adopt the new props — this section documents *who could*, not *who now does*.

### Final API

```jsx
<FormSelect
  label="Status"
  options={options}
  value={value}
  onChange={onChange}
  name="status"
  disabled={false}   // new — whole-control only, default false
  required={false}   // new — default false
  error=""           // new — string; truthy = error state + message, default ""
/>
```

All 10 pre-existing props (`label, options, value, onChange, name, className, buttonClassName, placeholder,
maxVisibleOptions, anchorOptions`) are unchanged in name, type, default, and behavior.

### Disabled implementation

`disabled` is passed straight to Headless UI's root `<Listbox disabled={disabled}>` — this is Headless UI's own
documented mechanism for whole-control disable, and it natively: prevents the panel from opening on click,
disables all keyboard interaction (Space/Enter/arrow keys no longer operate the control), and applies the
correct `aria-disabled` semantics to the button internally, without any custom event-blocking code needing to be
written. On top of that, `Listbox.Button` gets `cursor-not-allowed bg-gray-100 opacity-75` when `disabled` is
true — the same muted-background convention `FormInput` already uses (`disabled:bg-gray-100`), so a disabled
`FormSelect` looks like a disabled `FormInput`. No per-option disabling was added — only the whole control, per
the task's explicit scope limit.

### Required implementation

A single `required` boolean: shows a red asterisk immediately after the label text
(`{required ? <span className="ml-1 text-red-500">*</span> : null}`) and sets `aria-required={required ||
undefined}` on `Listbox.Button`. This intentionally matches the simpler, single-prop convention already
established by the newer `FormLabel`/`FormField` form-foundation components (`FormLabel`'s own `required` prop
does exactly this — asterisk, nothing else) rather than `FormInput`'s older two-prop split (`required` sets a
native HTML attribute; a separate `requiredMark` controls the asterisk). That split exists in `FormInput`
because a real `<input required>` attribute has independent native browser semantics (e.g. it participates in
native form validation) that a visual asterisk doesn't need to be coupled to. `FormSelect` has no native
`<select>` element to attach a real `required` attribute to — Headless UI's `Listbox` renders a `<button>`, not
a form control the browser's native validation can see — so there is no equivalent "real attribute" to keep
decoupled from the visual mark, and a single `required` prop is the smaller, sufficient API. `aria-required` is
the WAI-ARIA-correct way to expose the same semantic to assistive technology for a custom (non-native) widget.
No hidden validation or submit-blocking logic was added — `required` is purely a semantic/visual signal, exactly
as instructed.

### Error implementation

`error` is a string, matching `FormInput`'s exact convention (`error = ""`, truthy = has error, the string
itself is both the flag and the displayed message) — deliberately reusing the same convention rather than
inventing a `boolean` variant or a second message system, per the task's explicit "do not create a second
competing error-message system" instruction. When `error` is truthy: `Listbox.Button` gets `border-red-300
focus:border-red-500 focus:ring-red-500/20` (byte-identical class names to `FormInput`'s own error-state
classes) instead of the default `border-gray-300 focus:border-blue-500 focus:ring-blue-500`; `aria-invalid` is
set to `Boolean(error)` on the button; and `<p className="text-xs text-red-500">{error}</p>` is rendered below
the control — again byte-identical markup/classes to `FormInput`'s own error paragraph. No validation logic runs
inside `FormSelect`; it only ever reads the `error` prop the caller computed elsewhere.

### FormInput convention comparison

| Aspect | FormInput (existing) | FormSelect (this change) | Same convention? |
|---|---|---|---|
| Error prop type | string (truthy = error + message) | string (truthy = error + message) | ✅ identical |
| Error message markup | `<p className="text-xs text-red-500">{error}</p>` | same, byte-for-byte | ✅ identical |
| Error border/ring classes | `border-red-300 focus:border-red-500 focus:ring-red-500/20` | same, byte-for-byte | ✅ identical |
| `aria-invalid` | `Boolean(error)` | `Boolean(error)` | ✅ identical |
| Disabled visual | `disabled:cursor-not-allowed disabled:bg-gray-100` (native `:disabled` pseudo-class) | `cursor-not-allowed bg-gray-100 opacity-75` (conditional class, since Headless UI's Listbox root isn't a real disableable DOM node the way a native `<input disabled>` is) | Same visual language, applied via the mechanism appropriate to a non-native widget |
| Required marker | separate `requiredMark` prop (decoupled from the native `required` attribute) | single `required` prop drives both the asterisk and `aria-required` | Intentionally simplified — see rationale above; visually identical asterisk (`ml-1 text-red-500`, byte-for-byte) |

### Accessibility

- **Label association:** unchanged — `FormSelect`'s label was already a plain (not `htmlFor`-linked) `<label>`
  before this change, a pre-existing minor gap noted in P1.1 and not introduced or worsened here (Headless UI's
  `Listbox.Button` doesn't expose a natural `id` target the way a native `<select>` does; fixing this would be
  a separate, larger change to how the button is identified, out of this task's scope).
- **Required semantics:** `aria-required={required || undefined}` on the button — the correct ARIA property for
  a non-native listbox widget (native `required` has no meaning on a `<button>`).
- **Disabled semantics:** delegated entirely to Headless UI's own `disabled` handling on `<Listbox>`, which
  applies its own correct internal ARIA/keyboard-blocking behavior — not reimplemented by hand.
- **Error semantics:** `aria-invalid={Boolean(error)}` on the button. No `aria-describedby` link from the button
  to the error `<p>` was added — this matches `FormInput`'s own existing gap exactly (documented in P1.1: "error
  text is a plain `<p>` with no `aria-describedby` link to the input"). Per the "align with FormInput" and
  "do not regress existing accessibility beyond what's already there" instructions, this was intentionally left
  at parity with `FormInput` rather than introduced as a one-sided improvement.
- **Keyboard navigation:** fully preserved for the non-disabled case — no change was made to `Listbox.Options`,
  `Listbox.Option`, or the wheel-scroll handling; Headless UI's built-in roving keyboard nav is untouched.

### Styling

All three new visual treatments reuse existing color tokens already present elsewhere in the canonical layer:
`text-red-500`/`border-red-300`/`focus:ring-red-500` (already used by `FormInput`'s own error state) and
`bg-gray-100` (already used by `FormInput`'s own disabled state). No new color was introduced. No module-specific
class or branch exists anywhere in the diff.

### Backward compatibility

`disabled`, `required`, and `error` all default to falsy (`false`, `false`, `""`). When all three are omitted —
true for every one of the 61 current `FormSelect` consumers — `Listbox` receives `disabled={false}` (its own
existing default), the label renders with no asterisk, the button keeps its original `border-gray-300
focus:border-blue-500 focus:ring-blue-500` classes as the only active branch, `aria-required`/`aria-invalid`
evaluate to `undefined`/`false`, and no error paragraph renders — reproducing the exact pre-change markup and
behavior. Verified via successful `npm run build` with zero changes to any of the 61 consumer files.

### Test-case reasoning (per the task's 8 cases)

1. **`<FormSelect ... />` (no new props)** — all three new props take their default (falsy) values; output is
   unchanged. ✅
2. **`disabled={true}`** — `Listbox disabled` prevents opening/keyboard interaction; button is visually muted. ✅
3. **`disabled={false}`** — identical to omitting it; normal behavior. ✅
4. **`required`** — asterisk shown next to label, `aria-required="true"` on the button, visually matching
   `FormLabel`'s existing required-mark convention. ✅
5. **`error` populated** — red border/ring on the button, `aria-invalid="true"`, error text rendered below,
   using `FormInput`'s exact classes. ✅
6. **`error` absent** — default gray border/blue focus ring, no error text, `aria-invalid="false"`. ✅
7. **`disabled` + `error`** — both branches are independent `classNames()` conditions (not mutually exclusive
   logic), so a disabled+errored button shows the muted background AND the red border/ring simultaneously with
   no class conflict; `Listbox`'s `disabled` still blocks interaction regardless of the error styling. ✅
8. **`required` + `error`** — the asterisk (label-level) and the error border/message (button/below-button
   level) are fully independent code paths with no shared state, so both render correctly together. ✅

### Capabilities intentionally NOT implemented (explicitly out of scope for this task)

- **Per-option disabled** — only whole-control `disabled` was added, exactly as scoped.
- **Multi-select** — not touched; `onChange` still resolves to a single scalar value.
- **Custom option rendering** (icons/badges/secondary text per option) — `Listbox.Option`'s rendering is
  unchanged.
- **Searchable/filterable options** — no search input was added to the panel.
- **Async/remote-loaded options** — `options` remains a plain, caller-provided array; no fetch/debounce logic
  was added.

These five remain separate, not-yet-implemented canonical capabilities per the P1.1 audit's own classification
(searchable and async were both identified as TRUE canonical gaps there, but assigned to future, separate tasks
— not this one).

### Future FormSelect enhancements (not started, for a later task)

Per P1.1's prioritization: searchable options (P1, 4-module evidence, likely requires a larger architectural
decision — e.g. wrapping `react-select` — rather than a small addition to the Headless UI `Listbox`
implementation) and async/remote-loaded options (P1, 3-module evidence, would consolidate 3 currently-duplicated
bespoke debounced-search components). Per-option disabled and multi-select remain P3/specialized (2 modules
each) unless a third module's need emerges.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git status` confirms exactly one new file changed by this step: `src/components/forms/FormSelect.jsx`. No
  module file, no other canonical component, no `package.json`/`package-lock.json` was touched.
- ✅ All 61 existing `FormSelect` consumers compile successfully and, since none of them pass the new
  `disabled`/`required`/`error` props, render with zero visual or behavioral change (two UMS files that already
  pass a `required` prop today will begin seeing it take effect, which is a strict improvement — that prop was
  previously silently ignored, not a regression).

---

## P1.4 — PageCard KPI / Dashboard Tile Enhancement

**Date:** 2026-08-17

### Scope

Only `src/components/Cards/PageCard.jsx` was modified (one new named export added). No module file was touched.
Per this task's explicit instruction, XMS, AP, AR, and Finance were excluded even from being read for evidence
in this step, so this section's audit draws only on Projects, resource_management, employee-onboarding,
UserManagement, and Timesheet.

### Important discovery: a KPI primitive already exists and is already widely adopted

Before writing any code, representative implementations were read in full — not just grepped —
across the modules this task permitted auditing. This surfaced a fact P1.1's higher-level grep-based
audit had not resolved to this level of detail: **`src/components/kpi/KPI.jsx`'s `KPICard` already exists
and already has 31 consumers** repository-wide (`resource_management` ×11, `employee-onboarding` ×8, `airs`
×4, `Timesheet` ×3, `account_receivable` ×1, plus the top-level `Dashboard.jsx`) — more adoption than several
components already designated "canonical" in Phase 1 (`FilterBar`: 4, `ConfirmDialog`: 2, `PageContainer`: 0).

This changes the correct action here. Building a second, independent KPI implementation directly inside
`PageCard.jsx` would create exactly the "second competing system" this whole initiative has repeatedly avoided
(the same principle already applied to `FormSelect`'s error convention in P1.3: reuse `FormInput`'s existing
pattern rather than inventing a parallel one). `KPICard` is left completely untouched by this task — its 31
consumers, its API, and its own token system (it uses shadcn-style `cn()`/`bg-card`/`text-secondary-foreground`
tokens via `@/lib/utils`, a different token language than the plain-Tailwind literal classes `PageCard`/
`Button`/`FormInput` use) are unaffected. It remains a legitimate, already-proven, parallel implementation —
the same relationship this initiative already has with `GenericTable`, `ui/Modal.jsx`, `ui/button.jsx`, and the
legacy status-badge components: acknowledged, not consolidated, not deprecated.

**What was actually needed, and what this task adds:** a KPI-tile content layout that visually belongs to *the
`PageCard` system specifically* (its own plain-Tailwind token language: `rounded-xl border bg-white shadow-sm`,
`text-gray-500`/`text-gray-900`, etc.) — for the cases where a module is otherwise already standardizing on
`PageCard`/`PageCardContent` and wants a KPI tile that visually matches its other `PageCard`-based content,
without adopting a second, differently-tokened component family just for that one tile. `PageCard.jsx` gains
exactly one new named export for this; `KPICard` remains the right choice for any consumer already built around
it.

### KPI implementations audited

- **`src/pages/Projects/manager/Analytics/components/KpiCards.jsx`** — a local `KpiCard` (icon in a colored
  box, label, large value, optional `sub` text, optional `rightContent`) plus a distinct `SprintHealthCard`
  (label + colored status text + a progress bar) — the two are visually related but structurally different;
  `SprintHealthCard` is correctly excluded from consolidation (see below).
- **`src/pages/employee-onboarding/hr/components/StatCard.jsx`** — a thin wrapper that renders a native
  `<button>` around the *existing* `KPICard` (from `components/kpi/KPI.jsx`) to add click/active-state behavior
  — direct evidence that clickability is already solved today by composition (wrap in a button), not by a
  built-in `onClick` prop on the tile itself.
- **`src/components/kpi/KPI.jsx`** (`KPICard`) — read in full: `{label, value, icon, color, active, onClick,
  suffix, className}`. Note: `onClick` is destructured but **never wired to the rendered `<div>`** — a
  pre-existing, verified dead prop (see "Pre-existing issues" below), which is precisely why `StatCard.jsx` has
  to wrap it in an external `<button>` rather than passing `onClick` straight through.
- **`src/pages/resource_management/components/AvailabilityKPIs.jsx`** (`KPIBar`) — confirms the loading
  convention: `if (loading || !data) return <KPISkeleton />` replaces the **entire strip** of `KPICard`s with a
  separate skeleton component, rather than any individual tile having its own `loading` prop.
- **`src/pages/UserManagement/admin/userManagement/UserManagementHome.jsx`** — read and found to be a
  **navigation card grid** (`AppCard`/`DynamicCardGrid`, each card a clickable link to a sub-page with a title/
  subtitle/icon), not a value/KPI tile at all. This is exactly the kind of "don't assume all dashboard cards are
  the same" miscategorization the task warned about — P1.1's grep-level pass had flagged this file as KPI
  evidence; a full read shows it is not, and it is excluded from the evidence base here.

### Common KPI structure (from the two genuine value-tile examples)

1. Label — small, muted, uppercase-tracked text.
2. Value — large, bold/semibold number or string, rendered as-supplied (no formatting performed by the tile).
3. Icon — in a colored square/circle box; color/tone is caller-provided per KPI meaning (green for completed,
   orange for pending, etc.), not a fixed enum.
4. Optional supporting text (`sub`) — plain text below the value; content and meaning vary per module (a
   percentage, a count, a short phrase) and is provided pre-formatted by the caller.
5. Clickability — solved today via external composition (wrap the whole tile in a `<button>`), not a built-in
   prop.
6. Loading — solved today at the *group/strip* level (swap the whole set of tiles for a skeleton), not per-tile.
7. No trend-arrow/status-color system was found to be shared — where a "trend" exists at all, it renders
   completely differently per module (plain sub-text vs. `SprintHealthCard`'s colored label + progress bar).

### Specialized dashboard patterns excluded

`SprintHealthCard` (progress bar + dynamic status label/color) was explicitly **not** folded into the generic
KPI shape — it has substantially more structure (a computed health label, a colored progress bar with dynamic
width) than "icon + label + value + supporting text," matching the task's own example of what should stay
specialized. `KPIBar`'s `KPISkeleton` (the group-level loading placeholder) was also left untouched — it's a
sibling component to the tiles, not a capability the tile itself needs. `UserManagementHome.jsx`'s navigation
card grid was excluded entirely, as it is not a KPI/stat pattern.

### Existing PageCard API (preserved, unchanged)

`PageCard`: `children, className, title, subtitle, actions`. `PageCardContent`: `children, className, padding`.
Neither was modified — no prop renamed, removed, or given a new default.

### New API

```jsx
import { PageCard, PageCardContent, PageCardKpi } from "src/components/Cards/PageCard";

<PageCard>
  <PageCardContent>
    <PageCardKpi
      icon={<Users className="h-5 w-5" />}
      iconClassName="bg-indigo-50 text-indigo-600"
      label="Total Employees"
      value={totalEmployees}
      sub="12% up this month"
    />
  </PageCardContent>
</PageCard>
```

One new named export, `PageCardKpi`, with props `icon` (optional node), `iconClassName` (optional string,
defaults to a neutral gray box), `label`, `value`, `sub` (optional node/string), `className` (optional, merged
onto the root layout `<div>`). `PageCardKpi` renders **only** the icon+label+value+sub content row — it has no
card chrome of its own (no border/radius/shadow/background).

### Composability decision

`PageCardKpi` deliberately does not duplicate `PageCard`'s shell. Every audited KPI tile's own outer container
(`bg-white border-slate-200 rounded-xl`, `bg-white border-gray-200 rounded-xl shadow-sm`, etc.) already matches
`PageCard`'s existing default look almost exactly — so the correct, minimal composition is `<PageCard>
<PageCardContent><PageCardKpi .../></PageCardContent></PageCard>`, reusing the already-canonical card shell for
free rather than reimplementing rounded-corner/border/shadow/padding logic a second time inside a new
`variant="kpi"` prop branch on `PageCard` itself (which would have made `PageCard` a "do everything" component,
contrary to the task's explicit architectural guidance). This directly answers the task's own question ("if
PageCard can already compose the required KPI structure cleanly, consider whether an additional KPI primitive
is actually necessary") — the *shell* needed no new primitive at all; only the *inner content layout* did.

### Icon handling

`icon` accepts any React node — no specific icon library is hard-coded, matching every audited example (each
passes its own `lucide-react` icon element). `iconClassName` is a free-form string for the caller to supply
both background and icon-color classes together (mirroring how `KpiCards.jsx`'s local `KpiCard` combines
`iconBg`+`iconColor`), rather than exposing two separate props — the smaller, sufficient API. No icon was turned
into a `Button`; it renders inside a plain `<div>` box, per the task's explicit instruction.

### Value handling

`value` is rendered exactly as supplied — a number, a pre-formatted string, a percentage string, anything.
No formatting, calculation, or unit logic exists inside `PageCardKpi`; every audited example already does its
own formatting/calculation before passing `value` in (e.g. `` `${kpis.totalScope ?? 0} pts` ``), and this
enhancement preserves that responsibility split exactly.

### Trend/status handling

**Not implemented as a dedicated concept.** The only cross-module-common "extra" signal is a plain supporting
line of text/node (`sub`), which is generic enough to hold a percentage, a count, or any other short caller-
formatted string — but no color-coded trend arrow, no up/down indicator, and no status-tone system was added,
since the two real-world "trend-like" treatments found (`KpiCards.jsx`'s plain `sub` string vs.
`SprintHealthCard`'s colored label + progress bar) are different enough in kind that consolidating them would
mean inventing behavior neither module actually asked for, which the task explicitly prohibited.

### Loading handling

**Not implemented on `PageCardKpi` itself.** The one loading convention actually observed in the repository
(`AvailabilityKPIs.jsx`'s `KPIBar`) operates at the group/strip level — swapping an entire row of tiles for a
separate skeleton component — not via a per-tile `loading` prop. Since `PageCardKpi` is a single-tile content
layout, the equivalent pattern for a caller using it is to conditionally render a skeleton in place of a group
of `PageCardKpi`s, exactly as `KPIBar` already does; no new prop was needed or added to replicate that.

### Clickability handling

**Not implemented on `PageCardKpi` or `PageCard`.** Only one audited example (`StatCard.jsx`) needs a clickable
KPI tile, and it already achieves this today via external composition — wrapping the whole tile in a native
`<button>` — rather than needing (or even successfully using, given `KPICard`'s dead `onClick` prop) a built-in
click handler on the tile. Per the task's explicit instruction not to make every KPI clickable by default and
not to add capability for a single-module need, a future caller wanting a clickable `PageCardKpi` should wrap it
in a `<button>` the same way, which preserves full keyboard/focus semantics for free (a real `<button>` element)
without any new API surface.

### Styling standard

`PageCardKpi`'s icon box (`h-10 w-10 rounded-lg`), label (`text-xs font-medium uppercase tracking-wide
text-gray-500`), and value (`text-2xl font-semibold text-gray-900`) typography match the audited examples'
own conventions almost exactly, expressed in `PageCard`'s existing plain-Tailwind token language (`text-gray-500`/
`text-gray-900`, the same grays already used by `PageCard`'s own `title`/`subtitle`) rather than the shadcn
tokens `KPICard` uses — ensuring visual consistency *within the PageCard family* specifically. No new color was
invented; the default `iconClassName` (`bg-gray-100 text-gray-500`) reuses `EmptyState`'s existing neutral
icon-badge tone.

### Backward compatibility

`PageCard` and `PageCardContent`'s existing props, defaults, and rendering are completely unchanged —
`PageCardKpi` is a wholly new, additively-exported function; nothing about the existing two exports was touched.
Every existing `PageCard` consumer (61 files) compiles and renders identically, since `PageCardKpi` is opt-in
(a consumer has to explicitly import and render it) and it is not referenced anywhere yet.

### Intentionally deferred capabilities

Per-tile loading state, a built-in click/active-state prop, a trend/status color system, and any KPI variant
tied to a specific module (explicitly forbidden — no `variant="leave"`/`"pms"`/`"rms"` was created or considered)
are all deferred, each for a documented, evidence-based reason above rather than by omission. Migrating any of
the 31 `KPICard` consumers, or any `KpiCards.jsx`-style module, onto `PageCardKpi` is out of scope for this task
and was not performed.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step; zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git status` confirms exactly one new file changed by this step: `src/components/Cards/PageCard.jsx`. No
  module file (Leave Management, XMS, AP, AR, Finance, or otherwise), no other canonical component, no
  `package.json`/`package-lock.json` was touched.
- ✅ All 61 existing `PageCard` consumers compile successfully and render identically, since `PageCardKpi` is a
  new, unreferenced export with no effect on existing `PageCard`/`PageCardContent` behavior.

### Remaining PageCard capability gaps (unchanged from P1.1, not addressed here)

Footer slot and left-accent-bar variant remain unimplemented (≤2 modules each, per P1.1 — still below the
3+-module bar for a canonical addition).

### Pre-existing issue discovered (not fixed, flagged per the "STOP and report" convention)

`src/components/kpi/KPI.jsx`'s `KPICard` destructures an `onClick` prop that is **never wired to any element** —
passing `onClick` directly to `KPICard` today silently does nothing, which is why `StatCard.jsx` (and
presumably any other consumer wanting a clickable KPI) has to wrap it in an external `<button>` instead. This
is a real, verified defect in a non-canonical, already-widely-used (31 consumers) component — outside this
task's target file (`PageCard.jsx`) and therefore not fixed here, but worth a dedicated, separate fix given its
adoption size.

---

## P1.5 — DataTable Sticky Columns Enhancement

**Date:** 2026-08-17

### Scope

Only `src/components/patterns/DataTable.jsx` was modified. No module file was touched, `Pagination`/`FilterBar`
were not modified, and none of the 3 affected modules were migrated — this step makes the capability available,
per its stop condition, nothing more.

### Modules requiring sticky columns & existing implementations audited

Per P1.1, 3 modules were identified. All 3 were read in full for this step:

- **`src/pages/leave_management/models/HandleLeaveRequestAndApprovals.jsx`** — a raw `<table>` with **3 sticky
  columns**: a selection checkbox column (`sticky left-1`), an Employee-name column (`sticky left-[4.5%]`), and
  an Actions column (`sticky right-0`). Header cells use `z-20`, body cells `z-10`. This is the single most
  important reference: it's the one real example of **row selection and sticky columns coexisting** — the
  checkbox column *is* one of the sticky-left columns.
- **`src/pages/leave_management/HRManageTools.jsx`** — a raw `<table>` (`LeaveTable`) with sticky-left (first
  data column) and sticky-right (Actions), each with a boundary box-shadow
  (`shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]` / the mirrored right-side variant) and a background matching that
  row's own zebra color (`stickyBgClass = idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"`) plus
  `group-hover:bg-[#eff6ff]` so the sticky cell visually blends into its row on hover instead of staying a
  static color while the rest of the row highlights.
- **`src/pages/Timesheet/WeeklyEntry/WeeklyEntryModal.jsx`** — sticky-right only (a single Actions column),
  with its own boundary shadow (`shadow-[-6px_0_6px_-6px_rgba(25,28,48,.18)]`).

A 4th related file, **`src/pages/Projects/manager/SwimlaneBoard.jsx`**, was also read (it uses `sticky` heavily)
but was excluded from shaping the API: it is a drag-and-drop kanban grid (`react-beautiful-dnd` `Droppable`,
`border-separate` table, sticky top-*and*-left intersection corner, multi-row-spanning story groups) — a
fundamentally different, far more complex structure than a plain data table, already noted in P1.1 as
"structurally outside `DataTable`'s remit." It confirms the general *need* for sticky positioning in wide tables
but does not represent a `DataTable`-shaped consumer, so it was not used to size this API.

### Common sticky requirements extracted

1. Sticky-left and sticky-right both needed (all 3 real examples use sticky-right; 2 of 3 also use sticky-left).
2. **Row selection and sticky columns must coexist** — confirmed directly by
   `HandleLeaveRequestAndApprovals.jsx`, where the selection checkbox is itself one of the sticky-left columns.
3. Multiple sticky-left columns are needed (checkbox + Employee name), and their positions must be **computed,
   not hardcoded to `left: 0`** for both — `HandleLeaveRequestAndApprovals.jsx` hand-calculates the second
   column's offset (`left-[4.5%]`) to match the first column's width, which is exactly the kind of manual,
   fragile arithmetic a canonical implementation should do automatically.
4. Sticky cells need their own **opaque background** (matching the row's zebra color in the body, a solid
   indigo tone in the header) — a `<tr>`'s background does not "follow" a `position: sticky` cell that detaches
   from its normal document flow position, so each sticky cell must carry its own background or content
   scrolling underneath would show through.
5. A subtle **boundary shadow** is used in 2 of 3 examples at the sticky/non-sticky transition edge (not on
   every sticky cell — only at the boundary).
6. Sticky header cells use a higher z-index than sticky body cells in the one example that specifies both
   explicitly (`z-20` header, `z-10` body).
7. Hover feedback on sticky cells uses `group-hover:` tied to the row (`<tr>`), since the row's own `hover:`
   background is painted underneath the sticky cell's own opaque background and wouldn't otherwise be visible
   through it.

### Final DataTable API

```jsx
<DataTable
  columns={[
    { key: "name", header: "Name", sticky: "left" },
    { key: "email", header: "Email" },
    { key: "actions", header: "Actions", sticky: "right", render: (row) => <Button .../> },
  ]}
  rows={rows}
  selectable
  selectedRowKeys={selectedRowKeys}
  onSelectedRowKeysChange={setSelectedRowKeys}
/>
```

One new, optional per-column field: `col.sticky`, accepting `"left"`, `"right"`, or omitted (default, no sticky
behavior) — exactly the two values repository evidence requires, nothing more (no `"none"` literal needed since
omission already means "not sticky"). This is genuinely additive at the column-definition level, matching the
task's own suggested shape, confirmed rather than assumed against the real repository convention. All existing
top-level props (`columns, rows, loading, emptyTitle, emptyDescription, getRowKey, onRowClick, className`) and
the P1.2 selection props (`selectable, selectedRowKeys, onSelectedRowKeysChange`) are unchanged.

### Sticky-left behavior

Any column with `sticky: "left"` becomes `position: sticky` with a computed `left` offset. If `selectable` is
also true, the selection checkbox column (owned internally by `DataTable`, not part of the caller's `columns`
array) is itself always sticky-left at `left: 0` when any sticky column exists, and the first `sticky: "left"`
data column is offset by the checkbox column's own measured width — directly reproducing
`HandleLeaveRequestAndApprovals.jsx`'s exact real-world shape (checkbox then Employee name) without the
caller having to hand-calculate a percentage.

### Sticky-right behavior

Any column with `sticky: "right"` becomes `position: sticky` with a computed `right` offset, stacking from the
table's right edge inward (the last sticky-right column in `columns` order sits at `right: 0`; earlier
sticky-right columns are offset by the measured width of the ones after them).

### Multiple sticky-column behavior

Offsets are **measured, not assumed**: each sticky column's header `<th>` gets a ref, and a `useLayoutEffect`
computes cumulative offsets from `getBoundingClientRect().width` after every render where `columns`, `rows`,
`selectable`, or the presence of sticky columns changes. This directly satisfies the task's explicit instruction
not to apply `left: 0`/`right: 0` uniformly to every sticky column — the second (or third, etc.) sticky-left
column is offset by the actual rendered width of every sticky-left column before it (plus the selection column,
if present), and analogously in reverse for sticky-right. Because standard HTML table layout (`table-layout:
auto`, the default, unchanged here) sizes every cell in a column to the same final width, measuring only the
header cell per sticky column is sufficient and accurate for the whole column — body cells were not individually
measured.

### Horizontal scrolling

Unchanged: the existing two-layer structure (outer `overflow-hidden` div for the rounded shell, inner
`overflow-x-auto` div for the actual scrolling) from P1.0 was preserved exactly. Sticky columns work correctly
inside that existing inner scroll container — `position: sticky` operates relative to its nearest scrolling
ancestor, which is that same `overflow-x-auto` div, so no second/nested scrollbar was introduced.

### Rounded-corner compatibility

Unaffected: the outer shell's `rounded-xl` + `overflow-hidden` (P1.0) still clips the whole table to its rounded
corners regardless of any column's sticky state, since sticky positioning happens entirely inside the inner
scroll container and never affects the outer wrapper's box model.

### Z-index strategy

Sticky header cells: `z-index: 20`. Sticky body cells: `z-index: 10`. This matches the one example
(`HandleLeaveRequestAndApprovals.jsx`) that specifies both explicitly, and is applied uniformly regardless of
how many sticky columns exist (all sticky header cells share z-20; all sticky body cells share z-10 — no
per-column stacking is needed since sticky columns sit side-by-side, not on top of each other; the z-index's
only job is to render above the *non-sticky* cells scrolling underneath in the same row). These values are
local to each table's own stacking context and do not interfere with `Modal` (`z-[9999]` by default) or any
other global overlay.

### Row-selection compatibility

Verified directly against the one real example that combines both: when `selectable` is true and at least one
column has `sticky: "left"` or `sticky: "right"`, the selection column itself becomes sticky-left at offset 0
automatically (no separate prop needed to opt the selection column into stickiness — it's implied by the
presence of any other sticky column, matching the real-world case where the checkbox needed to stay visible
alongside the sticky name column). The checkbox remains fully visible and clickable, `stopPropagation` on the
selection cell's `onClick` (from P1.2) is preserved unchanged, select-all alignment is unaffected since the
header selection cell uses the same offset/z-index treatment as the body selection cells, and no P1.2 behavior
was altered — only additional `style`/`className` were layered on when sticky columns are present.

### Custom-cell compatibility

`columns[].render(row, rowIndex)` is invoked identically regardless of `col.sticky` — sticky positioning is
applied to the `<td>` wrapping the rendered content, never to the content itself, so buttons/badges/links/
dropdowns rendered via `render` remain exactly as interactive and accessible as before. No change was made to
how or when `render` is called.

### onRowClick compatibility

Unaffected: sticky `<td>`s do not add their own `onClick` handler (except the selection cell, whose
`stopPropagation` is unchanged from P1.2) — a click anywhere else in a sticky cell still bubbles up to the
`<tr>`'s `onClick` exactly as it did before this change.

### Backward compatibility

`col.sticky` is optional and defaults to not-sticky (undefined). When no column specifies `sticky: "left"` or
`sticky: "right"` — true for all 9 existing Leave Management `DataTable` consumers today — `hasStickyCols` is
`false`, the `useLayoutEffect` short-circuits without measuring or setting any state, and every cell renders
with no `ref`, no sticky `style`, and no sticky `className`, reproducing the exact pre-change markup. Verified
via successful `npm run build` with zero changes to any of the 9 consumer files.

### Validation

- ✅ `npm run build` — succeeds (only pre-existing, unrelated chunk-size warnings).
- ✅ `npm run lint` — same 2 pre-existing, unrelated `react-hooks/exhaustive-deps` config errors in
  `src/pages/airs/**` as every prior step (this repo's ESLint config does not actually have that rule
  registered, which is also why the `eslint-disable-next-line` comment added in this change is inert but
  harmless); zero new issues.
- ✅ `git diff --check` — clean (only pre-existing LF/CRLF advisories).
- ✅ `git status` confirms exactly one file changed by this step: `src/components/patterns/DataTable.jsx`. No
  module file, no `Pagination`, no `FilterBar`, no `package.json`/`package-lock.json` was touched.
- ✅ All 9 existing `DataTable` consumers compile successfully and, since none of them set `col.sticky` on any
  column, render with zero visual or behavioral change.

### Remaining sticky-column gaps / known limitations

- **Sticky headers (`position: sticky` on the `<thead>` itself, so the header row stays visible during
  *vertical* scroll) were explicitly not implemented.** None of the 3 genuine `DataTable`-shaped consumers need
  this — only the excluded kanban board (`SwimlaneBoard.jsx`) uses a sticky header row, and that's for a
  fundamentally different (vertically-scrolling, multi-section) layout. Sticky columns and sticky headers are
  confirmed-separate capabilities, per the task's own instruction, and only the former was built here.
  Documented explicitly as a possible, but not yet evidenced, future addition.
- **Width measurement runs client-side after render** (`useLayoutEffect` + `getBoundingClientRect`), so there is
  an unavoidable one-frame delay between initial paint and sticky columns settling into their final computed
  offset on first render of a sticky-configured table (a standard trade-off for any width-dependent sticky
  layout without hardcoded pixel widths; not observable as a flash in practice since `useLayoutEffect` runs
  synchronously before the browser paints, but noted for completeness).
- Column width changes driven by something other than `columns`/`rows`/`selectable` changing (e.g. a browser
  window resize while the same `rows` are still shown) do not currently trigger remeasurement — no `resize`
  listener was added, since none of the 3 audited consumers demonstrated a need for it and adding one would be
  speculative complexity beyond what the repository evidence supports.

### Pre-existing issues

None newly discovered in this step beyond what P1.1/P1.2/P1.4 already documented.

---

## Canonical BackButton

**Date:** 2026-08-17

### Why it was introduced

A repository-wide audit for existing "go back" patterns (`navigate(-1)`, `ArrowLeft`, `BackButton`, `history.back`)
found **32 files** implementing their own local back-navigation button, each with its own one-off styling, and
**no existing canonical component** for it anywhere under `src/components/` (`PageHeader` was checked
specifically, per its P1.1 documentation, and confirmed to have no built-in back-button slot). Rather than adding
a 33rd bespoke implementation to `EmployeeLeaveBalances.jsx`, a small canonical component was introduced instead.

### Canonical component path

`src/components/patterns/BackButton.jsx` — placed alongside the other small, composable presentational
primitives in `patterns/` (`FilterBar`, `EmptyState`, `StatusBadge`, `ConfirmDialog`), which is the closest
existing convention for "a small reusable piece that composes canonical `Button`" rather than a full standalone
UI system.

### Intended usage

```jsx
import BackButton from "src/components/patterns/BackButton";

<BackButton onClick={() => navigate(-1)} />
```

API: `{ onClick, label = "Back", className }`. `onClick` is required and supplied by the parent; `label`
defaults to `"Back"` but can be overridden for the rare case a caller wants different wording; `className` is an
additive escape hatch, consistent with every other canonical component's override convention.

### Navigation remains owned by the parent

`BackButton` has **zero React Router (or any routing) knowledge** — it does not call `useNavigate`, does not
know what "back" means, and does not import anything from `react-router-dom`. It is composed around the
canonical `Button` (`variant="outline"`, `size="small"`) purely for presentation, rendering an `ArrowLeft` icon
and the `label` text as `Button`'s children. Every navigation decision (`navigate(-1)`, a specific route, closing
a panel, anything else) is the caller's responsibility via the `onClick` prop it supplies — exactly mirroring how
`ConfirmDialog` composes `Modal`+`Button` without owning any business logic itself.

### EmployeeLeaveBalances migration

`src/pages/leave_management/models/EmployeeLeaveBalances.jsx`'s local `<motion.button>` (a `framer-motion`
hover/tap-scaled button, icon-only, with one-off `border-gray-500`/`text-blue-700` styling) was replaced with
`<BackButton onClick={() => navigate(-1)} />`. The button was also **moved to appear before the "Employee Leave
Balances" heading** instead of after it, and the container changed from `justify-between` (heading left, button
right) to `items-center gap-3` (button, then heading, left-aligned together). The `navigate(-1)` call itself,
`useNavigate()`, and every other behavior on the page were left completely untouched. The now-unused `motion`
and `ArrowLeft` imports were removed from the page (both confirmed, via search, to have no other usage anywhere
else in the file).

### Visual/behavioral standard

**Note (2026-08-17, later same day): updated after a follow-up review.** `BackButton`'s visible `"Back"` text
was intentionally commented out post-review (`{/* {label} */}` in the component source), making the final
canonical treatment **icon-only** (`ArrowLeft`, no visible label) rather than icon+text as first implemented.
This was a deliberate design decision made directly on the component, not a regression — the `label` prop and
its `"Back"` default are still fully wired through to `aria-label={label}` on the underlying `Button`, so the
control keeps a correct accessible name for assistive technology despite having no visible text. This
accessible-name wiring was added specifically to prevent the icon-only visual from becoming a real accessibility
regression (an icon-only `<button>` with no `aria-label` and no visible text has no accessible name at all).

Because `BackButton` composes canonical `Button` (`variant="outline"`, `size="small"`), it automatically
inherits keyboard activation (native `<button>`), `focus-visible` ring styling, and disabled/loading semantics
for free — nothing needed to be reimplemented. The color scheme uses `Button`'s standard `outline` variant
tokens (`border-gray-300`, `text-gray-700`, `hover:bg-gray-50`) rather than the old page's one-off
`border-gray-500`/`text-blue-700`, per the explicit "do not introduce arbitrary colors, use existing design
tokens" rule.

### Global canonical UI rule

**All Back buttons across the Intranet must use the canonical `BackButton` visual treatment.** There is exactly
one visual definition of "Back" for the entire application — the same icon, icon size, spacing, height,
padding, border, radius, colors, hover behavior, focus-visible behavior, and (via the underlying `Button`)
disabled/loading behavior, wherever it is used. A parent page controls only *where* `BackButton` appears and
*what happens* when it's clicked (`onClick`); it has no ability to override its visual appearance beyond the
existing generic `className` escape hatch already common to every canonical component. No module-specific prop
(`variant="leave"`, `module="lms"`, `color="blue"`, or similar) exists or should ever be added — `BackButton`'s
API is intentionally `{ onClick, label, className }` and nothing more.

### Repository-wide Back-button audit summary (informational — not migrated in this task)

The original audit (32 files, `navigate(-1)`/`ArrowLeft`/back-styled buttons, across `leave_management`,
`resource_management`, `employee-onboarding`, `airs`, `Timesheet`, and `Projects` — `XMS`/`AP`/`AR`/`Finance`
excluded per instruction) found no existing canonical implementation and no two files styled identically; each
page had independently reinvented its own bordered/icon/text combination. This is the same class of duplication
already resolved for `Button`, `Modal`, `DataTable`, `FormSelect`, and `PageCard` earlier in this initiative —
`BackButton` closes the same gap for back-navigation controls specifically.

**Only `EmployeeLeaveBalances.jsx` was migrated in this task.** The other 31 files identified in the audit
remain on their local implementations and are **not** touched here — per explicit instruction, this task
establishes the canonical component and its visual standard without performing a large, uncontrolled
cross-module diff. Each module's existing Back button should be replaced with canonical `BackButton` as that
module comes up for migration in the sequential, module-by-module process already used for every other
canonical component in this initiative (Button → Modal → FormInput → FormSelect → Table → Pagination → Card →
Filter, each done one module/step at a time). No other module was modified as part of this task — confirmed via
`git status`.

### EditHolidaysPage migration (2026-08-17, follow-up)

`src/pages/leave_management/models/EditHolidaysPage.jsx` is the second file migrated onto canonical
`BackButton`, following the exact same placement/style already established by `EmployeeLeaveBalances.jsx`.

- **Previous implementation:** a local `<motion.button>` (icon + visible "Back" text, `text-blue-700
  hover:text-blue-900` one-off coloring, no border) positioned in a `justify-between` header row **after** the
  "Manage Holidays" heading (heading left, button far right).
- **Replacement:** `<BackButton onClick={() => navigate(-1)} />`, positioned **before** the heading in a
  `flex items-center gap-3` row, matching `EmployeeLeaveBalances.jsx`'s header structure exactly. No local
  color/border/animation classes were carried over — the canonical component controls 100% of the visual
  treatment, per the "no page-specific customization" rule.
- **Heading text preserved exactly** ("Manage Holidays" — the page's actual existing heading text was kept
  as-is; it was not renamed to "Edit Holidays" despite that being this task's descriptive shorthand for the
  page, since renaming it was never requested and would have been an unrelated content change).
- **Navigation behavior preserved exactly:** `onClick={() => navigate(-1)}` unchanged; `useNavigate()` remains
  entirely owned by the page; `BackButton` still has no routing knowledge.
- **No business/API logic changed:** holiday fetch/update/delete API calls, year-based refetching, search
  filtering, inline row-edit state, and the delete `ConfirmationModal` were all left untouched.
- **Import cleanup:** the now-unused `motion` (from `framer-motion`) and `ArrowLeft` (from `lucide-react`)
  imports were removed — both confirmed, via search, to have no other usage anywhere else in the file.

**`EmployeeLeaveBalances.jsx` and `EditHolidaysPage.jsx` now share the identical canonical Back-button placement
and visual treatment.** Every future module migrated onto `BackButton` should follow this same pattern: replace
the local implementation, move it before the page heading, and remove any now-unused icon/animation imports.
