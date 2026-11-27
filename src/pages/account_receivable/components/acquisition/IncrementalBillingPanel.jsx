import { useMemo, useState } from "react";
import {
  Layers,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  Info,
  ChevronDown,
  ExternalLink,
  FileText,
  Calculator,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import { formatBillingPeriod, PERIOD_READINESS } from "../../services/billingDataAcquisitionService";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../../utils/format";

const READINESS_STYLE = {
  [PERIOD_READINESS.READY]: { label: "Ready", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  [PERIOD_READINESS.NO_NEW_ITEMS]: { label: "No New Items", cls: "border-slate-200 bg-slate-50 text-slate-600", Icon: Info },
  [PERIOD_READINESS.BLOCKED]: { label: "Blocked", cls: "border-amber-200 bg-amber-50 text-amber-700", Icon: AlertTriangle },
  [PERIOD_READINESS.SOURCE_UNAVAILABLE]: { label: "Source Unavailable", cls: "border-red-200 bg-red-50 text-red-700", Icon: WifiOff },
};

/**
 * The next step toward an invoice for one batch, from its own snapshot and
 * invoice status. Invoices are generated per snapshot after tax is calculated.
 */
export function getBatchInvoiceAction(batch) {
  if (!batch?.snapshotId) return null;
  const status = String(batch.snapshotStatus || "").toUpperCase();
  if (status === "CANCELLED") return null;
  if (batch.invoiceId || status === "INVOICED") return { kind: "VIEW_INVOICE", label: "View Invoice", Icon: FileText };
  if (status === "TAX_COMPLETED") return { kind: "GENERATE_INVOICE", label: "Generate Invoice", Icon: FileText };
  return { kind: "CALCULATE_TAX", label: "Calculate Tax", Icon: Calculator };
}

function humanize(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(value, currency) {
  return value === null || value === undefined ? "—" : formatCurrency(value, currency || "USD");
}

function plain(value, digits = 2) {
  return value === null || value === undefined
    ? "—"
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400" title={hint}>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function ReadinessBadge({ readiness }) {
  const style = READINESS_STYLE[readiness] || { label: humanize(readiness), cls: "border-slate-200 bg-slate-50 text-slate-600", Icon: Info };
  const { Icon } = style;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.cls}`}>
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

function ReadinessMessage({ period }) {
  const { readiness, blockingReasons } = period;
  if (readiness === PERIOD_READINESS.NO_NEW_ITEMS) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        {period.previouslyAcquired
          ? "No new approved records since the last batch of this period."
          : "No approved billable records are available for this period yet."}
      </p>
    );
  }
  if ((readiness === PERIOD_READINESS.BLOCKED || readiness === PERIOD_READINESS.SOURCE_UNAVAILABLE) && blockingReasons.length > 0) {
    const tone =
      readiness === PERIOD_READINESS.SOURCE_UNAVAILABLE
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    return (
      <ul className={`mt-3 space-y-1 rounded-lg border p-3 text-xs font-medium ${tone}`} role="alert">
        {blockingReasons.map((reason, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="break-words">{reason}</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function BatchTable({ batches, currency, busy, openingSnapshotId, activeSnapshotId, onOpenBatch, onBatchInvoice }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Batch</th>
            <th className="px-3 py-2">Snapshot</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Timesheets</th>
            <th className="px-3 py-2 text-right">Expenses</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Invoice</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {batches.map((batch) => {
            const action = getBatchInvoiceAction(batch);
            const isActive = activeSnapshotId && String(activeSnapshotId) === String(batch.snapshotId);
            const isOpening = openingSnapshotId && String(openingSnapshotId) === String(batch.snapshotId);
            const isCancelled = String(batch.snapshotStatus || "").toUpperCase() === "CANCELLED";
            return (
              <tr key={batch.snapshotId || `${batch.batchSequence}-${batch.createdDate}`} className={isActive ? "bg-indigo-50/60" : ""}>
                <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-slate-800">#{batch.batchSequence ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-700">
                  {batch.snapshotNumber || "—"}
                  {isActive && <span className="ml-1.5 rounded bg-indigo-100 px-1 py-0.5 font-sans text-[10px] font-semibold text-indigo-700">Open</span>}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 ${isCancelled ? "text-slate-400 line-through" : "text-slate-700"}`}>{humanize(batch.snapshotStatus)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{batch.timesheetCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{batch.expenseCount}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold">{money(batch.totalAmount, currency)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatDisplayDateTime(batch.createdDate)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {batch.invoiceId ? (
                    <span>
                      <span className="font-mono">{batch.invoiceNumber || "—"}</span>
                      {batch.invoiceStatus && <span className="ml-1 text-slate-400">({humanize(batch.invoiceStatus)})</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not generated</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="small"
                      className="text-xs"
                      disabled={busy || !batch.snapshotId}
                      onClick={() => onOpenBatch(batch)}
                      aria-label={`Open snapshot ${batch.snapshotNumber || ""}`}
                    >
                      <ExternalLink className={`h-3.5 w-3.5 ${isOpening ? "animate-pulse" : ""}`} />
                      {isOpening ? "Opening..." : "Open"}
                    </Button>
                    {action && (
                      <Button
                        variant="outline"
                        size="small"
                        className="text-xs"
                        disabled={busy}
                        onClick={() => onBatchInvoice(batch, action)}
                      >
                        <action.Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Snapshots whose own period overlaps this billing period without being one of
 * the configuration's periods (backend `overlappingSnapshots`). Reference only:
 * they are not batches of this period, carry no actions here, and are excluded
 * from the batch count. Records they already bill are excluded from the new
 * counts by the backend, per record.
 */
function OverlappingSnapshots({ snapshots }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3" aria-label="Overlapping snapshots">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Overlapping snapshot{snapshots.length === 1 ? "" : "s"} · not batches of this period
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Created for a different billing period that overlaps this one. Records they already bill are not counted as new.
          </p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {snapshots.map((snap, idx) => (
          <li
            key={snap.snapshotId || `${snap.snapshotNumber}-${idx}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            <span className="font-mono font-semibold text-slate-800">{snap.snapshotNumber || "—"}</span>
            <span className="tabular-nums text-slate-600">
              {snap.billingPeriodStart && snap.billingPeriodEnd
                ? formatBillingPeriod(snap.billingPeriodStart, snap.billingPeriodEnd)
                : "Period unknown"}
            </span>
            {snap.periodAligned !== true && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                Non-aligned period
              </span>
            )}
            <span className="text-slate-500">{humanize(snap.snapshotStatus)}</span>
            <span className="ml-auto whitespace-nowrap">
              {snap.invoiceNumber ? (
                <>
                  <span className="text-slate-400">Invoice </span>
                  <span className="font-mono">{snap.invoiceNumber}</span>
                </>
              ) : (
                <span className="text-slate-400">No invoice</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Incremental Time & Material billing: every billing period the backend
 * discovered, what is newly billable in it, and its batches. A period can hold
 * several batches; each batch is its own snapshot and invoice.
 */
export default function IncrementalBillingPanel({
  discovery,
  loading = false,
  error = null,
  currency,
  creatingPeriodKey = null,
  busy = false,
  openingSnapshotId = null,
  activeSnapshotId = null,
  onRefresh,
  onCreateBatch,
  onOpenBatch,
  onBatchInvoice,
}) {
  const [onlyNew, setOnlyNew] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Newest period first; the backend returns them in schedule order.
  const periods = useMemo(() => {
    const list = discovery?.periods ? [...discovery.periods].reverse() : [];
    return onlyNew ? list.filter((p) => p.hasNewItems) : list;
  }, [discovery, onlyNew]);

  const disabledAll = busy || loading || Boolean(creatingPeriodKey);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Incremental billing" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Incremental Billing</h2>
          </div>
          {discovery && (
            <p className="mt-1 text-[11px] text-slate-500">
              {humanize(discovery.billingFrequency)} periods
              {discovery.scheduleStart ? ` from ${formatDisplayDate(discovery.scheduleStart)}` : ""}
              {" · "}Expense billing {discovery.expenseBillingEnabled ? "on" : "off"}
              {discovery.asOf ? ` · As of ${formatDisplayDate(discovery.asOf)}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
            />
            Only periods with new items
          </label>
          <Button
            variant="outline"
            size="small"
            className="text-xs font-semibold"
            onClick={onRefresh}
            disabled={loading || Boolean(creatingPeriodKey)}
            aria-label="Refresh billing periods"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {discovery?.warnings?.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
          {discovery.warnings.map((w, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="break-words">{w}</span>
            </li>
          ))}
        </ul>
      )}

      {loading && !discovery && <p className="mt-4 text-xs text-slate-500">Loading billing periods…</p>}

      {discovery && periods.length === 0 && !loading && (
        <p className="mt-4 text-xs text-slate-500">
          {onlyNew ? "No billing period has new records." : "No billing period has started for this configuration yet."}
        </p>
      )}

      {periods.length > 0 && (
        <ul className="mt-4 max-h-[36rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {periods.map((period) => {
            const isCreating = creatingPeriodKey === period.key;
            const canCreate = period.readiness === PERIOD_READINESS.READY;
            const isOpen = Boolean(expanded[period.key]);
            return (
              <li key={period.key} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatBillingPeriod(period.billingPeriodStart, period.billingPeriodEnd)}
                      </span>
                      <ReadinessBadge readiness={period.readiness} />
                      {period.partialPeriod && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Partial</span>
                      )}
                      {!period.periodEnded && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Open period</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {period.periodNumber != null ? `Period ${period.periodNumber}` : ""}
                      {period.billingDate ? ` · Billing date ${formatDisplayDate(period.billingDate)}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    className={`text-xs font-semibold ${!canCreate ? "cursor-not-allowed opacity-50" : ""}`}
                    disabled={!canCreate || disabledAll}
                    onClick={() => onCreateBatch(period)}
                    title={!canCreate ? READINESS_STYLE[period.readiness]?.label : undefined}
                  >
                    <PlusCircle className={`h-3.5 w-3.5 ${isCreating ? "animate-spin" : ""}`} />
                    {isCreating ? "Creating Batch..." : "Create Batch"}
                  </Button>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Metric label="New Timesheets" value={plain(period.newTimesheetCount, 0)} />
                  <Metric label="New Billable Hours" value={plain(period.newBillableHours)} />
                  <Metric label="New Expenses" value={plain(period.newExpenseCount, 0)} />
                  <Metric
                    label="New Expense Amount"
                    value={plain(period.newExpenseAmount)}
                    hint="Expense cost basis in each expense's own currency; converted when the batch is created."
                  />
                  <Metric
                    label="Est. Timesheet Amount"
                    value={money(period.estimatedTimesheetAmount, currency)}
                    hint="Hours × rate of the newly eligible timesheets, as estimated by the backend."
                  />
                  <Metric label="Batches" value={period.batches.length} />
                </dl>

                <ReadinessMessage period={period} />

                {period.batches.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                      onClick={() => setExpanded((prev) => ({ ...prev, [period.key]: !prev[period.key] }))}
                      aria-expanded={isOpen}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      {isOpen ? "Hide" : "Show"} {period.batches.length} batch{period.batches.length === 1 ? "" : "es"}
                    </button>
                    {isOpen && (
                      <BatchTable
                        batches={period.batches}
                        currency={currency}
                        busy={disabledAll || Boolean(openingSnapshotId)}
                        openingSnapshotId={openingSnapshotId}
                        activeSnapshotId={activeSnapshotId}
                        onOpenBatch={onOpenBatch}
                        onBatchInvoice={onBatchInvoice}
                      />
                    )}
                  </div>
                )}

                {period.overlappingSnapshots?.length > 0 && (
                  <OverlappingSnapshots snapshots={period.overlappingSnapshots} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
