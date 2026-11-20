import React from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usageShares } from "@/pages/expense-management/pages/cash-advance/settlementFigures";
import { formatDate, formatMoney, formatTripDates, getCostCenterValue } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";

/** How the owed amount was used: spent on expenses, recovered, carried forward, still outstanding. */
export function UsageBar({ figures, tall = false }) {
  const s = usageShares(figures);
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-gray-100 ${tall ? "h-3" : "h-1.5"}`}
      role="img"
      aria-label={`${Math.round(s.spent)}% spent, ${Math.round(s.recovered)}% recovered, ${Math.round(s.carried)}% carried forward, ${Math.round(s.outstanding)}% outstanding`}
    >
      <div className="bg-sky-500" style={{ width: `${s.spent}%` }} />
      <div className="bg-emerald-500" style={{ width: `${s.recovered}%` }} />
      <div className="bg-violet-500" style={{ width: `${s.carried}%` }} />
      <div className="bg-amber-400" style={{ width: `${s.outstanding}%` }} />
    </div>
  );
}

export function UsageLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Consumed by expenses</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Recovered (salary / repaid)</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Carried forward</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Outstanding on the advance</span>
    </div>
  );
}

export const reportPath = (reportId) => `/expense-management/expenses/reports/${reportId}`;

/**
 * Actions-column icon for the expense report attached to a paid-out advance. Opens the report (the first, when there
 * are several). Greyed out with a hint while no report is attached yet; hidden before the advance is paid out.
 */
export function ExpenseReportLink({ figures }) {
  const navigate = useNavigate();
  if (!figures?.paidOut) return null;
  const reports = figures.reports || [];
  if (reports.length === 0) {
    return (
      <span title="No expense report attached yet" aria-label="No expense report attached yet" className="p-1.5 text-gray-300">
        <FileText size={15} aria-hidden="true" />
      </span>
    );
  }
  const first = reports[0];
  const label =
    reports.length > 1
      ? `Open expense report ${first.reportNumber || ""} (${reports.length} attached)`
      : `Open expense report ${first.reportNumber || ""}`;
  return (
    <button
      type="button"
      onClick={() => navigate(reportPath(first.reportId))}
      title={label}
      aria-label={label}
      className="relative rounded p-1.5 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800"
    >
      <FileText size={15} aria-hidden="true" />
      {reports.length > 1 && (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-indigo-600 px-1 text-[9px] font-bold leading-tight text-white">
          {reports.length}
        </span>
      )}
    </button>
  );
}

/** The chevron button that opens a row's details. The whole row is clickable too; this is the keyboard target. */
export function ExpandToggle({ open, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} details of ${label}`}
      className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
    >
      <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

/** Row props that make a whole table row toggle its details, without stealing clicks from buttons inside it. */
export const expandableRowProps = (open, onToggle) => ({
  onClick: (e) => {
    if (e.target.closest("button, a, input, select, textarea")) return;
    onToggle();
  },
  className: `cursor-pointer transition ${open ? "bg-indigo-50/40" : "hover:bg-gray-50/80"}`,
});

const TONE = {
  slate: "text-gray-900",
  indigo: "text-indigo-800",
  sky: "text-sky-700",
  violet: "text-violet-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
};

function Step({ label, value, note, tone = "slate", strong = false, muted = false }) {
  return (
    <div className={`rounded-lg border p-2.5 ${strong ? "border-amber-200 bg-amber-50/60" : "border-gray-200 bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${muted ? "text-gray-300" : TONE[tone]}`}>{value}</p>
      {note && <p className="mt-0.5 text-[10px] leading-snug text-gray-500">{note}</p>}
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-xs text-gray-800">{children}</dd>
    </div>
  );
}

/**
 * The money of one advance in the order it moves, with how the owed amount was used. Used under an opened table row
 * and on the advance's detail page. {@code figures} comes from figuresForAdvance() / useAdvanceFigures().figuresOf.
 */
export function MoneyFlowSteps({ advance, figures: f, loading = false, title = "Money flow", showReports = false }) {
  const cur = advance.currencyCode || "INR";
  const money = (v) => formatMoney(v, cur);
  const paid = f.paidOut && !loading;
  const later = (v) => (loading ? "…" : f.paidOut ? money(v) : "—");
  const cashApproved = f.approved - f.carriedIn;

  return (
      <section aria-label="Money flow">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#0a174e]">{title}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
          <Step label="Requested" value={money(f.requested)} note="Asked for" />
          <Step
            label="Approved"
            value={f.approvedKnown ? money(f.approved) : "—"}
            muted={!f.approvedKnown}
            tone="indigo"
            note={
              !f.approvedKnown
                ? "Not approved yet"
                : cashApproved > 0 && f.requested > cashApproved
                  ? `Reduced by ${money(f.requested - cashApproved)}`
                  : "By Finance"
            }
          />
          <Step label="Disbursed" value={later(f.disbursed)} muted={!f.paidOut} tone="indigo" note={f.paidOut ? "Cash paid" : "Not paid yet"} />
          <Step
            label="Owed"
            value={later(f.owed)}
            muted={!f.paidOut}
            note={f.carriedIn > 0 ? `incl. ${money(f.carriedIn)} brought in` : "Disbursed + brought in"}
          />
          <Step
            label="Consumed"
            value={later(f.consumed)}
            muted={!f.paidOut}
            tone="sky"
            note={paid && f.approvedConsumed !== null && f.consumed > 0 ? `${money(f.approvedConsumed)} approved` : "Expenses added"}
          />
          <Step
            label="Balance"
            value={later(f.remaining)}
            muted={!f.paidOut}
            note={paid && f.owedToEmployee > 0 ? `Company owes ${money(f.owedToEmployee)}` : "Owed − consumed"}
          />
          <Step
            label="Carried forward"
            value={later(f.carriedForward)}
            muted={!f.paidOut}
            tone="violet"
            note={
              f.held > 0
                ? `${money(f.held)} held in outstanding`
                : f.moved > 0
                  ? `${money(f.moved)} taken into a later advance`
                  : "To the next advance"
            }
          />
          <Step
            label="Salary deducted"
            value={later(f.salaryDeducted)}
            muted={!f.paidOut}
            tone="emerald"
            note={paid && f.otherRepaid > 0 ? `+ ${money(f.otherRepaid)} repaid` : "Recovered via payroll"}
          />
          <Step
            label="Outstanding"
            value={later(f.outstanding)}
            muted={!f.paidOut}
            tone="amber"
            strong={paid && f.outstanding > 0}
            note="Still to recover here"
          />
        </div>
        {paid && f.owed > 0 && (
          <div className="mt-3">
            <UsageBar figures={f} tall />
            <UsageLegend />
          </div>
        )}
        {/* Linked expense reports: shown to Finance only. */}
        {showReports && paid && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-gray-500">Expense reports</span>
            {(f.reports || []).length === 0 ? (
              <span className="text-gray-400">None attached yet</span>
            ) : (
              f.reports.map((r) => (
                <Link
                  key={r.reportId}
                  to={reportPath(r.reportId)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-800 hover:bg-indigo-100"
                >
                  <FileText size={12} aria-hidden="true" />
                  <span className="font-mono">{r.reportNumber || "Expense report"}</span>
                  {r.reportStatus && <span className="text-indigo-500">· {String(r.reportStatus).replace(/_/g, " ").toLowerCase()}</span>}
                  {r.claimedAmount != null && <span className="text-indigo-500">· {money(r.claimedAmount)}</span>}
                </Link>
              ))
            )}
          </div>
        )}
      </section>

  );
}

/**
 * The details of one advance, shown under its row when the row is opened: the money in the order it moves, how the
 * owed amount was used, and the request's facts.
 */
export default function AdvanceRowDetails({ advance, figures, loading, footer }) {
  return (
    <div className="space-y-4 border-l-4 border-indigo-300 bg-gray-50/70 px-4 py-4">
      <MoneyFlowSteps advance={advance} figures={figures} loading={loading} />

      <dl className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-4">
        <Fact label="Cost center">{getCostCenterValue(advance)}</Fact>
        <Fact label="Needed by">{formatDate(advance.neededByDate)}</Fact>
        <Fact label="Trip dates">{formatTripDates(advance)}</Fact>
        <Fact label="Settlement due">{formatDate(advance.settlementDueDate)}</Fact>
        <div className="col-span-2 sm:col-span-4">
          <Fact label="Purpose">
            <span className="whitespace-pre-line leading-relaxed">{advance.purpose || "—"}</span>
          </Fact>
        </div>
      </dl>

      {footer}
    </div>
  );
}
