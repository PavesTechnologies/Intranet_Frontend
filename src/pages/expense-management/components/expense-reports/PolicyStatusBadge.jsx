import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Enforcement, not severity, decides the line-item state — a backend can
 * legitimately return severity=WARN with enforcementType=BLOCK, and that
 * must still render as BLOCKED. Priority when a line item has multiple
 * policyWarnings: BLOCK > WARN > no violation.
 */
export function derivePolicyStatus(lineStatus, policyWarnings) {
  const warnings = Array.isArray(policyWarnings) ? policyWarnings : [];
  const blocking = warnings.filter((w) => (w?.enforcementType || "").toUpperCase() === "BLOCK");
  const warning = warnings.filter((w) => (w?.enforcementType || "").toUpperCase() === "WARN");
  const other = warnings.filter((w) => !blocking.includes(w) && !warning.includes(w));
  const isBlockedStatus = (lineStatus || "").toUpperCase() === "BLOCKED";

  let status = "ACTIVE";
  if (blocking.length > 0 || isBlockedStatus) status = "BLOCKED";
  else if (warning.length > 0) status = "WARNING";

  return { status, warnings: [...blocking, ...warning, ...other], blocking, warning };
}

const STATUS_META = {
  BLOCKED: {
    emoji: "🔴",
    label: "Blocked",
    icon: AlertCircle,
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  WARNING: {
    emoji: "🟡",
    label: "Warning",
    icon: AlertTriangle,
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  ACTIVE: {
    emoji: "🟢",
    label: "Active",
    icon: CheckCircle2,
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const formatMoney = (value, currencyCode) => {
  if (value === undefined || value === null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
};

const formatOverage = (value) =>
  value === undefined || value === null || value === "" ? null : `${Number(value).toFixed(2)}%`;

function ViolationRow({ warning }) {
  const isBlock = (warning.enforcementType || "").toUpperCase() === "BLOCK";
  const overage = formatOverage(warning.overagePercent);

  return (
    <div className={`rounded-lg border px-3 py-2 ${isBlock ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <p className={`text-xs font-medium ${isBlock ? "text-red-700" : "text-amber-700"}`}>
        {warning.message || warning.ruleType || "Policy violation"}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
        {warning.limitValue !== undefined && warning.limitValue !== null && (
          <span>
            Limit: <span className="font-medium text-gray-700">{formatMoney(warning.limitValue, warning.currencyCode)}</span>
          </span>
        )}
        {warning.actualValue !== undefined && warning.actualValue !== null && (
          <span>
            Actual: <span className="font-medium text-gray-700">{formatMoney(warning.actualValue, warning.currencyCode)}</span>
          </span>
        )}
        {overage && (
          <span>
            Overage: <span className="font-medium text-gray-700">{overage}</span>
          </span>
        )}
      </div>
      {(warning.severityTier || warning.enforcementType) && (
        <div className="mt-1 flex gap-1.5">
          {warning.severityTier && (
            <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {warning.severityTier}
            </span>
          )}
          <span
            className={`rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isBlock ? "border-red-200 text-red-600" : "border-amber-200 text-amber-600"
            }`}
          >
            {warning.enforcementType || "WARN"}
          </span>
        </div>
      )}
    </div>
  );
}

/** Inline banner for the Manual Entry / Edit drawer — always visible (not a popover). */
export function PolicyResultBanner({ lineStatus, policyWarnings }) {
  const { status, warnings } = derivePolicyStatus(lineStatus, policyWarnings);
  if (status === "ACTIVE") return null;

  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className={`mb-4 rounded-lg border ${meta.border} ${meta.bg} p-3.5`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${meta.text}`}>
        <Icon size={16} className="shrink-0" />
        <span>
          {meta.emoji} {status === "BLOCKED" ? "BLOCKED" : "POLICY WARNING"}
        </span>
      </div>
      <p className={`mt-0.5 text-xs font-semibold ${meta.text}`}>
        {status === "BLOCKED" ? "Policy Violation" : "Policy Warning"}
        {warnings.length > 1 ? `s (${warnings.length})` : ""}
      </p>
      <div className="mt-2 space-y-1.5">
        {warnings.map((w, idx) => (
          <ViolationRow key={w.violationId || idx} warning={w} />
        ))}
      </div>
      {status === "BLOCKED" ? (
        <p className="mt-2 text-xs text-red-600">
          This line item cannot be submitted until it is within policy limits.
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-600">
          This exceeds the recommended limit, but you can still save and submit this line item.
        </p>
      )}
    </div>
  );
}

/** Compact status badge for the line-item table — click to view violation details. */
export default function PolicyStatusBadge({ lineStatus, policyWarnings }) {
  const { status, warnings } = derivePolicyStatus(lineStatus, policyWarnings);
  const meta = STATUS_META[status];
  const hasDetails = warnings.length > 0;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => hasDetails && setOpen((prev) => !prev)}
        title={hasDetails ? "View policy details" : "No policy violations"}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.text} ${meta.border} ${
          hasDetails ? "cursor-pointer hover:brightness-95" : "cursor-default"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </button>

      {open && hasDetails && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-2xl">
          <p className={`text-xs font-semibold ${meta.text}`}>
            {meta.emoji} {status === "BLOCKED" ? "Policy Violations" : "Policy Warning"}
          </p>
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {warnings.map((w, idx) => (
              <ViolationRow key={w.violationId || idx} warning={w} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
