import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Paperclip } from "lucide-react";
import { lineItemService } from "@/pages/expense-management/api/expenseReportsApi";
import { ViolationFigures } from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";

const PREVIEW_DELAY_MS = 400;

const isBlock = (w) => (w?.enforcementType || "").toUpperCase() === "BLOCK";

/**
 * Policy warnings for a line-item form while it is being filled in ("over limit", "receipt
 * required", ...). Asks the server's policy preview, which runs the same rules a save does but
 * persists nothing. Debounced; stale responses are dropped; a failed preview just shows nothing,
 * since the authoritative check still runs on save.
 *
 * Waits until category, amount and currency are filled, so a half-typed form isn't judged.
 * MISSING_DESCRIPTION is held back until `descriptionTouched`, so it doesn't nag before the
 * employee has reached that field.
 */
export function usePolicyPreview({ reportId, enabled, form, lineItemId, receiptAttached, descriptionTouched }) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const amount = Number(form.amount);
  const ready = !!(enabled && reportId && form.categoryId && form.currencyId && amount > 0);

  useEffect(() => {
    if (!ready) {
      requestSeq.current++;
      setWarnings([]);
      setLoading(false);
      return undefined;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      lineItemService
        .previewPolicy(reportId, {
          categoryId: form.categoryId,
          expenseDate: form.expenseDate || null,
          merchantName: (form.merchantName || "").trim() || null,
          description: (form.description || "").trim() || null,
          amount,
          currencyId: form.currencyId,
          lineItemId: lineItemId || null,
          receiptAttached: !!receiptAttached,
        })
        .then((res) => {
          if (seq !== requestSeq.current) return;
          const data = res.data?.data;
          setWarnings(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (seq === requestSeq.current) setWarnings([]);
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    ready,
    reportId,
    form.categoryId,
    form.expenseDate,
    form.merchantName,
    form.description,
    amount,
    form.currencyId,
    lineItemId,
    receiptAttached,
  ]);

  const visible = warnings.filter((w) => descriptionTouched || w.ruleType !== "MISSING_DESCRIPTION");
  // Blocking rules first, so the one that needs an explanation is read first.
  visible.sort((a, b) => Number(isBlock(b)) - Number(isBlock(a)));
  return { warnings: visible, loading };
}

function PreviewRow({ warning }) {
  const block = isBlock(warning);
  const receipt = warning.ruleType === "RECEIPT_REQUIRED";
  const Icon = receipt ? Paperclip : block ? AlertCircle : AlertTriangle;
  const tone = block
    ? "border-red-200 bg-red-50/70 text-red-700"
    : "border-amber-200 bg-amber-50/70 text-amber-800";

  let message = warning.message || warning.ruleType || "Policy warning";
  if (receipt) message = `Attach a receipt: ${message.charAt(0).toLowerCase()}${message.slice(1)}.`;

  return (
    <li className={`flex gap-2 rounded-lg border px-2.5 py-1.5 ${tone}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium break-words">{message}</p>
        {warning.ruleType === "AMOUNT_LIMIT" && <ViolationFigures warning={warning} />}
        {block && (
          <p className="mt-0.5 text-[11px] text-red-600">
            You can still save, but you&apos;ll need to explain this before the report can be submitted.
          </p>
        )}
      </div>
    </li>
  );
}

/** The live warnings block shown under the amount fields. Renders nothing while there is nothing to say. */
export default function LivePolicyWarnings({ warnings, loading, className = "" }) {
  if (!warnings.length && !loading) return null;
  return (
    <div className={`space-y-1 ${className}`} aria-live="polite" data-testid="live-policy-warnings">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Policy check
        {loading && <Loader2 className="h-3 w-3 animate-spin" aria-label="Checking policy" />}
      </div>
      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <PreviewRow key={`${w.ruleType}-${i}`} warning={w} />
          ))}
        </ul>
      )}
    </div>
  );
}
