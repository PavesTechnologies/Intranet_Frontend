import React, { useState } from "react";
import { BadgeCheck, Briefcase, CalendarDays, Check, Copy, FilePen, FileText, Landmark, Plane, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { JOURNEY_STEPS, TONE_CLASSES, reportJourney } from "./reportJourney";

// The top of an expense report: what it is, where it is now in plain words, how much it is for, and the five steps
// every report goes through with the date each one happened. Status words come from reportJourney, the same helper
// My Expenses uses, so a report reads the same on both pages.

const STEP_ICONS = [FilePen, UserCheck, ShieldCheck, Landmark, BadgeCheck];
const STEP_CAPTIONS = ["Report created", "Manager approval", "Finance verification", "Sent for payment", "Money received"];

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const money = (value, currency) => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency || ""} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const ACCENT = {
  neutral: "from-slate-400 to-slate-300",
  info: "from-blue-500 to-sky-400",
  violet: "from-violet-500 to-fuchsia-400",
  action: "from-orange-500 to-amber-400",
  payment: "from-[#0A0082] to-[#4f63c9]",
  success: "from-emerald-500 to-teal-400",
  danger: "from-rose-500 to-[#ff7aa0]",
};

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/[0.06] text-[#0A0082]">
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-[#0a174e]">{value || "—"}</p>
      </div>
    </div>
  );
}

/** Five steps, done / current / to come, each with the date it happened when the report carries one. */
function Tracker({ journey, report }) {
  const paidOn = report.paymentConfirmation?.paymentDate || report.paymentConfirmation?.confirmedAt;
  // Dates the report response carries for each step; Finance's own date is not on the report, so approval covers it.
  const dates = [report.createdAt, report.submittedAt, report.approvedAt, report.approvedAt, paidOn || report.closedAt];
  const current = journey.step;
  const finished = current === JOURNEY_STEPS.length - 1;

  return (
    <ol className="grid grid-cols-5 gap-1" data-report-tracker aria-label="Report progress">
      {JOURNEY_STEPS.map((label, i) => {
        const Icon = STEP_ICONS[i];
        const done = i < current || (finished && i === current);
        const isCurrent = i === current && !finished;
        const stopped = journey.stopped && i === current;
        const date = done || isCurrent ? fmtDate(dates[i]) : null;
        return (
          <li key={label} data-step={label} aria-current={isCurrent ? "step" : undefined} className="relative flex flex-col items-center text-center">
            {i < JOURNEY_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-[18px] h-0.5 w-full ${i < current ? "bg-emerald-400" : "bg-slate-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white transition ${
                stopped
                  ? "bg-rose-500 text-white"
                  : done
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-[#0A0082] text-white shadow-[0_0_0_4px_rgba(10,0,130,0.15)]"
                      : "bg-slate-100 text-slate-400"
              }`}
            >
              {stopped ? <XCircle size={16} aria-hidden="true" /> : done ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
            </span>
            <p className={`mt-2 text-xs font-semibold ${done || isCurrent ? "text-[#0a174e]" : "text-slate-400"}`}>{label}</p>
            <p className="hidden text-[11px] text-slate-400 sm:block">{STEP_CAPTIONS[i]}</p>
            {date && <p className={`mt-0.5 text-[11px] font-medium tabular-nums ${isCurrent ? "text-[#0A0082]" : "text-emerald-700"}`}>{date}</p>}
            {isCurrent && !date && <p className="mt-0.5 text-[11px] font-medium text-[#0A0082]">In progress</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default function ReportHeroCard({ report, statusPill, actions, deadline, children }) {
  const [copied, setCopied] = useState(false);
  const journey = reportJourney(report);
  const currency = report.baseCurrencyCode || report.currencyCode;
  const paid = report.paymentConfirmation;
  const trip =
    report.tripStartDate || report.tripEndDate
      ? [fmtDate(report.tripStartDate), fmtDate(report.tripEndDate)].filter(Boolean).join(" – ")
      : report.reportingPeriodStart
        ? [fmtDate(report.reportingPeriodStart), fmtDate(report.reportingPeriodEnd)].filter(Boolean).join(" – ")
        : null;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(report.reportNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <section
      data-report-hero
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]"
    >
      <span aria-hidden="true" className={`block h-1.5 bg-gradient-to-r ${ACCENT[journey.tone] || ACCENT.neutral}`} />

      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0a174e]">{report.title}</h1>
              {statusPill}
            </div>
            <button
              type="button"
              onClick={copyNumber}
              title="Copy report number"
              className="mt-1 inline-flex items-center gap-1.5 rounded-md font-mono text-xs text-slate-500 transition hover:text-[#0A0082]"
            >
              {report.reportNumber}
              {copied ? <Check size={12} className="text-emerald-600" aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            </button>

            <div className={`mt-3 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border px-3 py-2 text-sm ${TONE_CLASSES[journey.tone] || TONE_CLASSES.neutral}`} data-journey-label>
              <span className="font-semibold">{journey.label}</span>
              {journey.hint && <span className="text-xs opacity-80">· {journey.hint}</span>}
            </div>
            {deadline}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="lg:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total claimed</p>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-[#0a174e]" data-report-total>
                {money(report.totalAmount, currency)}
              </p>
              <p className="text-xs text-slate-500">
                {report.lineItemCount ?? 0} expense{report.lineItemCount === 1 ? "" : "s"}
                {paid ? (
                  <span className="font-semibold text-emerald-700"> · {money(paid.amountPaid, currency)} paid on {fmtDate(paid.paymentDate || paid.confirmedAt)}</span>
                ) : report.noPaymentDue ? (
                  <span className="font-semibold text-slate-600"> · covered by your advance</span>
                ) : null}
              </p>
            </div>
            {actions}
          </div>
        </div>

        {children}

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <Fact icon={FileText} label="Business purpose" value={report.businessPurpose} />
          <Fact icon={Briefcase} label="Cost center" value={report.costCenterName} />
          <Fact icon={trip ? Plane : Landmark} label={trip ? (report.tripStartDate ? "Trip dates" : "Reporting period") : "Report currency"} value={trip || report.currencyCode} />
          <Fact icon={CalendarDays} label="Created" value={fmtDate(report.createdAt)} />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50/80 px-2 py-4 sm:px-4">
          <Tracker journey={journey} report={report} />
        </div>
      </div>
    </section>
  );
}
