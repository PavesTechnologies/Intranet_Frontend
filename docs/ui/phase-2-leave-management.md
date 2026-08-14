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

**STOP after P0.1 — do not proceed to P0.2 (Modal) automatically.**
