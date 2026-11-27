import { CalendarRange, Play, RefreshCw, AlertTriangle, CheckCircle2, Info, WifiOff } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { formatBillingPeriod } from "../../services/billingDataAcquisitionService";

// The backend reports a TMS outage as a reason, not an HTTP error.
const TMS_UNREACHABLE = /could not be read from TMS/i;

function humanizeFrequency(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatHours(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatCount(value) {
  return value === null || value === undefined ? "—" : String(value);
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * The next billing period the backend says can be acquired for this
 * Time & Material configuration. Displays it as-is; never derives a period.
 */
export default function NextBillingPeriodCard({
  nextPeriod,
  loading = false,
  error = null,
  acquiring = false,
  onAcquire,
  onRefresh,
}) {
  const allowed = Boolean(nextPeriod?.acquisitionAllowed);
  const tmsDown = !allowed && TMS_UNREACHABLE.test(nextPeriod?.reason || "");
  const busy = loading || acquiring;

  let tone = "info";
  if (error || tmsDown) tone = "error";
  else if (allowed) tone = "success";
  else if (nextPeriod) tone = "warning";

  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];
  const ToneIcon = error ? AlertTriangle : tmsDown ? WifiOff : allowed ? CheckCircle2 : nextPeriod ? AlertTriangle : Info;

  const message = error
    ? error
    : nextPeriod?.reason ||
      (nextPeriod && !nextPeriod.hasPeriod ? "No further billing period is available for this configuration." : "");

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label="Next billing period"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Next Billing Period</h2>
          {nextPeriod?.partialPeriod && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Partial period
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={onRefresh}
            disabled={busy}
            className="text-xs font-semibold"
            aria-label="Refresh next billing period"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={onAcquire}
            disabled={!allowed || busy}
            className={`text-xs font-semibold ${!allowed ? "cursor-not-allowed opacity-50" : ""}`}
            title={!allowed && message ? message : undefined}
          >
            <Play className={`h-3.5 w-3.5 ${acquiring ? "animate-spin" : ""}`} />
            {acquiring ? "Acquiring..." : "Acquire Period"}
          </Button>
        </div>
      </div>

      {loading && !nextPeriod ? (
        <p className="mt-4 text-xs text-slate-500">Checking the next eligible billing period…</p>
      ) : (
        nextPeriod && (
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Field label="Period">
              {nextPeriod.hasPeriod ? formatBillingPeriod(nextPeriod.billingPeriodStart, nextPeriod.billingPeriodEnd) : "—"}
            </Field>
            <Field label="Frequency">{humanizeFrequency(nextPeriod.billingFrequency)}</Field>
            <Field label="Eligible Timesheets">{formatCount(nextPeriod.eligibleRecordCount)}</Field>
            <Field label="Eligible Hours">{formatHours(nextPeriod.eligibleHours)}</Field>
            <Field label="Already Claimed">{formatCount(nextPeriod.alreadyClaimedCount)}</Field>
            <Field label="Partial Period">{nextPeriod.hasPeriod ? (nextPeriod.partialPeriod ? "Yes" : "No") : "—"}</Field>
          </dl>
        )
      )}

      {message && (
        <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs font-medium ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
          <ToneIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Earlier periods the backend skipped because they cannot be acquired now. Informational:
          they never disable Acquire, which follows acquisitionAllowed for the selected period only. */}
      {!error && nextPeriod?.warnings?.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" aria-label="Earlier blocked periods">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Earlier period{nextPeriod.warnings.length === 1 ? "" : "s"} not acquired
            {allowed ? " — these do not block the period above" : ""}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-6 font-medium">
            {nextPeriod.warnings.map((warning, idx) => (
              <li key={idx} className="break-words">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
