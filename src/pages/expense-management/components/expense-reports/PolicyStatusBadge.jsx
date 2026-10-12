import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, MessageSquareText } from "lucide-react";

/** Whether the employee has explained this violation (the backend's PolicyViolation.isJustified). */
export const isJustified = (warning) => !!(warning?.justification && String(warning.justification).trim());

/**
 * Enforcement, not severity, decides the line-item state — a backend can
 * legitimately return severity=WARN with enforcementType=BLOCK, and that
 * must still render as BLOCKED. An explained violation no longer blocks:
 * the employee's justification goes to the approver and Finance, who decide.
 * Priority: unexplained BLOCK > unexplained WARN > all explained > no violation.
 */
export function derivePolicyStatus(lineStatus, policyWarnings) {
  const warnings = Array.isArray(policyWarnings) ? policyWarnings : [];
  const isBlock = (w) => (w?.enforcementType || "").toUpperCase() === "BLOCK";
  const blocking = warnings.filter((w) => isBlock(w) && !isJustified(w));
  const warning = warnings.filter((w) => !isBlock(w) && !isJustified(w));
  const explained = warnings.filter(isJustified);
  // lineStatus BLOCKED only counts while something is still unexplained - the backend
  // recomputes it on justify, but a list loaded before that may still carry the old value.
  const isBlockedStatus = (lineStatus || "").toUpperCase() === "BLOCKED" && explained.length < warnings.length;

  let status = "ACTIVE";
  if (blocking.length > 0 || isBlockedStatus) status = "BLOCKED";
  else if (warning.length > 0) status = "WARNING";
  else if (explained.length > 0) status = "JUSTIFIED";

  return { status, warnings: [...blocking, ...warning, ...explained], blocking, warning, explained };
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
  JUSTIFIED: {
    emoji: "🔵",
    label: "Explained",
    icon: MessageSquareText,
    text: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    dot: "bg-sky-500",
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

/** Limit / actual / overage line for one violation - shared with the justification dialog. */
export function ViolationFigures({ warning }) {
  const overage = formatOverage(warning.overagePercent);
  const hasLimit = warning.limitValue !== undefined && warning.limitValue !== null;
  const hasActual = warning.actualValue !== undefined && warning.actualValue !== null;
  if (!hasLimit && !hasActual && !overage) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
      {hasLimit && (
        <span>
          Limit: <span className="font-medium text-gray-700">{formatMoney(warning.limitValue, warning.currencyCode)}</span>
        </span>
      )}
      {hasActual && (
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
  );
}

function ViolationRow({ warning, audience = "employee" }) {
  const isBlock = (warning.enforcementType || "").toUpperCase() === "BLOCK";

  return (
    <div className={`rounded-lg border px-3 py-2 ${isBlock ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <p className={`text-xs font-medium ${isBlock ? "text-red-700" : "text-amber-700"}`}>
        {warning.message || warning.ruleType || "Policy violation"}
      </p>
      <ViolationFigures warning={warning} />
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
      {isJustified(warning) ? (
        <div className="mt-1.5 rounded-md border border-sky-200 bg-white px-2 py-1.5 text-xs text-gray-700">
          <p className="flex items-center gap-1 font-semibold text-sky-700">
            <MessageSquareText className="h-3.5 w-3.5 flex-shrink-0" />
            {audience === "reviewer" ? "Employee's justification" : "Your justification"}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words">{warning.justification}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-xs italic text-gray-500">
          {audience === "reviewer" ? "No justification provided." : "Not explained yet - you'll be asked why when you submit."}
        </p>
      )}
      {/* A SEPARATE, approver-side authorization - distinct from the employee's own justification
          above. Read-only here; the action itself lives in the approver's own review queue. */}
      {warning.approverJustifiedAt && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Exception authorized by <span className="font-medium">{warning.approverJustifiedBy}</span>: “{warning.approverJustification}”
          </span>
        </p>
      )}
    </div>
  );
}

const BANNER_TEXT = {
  employee: {
    BLOCKED: "This is over policy. You'll be asked to explain why when you submit; your approver and Finance decide whether to accept it.",
    WARNING: "This exceeds the recommended limit. You can still save and submit; you'll be asked to explain it when you submit.",
    JUSTIFIED: "Explained. Your approver and Finance will see your justification when they review this line item.",
  },
  reviewer: {
    BLOCKED: "The employee has not explained this violation.",
    WARNING: "The employee has not explained this violation.",
    JUSTIFIED: "The employee explained this violation. Weigh the justification, then approve, send back or reject.",
  },
};

/**
 * Inline policy banner: the employee's Manual Entry / Edit drawer, and the approver's and
 * Finance's review panels (audience="reviewer"). Always visible (not a popover).
 */
export function PolicyResultBanner({ lineStatus, policyWarnings, audience = "employee" }) {
  const { status, warnings } = derivePolicyStatus(lineStatus, policyWarnings);
  if (status === "ACTIVE") return null;

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const text = (BANNER_TEXT[audience] || BANNER_TEXT.employee)[status];

  return (
    <div className={`mb-4 rounded-lg border ${meta.border} ${meta.bg} p-3.5`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${meta.text}`}>
        <Icon size={16} className="shrink-0" />
        <span>
          {meta.emoji} {status === "JUSTIFIED" ? "POLICY VIOLATION - EXPLAINED" : status === "BLOCKED" ? "POLICY VIOLATION" : "POLICY WARNING"}
        </span>
      </div>
      <p className={`mt-0.5 text-xs font-semibold ${meta.text}`}>
        {warnings.length > 1 ? `${warnings.length} violations` : "1 violation"}
      </p>
      <div className="mt-2 space-y-1.5">
        {warnings.map((w, idx) => (
          <ViolationRow key={w.violationId || idx} warning={w} audience={audience} />
        ))}
      </div>
      <p className={`mt-2 text-xs ${meta.text}`}>{text}</p>
    </div>
  );
}

/** Compact status badge for the line-item table — click to view violation details. */
export default function PolicyStatusBadge({ lineStatus, policyWarnings, audience = "employee" }) {
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
            {meta.emoji} {status === "JUSTIFIED" ? "Policy violations - explained" : status === "BLOCKED" ? "Policy Violations" : "Policy Warning"}
          </p>
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {warnings.map((w, idx) => (
              <ViolationRow key={w.violationId || idx} warning={w} audience={audience} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
