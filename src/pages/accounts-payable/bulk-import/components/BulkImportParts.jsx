// Shared bits for the bulk import pages. Status colours always come with a text label.
import clsx from "clsx";

export const ROW_STATUS = {
  PENDING: { label: "Checking", tone: "blue" },
  READY: { label: "Ready", tone: "emerald" },
  NEEDS_REVIEW: { label: "Needs review", tone: "amber" },
  ERROR: { label: "Error", tone: "rose" },
  RECORDED: { label: "Recorded", tone: "emerald" },
  SKIPPED: { label: "Skipped", tone: "slate" },
};


export const JOB_STATUS = {
  VALIDATING: { label: "Checking documents", tone: "blue" },
  VALIDATED: { label: "Ready to record", tone: "emerald" },
  RECORDING: { label: "Recording", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "emerald" },
  NEEDS_REVIEW: { label: "Needs review", tone: "amber" },
  FAILED: { label: "Failed", tone: "rose" },
};

const TONES = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

function Pill({ meta }) {
  if (!meta) return null;
  return <span className={clsx("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1", TONES[meta.tone])}>{meta.label}</span>;
}

export const JobStatusPill = ({ status }) => <Pill meta={JOB_STATUS[status]} />;
export const RowStatusPill = ({ status }) => <Pill meta={ROW_STATUS[status]} />;

export function RowCounts({ counts = {}, total }) {
  const parts = [
    ["recorded", "recorded", "text-emerald-700"],
    ["ready", "ready", "text-emerald-700"],
    ["needs_review", "to review", "text-amber-700"],
    ["error", counts.error === 1 ? "error" : "errors", "text-rose-700"],
    ["pending", "checking", "text-blue-700"],
  ].filter(([key]) => counts[key]);
  return (
    <p className="text-xs text-slate-600">
      <span className="font-semibold text-slate-900">{total}</span> rows
      {parts.map(([key, label, cls]) => (
        <span key={key} className={cls}> · {counts[key]} {label}</span>
      ))}
    </p>
  );
}

export function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
