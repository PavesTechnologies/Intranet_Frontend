// Shared entry-selection helpers.
//
// This lives in its own leaf module on purpose: EntriesTable already imports
// ConfirmDialog from TimesheetGroup, which imports EntriesTable. Hanging these
// helpers off either file would turn that cycle bidirectional and make module
// evaluation order matter.

// Key used for the "+ New Timesheet" panel, whose timesheet does not exist
// server-side yet. A stable string (rather than `undefined`) keeps the key
// meaningful while the user changes the date in the picker.
export const DRAFT_DAY_KEY = "draft-day";

export const dayKeyFor = (timesheetId) =>
  timesheetId == null ? DRAFT_DAY_KEY : `ts-${timesheetId}`;

// The id a row is selected by. Must stay the single source of truth — the day
// header's select-all and the per-row checkbox have to agree on it.
export const getEntryRowId = (entry, idx) =>
  entry?.timesheetEntryId ?? entry?.timesheetEntryid ?? `new-${idx}`;

export const getEntryRowIds = (entries = [], pendingEntries = []) =>
  [...entries, ...pendingEntries].map(getEntryRowId);

// `new-<idx>` is a render-time fallback for a row the backend sent without an
// id — it is not a real entry id and must never reach the delete endpoint.
export const isDeletableRowId = (id) =>
  id != null && !(typeof id === "string" && id.startsWith("new-"));

export const isPendingRowId = (id) =>
  typeof id === "string" && id.startsWith("pending-");
