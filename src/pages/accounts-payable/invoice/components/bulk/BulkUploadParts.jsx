// Shared pieces for the bulk upload pages: per-file / per-batch status meta and the batch
// progress bar. Status colours always come with a text label (never colour alone).
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Copy, Loader2, MinusCircle, XCircle, Clock } from "lucide-react";

export const ITEM_STATUS = {
  QUEUED: { label: "Waiting", tone: "slate", icon: Clock },
  PROCESSING: { label: "Reading", tone: "blue", icon: Loader2, spin: true },
  CREATED: { label: "Sent to OCR review", tone: "emerald", icon: CheckCircle2 },
  VENDOR_NOT_FOUND: { label: "Vendor not found", tone: "amber", icon: AlertTriangle },
  DUPLICATE: { label: "Duplicate", tone: "slate", icon: Copy },
  FAILED: { label: "Failed", tone: "rose", icon: XCircle },
  SKIPPED: { label: "Skipped", tone: "slate", icon: MinusCircle },
};

export const BATCH_STATUS = {
  QUEUED: { label: "Queued", tone: "slate" },
  PROCESSING: { label: "Processing", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "emerald" },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "amber" },
};

const TONE_CLASSES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusPill({ meta, stalled = false }) {
  if (!meta) return null;
  const Icon = stalled ? AlertTriangle : meta.icon;
  const tone = stalled ? "amber" : meta.tone;
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1", TONE_CLASSES[tone])}>
      {Icon && <Icon className={clsx("h-3.5 w-3.5", meta.spin && !stalled && "animate-spin")} aria-hidden />}
      {stalled ? "Stalled" : meta.label}
    </span>
  );
}

export function attentionCount(counts = {}) {
  return (counts.vendor_not_found || 0) + (counts.failed || 0);
}

export function doneCount(batch) {
  const c = batch?.counts || {};
  return (batch?.total_files || 0) - (c.queued || 0);
}

const SEGMENTS = [
  { key: "created", label: "Created", className: "bg-emerald-500" },
  { key: "attention", label: "Needs attention", className: "bg-amber-500" },
  { key: "other", label: "Duplicate / skipped", className: "bg-slate-400" },
];

/** Stacked bar of final results; the unfilled remainder is files still in progress. */
export function BatchProgressBar({ batch, showLegend = false, className }) {
  const c = batch?.counts || {};
  const total = Math.max(batch?.total_files || 0, 1);
  const values = { created: c.created || 0, attention: attentionCount(c), other: (c.duplicate || 0) + (c.skipped || 0) };
  const done = doneCount(batch);
  return (
    <div className={className}>
      <div
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={batch?.total_files || 0}
        aria-valuenow={done}
        aria-label={`${done} of ${batch?.total_files || 0} files processed`}
      >
        {SEGMENTS.map((s) =>
          values[s.key] ? <div key={s.key} className={clsx("h-full", s.className)} style={{ width: `${(values[s.key] / total) * 100}%` }} /> : null,
        )}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={clsx("h-2 w-2 rounded-full", s.className)} aria-hidden />
              {s.label} <span className="font-semibold text-slate-800">{values[s.key]}</span>
            </span>
          ))}
          {c.queued ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-200" aria-hidden />
              In progress <span className="font-semibold text-slate-800">{c.queued}</span>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
