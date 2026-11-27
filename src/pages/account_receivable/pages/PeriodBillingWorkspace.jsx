/**
 * Period Billing Workspace — redesigned Billing Data Acquisition detail page.
 *
 * The page is organised around the configuration's own billing schedule: every
 * period from project start to project end, generated locally from the billing
 * frequency (Weekly / Bi-Weekly / Monthly / …). Each period is addressable before
 * anything has been acquired, so the user picks a period and pulls exactly that
 * date range of timesheets from TMS.
 *
 * Downstream is unchanged: acquiring produces the same snapshot, and Preview →
 * Calculate Tax → Generate Invoice navigate to the same routes as before.
 *
 * The previous page (AcquisitionDetail.jsx) is untouched; see the route in App.jsx.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CalendarRange,
  RefreshCw,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CircleDashed,
  FileText,
  Calculator,
  Receipt,
  Eye,
  ChevronRight,
  Users,
  Wallet,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import Modal from "../../../components/Modal/modal";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  fetchBillingConfigurationById,
  fetchBillingSnapshotsByConfiguration,
  acquireBillingData,
  mapBillingSnapshotResponse,
  formatBillingPeriod,
} from "../services/billingDataAcquisitionService";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import {
  buildPeriodSchedule,
  attachSnapshotsToPeriods,
  toDateOnly,
  PERIOD_STATE,
} from "../utils/billingSchedule";

const QUEUE_PATH = "/account-receivable/billing-data-acquisition/workspace";

/* ───────────────────────── status model ───────────────────────── */

/**
 * One period's billing status, derived from its snapshot rather than stored.
 * ACQUIRED covers every post-acquisition state before tax is finished.
 */
const PERIOD_STATUS = Object.freeze({
  FUTURE: "FUTURE",
  AWAITING: "AWAITING",
  ACQUIRED: "ACQUIRED",
  TAXED: "TAXED",
  INVOICED: "INVOICED",
  CANCELLED: "CANCELLED",
});

const STATUS_STYLE = {
  [PERIOD_STATUS.FUTURE]: { label: "Not started", cls: "border-slate-200 bg-slate-50 text-slate-500", Icon: CircleDashed },
  [PERIOD_STATUS.AWAITING]: { label: "Ready to acquire", cls: "border-indigo-200 bg-indigo-50 text-indigo-700", Icon: Download },
  [PERIOD_STATUS.ACQUIRED]: { label: "Acquired", cls: "border-sky-200 bg-sky-50 text-sky-700", Icon: CheckCircle2 },
  [PERIOD_STATUS.TAXED]: { label: "Tax calculated", cls: "border-violet-200 bg-violet-50 text-violet-700", Icon: Calculator },
  [PERIOD_STATUS.INVOICED]: { label: "Invoiced", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: Receipt },
  [PERIOD_STATUS.CANCELLED]: { label: "Cancelled", cls: "border-slate-200 bg-slate-50 text-slate-400", Icon: AlertTriangle },
};

function snapshotStatusOf(snapshot) {
  return String(snapshot?.status || snapshot?.snapshotStatus || "").toUpperCase();
}

/** The snapshot that represents a period — the newest non-cancelled one. */
function primarySnapshotOf(period) {
  const live = (period.snapshots || []).filter((s) => snapshotStatusOf(s) !== "CANCELLED");
  const pool = live.length > 0 ? live : period.snapshots || [];
  return pool.length > 0 ? pool[pool.length - 1] : null;
}

function periodStatusOf(period) {
  const snap = primarySnapshotOf(period);
  if (!snap) {
    return period.state === PERIOD_STATE.FUTURE ? PERIOD_STATUS.FUTURE : PERIOD_STATUS.AWAITING;
  }
  const status = snapshotStatusOf(snap);
  if (status === "CANCELLED") return PERIOD_STATUS.CANCELLED;
  if (status === "INVOICED" || status === "ALREADY_BILLED" || snap.invoiceId) return PERIOD_STATUS.INVOICED;
  if (status === "TAX_COMPLETED") return PERIOD_STATUS.TAXED;
  return PERIOD_STATUS.ACQUIRED;
}

/** The single next step for a period, by its status. */
function nextActionOf(status) {
  switch (status) {
    case PERIOD_STATUS.ACQUIRED:
      return { kind: "TAX", label: "Calculate Tax", Icon: Calculator };
    case PERIOD_STATUS.TAXED:
      return { kind: "INVOICE", label: "Generate Invoice", Icon: FileText };
    case PERIOD_STATUS.INVOICED:
      return { kind: "VIEW_INVOICE", label: "View Invoice", Icon: Receipt };
    default:
      return null;
  }
}

/* ───────────────────────── small presentational pieces ───────────────────────── */

function StatusPill({ status, className = "" }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE[PERIOD_STATUS.FUTURE];
  const { Icon } = style;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.cls} ${className}`}>
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400" title={hint}>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-base font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyNote({ icon: Icon = CircleDashed, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-slate-400" />
      <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-1 max-w-md text-xs text-slate-500">{children}</div>}
    </div>
  );
}

function num(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isNaN(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/* ───────────────────────── period rail ───────────────────────── */

const RAIL_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "BILLABLE", label: "Billable" },
  { key: "PENDING", label: "Not acquired" },
  { key: "DONE", label: "Acquired" },
];

function PeriodRail({ periods, selectedKey, onSelect, currency, filter, onFilterChange }) {
  const shown = useMemo(() => {
    if (filter === "BILLABLE") return periods.filter((p) => p.state !== PERIOD_STATE.FUTURE);
    if (filter === "PENDING") return periods.filter((p) => periodStatusOf(p) === PERIOD_STATUS.AWAITING);
    if (filter === "DONE") return periods.filter((p) => primarySnapshotOf(p));
    return periods;
  }, [periods, filter]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Billing Periods</h2>
          <span className="ml-auto text-[11px] font-semibold text-slate-400">{shown.length}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {RAIL_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                filter === f.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="p-4 text-xs text-slate-500">No period matches this filter.</p>
      ) : (
        <ul className="max-h-[32rem] flex-1 divide-y divide-slate-100 overflow-y-auto lg:max-h-[46rem]">
          {shown.map((period) => {
            const status = periodStatusOf(period);
            const snap = primarySnapshotOf(period);
            const isSelected = period.key === selectedKey;
            return (
              <li key={period.key}>
                <button
                  type="button"
                  onClick={() => onSelect(period.key)}
                  aria-current={isSelected}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                    isSelected ? "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                      isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {period.index}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold tabular-nums text-slate-900">
                      {formatBillingPeriod(period.startDate, period.endDate)}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <StatusPill status={status} />
                      {period.state === PERIOD_STATE.OPEN && <Chip tone="sky">In progress</Chip>}
                      {period.isPartial && <Chip tone="amber">Partial</Chip>}
                    </span>
                    {snap?.totalAmount !== undefined && snap?.totalAmount !== null && (
                      <span className="mt-1 block text-[11px] font-semibold tabular-nums text-slate-500">
                        {formatCurrency(snap.totalAmount, currency || "USD")}
                      </span>
                    )}
                  </span>
                  <ChevronRight className={`mt-1 h-4 w-4 flex-shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-300"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── record tables ───────────────────────── */

function TimesheetTable({ records, currency }) {
  if (!records || records.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-slate-500">No timesheet records in this snapshot.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Employee</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Work Date</th>
            <th className="px-3 py-2 text-right">Hours</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {records.map((r, idx) => (
            <tr key={r.id || idx} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{r.employee || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.role || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{formatDisplayDate(r.workDate)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{num(r.hours)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.rate ? formatCurrency(r.rate, currency || "USD") : "—"}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.amount ? formatCurrency(r.amount, currency || "USD") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseTable({ records, currency }) {
  if (!records || records.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Expense</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {records.map((e, idx) => (
            <tr key={e.id || idx} className="hover:bg-slate-50/70">
              <td className="px-3 py-2 font-medium text-slate-800">{e.description || e.title || e.expenseName || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{e.category || e.expenseCategory || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{formatDisplayDate(e.expenseDate || e.date)}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {formatCurrency(e.costBasis ?? e.amount ?? 0, e.currency || currency || "USD")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function PeriodBillingWorkspace() {
  // Named projectId because that is the route's path parameter; the acquisition
  // console now puts a billingConfigurationId in it.
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // The row the user clicked in the console. Memoised on the state object so the
  // configuration effect doesn't refetch on every render.
  const listRow = useMemo(() => location.state?.config ?? {}, [location.state]);

  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [selectedKey, setSelectedKey] = useState(null);
  const [railFilter, setRailFilter] = useState("BILLABLE");
  const [acquiringKey, setAcquiringKey] = useState(null);
  const [detail, setDetail] = useState(null); // mapped snapshot of the selected period
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Synchronous guard: a state flag alone lets a fast double click through.
  const acquiringRef = useRef(false);
  const snapshotRequestRef = useRef(0);

  /* ── configuration ──
     The route param is the billingConfigurationId the acquisition console
     navigated with, and the full record comes from
     GET /api/billing-configurations/{billingConfigurationId}.
     That DTO has no project/client name, so the clicked list row — handed over
     in navigation state — supplies the header text. Arriving without that state
     (a bookmark, a hard refresh) still works; only the names fall back. */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const full = await fetchBillingConfigurationById(projectId, listRow);
        if (!mounted) return;
        setConfig(full);
      } catch (err) {
        if (!mounted) return;
        setLoadError(err?.message || "The billing configuration could not be loaded.");
        showStatusToast(err?.message || "The billing configuration could not be loaded.", "error");
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId, listRow]);

  /* ── snapshots of this configuration ── */
  const loadSnapshots = useCallback(async (configurationId) => {
    if (!configurationId) return;
    const requestId = ++snapshotRequestRef.current;
    setLoadingSnapshots(true);
    try {
      const list = await fetchBillingSnapshotsByConfiguration(configurationId);
      if (requestId !== snapshotRequestRef.current) return; // superseded
      setSnapshots(Array.isArray(list) ? list : []);
      setLoadError(null);
    } catch (err) {
      if (requestId !== snapshotRequestRef.current) return;
      setLoadError(err?.message || "Billing snapshots could not be loaded.");
    } finally {
      if (requestId === snapshotRequestRef.current) setLoadingSnapshots(false);
    }
  }, []);

  useEffect(() => {
    if (config?.billingConfigurationId) loadSnapshots(config.billingConfigurationId);
  }, [config?.billingConfigurationId, loadSnapshots]);

  useEffect(() => () => {
    snapshotRequestRef.current += 1; // ignore responses that land after unmount
  }, []);

  /* ── the schedule ── */
  const schedule = useMemo(() => {
    if (!config) return { frequency: null, periods: [], reason: null };
    return buildPeriodSchedule({
      frequency: config.billingFrequency,
      projectStartDate: config.projectStartDate || config.effectiveFrom || config.startDate,
      projectEndDate: config.projectEndDate || config.effectiveTo || config.endDate,
    });
  }, [config]);

  const { periods, unmatched } = useMemo(
    () => attachSnapshotsToPeriods(schedule.periods, snapshots),
    [schedule.periods, snapshots]
  );

  const summary = useMemo(() => {
    const billable = periods.filter((p) => p.state !== PERIOD_STATE.FUTURE);
    const acquired = periods.filter((p) => primarySnapshotOf(p));
    const invoiced = periods.filter((p) => periodStatusOf(p) === PERIOD_STATUS.INVOICED);
    const value = acquired.reduce((sum, p) => sum + Number(primarySnapshotOf(p)?.totalAmount || 0), 0);
    return { total: periods.length, billable: billable.length, acquired: acquired.length, invoiced: invoiced.length, value };
  }, [periods]);

  // Default selection: the earliest billable period that has not been acquired,
  // otherwise the most recent period that has.
  useEffect(() => {
    if (selectedKey || periods.length === 0) return;
    const pending = periods.find((p) => periodStatusOf(p) === PERIOD_STATUS.AWAITING);
    const acquired = [...periods].reverse().find((p) => primarySnapshotOf(p));
    setSelectedKey((pending || acquired || periods[0]).key);
  }, [periods, selectedKey]);

  const selected = useMemo(() => periods.find((p) => p.key === selectedKey) || null, [periods, selectedKey]);
  const selectedSnapshot = selected ? primarySnapshotOf(selected) : null;
  const selectedStatus = selected ? periodStatusOf(selected) : null;

  /* ── detail of the selected period ── */
  useEffect(() => {
    if (!selectedSnapshot || !config) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    // The list endpoint already returns full snapshot DTOs, so this is a local map.
    const mapped = mapBillingSnapshotResponse(selectedSnapshot, {
      projectId: Number(config.projectId) || null,
      billingConfigurationId: config.billingConfigurationId,
      fallbackStart: selected?.startDate,
      fallbackEnd: selected?.endDate,
    });
    setDetail(mapped);
    setLoadingDetail(false);
  }, [selectedSnapshot, config, selected?.startDate, selected?.endDate]);

  /* ── acquire ── */
  const handleAcquire = async (period) => {
    if (acquiringRef.current || !config || !period) return;
    acquiringRef.current = true;
    setAcquiringKey(period.key);
    try {
      const results = await acquireBillingData(config, period.startDate, period.endDate);
      const ok =
        results?.success &&
        !["ACQUISITION_FAILED", "CONFIGURATION_REQUIRED"].includes(String(results.billingStatus || "").toUpperCase());

      if (ok) {
        showStatusToast(
          results?.isExisting
            ? "Existing billing snapshot loaded for this period."
            : `Timesheets acquired for ${formatBillingPeriod(period.startDate, period.endDate)}.`,
          "success"
        );
      } else {
        showStatusToast(
          results?.message || results?.labor?.error || "Timesheets could not be acquired for this period.",
          "error"
        );
      }
    } catch (err) {
      showStatusToast(err?.message || "Timesheets could not be acquired for this period.", "error");
    } finally {
      acquiringRef.current = false;
      setAcquiringKey(null);
      // Re-read from the backend so the rail reflects what was actually stored.
      loadSnapshots(config.billingConfigurationId);
    }
  };

  /* ── downstream navigation — unchanged routes ── */
  const navState = () => ({ config, acquisitionResults: detail });

  const handleNextAction = (action) => {
    const snapshotId = selectedSnapshot?.snapshotId || selectedSnapshot?.id;
    if (!snapshotId) {
      showStatusToast("This period has no snapshot yet.", "warning");
      return;
    }
    if (action.kind === "TAX") {
      navigate(`/account-receivable/tax-calculation/${snapshotId}`, { state: navState() });
    } else if (action.kind === "INVOICE") {
      navigate(`/account-receivable/invoice-generation/${snapshotId}`, {
        state: { from: "billing-data-acquisition", source: "billing-data-acquisition", snapshotId, projectId: config?.projectId || null, ...navState() },
      });
    } else if (action.kind === "VIEW_INVOICE") {
      navigate(`/account-receivable/invoices/${snapshotId}`, { state: navState() });
    }
  };

  /* ── render ── */
  if (loadingConfig) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto w-full max-w-3xl py-12">
        <EmptyNote icon={AlertTriangle} title="Billing configuration unavailable">
          {loadError || "This project has no active Time & Material billing configuration."}
        </EmptyNote>
      </div>
    );
  }

  const currency = config.currency || "USD";
  const freqLabel = schedule.frequency?.label || "—";
  const nextAction = nextActionOf(selectedStatus);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {/* The route param is a configuration id, so it is never a useful title —
          the numeric projectId from the configuration is the fallback instead. */}
      <PageHeader
        title={config.projectName || (config.projectId ? `Project ${config.projectId}` : "Billing Configuration")}
        subtitle={`${config.projectCode ? `${config.projectCode} · ` : ""}${config.client || "—"}`}
        actions={
          <Button
            variant="outline"
            size="small"
            className="text-xs font-semibold"
            onClick={() => loadSnapshots(config.billingConfigurationId)}
            disabled={loadingSnapshots}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Configuration strip — the schedule this whole page is built from */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Billing Frequency</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm font-bold text-slate-900">
              <CalendarRange className="h-4 w-4 text-indigo-600" />
              {freqLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Project Duration</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
              {formatBillingPeriod(
                config.projectStartDate || config.effectiveFrom,
                config.projectEndDate || config.effectiveTo
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Billing Type</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{config.billingType || "Time & Material"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Currency</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{currency}</p>
          </div>

          <dl className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Periods" value={summary.total} hint="Total periods across the project duration" />
            <Metric label="Billable" value={summary.billable} hint="Periods that have started" />
            <Metric label="Acquired" value={summary.acquired} />
            <Metric label="Value" value={formatCurrency(summary.value, currency)} hint="Total of all acquired snapshots" />
          </dl>
        </div>

        {schedule.reason === "NO_START_DATE" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
            This project has no start date, so its billing schedule cannot be generated.
          </p>
        )}
        {schedule.reason === "NO_SCHEDULE" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
            This configuration bills on demand, so it has no repeating period schedule.
          </p>
        )}
        {!config.projectEndDate && !config.effectiveTo && schedule.periods.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-500">
            No project end date is set — the schedule is shown up to the generated limit.
          </p>
        )}
        {loadError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800" role="alert">
            {loadError}
          </p>
        )}
        {unmatched.length > 0 && (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[11px] text-slate-600">
            {unmatched.length} existing snapshot{unmatched.length === 1 ? "" : "s"} cover a date range that is not one of this
            schedule's periods (acquired before the current frequency, or with manually entered dates). They are not shown against
            a period here.
          </p>
        )}
      </section>

      {/* Schedule + detail */}
      {schedule.periods.length === 0 ? (
        <EmptyNote icon={CalendarRange} title="No billing periods to show">
          A period schedule needs a project start date and a repeating billing frequency.
        </EmptyNote>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <PeriodRail
              periods={periods}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              currency={currency}
              filter={railFilter}
              onFilterChange={setRailFilter}
            />
          </aside>

          <section className="min-w-0 lg:col-span-8">
            {!selected ? (
              <EmptyNote title="Select a billing period">Pick a period on the left to see or acquire its timesheets.</EmptyNote>
            ) : (
              <div className="space-y-4">
                {/* Period header */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Period {selected.index} of {summary.total}
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
                        {formatBillingPeriod(selected.startDate, selected.endDate)}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={selectedStatus} />
                        {selected.state === PERIOD_STATE.OPEN && <Chip tone="sky">In progress</Chip>}
                        {selected.state === PERIOD_STATE.FUTURE && <Chip>Starts {formatDisplayDate(selected.startDate)}</Chip>}
                        {selected.isPartial && <Chip tone="amber">Partial period</Chip>}
                        {selectedSnapshot?.snapshotNumber && (
                          <Chip tone="indigo">
                            <span className="font-mono">{selectedSnapshot.snapshotNumber}</span>
                          </Chip>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSnapshot && (
                        <Button variant="outline" size="small" className="text-xs font-semibold" onClick={() => setPreviewOpen(true)}>
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      )}
                      {nextAction && (
                        <Button variant="primary" size="small" className="text-xs font-semibold" onClick={() => handleNextAction(nextAction)}>
                          <nextAction.Icon className="h-3.5 w-3.5" />
                          {nextAction.label}
                        </Button>
                      )}
                      {!selectedSnapshot && (
                        <Button
                          variant="primary"
                          size="small"
                          className="text-xs font-semibold"
                          onClick={() => handleAcquire(selected)}
                          disabled={acquiringKey === selected.key}
                        >
                          {acquiringKey === selected.key ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {acquiringKey === selected.key ? "Acquiring..." : "Acquire from TMS"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                {!selectedSnapshot ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <EmptyNote
                      icon={selected.state === PERIOD_STATE.FUTURE ? Clock : Download}
                      title={selected.state === PERIOD_STATE.FUTURE ? "This period has not started yet" : "No timesheets acquired for this period"}
                    >
                      {selected.state === PERIOD_STATE.FUTURE ? (
                        <>
                          It runs from {formatDisplayDate(selected.startDate)} to {formatDisplayDate(selected.endDate)}. You can still
                          acquire it, but TMS is unlikely to hold timesheets for a period that has not begun.
                        </>
                      ) : (
                        <>
                          Acquiring pulls every approved timesheet dated between {formatDisplayDate(selected.startDate)} and{" "}
                          {formatDisplayDate(selected.endDate)} from TMS and creates a billing snapshot for this period.
                        </>
                      )}
                    </EmptyNote>
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="primary"
                        size="medium"
                        className="text-xs font-semibold"
                        onClick={() => handleAcquire(selected)}
                        disabled={acquiringKey === selected.key}
                      >
                        {acquiringKey === selected.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {acquiringKey === selected.key ? "Acquiring from TMS..." : "Acquire from TMS"}
                      </Button>
                    </div>
                  </div>
                ) : loadingDetail || !detail ? (
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-10 shadow-sm">
                    <Loader />
                  </div>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      <Metric label="Timesheets" value={num(detail.laborRecords?.length, 0)} />
                      <Metric label="Billable Hours" value={num(detail.readiness?.approvedHours ?? detail.laborRecords?.reduce((s, r) => s + Number(r.hours || 0), 0))} />
                      <Metric label="Labour" value={formatCurrency(detail.laborAmount || 0, currency)} />
                      <Metric label="Expenses" value={formatCurrency(detail.expenseAmount || 0, currency)} />
                      <Metric label="Total" value={formatCurrency(detail.totalAmount || 0, currency)} />
                    </dl>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Timesheets ({detail.laborRecords?.length || 0})
                        </h3>
                      </div>
                      <TimesheetTable records={detail.laborRecords} currency={currency} />
                    </div>

                    {detail.expenseRecords?.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                          <Wallet className="h-4 w-4 text-indigo-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Expenses ({detail.expenseRecords.length})
                          </h3>
                        </div>
                        <ExpenseTable records={detail.expenseRecords} currency={currency} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Preview — pre-tax summary of the selected snapshot */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Billing Preview"
        subtitle={selected ? formatBillingPeriod(selected.startDate, selected.endDate) : ""}
        size="2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {nextAction && (
              <Button
                variant="primary"
                onClick={() => {
                  setPreviewOpen(false);
                  handleNextAction(nextAction);
                }}
              >
                <nextAction.Icon className="h-4 w-4" />
                {nextAction.label}
              </Button>
            )}
          </div>
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Snapshot</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{detail.snapshotNumber || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Status</p>
                <p className="text-sm font-semibold text-slate-900">{detail.status || "—"}</p>
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">
                  Labour ({detail.laborRecords?.length || 0} timesheet{detail.laborRecords?.length === 1 ? "" : "s"})
                </dt>
                <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(detail.laborAmount || 0, currency)}</dd>
              </div>
              {detail.expenseRecords?.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Expenses ({detail.expenseRecords.length})</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(detail.expenseAmount || 0, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <dt className="font-semibold text-slate-700">Subtotal (before tax)</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900">{formatCurrency(detail.totalAmount || 0, currency)}</dd>
              </div>
            </dl>

            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
              Tax is not included. It is calculated in the next step, where this snapshot is priced and the invoice is produced.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No snapshot to preview.</p>
        )}
      </Modal>
    </div>
  );
}
