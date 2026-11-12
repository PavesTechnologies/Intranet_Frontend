import React, { useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { buildAdjustmentRequest, newIdempotencyKey, adjustmentErrorMessage } from "@/pages/expense-management/api/adjustmentRequest";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(data) ? data : data.content ?? data.items ?? [];
};

const amountOf = (value) => Number(value) || 0;

// Finance chooses ONE of the employee's open advances to cover part of this report. The split is shown before anything
// is recorded: the covered amount is set against that advance, and the rest is paid to the employee. The amount is never
// spread across advances automatically, and an advance is never netted against an unrelated report.
export default function CashAdvanceOffsetSection({ reportId, employeeId, reportTotal, currencyCode, onApplied }) {
  const [openAdvances, setOpenAdvances] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const loadOpenAdvances = async () => {
    try {
      const list = unwrapList(await cashAdvanceApi.getAll({ limit: 1000 }));
      setOpenAdvances(
        list
          .filter((a) => String(a.employeeId ?? "") === String(employeeId ?? "") && amountOf(a.outstandingBalance) > 0)
          .sort((a, b) => String(a.advanceId).localeCompare(String(b.advanceId))),
      );
    } catch {
      setOpenAdvances([]);
      showStatusToast("Could not load the employee's open cash advances", "error");
    }
  };

  useEffect(() => {
    loadOpenAdvances();
    // Reload only when the report or employee changes; the list is refreshed after each recorded offset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, employeeId]);

  const selected = (openAdvances || []).find((a) => a.advanceId === selectedId) || null;
  const total = amountOf(reportTotal);
  const outstanding = selected ? amountOf(selected.outstandingBalance) : 0;
  const covered = selected ? Math.min(total, outstanding) : 0;
  const paid = total - covered;

  const record = async () => {
    if (!selected || covered <= 0) return;
    setBusy(true);
    try {
      const payload = buildAdjustmentRequest({
        advanceId: selected.advanceId,
        reportId,
        adjustedAmount: covered,
        idempotencyKey: newIdempotencyKey(),
      });
      await cashAdvanceApi.createReimbursementAdjustment(payload);
      setResult({ advanceId: selected.advanceId, covered, paid });
      setSelectedId("");
      showStatusToast("Cash advance offset recorded", "success");
      await loadOpenAdvances();
      onApplied?.();
    } catch (err) {
      showStatusToast(adjustmentErrorMessage(err, "Could not record the offset"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (openAdvances === null) {
    return <p className="text-xs text-gray-500">Loading the employee's open cash advances…</p>;
  }

  if (openAdvances.length === 0) {
    return (
      <div className="space-y-2 text-xs text-gray-600">
        <p className="rounded-md bg-gray-50 px-3 py-2">
          This employee has no open cash advance. The report is paid in full to the employee.
        </p>
        {result && <ResultNote result={result} currencyCode={currencyCode} />}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs text-gray-700">
      <p className="text-gray-500">
        Pick the advance this report should cover. Only the covered amount is set against that advance; the rest is paid to the employee.
      </p>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium text-gray-800">Open cash advances</legend>
        {openAdvances.map((a) => {
          const isSelected = a.advanceId === selectedId;
          return (
            <label
              key={a.advanceId}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                isSelected ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name={`offset-advance-${reportId}`}
                value={a.advanceId}
                checked={isSelected}
                onChange={() => setSelectedId(a.advanceId)}
                className="mt-0.5 h-3.5 w-3.5 accent-blue-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{a.purpose || a.title || "Cash advance"}</span>
                <span className="mt-0.5 block text-gray-500">
                  Received {formatMoney(a.disbursedAmount ?? a.amount, currencyCode)} · Still owed{" "}
                  <span className="font-semibold text-amber-700">{formatMoney(a.outstandingBalance, currencyCode)}</span>
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-gray-400">{a.advanceId}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {selected ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 font-medium text-gray-800">How this report will be split</p>
          <dl className="space-y-1.5">
            <Row label="Report total" value={formatMoney(total, currencyCode)} />
            <Row label="Covered by this advance" value={`− ${formatMoney(covered, currencyCode)}`} tone="text-gray-900" />
            <Row label="Paid to the employee" value={formatMoney(paid, currencyCode)} strong />
          </dl>
          <p className="mt-2 border-t border-gray-200 pt-2 text-gray-500">
            The advance will still owe {formatMoney(outstanding - covered, currencyCode)} after this.
          </p>
          <div className="mt-3 flex justify-end">
            <Button disabled={busy || covered <= 0} onClick={record} className="text-xs">
              {busy ? "Recording…" : `Record offset of ${formatMoney(covered, currencyCode)}`}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Select an advance to see how this report will be split.</p>
      )}

      {result && <ResultNote result={result} currencyCode={currencyCode} />}
    </div>
  );
}

function Row({ label, value, strong = false, tone = "text-gray-700" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-gray-900" : tone}`}>{value}</dd>
    </div>
  );
}

function ResultNote({ result, currencyCode }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
      {formatMoney(result.covered, currencyCode)} set against the cash advance, {formatMoney(result.paid, currencyCode)} paid to the employee.
    </p>
  );
}
