import { useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { CalendarClock, ChevronDown, ChevronRight, Pencil, Plus, Repeat } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { FREQUENCY_OPTIONS, PERIOD_STATE, VARIANCE_LABEL } from "../../constants/recurring";
import { formatMoney } from "../../dashboard/components/insights";
import { formatDate, formatMonth } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useLinkInvoice, useRecurringOverview, useSkipPeriod } from "../hooks/useRecurring";
import ScheduleFormModal from "../components/ScheduleFormModal";

const monthLabel = (iso) => formatMonth(iso);
const frequencyLabel = (f) => FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;

function StateBadge({ state }) {
  const s = PERIOD_STATE[state] || PERIOD_STATE.UPCOMING;
  return <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", s.tone)}>{s.label}</span>;
}

function Variance({ period }) {
  if (period.variance_pct == null) return null;
  const pct = Number(period.variance_pct);
  return (
    <span className={clsx("text-xs", period.variance_status === "WITHIN" ? "text-slate-500" : "font-medium text-amber-700")}>
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}% · {VARIANCE_LABEL[period.variance_status]}
    </span>
  );
}

function Tile({ label, value, tone = "text-slate-800", hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PeriodRow({ period, canManage }) {
  const skip = useSkipPeriod();
  const link = useLinkInvoice();
  const [mode, setMode] = useState(null); // "skip" | "link"
  const [value, setValue] = useState("");
  const open = period.state !== "RECEIVED" && period.state !== "SKIPPED";

  const submit = async () => {
    try {
      if (mode === "skip") await skip.mutateAsync({ occurrenceId: period.occurrence_id, reason: value });
      else await link.mutateAsync({ occurrenceId: period.occurrence_id, invoiceId: value });
      toast.success(mode === "skip" ? "Period skipped." : "Invoice linked.");
      setMode(null);
      setValue("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the period."));
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
      <span className="w-20 font-medium text-slate-700">{monthLabel(period.period_start)}</span>
      <StateBadge state={period.state} />
      <span className="text-xs text-slate-500">expected {formatDate(period.expected_date)} · {formatMoney(period.expected_amount, "INR")}</span>
      {period.invoice_id && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(period.invoice_id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          {period.invoice_number} · {formatMoney(period.received_amount, "INR")}
        </Link>
      )}
      <Variance period={period} />
      {period.skip_reason && <span className="text-xs italic text-slate-500">“{period.skip_reason}”</span>}
      {canManage && open && !mode && (
        <span className="ml-auto flex gap-2">
          <Button size="small" variant="ghost" onClick={() => setMode("link")}>Link invoice</Button>
          <Button size="small" variant="ghost" onClick={() => setMode("skip")}>Skip period</Button>
        </span>
      )}
      {mode && (
        <span className="ml-auto flex items-center gap-2">
          <input
            aria-label={mode === "skip" ? "Reason for skipping" : "Invoice ID"}
            className="h-8 w-56 rounded-md border border-slate-300 px-2 text-xs"
            placeholder={mode === "skip" ? "Why nothing was billed (min 5 chars)" : "Invoice ID"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button size="small" variant="primary" onClick={submit} loading={skip.isPending || link.isPending}
            disabled={mode === "skip" ? value.trim().length < 5 : !/^\d+$/.test(value)}>
            {mode === "skip" ? "Skip" : "Link"}
          </Button>
          <Button size="small" variant="ghost" onClick={() => { setMode(null); setValue(""); }}>Cancel</Button>
        </span>
      )}
    </li>
  );
}

function ScheduleCard({ schedule, canManage, onEdit }) {
  const [open, setOpen] = useState(false);
  const current = schedule.current;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <li className={clsx("rounded-xl border bg-white", schedule.is_active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70")}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left">
          <Chevron className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">{schedule.name}</span>
            <span className="block text-xs text-slate-500">
              {schedule.vendor_name} · {frequencyLabel(schedule.frequency)} on day {schedule.expected_day} ·{" "}
              {formatMoney(schedule.expected_amount, "INR")} ± {Number(schedule.tolerance_pct)}%
              {schedule.fast_track ? " · fast-track" : ""}{schedule.is_active ? "" : " · inactive"}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-1" aria-label="Recent periods">
          {schedule.occurrences.slice(-6).map((o) => (
            <span key={o.occurrence_id} title={`${monthLabel(o.period_start)}: ${PERIOD_STATE[o.state]?.label}`}
              className={clsx("h-2.5 w-2.5 rounded-full", PERIOD_STATE[o.state]?.dot, o.variance_status && o.variance_status !== "WITHIN" && "ring-2 ring-amber-300")} />
          ))}
        </div>
        {current && <StateBadge state={current.state} />}
        {canManage && (
          <Button size="small" variant="outline" onClick={() => onEdit(schedule)}>
            <Pencil size={13} /> Edit
          </Button>
        )}
      </div>
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {[...schedule.occurrences].reverse().map((o) => (
            <PeriodRow key={o.occurrence_id} period={o} canManage={canManage} />
          ))}
          {schedule.occurrences.length === 0 && <li className="px-4 py-3 text-xs text-slate-500">No periods yet - the first begins {formatDate(schedule.start_date)}.</li>}
        </ul>
      )}
    </li>
  );
}

/**
 * Recurring invoices: what each vendor bills every period, which periods' invoices have arrived,
 * which are missing and which differ from the schedule. Invoices are still uploaded and approved
 * normally; this page is where AP sets the expectation and follows up.
 */
export default function RecurringSchedulesPage() {
  const { data, isLoading, isError, error } = useRecurringOverview();
  const { canManageRecurring } = useApPermissions();
  const [editing, setEditing] = useState(null); // null | {} (new) | schedule

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Recurring invoices" }]} />
      <PageHeader
        title="Recurring invoices"
        subtitle="Rent, subscriptions and other monthly bills - what to expect, what has arrived, what is missing"
        actions={canManageRecurring && (
          <Button variant="primary" size="small" onClick={() => setEditing({})}>
            <Plus size={14} /> New schedule
          </Button>
        )}
      />
      <PageGuide page="recurring" />
      {isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-20"><LoadingSpinner text="Loading schedules..." /></div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the schedules.")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Not received" value={data.totals.MISSING} tone={data.totals.MISSING ? "text-rose-600" : "text-slate-800"}
              hint="Past the expected date + grace days" />
            <Tile label="Due now" value={data.totals.DUE} hint="Expected date reached, within grace" />
            <Tile label="Different from schedule" value={data.totals.VARIANCE} tone={data.totals.VARIANCE ? "text-amber-600" : "text-slate-800"}
              hint="Outside tolerance, last 3 months" />
            <Tile label="Received this period" value={`${data.totals.RECEIVED_THIS_PERIOD} / ${data.schedules.filter((s) => s.is_active).length}`} />
          </div>
          {data.upcoming?.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><CalendarClock className="h-4 w-4" aria-hidden /> Expected recurring spend</span>
              {data.upcoming.map((u) => (
                <span key={u.period} className="text-slate-600">{u.label}: <span className="font-semibold tabular-nums text-slate-800">{formatMoney(u.amount, "INR")}</span></span>
              ))}
            </div>
          )}
          {data.schedules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
              <Repeat className="h-6 w-6 text-slate-300" aria-hidden />
              <p className="text-sm font-medium text-slate-700">No recurring schedules yet</p>
              <p className="max-w-md text-xs text-slate-500">Add one for each bill that comes every month or quarter - rent, SaaS, cloud. Missing and unusual invoices will then show up on the dashboard.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.schedules.map((s) => (
                <ScheduleCard key={s.schedule_id} schedule={s} canManage={canManageRecurring} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </>
      )}
      {editing && <ScheduleFormModal isOpen onClose={() => setEditing(null)} schedule={editing.schedule_id ? editing : null} />}
    </div>
  );
}
