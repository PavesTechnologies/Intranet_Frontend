import { useMemo } from "react";
import { AlertCircle, Loader2, Lock, Trash2 } from "lucide-react";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import {
  MILESTONE_ENTRY_STATE,
  getMilestoneEntryFrozenState,
  getMilestoneIneligibilityReason,
  isMilestoneEntryLocked,
} from "../../services/projectMilestoneService";

const READINESS_LABELS = {
  READY_FOR_BILLING: { label: "Ready for billing", tone: "bg-emerald-100 text-emerald-800" },
  NOT_READY: { label: "Not ready", tone: "bg-amber-100 text-amber-800" },
  NOT_BILLABLE: { label: "Not billable in PMS", tone: "bg-slate-100 text-slate-600" },
};

const roundPercent = (n) => Math.round((Number(n) || 0) * 100) / 100;

const fieldInput =
  "h-9 w-full rounded-lg border px-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20";

function ReadinessBadge({ readiness }) {
  if (!readiness) return <span className="text-slate-400">—</span>;
  const known = READINESS_LABELS[readiness];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        known ? known.tone : "bg-slate-100 text-slate-600"
      }`}
    >
      {known ? known.label : readiness}
    </span>
  );
}

const hasValue = (value) => value !== "" && value !== null && value !== undefined;

// Picks which PMS milestones a Milestone Plan bills and how much of the
// contract each one bills. The milestone list comes from the backend
// (GET /api/projects/{pmsProjectId}/milestones) and is passed in with its
// loading state; the plan's entries ({ pmsMilestoneId, percentage, billingDate,
// remarks, ... }) are owned by the parent form. The PMS allocation percentage
// is shown for reference only — the AR percentage is always entered here.
export default function PmsMilestoneSelectionPanel({
  pmsProjectId,
  milestonesState,
  onReload,
  entries = [],
  onEntriesChange,
  totalValue = 0,
  currency = "INR",
}) {
  const { status, milestones, error } = milestonesState;

  const entryByMilestone = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      if (entry.pmsMilestoneId !== null && entry.pmsMilestoneId !== undefined) map.set(entry.pmsMilestoneId, entry);
    });
    return map;
  }, [entries]);

  const listedIds = useMemo(() => new Set(milestones.map((m) => m.pmsMilestoneId)), [milestones]);
  // Saved entries whose milestone the backend no longer lists (deleted in PMS,
  // or not part of this project). Only meaningful once a list has really loaded.
  const unlistedEntries = status === "success" ? entries.filter((e) => !listedIds.has(e.pmsMilestoneId)) : [];

  const toggle = (milestone) => {
    if (entryByMilestone.has(milestone.pmsMilestoneId)) {
      const existingEntry = entryByMilestone.get(milestone.pmsMilestoneId);
      if (isMilestoneEntryLocked(existingEntry)) {
        return;
      }
      onEntriesChange(entries.filter((e) => e.pmsMilestoneId !== milestone.pmsMilestoneId));
      return;
    }
    const ineligibilityReason = getMilestoneIneligibilityReason(milestone);
    const isEligible = milestone.eligibleForBilling !== undefined ? Boolean(milestone.eligibleForBilling) : !ineligibilityReason;
    if (!isEligible) return;

    onEntriesChange([
      ...entries,
      {
        clientKey: `pms-milestone-${milestone.pmsMilestoneId}`,
        pmsMilestoneId: milestone.pmsMilestoneId,
        percentage: "",
        billingDate: milestone.plannedCompletionDate || "",
        remarks: milestone.name,
      },
    ]);
  };

  const patchEntry = (pmsMilestoneId, patch) => {
    if (isMilestoneEntryLocked(entryByMilestone.get(pmsMilestoneId))) {
      return;
    }
    onEntriesChange(entries.map((e) => (e.pmsMilestoneId === pmsMilestoneId ? { ...e, ...patch } : e)));
  };

  const removeEntry = (pmsMilestoneId) => {
    if (isMilestoneEntryLocked(entryByMilestone.get(pmsMilestoneId))) {
      return;
    }
    onEntriesChange(entries.filter((e) => e.pmsMilestoneId !== pmsMilestoneId));
  };

  const selectedCount = entries.length;
  const currentCycleTotalPercentage = entries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0);
  const currentCycleScheduledAmount = entries.reduce((sum, e) => sum + ((Number(e.percentage) || 0) / 100) * totalValue, 0);

  return (
    <div className="space-y-4" data-testid="pms-milestone-panel">
      {status === "loading" && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading milestones from PMS…
        </p>
      )}

      {status === "error" && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </span>
          {pmsProjectId ? (
            <button
              type="button"
              onClick={onReload}
              className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          ) : null}
        </div>
      )}

      {status === "success" && milestones.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          No milestones have been synchronised from PMS for this project yet. Add them in PMS, then use Sync.
        </p>
      )}

      {status === "success" && milestones.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              PMS Milestones ({milestones.length}) · {selectedCount} selected
            </span>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium text-slate-500">
                Scheduled (Current Cycle):{" "}
                <span className="font-semibold tabular-nums text-[#0A0082]">
                  {formatCurrency(currentCycleScheduledAmount, currency)} ({roundPercent(currentCycleTotalPercentage)}%)
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-slate-500">
                Total Contract Value:{" "}
                <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(totalValue, currency)}</span>
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3.5 py-2.5">Bill</th>
                  <th className="px-3.5 py-2.5">Milestone</th>
                  <th className="px-3.5 py-2.5">Planned Due</th>
                  <th className="px-3.5 py-2.5">PMS Status</th>
                  <th className="px-3.5 py-2.5">PMS Allocation (reference)</th>
                  <th className="px-3.5 py-2.5">Readiness</th>
                  <th className="px-3.5 py-2.5">Billing State</th>
                  <th className="px-3.5 py-2.5">AR Billing %</th>
                  <th className="px-3.5 py-2.5">Billing Date</th>
                  <th className="px-3.5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {milestones.map((milestone) => {
                  const entry = entryByMilestone.get(milestone.pmsMilestoneId);
                  const selected = Boolean(entry);
                  const percentNum = Number(entry?.percentage);
                  const percentInvalid =
                    selected && hasValue(entry.percentage) && (Number.isNaN(percentNum) || percentNum <= 0 || percentNum > 100);

                  const ineligibilityReason = getMilestoneIneligibilityReason(milestone);
                  const isEligible = milestone.eligibleForBilling !== undefined ? Boolean(milestone.eligibleForBilling) : !ineligibilityReason;
                  // the ENTRY's own backend state decides; the milestone-level billing state below is display only
                  const entryState = selected ? getMilestoneEntryFrozenState(entry) : null;
                  const isFrozen = entryState === MILESTONE_ENTRY_STATE.FROZEN;
                  const isStateUnknown = entryState === MILESTONE_ENTRY_STATE.UNKNOWN;
                  const isLocked = isFrozen || isStateUnknown;

                  const billingStateUpper = milestone.billingState ? String(milestone.billingState).toUpperCase() : "";
                  const isAlreadyBilled = Boolean(
                    milestone.alreadyBilled || milestone.billed || milestone.isBilled || billingStateUpper === "BILLED",
                  );
                  const isReserved = Boolean(
                    milestone.reserved || milestone.isReserved || milestone.reservedBy || billingStateUpper === "RESERVED",
                  );
                  const isCheckboxDisabled = (!selected && !isEligible) || isLocked;

                  return (
                    <tr
                      key={milestone.pmsMilestoneId}
                      className={selected ? "bg-[#0A0082]/[0.03]" : ineligibilityReason ? "bg-slate-50/40 opacity-80" : "hover:bg-slate-50/80"}
                    >
                      <td className="px-3.5 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Bill milestone ${milestone.code || milestone.pmsMilestoneId}`}
                          checked={selected}
                          disabled={isCheckboxDisabled}
                          title={isLocked ? "This milestone is locked and cannot be removed." : ineligibilityReason || "Select milestone"}
                          onChange={() => toggle(milestone)}
                          className="h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-[#0A0082]/30 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3.5 py-3">
                        {milestone.code && <div className="font-mono text-xs font-semibold text-slate-900">{milestone.code}</div>}
                        <div className="text-xs font-medium text-slate-800">{milestone.name || `Milestone ${milestone.pmsMilestoneId}`}</div>
                        {selected && isFrozen && (
                          <div
                            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-700"
                            data-testid={`frozen-indicator-${milestone.pmsMilestoneId}`}
                            title="This milestone is already in billing or invoiced and cannot be modified or removed."
                          >
                            <Lock className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>Billed / Locked</span>
                            <span className="text-slate-500 font-normal">· Cannot be modified or removed</span>
                            {entry.occurrenceStatus && (
                              <span className="text-slate-500 font-normal" data-testid={`frozen-occurrence-${milestone.pmsMilestoneId}`}>
                                · Occurrence {entry.occurrenceStatus}{entry.invoiced ? " (invoiced)" : ""}
                              </span>
                            )}
                          </div>
                        )}
                        {isStateUnknown && (
                          <div
                            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700"
                            data-testid={`unknown-state-indicator-${milestone.pmsMilestoneId}`}
                            title="The server did not report whether billing has started for this entry, so it is kept read-only. Reload the plan."
                          >
                            <Lock className="h-3 w-3 shrink-0" />
                            <span>Billing state unavailable</span>
                            <span className="font-normal">· Read-only until the plan is reloaded</span>
                          </div>
                        )}
                        {ineligibilityReason && !selected && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700" data-testid={`ineligible-reason-${milestone.pmsMilestoneId}`}>
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{ineligibilityReason}</span>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 tabular-nums">
                        {milestone.plannedCompletionDate ? formatDisplayDate(milestone.plannedCompletionDate) : "—"}
                        {milestone.actualCompletionDate && (
                          <div className="text-[10px] font-medium text-emerald-600">
                            Done: {formatDisplayDate(milestone.actualCompletionDate)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">{milestone.executionStatus || "—"}</td>
                      <td className="whitespace-nowrap px-3.5 py-3 tabular-nums text-slate-500">
                        {milestone.pmsAllocationPercentage !== null ? `${milestone.pmsAllocationPercentage}%` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <ReadinessBadge readiness={milestone.billingReadiness} />
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {billingStateUpper === "INVOICED" ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                            Invoiced
                          </span>
                        ) : billingStateUpper === "IN_BILLING" ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            In Billing
                          </span>
                        ) : billingStateUpper === "RESERVED" ? (
                          <span
                            className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                            title={milestone.billingConfigurationId || milestone.reservedBy ? `Billing plan ${milestone.billingConfigurationId || milestone.reservedBy}` : undefined}
                          >
                            {milestone.reservedBy ? `Reserved (${milestone.reservedBy})` : "Reserved"}
                          </span>
                        ) : billingStateUpper === "AVAILABLE" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Available
                          </span>
                        ) : isAlreadyBilled ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            Already billed
                          </span>
                        ) : isReserved ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {milestone.reservedBy ? `Reserved (${milestone.reservedBy})` : "Reserved"}
                          </span>
                        ) : (
                          // missing or unrecognised: never guessed as AVAILABLE
                          <span
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                            data-testid={`billing-state-unavailable-${milestone.pmsMilestoneId}`}
                            title={
                              milestone.billingState
                                ? `Unrecognised billing state "${milestone.billingState}" reported by the server.`
                                : "The server did not report a billing state for this milestone."
                            }
                          >
                            State unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {selected ? (
                          <div className="relative w-28">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              inputMode="decimal"
                              aria-label={`AR billing percentage for ${milestone.code || milestone.pmsMilestoneId}`}
                              value={entry.percentage ?? ""}
                              placeholder="Enter %"
                              disabled={isLocked}
                              onChange={(event) => patchEntry(milestone.pmsMilestoneId, { percentage: event.target.value })}
                              className={`${fieldInput} pr-6 tabular-nums ${percentInvalid ? "border-red-400" : "border-slate-300"} disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">%</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {selected ? (
                          <input
                            type="date"
                            aria-label={`Billing date for ${milestone.code || milestone.pmsMilestoneId}`}
                            value={entry.billingDate || ""}
                            disabled={isLocked}
                            onChange={(event) => patchEntry(milestone.pmsMilestoneId, { billingDate: event.target.value })}
                            className={`${fieldInput} w-40 border-slate-300 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {selected && hasValue(entry.percentage) && !percentInvalid
                          ? formatCurrency((percentNum / 100) * totalValue, currency)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unlistedEntries.length > 0 && (
        <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-start gap-2 font-semibold">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            These saved entries refer to milestones PMS no longer lists for this project (deleted, or not part of it).
            Entries that can still change must be removed before saving; locked entries are kept as they are.
          </p>
          <ul className="space-y-1">
            {unlistedEntries.map((entry) => (
              <li key={entry.pmsMilestoneId ?? entry.clientKey} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                <span>
                  PMS milestone {entry.pmsMilestoneId ?? "(none)"} — {entry.percentage || 0}%
                </span>
                {isMilestoneEntryLocked(entry) ? (
                  <span
                    className="inline-flex items-center gap-1 font-semibold text-slate-700"
                    data-testid={`unlisted-locked-${entry.pmsMilestoneId}`}
                    title="Billing has started for this entry, so it stays in the plan even though PMS no longer lists the milestone."
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-500" /> Locked · source milestone unavailable in PMS
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.pmsMilestoneId)}
                    className="inline-flex items-center gap-1 text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
