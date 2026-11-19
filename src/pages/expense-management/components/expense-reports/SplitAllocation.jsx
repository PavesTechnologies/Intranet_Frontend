import React, { useMemo, useState } from "react";
import Select from "react-select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import { splitService } from "@/pages/expense-management/api/expenseReportsApi";

/**
 * Split Allocation (ExpenseSplitController) for one line item - layered on top of the line item's own
 * costCenterId, not a replacement for it. Whole-set replace, so `rows` always holds the complete
 * intended set; saving sends every row (or an empty list to revert). Shared by the Manual Entry drawer
 * and the Automatic (AI Scan) review so both behave the same.
 */

const emptySplitRow = () => ({ key: Math.random().toString(36).slice(2), costCenterId: "", percentage: "", allocatedAmount: "" });

/**
 * State and rules for a split allocation. `totalBasis` is what the rows must add up to: the backend
 * validates against the line item's BASE-currency amount (ExpenseSplitServiceImpl uses
 * lineItem.getBaseAmount()), which isn't known before the line is first created, so callers pass the
 * entered amount until a save returns the authoritative baseAmount.
 */
export function useSplitAllocation(totalBasis, formatAmount) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState("PERCENTAGE"); // mirrors enums/SplitType.java
  const [rows, setRows] = useState([]); // [{ key, costCenterId, percentage, allocatedAmount }]
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Whether the line item had an active split set as of the last load, so an unchecked "Split this
  // expense" on an item that previously had one still sends the [] revert-to-normal PUT - while a
  // line item that never had splits skips the splits call entirely.
  const [hadExisting, setHadExisting] = useState(false);

  const reset = () => {
    setEnabled(false);
    setMode("PERCENTAGE");
    setRows([]);
    setErrors({});
    setHadExisting(false);
  };

  /** Shows a line item's saved splits (as returned by GET .../splits). */
  const loadFrom = (list) => {
    if (list.length > 0) {
      setEnabled(true);
      setMode(list[0].splitType || "PERCENTAGE");
      setRows(
        list.map((s) => ({
          key: s.splitId || Math.random().toString(36).slice(2),
          costCenterId: s.costCenterId,
          percentage: s.percentage != null ? String(s.percentage) : "",
          allocatedAmount: s.allocatedAmount != null ? String(s.allocatedAmount) : "",
        }))
      );
      setHadExisting(true);
    } else {
      setEnabled(false);
      setRows([]);
      setHadExisting(false);
    }
  };

  const toggle = (checked) => {
    setEnabled(checked);
    setErrors({});
    if (checked && rows.length < 2) {
      setRows([emptySplitRow(), emptySplitRow()]);
    }
  };

  // Switching mode clears the now-irrelevant values instead of trying to convert them (a percentage
  // doesn't map onto a fixed amount without knowing the total); cost center selections are kept.
  const changeMode = (next) => {
    setMode(next);
    setRows((prev) => prev.map((row) => ({ ...row, percentage: "", allocatedAmount: "" })));
    setErrors({});
  };

  const changeRow = (idx, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
    setErrors((prev) => {
      if (!prev.rows?.[idx]?.[field]) return prev;
      return { ...prev, rows: { ...prev.rows, [idx]: { ...prev.rows[idx], [field]: "" } } };
    });
  };

  const addRow = () => setRows((prev) => [...prev, emptySplitRow()]);

  // A split allocation is only meaningful with 2+ rows (backend rejects exactly 1); dropping to 1 or 0
  // reverts the line item to a normal, single-cost-center expense rather than blocking removal.
  const removeRow = (idx) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length < 2) {
        setEnabled(false);
        setErrors({});
        return [];
      }
      return next;
    });
  };

  // Mirrors ExpenseSplitServiceImpl.buildPercentageSplits exactly: every row but the last is rounded to
  // 4 decimals, and the last absorbs the remainder so the total always reconciles to totalBasis.
  const computedAmounts = useMemo(() => {
    if (!enabled || mode !== "PERCENTAGE") return {};
    const amounts = {};
    let running = 0;
    rows.forEach((row, i) => {
      if (i === rows.length - 1) {
        amounts[i] = Math.max(totalBasis - running, 0);
      } else {
        const amt = Math.round(((totalBasis * (Number(row.percentage) || 0)) / 100) * 10000) / 10000;
        amounts[i] = amt;
        running += amt;
      }
    });
    return amounts;
  }, [enabled, mode, rows, totalBasis]);

  const totalPercentage = rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
  const totalAllocated =
    mode === "PERCENTAGE"
      ? Object.values(computedAmounts).reduce((sum, v) => sum + v, 0)
      : rows.reduce((sum, r) => sum + (Number(r.allocatedAmount) || 0), 0);

  const computeErrors = () => {
    if (!enabled) return {};
    const result = { rows: {} };
    if (rows.length < 2) {
      result.general = "A split allocation needs at least 2 cost centers — add another row or turn off splitting.";
      return result;
    }

    const seen = new Set();
    rows.forEach((row, i) => {
      const rowErr = {};
      if (!row.costCenterId) {
        rowErr.costCenterId = "Select a cost center.";
      } else if (seen.has(row.costCenterId)) {
        rowErr.costCenterId = "Already used in another row.";
      } else {
        seen.add(row.costCenterId);
      }

      if (mode === "PERCENTAGE") {
        const pct = Number(row.percentage);
        if (row.percentage === "" || Number.isNaN(pct)) rowErr.percentage = "Required.";
        else if (pct <= 0) rowErr.percentage = "Must be > 0.";
      } else {
        const amt = Number(row.allocatedAmount);
        if (row.allocatedAmount === "" || Number.isNaN(amt)) rowErr.allocatedAmount = "Required.";
        else if (amt <= 0) rowErr.allocatedAmount = "Must be > 0.";
      }
      if (Object.keys(rowErr).length > 0) result.rows[i] = rowErr;
    });

    if (Object.keys(result.rows).length === 0) {
      if (mode === "PERCENTAGE") {
        if (Math.abs(totalPercentage - 100) > 0.01) {
          result.general = `Percentages must add up to 100% — currently ${totalPercentage.toFixed(2)}%.`;
        }
      } else if (Math.abs(totalAllocated - totalBasis) > 0.01) {
        result.general = `Allocated amounts must add up to the line item total (${formatAmount(totalBasis)}) — currently ${formatAmount(
          totalAllocated
        )}.`;
      }
    }
    return result;
  };

  /** Shows any problems and returns whether the split (if any) can be saved. */
  const validate = () => {
    const result = computeErrors();
    const ok = !result.general && Object.keys(result.rows || {}).length === 0;
    setErrors(ok ? {} : result);
    return ok;
  };

  // Whole-set replace: the complete intended split list (or [] to revert to normal); null when there's
  // nothing to do at all (never split, still not split).
  const buildPayload = () => {
    if (!enabled) {
      return hadExisting ? { splits: [] } : null;
    }
    return {
      splits: rows.map((row) => ({
        costCenterId: row.costCenterId,
        splitType: mode,
        percentage: mode === "PERCENTAGE" ? Number(row.percentage) : null,
        allocatedAmount: mode === "FIXED_AMOUNT" ? Number(row.allocatedAmount) : null,
      })),
    };
  };

  // Saves (or reverts) the split allocation once the line item itself is known to exist. Never throws -
  // callers decide how to present a failure, since "line item saved, split failed" needs different
  // handling than a normal save error (the line item must not be reported as lost).
  const save = async (lineItemId) => {
    const payload = buildPayload();
    if (!payload) return { ok: true };
    try {
      const res = await splitService.replace(lineItemId, payload);
      const saved = res.data?.data || res.data || [];
      setHadExisting(Array.isArray(saved) && saved.length > 0);
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.detail || "Failed to save the split allocation.";
      return { ok: false, message };
    }
  };

  return {
    enabled,
    mode,
    rows,
    errors,
    loading,
    setLoading,
    totalBasis,
    computedAmounts,
    totalPercentage,
    totalAllocated,
    reset,
    loadFrom,
    toggle,
    changeMode,
    changeRow,
    addRow,
    removeRow,
    validate,
    save,
  };
}

/**
 * Labels of the cost centers a line is charged to that sit outside the caller's home department: the
 * split rows when splitting, otherwise the line's own cost center. Each needs a reason (the server
 * re-checks at submit). A cost center with no department is never cross-department. With the home
 * department unknown, a line split across two or more departments still needs one - every share is listed.
 */
export function crossDepartmentCostCenterLabels({ split, costCenterId, costCenterOptions, homeDepartmentUuid }) {
  const ids = split.enabled ? split.rows.map((row) => row.costCenterId).filter(Boolean) : [costCenterId].filter(Boolean);
  const options = [...new Set(ids)]
    .map((id) => costCenterOptions.find((o) => o.value === id))
    .filter((o) => o?.departmentUuid);
  if (!homeDepartmentUuid) {
    const departments = new Set(options.map((o) => String(o.departmentUuid).toLowerCase()));
    return departments.size > 1 ? options.map((o) => o.label) : [];
  }
  const home = String(homeDepartmentUuid).toLowerCase();
  return options.filter((o) => String(o.departmentUuid).toLowerCase() !== home).map((o) => o.label);
}

/** The "Split this expense across multiple cost centers" box, driven by {@link useSplitAllocation}. */
export function SplitAllocationSection({ split, costCenterOptions, selectStyles, disabled, formatAmount, currencyLabel }) {
  const balanced =
    split.mode === "PERCENTAGE"
      ? Math.abs(split.totalPercentage - 100) <= 0.01
      : Math.abs(split.totalAllocated - split.totalBasis) <= 0.01;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={split.enabled}
          onChange={(e) => split.toggle(e.target.checked)}
          disabled={disabled || split.loading}
          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        Split this expense across multiple cost centers
      </label>

      {split.loading && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Loader2 className="animate-spin" size={12} /> Loading existing split allocation...
        </div>
      )}

      {split.enabled && !split.loading && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Split Allocation</span>
            <select
              value={split.mode}
              onChange={(e) => split.changeMode(e.target.value)}
              disabled={disabled}
              className="text-[11px] px-2 py-1 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="PERCENTAGE">By Percentage</option>
              <option value="FIXED_AMOUNT">By Fixed Amount</option>
            </select>
          </div>

          <div className="space-y-2">
            {split.rows.map((row, idx) => {
              const rowError = split.errors.rows?.[idx] || {};
              const rowCostCenterOptions = costCenterOptions.filter(
                (o) => o.value === row.costCenterId || !split.rows.some((r, j) => j !== idx && r.costCenterId === o.value)
              );
              return (
                <div key={row.key} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      options={rowCostCenterOptions}
                      value={costCenterOptions.find((o) => o.value === row.costCenterId) || null}
                      onChange={(opt) => split.changeRow(idx, "costCenterId", opt ? opt.value : "")}
                      placeholder="Select cost center..."
                      isSearchable
                      styles={selectStyles}
                      isDisabled={disabled}
                    />
                    {rowError.costCenterId && <span className="text-[11px] text-red-600 block mt-0.5">{rowError.costCenterId}</span>}
                  </div>
                  <div className="w-24 shrink-0">
                    <FormInput
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={split.mode === "PERCENTAGE" ? "%" : "Amount"}
                      value={split.mode === "PERCENTAGE" ? row.percentage : row.allocatedAmount}
                      onChange={(e) => split.changeRow(idx, split.mode === "PERCENTAGE" ? "percentage" : "allocatedAmount", e.target.value)}
                      disabled={disabled}
                      inputClassName="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-8"
                      error={split.mode === "PERCENTAGE" ? rowError.percentage : rowError.allocatedAmount}
                    />
                  </div>
                  {split.mode === "PERCENTAGE" && (
                    <div className="w-20 shrink-0 pt-1.5 text-right text-xs font-mono text-gray-500">
                      {formatAmount(split.computedAmounts[idx] ?? 0)}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="icon"
                    title="Remove row"
                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 shrink-0"
                    onClick={() => split.removeRow(idx)}
                    disabled={disabled}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={split.addRow}
            disabled={disabled || split.rows.length >= costCenterOptions.length}
          >
            <Plus size={12} />
            Add Cost Center
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold">
            <span className={balanced ? "text-emerald-600" : "text-red-600"}>
              Total: {split.mode === "PERCENTAGE" ? `${split.totalPercentage.toFixed(2)}%` : formatAmount(split.totalAllocated)}
              {split.mode === "PERCENTAGE" && ` / ${formatAmount(split.totalAllocated)}`}
            </span>
            <span className="text-gray-400">
              Line Item Amount: {formatAmount(split.totalBasis)} {currencyLabel}
            </span>
          </div>

          {split.errors.general && <p className="text-[11px] text-red-600">{split.errors.general}</p>}
        </div>
      )}
    </div>
  );
}
