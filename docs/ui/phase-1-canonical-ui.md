# Phase 1 — Canonical UI Foundation

## 1. Purpose

This repository (Intranet_Frontend) has grown many independent modules under `src/pages/`, each with its own
buttons, modals, cards, badges, tables, and spacing conventions. The application should look like **one**
enterprise product. Phase 1 establishes a canonical UI layer — consolidated components, shared design tokens,
and documented conventions — that all modules will migrate onto in later phases.

Phase 1 does **not** migrate any module page. It only builds the foundation those migrations will use.

## 2. Scope

- Branch: `intra-ui/unify` (created from `dev`). Do not modify `main` or `dev`.
- No business logic, API calls, auth, RBAC, routing, or state management changed.
- No module page under `src/pages/**` was rewritten.
- Every change below is additive or backward-compatible with existing consumers — verified against import
  counts gathered from a full-repo audit (see §28 for the audit method).

## 3. What Phase 1 Implemented

| Area | Action |
|---|---|
| Design tokens | Added brand + semantic tokens to `src/index.css` / `tailwind.config.js` (additive, did not touch existing shadcn tokens) |
| Typography | Fixed a pre-existing bug: `Poppins` and `Fira Code` were referenced in `tailwind.config.js` but never loaded — added to `index.html` |
| Button | Consolidated on existing `src/components/Button/Button.jsx` (294 consumers) — tokenized colors, added focus-visible ring, added `sm/md/lg` size aliases |
| Modal | Consolidated on existing `src/components/Modal/modal.jsx` (69 consumers) — added Escape-to-close |
| PageCard | Enhanced existing `src/components/Cards/PageCard.jsx` (52 consumers) — added optional title/subtitle/actions header and padding control |
| PageHeader | Enhanced existing `src/components/ui/PageHeader.jsx` (28 consumers) — added optional breadcrumbs |
| Loader | Restyled existing `src/components/ui/Loader.jsx` onto the brand spinner color; added new `src/components/patterns/Loaders.jsx` (`PageLoader`, `InlineLoader`, `TableSkeleton`) |
| Pagination | Rebranded existing `src/components/Pagination/pagination.jsx` (89 consumers) active-state colors from arbitrary indigo to brand primary |
| StatusBadge | New `src/components/patterns/StatusBadge.jsx` — semantic status→tone resolver |
| PageContainer | New `src/components/patterns/PageContainer.jsx` |
| FilterBar | New `src/components/patterns/FilterBar.jsx` |
| DataTable | New `src/components/patterns/DataTable.jsx` |
| EmptyState | New `src/components/patterns/EmptyState.jsx` |
| ConfirmDialog | New `src/components/patterns/ConfirmDialog.jsx` (wraps canonical Modal + Button) |
| Form foundation | New `src/components/forms/{FormLabel,FormError,FormHelperText,FormField,FormSection,FormActions}.jsx` |

## 4. What Phase 1 Deliberately Did NOT Implement

- No module page migrations (`src/pages/**` untouched).
- No new `Input.jsx` / `Select.jsx` / `Badge.jsx` under `src/components/ui/` — see §27 (case-collision constraint)
  and §7/§9 below; the existing lowercase files already meet the canonical spec and were left alone.
- No consolidation of the 3 competing pagination approaches (`Pagination/pagination.jsx`, `react-paginate`,
  `react-pagination`) beyond documenting the canonical one — removing the two unused libraries is a dependency
  change outside Phase 1's UI-layer scope.
- No consolidation of the ~35+ page-specific Card/TaskCard duplicates, the ~75 page-specific modals, or the
  bespoke per-module tables — those are Phase 2 migration targets, not Phase 1 deletions.
- No Tabs behavior changes (keyboard arrow-key navigation, etc.) — `ui/tabs.jsx` was judged already suitable.
- No changes to `react-select` / Headless UI `Listbox` usage — those remain valid for specialized behavior.
- `clsx` (imported directly by `src/components/status/statusbadge.jsx`) is not declared in `package.json` and
  is resolving only because it's a transitive dependency. Documented as a known pre-existing issue (§30), not
  fixed in Phase 1 to avoid an unscoped dependency-manifest change.

## 5. Canonical Component Inventory & Locations

| Component | Canonical file | Status |
|---|---|---|
| Button | `src/components/Button/Button.jsx` | Enhanced, backward-compatible |
| Modal | `src/components/Modal/modal.jsx` | Enhanced, backward-compatible |
| PageCard | `src/components/Cards/PageCard.jsx` | Enhanced, backward-compatible |
| PageHeader | `src/components/ui/PageHeader.jsx` | Enhanced, backward-compatible |
| Input | `src/components/ui/input.jsx` | Unchanged — already meets spec |
| Select | `src/components/ui/select.jsx` | Unchanged — already meets spec |
| Tabs | `src/components/ui/tabs.jsx` | Unchanged — already meets spec |
| Pagination | `src/components/Pagination/pagination.jsx` | Enhanced (color only), backward-compatible |
| Loader (legacy, no props) | `src/components/ui/Loader.jsx` | Restyled |
| LoadingSpinner (primary loader) | `src/components/LoadingSpinner.jsx` | Unchanged — already canonical |
| PageLoader / InlineLoader / TableSkeleton | `src/components/patterns/Loaders.jsx` | New |
| StatusBadge | `src/components/patterns/StatusBadge.jsx` | New |
| PageContainer | `src/components/patterns/PageContainer.jsx` | New |
| FilterBar | `src/components/patterns/FilterBar.jsx` | New |
| DataTable | `src/components/patterns/DataTable.jsx` | New |
| EmptyState | `src/components/patterns/EmptyState.jsx` | New |
| ConfirmDialog | `src/components/patterns/ConfirmDialog.jsx` | New |
| FormLabel / FormError / FormHelperText / FormField / FormSection / FormActions | `src/components/forms/*.jsx` | New |

## 6. Component APIs

### Button

```jsx
<Button variant="primary" size="md" loading={loading} onClick={...}>Save</Button>
```

- `variant`: `primary | secondary | success | danger | outline | ghost | link`
- `size`: `sm | md | lg | icon` (aliases for the original `small | medium | large | icon` — both work)
- `disabled`, `loading`, `loadingText`, `type`, plus any standard `<button>` prop.

### Modal

```jsx
<Modal isOpen={open} onClose={close} title="..." subtitle="..." size="lg" footer={<...>}>
  ...
</Modal>
```

- `size`: `xs | sm | md | lg | xl | 2xl … 7xl | full | screen`
- `closeOnBackdrop`, `closeOnEscape` (new, defaults `true`), `scrollable`, `showCloseButton`, `showHeader`,
  `footer`, `titleIcon`, `animation: zoom | slide-up | slide-down | fade | none`.

### PageCard

```jsx
<PageCard title="Vendors" subtitle="12 active" actions={<Button size="sm">Add</Button>}>
  <PageCardContent padding="md">...</PageCardContent>
</PageCard>
```

`title`/`subtitle`/`actions` are optional; omitting them renders the same plain card every current consumer gets.

### PageHeader

```jsx
<PageHeader
  title="Employees"
  subtitle="Manage employees"
  breadcrumbs={[{ label: "Home", href: "/" }, { label: "Employees" }]}
  actions={<Button variant="primary">Add Employee</Button>}
/>
```

### StatusBadge

```jsx
<StatusBadge status="approved" />
<StatusBadge status="ocr processing" />
<StatusBadge label="Custom Label" tone="info" />
```

Resolves free-text statuses to one of five tones: `success | warning | danger | info | neutral`.

### FilterBar / PageContainer / EmptyState / ConfirmDialog / DataTable

```jsx
<PageContainer density="comfortable">
  <FilterBar>
    <Input placeholder="Search..." />
    <Button variant="outline">Reset</Button>
  </FilterBar>

  <DataTable
    columns={[{ key: "name", header: "Name" }]}
    rows={data}
    loading={isLoading}
    emptyTitle="No results"
  />
</PageContainer>

<EmptyState title="No leave requests" description="Try changing your filters." />

<ConfirmDialog
  isOpen={open}
  onClose={close}
  onConfirm={handleDelete}
  title="Delete employee?"
  description="This action cannot be undone."
  confirmText="Delete"
  variant="danger"
/>
```

### Form foundation

```jsx
<FormSection title="Contact details">
  <FormField label="Email" htmlFor="email" required error={errors.email}>
    <input id="email" className="..." />
  </FormField>
  <FormActions>
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Save</Button>
  </FormActions>
</FormSection>
```

## 7. Design Tokens

Added to `src/index.css` `:root` (additive — existing shadcn tokens `--primary`, `--secondary`, etc. are
untouched because `ui/button.jsx`, `ui/input.jsx`, `ui/select.jsx`, `ui/badge.jsx`, `ui/tabs.jsx` already depend
on them for a neutral surface look):

```
--brand-primary: #0A0082;        --brand-primary-hover: #080066;
--brand-secondary: #B83280;      --brand-secondary-hover: #9D286D;
--success: #16a34a;   --success-bg: #dcfce7;
--warning: #d97706;   --warning-bg: #fef3c7;
--danger:  #dc2626;   --danger-bg:  #fee2e2;
--info:    #2563eb;   --info-bg:    #dbeafe;
--neutral: #6b7280;   --neutral-bg: #f3f4f6;
```

Exposed in `tailwind.config.js` as `bg-brand-primary`, `bg-brand-secondary`, `bg-success`, `bg-success-bg`,
`text-danger`, etc.

## 8. Typography Rules

- Font stack unchanged: `font-sans` → Inter, `font-heading` → Poppins, `font-mono` → Fira Code (all three are
  now actually loaded via Google Fonts in `index.html` — Poppins/Fira Code were previously silently falling
  back to the browser default).
- Use `src/components/Fonts/Fonts.jsx` string constants (`heading1..4`, `subheading`, `paragraph`, `label`,
  `button`, `caption`, `smallText`) rather than ad hoc `text-*`/`font-*` combinations.
- Recommended sizes: page title 24–30px (`heading3`/`heading2`), section title 18–20px (`subheading`/`heading4`),
  body/table/label/button 13–14px, helper text 12–13px.

## 9. Color Rules

- Brand primary (`#0A0082`) and secondary (`#B83280`) come only from `bg-brand-primary` / `bg-brand-secondary`
  (and their `-hover` variants) — do not hardcode these hex values in new code.
- Status/semantic colors come only from `success`/`warning`/`danger`/`info`/`neutral` tokens.
- Do not introduce new arbitrary hex colors in canonical components or new pattern components.

## 10. Button Rules

- Always use `src/components/Button/Button.jsx`. Do not create a module-local button.
- `ui/button.jsx` (shadcn-style, 23 consumers, mostly `resource_management`) is legacy — do not add new
  consumers; existing ones are untouched.

## 11. Input Rules

- `src/components/ui/input.jsx` is canonical (h-10, `rounded-md`, bordered, focus ring) — use it directly, or
  wrap it with `FormField` for label/error/helper text.
- Do not create a second Input component. (Note: a capitalized `Input.jsx` cannot coexist with the existing
  lowercase `input.jsx` on a case-insensitive filesystem — see §27.)

## 12. Select Rules

- `src/components/ui/select.jsx` is canonical for simple in-house selects.
- `react-select` and Headless UI `Listbox` remain valid for searchable/multi-select/complex behavior — do not
  force-migrate those call sites.

## 13. Modal Rules

- Always use `src/components/Modal/modal.jsx`. It supports sizes `xs`–`7xl`/`full`/`screen`, header, footer,
  and now Escape-to-close.
- `ui/Modal.jsx` (33 consumers) and `Modal/modalold.jsx` are legacy — do not add new consumers.

## 14. Table Rules

- New tables should use `src/components/patterns/DataTable.jsx`.
- Do not rewrite existing bespoke tables (`InvoiceTable`, `VendorTable`, `CandidateTable`, etc.) in Phase 1 or
  as a blanket Phase 2 action — migrate only when a module is otherwise being touched.

## 15. Badge / Status Rules

- Use `src/components/patterns/StatusBadge.jsx` for new status displays.
- `src/components/status/statusbadge.jsx` (49 consumers) and `src/components/ui/badge.jsx` (38 consumers,
  mostly `airs`) remain in place — do not delete, do not add new consumers.

## 16. FilterBar Rules

- Use `src/components/patterns/FilterBar.jsx` as the outer shell for new filter UIs; compose it with
  `Input`/`Select`/`Button`. Existing `src/components/filter/*` components are untouched and still valid.

## 17. PageContainer Rules

- Wrap new page bodies in `src/components/patterns/PageContainer.jsx` for consistent `p-4`/`p-6` spacing.
  Not applied to existing pages in Phase 1.

## 18. PageHeader Rules

- Always use `src/components/ui/PageHeader.jsx`. `breadcrumbs` is optional.

## 19. PageCard Rules

- Always use `src/components/Cards/PageCard.jsx` + `PageCardContent`. Use the new `title`/`subtitle`/`actions`
  props instead of hand-rolling a header row inside the card.

## 20. EmptyState Rules

- Use `src/components/patterns/EmptyState.jsx` for "no data" states in new/migrated screens.

## 21. Loading Rules

- Default page/section loader: `LoadingSpinner` (`src/components/LoadingSpinner.jsx`) or the new
  `PageLoader`/`InlineLoader` wrappers in `src/components/patterns/Loaders.jsx`.
- Table loading state: `TableSkeleton` from the same file.
- `ui/Loader.jsx` remains for its existing 3 consumers, now restyled to the brand color.

## 22. ConfirmDialog Rules

- Use `src/components/patterns/ConfirmDialog.jsx` for new destructive-action confirmations instead of a
  bespoke modal.

## 23. Form Rules

- Compose `FormField` (label + error/helper text) around any input control; use `FormSection`/`FormActions`
  for layout. Existing `src/components/forms/FormInput.jsx` / `FormSelect.jsx` / etc. are unchanged and remain
  valid for existing consumers.

## 24. Tabs Rules

- Use `src/components/ui/tabs.jsx` for new tabbed UIs. It already has a clear active state, consistent
  typography/spacing, and predictable Context-based API.

## 25. Icon Rules

- Prefer `lucide-react` for any icon used inside a canonical/pattern component (all new components in this
  phase use it exclusively). No app-wide icon migration was performed.

## 26. Backward Compatibility Decisions

- Every enhanced canonical component (Button, Modal, PageCard, PageHeader, Pagination, Loader) keeps its
  exact existing prop names and default rendering; all new behavior is opt-in via new optional props or is a
  pure color/token substitution with identical visual output for existing hardcoded-hex call sites.
- No existing import path changed. No component was deleted or renamed.

## 27. Filesystem Constraint (read before adding new `ui/` files)

Windows' default filesystem is case-insensitive. `src/components/ui/` already contains lowercase
`button.jsx`, `input.jsx`, `select.jsx`, `badge.jsx`, `tabs.jsx`. A new file that differs only by case
(`Button.jsx`, `Input.jsx`, `Select.jsx`, `Badge.jsx`) would collide with the existing file on disk even
though git treats them as distinct paths — this caused Phase 1 to deliberately avoid creating those files and
instead enhance the existing lowercase ones in place, or place genuinely new components under
`src/components/patterns/` where no name collision exists. Follow the same rule in later phases.

## 28. Deprecated / Legacy Components (not deleted)

- `src/components/ui/button.jsx` — legacy Button variant, 23 consumers (mostly `resource_management`).
- `src/components/ui/Modal.jsx` — legacy Modal, 33 consumers.
- `src/components/Modal/modalold.jsx` — appears to have no consumers; not deleted without a full-repo import
  verification (Rule 13). Flagged for removal after that verification in Phase 2.
- `src/components/ui/badge.jsx`, `src/components/status/statusbadge.jsx` — legacy badges, kept per §15.
- `react-paginate`, `react-pagination` npm packages — installed but not clearly the canonical pagination path;
  not removed (dependency change out of scope).

## 29. Components Intentionally Not Deleted

All items in §28, plus every page-specific Button/Modal/Card/Table/Badge/Tabs variant under `src/pages/**`
(there are dozens). These are Phase 2 migration targets, not Phase 1 deletions, per Rule 13.

## 30. Known Pre-existing Issues (not caused by, and not fixed in, Phase 1)

- `clsx` is imported directly in `src/components/status/statusbadge.jsx` but is not a direct dependency in
  `package.json` (only present transitively). Currently resolves fine but is fragile to lockfile changes.
- Mixed Tailwind tooling: `tailwindcss@^3.4.17` (devDependency, v3 engine) alongside `@tailwindcss/vite@^4.1.13`
  (a v4 package) in dependencies.
- Three competing pagination approaches installed (`Pagination/pagination.jsx`, `react-paginate`,
  `react-pagination`).
- Three separate `TaskCard` implementations across `Projects/manager/Sprint`, `Board`, and `SwimlaneBoard`.
- The `.xms-density` block in `src/index.css` (~300 lines) rescales spacing/font-size utilities specifically
  for `/expense-management/*` routes via a scoped class — a module-specific density override sitting outside
  the Tailwind theme scale. Left untouched (Rule 14: do not modify module-level Tailwind styles yet).

## 31. Validation Performed

See §36 (Implementation Log) for the exact commands run and their results.

## 32–33. Build / Lint Result

- **Lint (`npm run lint`):** 2 pre-existing errors, unrelated to Phase 1 — see §36 for detail.
- **Build (`npm run build`):** Succeeds — see §36 for detail.

## 34. Migration Guidance for Future Modules

When migrating a module page in a later phase:

1. Do not change business logic, API calls, routing, or RBAC.
2. Replace raw `<button className="...">` markup with `<Button variant=... size=...>`.
3. Replace module-specific plain-card `<div className="rounded-xl border bg-white shadow-sm">` wrappers with
   `<PageCard>` (use its `title`/`actions` props instead of a hand-rolled header row).
4. Replace hand-rolled page header markup with `<PageHeader title=... subtitle=... actions=... />`.
5. Replace hand-rolled filter bars with `<FilterBar>` wrapping existing `Input`/`Select`/`Button`.
6. Replace bespoke tables with `<DataTable>` **only when the table has no specialized behavior** (custom
   grouping, drag-and-drop rows, etc. can stay bespoke).
7. Replace ad hoc `<span className="bg-*-100 text-*-700">` status pills with `<StatusBadge status=... />`.
8. Replace duplicate/local modals with `<Modal>` from `src/components/Modal/modal.jsx`.
9. Wrap form fields with `<FormField>`/`<FormSection>`/`<FormActions>`.
10. Wrap the page body in `<PageContainer>` for consistent spacing.
11. Keep business-specific layouts (Kanban boards, resume viewers, calendars, financial tables) as-is — only
    the surrounding visual language (buttons, cards, headers, badges, spacing) needs to conform.

### Before / After examples

```jsx
// BEFORE
<div className="px-4 py-2 bg-[#0A0082] text-white rounded-lg text-sm font-semibold">Add</div>
// AFTER
<Button variant="primary" size="md">Add</Button>

// BEFORE
<div className="rounded-xl border bg-white shadow-sm p-4">...</div>
// AFTER
<PageCard><PageCardContent>...</PageCardContent></PageCard>

// BEFORE
<div className="flex justify-between mb-4"><h1 className="text-2xl font-bold">Leave Management</h1></div>
// AFTER
<PageHeader title="Leave Management" subtitle="Handle leave requests and approvals" />

// BEFORE
<span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Approved</span>
// AFTER
<StatusBadge status="approved" />
```

## 35. Explicit Rules for Future AI Agents

- Do not create another Button, Modal, PageCard, PageHeader, StatusBadge, DataTable, or FilterBar inside a
  module unless there is a documented, reviewed business-specific reason (e.g. a Kanban card is not a
  `PageCard` and should stay bespoke).
- Before adding any file under `src/components/ui/`, check for an existing file that differs only by case —
  Windows treats them as the same file (§27).
- Before deleting anything under §28/§29, grep every import across `src/` and get explicit confirmation; do
  not assume "0 recent commits touch this" means "unused."
- Never repurpose the shadcn `--primary`/`--secondary`/`--muted`/etc. CSS variables for brand colors — use the
  dedicated `--brand-*` tokens instead, since 20+ existing components depend on the shadcn tokens for a neutral
  (non-brand) surface look.

## 36. Implementation Log

Branch: `intra-ui/unify`

### 2026-08-14

#### Design tokens
Files: `src/index.css`, `tailwind.config.js`

Change: Added `--brand-primary`, `--brand-primary-hover`, `--brand-secondary`, `--brand-secondary-hover`,
`--success(-bg)`, `--warning(-bg)`, `--danger(-bg)`, `--info(-bg)`, `--neutral(-bg)` CSS variables and exposed
them as Tailwind colors (`brand.primary`, `success`, `warning`, `danger`, `info`, `neutral`).

Reason: Establish a single source of truth for the Paves brand colors (`#0A0082` / `#B83280`) and semantic
status colors, per Phase 1 objective 1.

Compatibility: Purely additive — no existing `--primary`/`--secondary`/etc. shadcn token was modified, so
`ui/button.jsx`, `ui/input.jsx`, `ui/select.jsx`, `ui/badge.jsx`, `ui/tabs.jsx` (which read those tokens) are
unaffected.

#### Typography — font loading fix
File: `index.html`

Change: Added `Poppins` and `Fira Code` to the existing Google Fonts `<link>` (previously only `Inter` was
loaded).

Reason: `tailwind.config.js` already mapped `font-heading` → Poppins and `font-mono` → Fira Code, but neither
was ever loaded, so every heading in the app was silently falling back to the browser default sans-serif. This
directly blocks the typography-consistency objective of Phase 1.

Compatibility: Additive only; existing `font-heading`/`font-mono` classes now render as intended instead of
falling back.

Validation: Visual — Google Fonts URL parameters verified against Tailwind's configured family names.

#### Button
File: `src/components/Button/Button.jsx`

Change: Replaced hardcoded hex colors in `primary`/`secondary`/`danger` variants with the new `brand-*`/`danger`
design tokens. Added a visible `focus-visible` ring (previously `focus:outline-none` with no replacement).
Added `sm`/`md`/`lg` as aliases for the existing `small`/`medium`/`large` size names.

Reason: Establish one canonical, tokenized button system per Phase 1 objective 2, without breaking the 294
existing consumers of this component.

Compatibility: Existing API and default rendering fully preserved — same hex values, just sourced from CSS
variables now. `size` still accepts the original values; new aliases are additive.

#### Modal
File: `src/components/Modal/modal.jsx`

Change: Added Escape-key-to-close behavior, gated by a new optional `closeOnEscape` prop (default `true`).

Reason: Accessibility gap — the existing modal only closed via backdrop click or an explicit close button.

Compatibility: Additive prop with a safe default; every existing consumer already passes `onClose`, so the new
behavior only adds a keyboard affordance.

#### PageCard
File: `src/components/Cards/PageCard.jsx`

Change: Added optional `title`/`subtitle`/`actions` header rendering and a `padding` prop on
`PageCardContent`.

Reason: 52 existing consumers hand-roll a header row inside the card; giving `PageCard` a built-in header lets
Phase 2 migrations drop that duplication.

Compatibility: All new props are optional; omitting them renders byte-identical output to before.

#### PageHeader
File: `src/components/ui/PageHeader.jsx`

Change: Added an optional `breadcrumbs` prop.

Reason: Phase 1 objective 8 calls for optional breadcrumb support.

Compatibility: Optional prop; 28 existing consumers unaffected.

#### Loader
File: `src/components/ui/Loader.jsx`

Change: Restyled the spin border from gray/black to the brand primary color.

Reason: This loader's colors disagreed with the dominant `LoadingSpinner` component's brand-colored spinner —
a small but visible inconsistency.

Compatibility: Component takes no props; all 3 existing consumers are unaffected beyond the (intended) color
change.

#### Pagination
File: `src/components/Pagination/pagination.jsx`

Change: Replaced arbitrary `indigo-500`/`indigo-600` hover/active colors with `brand-primary`.

Reason: Indigo was never an intentional brand choice; aligning it with the brand primary removes a visible
inconsistency across the 89 pages that use this component.

Compatibility: Same class structure and props; color-only change.

#### New pattern components
Files: `src/components/patterns/{StatusBadge,PageContainer,FilterBar,DataTable,EmptyState,ConfirmDialog,Loaders}.jsx`

Change: Created seven new components implementing Phase 1 objectives 5, 7, 10, 11, 13, 15.

Reason: No existing generic equivalent could be safely reused without breaking consumers (see §26/§28 for why
the legacy Badge/Loader/etc. were kept rather than replaced).

Compatibility: All new files; zero existing imports affected.

#### Form foundation
Files: `src/components/forms/{FormLabel,FormError,FormHelperText,FormField,FormSection,FormActions}.jsx`

Change: Created six new form-layout primitives per Phase 1 objective 16.

Reason: Existing `FormInput`/`FormSelect`/etc. bundle label+input+error together; the new primitives let
future code compose a label/error/helper layout around any control (including `react-select`/`Listbox`-based
ones).

Compatibility: All new files; existing `src/components/forms/*` components untouched.

### Validation Summary

Run after all changes above were made, on `intra-ui/unify`:

- **Lint (`npm run lint`):** 2 pre-existing errors, both unrelated to Phase 1 —
  `react-hooks/exhaustive-deps` rule definition not found in
  `src/pages/airs/dashboard/hooks/useDashboardSection.js` and
  `src/pages/airs/talent-pool/hooks/useTalentPool.js` (an ESLint plugin/config issue, not a code defect
  introduced here). No lint errors in any file touched by Phase 1.
- **Build (`npm run build`):** Initially failed with `Rollup failed to resolve import "@dnd-kit/core"` —
  caused by an incomplete `node_modules` install already present before this work started (`@dnd-kit/*` was
  declared in `package.json` but missing on disk), not by any Phase 1 change. Ran `npm install` to restore the
  declared dependencies, then reverted the resulting `package-lock.json` diff (`git checkout -- package-lock.json`)
  since it reflected unrelated pre-existing lockfile drift, not a Phase 1 dependency change, and bundling it
  would be out of scope for this UI-only PR. `node_modules` remains fully installed locally for testing.
  With dependencies present, `npm run build` completed successfully (`✓ built in ~1m`) — only pre-existing
  warnings (large chunk sizes, dynamic/static import overlap in a few pages, an `eval` warning inside the
  `exceljs` dependency) were reported, none introduced by this work.
