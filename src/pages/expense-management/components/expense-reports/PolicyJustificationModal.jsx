import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/Button/Button";
import { ViolationFigures } from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";

/** Mirrors the backend's policy.justification.min-length default. */
export const JUSTIFICATION_MIN_LENGTH = 20;

const formatMoney = (value, currencyCode) => {
  const num = Number(value);
  if (value === undefined || value === null || value === "" || Number.isNaN(num)) return "";
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
};

/**
 * Asks the employee to explain each policy violation on the report. Opened from Submit /
 * Resubmit when something is still unexplained (mode "submit": saves every explanation, then the
 * caller submits), or from the report's "Explain now" prompt (mode "save"). Each explanation goes
 * to the approver and Finance, who decide whether to accept the expense.
 *
 * items: [{ lineItem, violation }] - the violations to explain, grouped here by line item.
 * onConfirm receives [{ lineItemId, violationId, justification }].
 */
export default function PolicyJustificationModal({ isOpen, items, mode = "submit", isSaving, error, onConfirm, onCancel }) {
  const [drafts, setDrafts] = useState({});

  // Fresh drafts each time the dialog opens, pre-filled with any existing explanation.
  useEffect(() => {
    if (!isOpen) return;
    const initial = {};
    items.forEach(({ violation }) => {
      initial[violation.violationId] = violation.justification || "";
    });
    setDrafts(initial);
  }, [isOpen, items]);

  if (!isOpen) return null;

  const groups = [];
  items.forEach((item) => {
    let group = groups.find((g) => g.lineItem.lineItemId === item.lineItem.lineItemId);
    if (!group) {
      group = { lineItem: item.lineItem, violations: [] };
      groups.push(group);
    }
    group.violations.push(item.violation);
  });

  const lengthOf = (id) => (drafts[id] || "").trim().length;
  const remaining = items.filter(({ violation }) => lengthOf(violation.violationId) < JUSTIFICATION_MIN_LENGTH).length;

  const confirm = () =>
    onConfirm(
      items.map(({ lineItem, violation }) => ({
        lineItemId: lineItem.lineItemId,
        violationId: violation.violationId,
        justification: (drafts[violation.violationId] || "").trim(),
      }))
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
      <div role="dialog" aria-modal="true" aria-labelledby="policy-justification-title" className="flex max-h-full w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 id="policy-justification-title" className="text-base font-semibold text-gray-900">
              Explain {items.length > 1 ? `${items.length} policy violations` : "the policy violation"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {items.length > 1 ? "These expenses go" : "This expense goes"} over your company's expense policy. Say why, so your approver
              and Finance can decide whether to accept {items.length > 1 ? "them" : "it"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {groups.map(({ lineItem, violations }) => (
            <div key={lineItem.lineItemId} className="rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-sm font-semibold text-gray-800">
                  {lineItem.merchantName || "Line item"}
                  {lineItem.categoryName && <span className="ml-2 text-xs font-normal text-gray-500">{lineItem.categoryName}</span>}
                </p>
                <p className="text-xs text-gray-500">{formatMoney(lineItem.amount, lineItem.currencyCode)}</p>
              </div>
              <div className="space-y-3 p-3">
                {violations.map((v) => {
                  const length = lengthOf(v.violationId);
                  const short = length < JUSTIFICATION_MIN_LENGTH;
                  const inputId = `justification-${v.violationId}`;
                  return (
                    <div key={v.violationId}>
                      <p className="flex items-start gap-1.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        {v.message || v.ruleType || "Policy violation"}
                      </p>
                      <ViolationFigures warning={v} />
                      <label htmlFor={inputId} className="sr-only">
                        Reason for this violation
                      </label>
                      <textarea
                        id={inputId}
                        rows={3}
                        value={drafts[v.violationId] || ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [v.violationId]: e.target.value }))}
                        disabled={isSaving}
                        placeholder="e.g. Client dinner for four; the only restaurant open near the venue that late."
                        className="mt-2 w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30"
                      />
                      <p className={`mt-0.5 text-[11px] ${short ? "text-gray-400" : "text-emerald-600"}`}>
                        {short ? `At least ${JUSTIFICATION_MIN_LENGTH} characters (${length}/${JUSTIFICATION_MIN_LENGTH})` : "Looks good"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {remaining > 0 && (
              <p className="text-xs text-gray-500 sm:mr-auto">
                {remaining} {remaining > 1 ? "explanations" : "explanation"} still too short
              </p>
            )}
            <Button variant="outline" size="small" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              disabled={remaining > 0}
              loading={isSaving}
              loadingText={mode === "submit" ? "Submitting..." : "Saving..."}
              onClick={confirm}
            >
              {mode === "submit" ? "Save & Submit" : "Save explanations"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
