import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { taxService } from "@/pages/expense-management/api/expenseReportsApi";

/**
 * Line item tax, calculated by the server (POST /xms/tax/calculate - the same engine the save
 * uses). The employee enters what the receipt says they paid; the tax code comes from the
 * category's mapping for the expense date and can be changed; "Receipt shows different tax"
 * unlocks the tax figure, and a reason is needed when it differs from the code's calculation.
 *
 * Controlled: `value` = { taxCodeId (null = category default), override, enteredTax, overrideReason }.
 * Use the helpers below to build the initial value, the request fields and the validation.
 */

export const emptyTaxValue = { taxCodeId: null, override: false, enteredTax: "", overrideReason: "" };

/** Value for editing a saved line. Legacy lines start on the calculation (recalculated on save, per the tax design). */
export const taxValueFromLine = (line) => {
  const tax = line?.tax;
  const overridden = tax?.taxSource === "EMPLOYEE_OVERRIDE";
  return {
    taxCodeId: tax?.taxCodeId ?? null,
    override: overridden,
    enteredTax: overridden ? String(line?.taxAmount ?? "") : "",
    overrideReason: tax?.taxOverrideReason || "",
  };
};

/** Value pre-filled from OCR: the receipt's tax is the entered side and is compared with the code. */
export const taxValueFromOcr = (ocrTax) =>
  Number(ocrTax) > 0 ? { ...emptyTaxValue, override: true, enteredTax: String(ocrTax) } : { ...emptyTaxValue };

const noCodeApplies = (preview) => !!preview && !preview.taxCodeId;

/** Request fields for the line item API. taxAmount null = take the server's calculation. */
export const taxRequestFields = (value, preview) => {
  const entered = value.override || noCodeApplies(preview);
  return {
    taxAmount: entered && value.enteredTax !== "" ? Number(value.enteredTax) : null,
    taxCodeId: value.taxCodeId || null,
    taxOverrideReason: entered && value.overrideReason.trim() ? value.overrideReason.trim() : null,
  };
};

/**
 * Same, for POST /receipts/{id}/confirm: there a null taxAmount falls back to the raw OCR value, so
 * "use the calculation" has to send the calculated figure explicitly.
 */
export const taxRequestFieldsForConfirm = (value, preview) => {
  const fields = taxRequestFields(value, preview);
  return fields.taxAmount == null ? { ...fields, taxAmount: preview ? Number(preview.taxAmount) : 0 } : fields;
};

/** Blocking errors (design §22): negative tax, tax above amount, missing reason. */
export const validateTaxValue = (value, preview, amount) => {
  const entered = value.override || noCodeApplies(preview);
  if (entered && value.enteredTax !== "") {
    const t = Number(value.enteredTax);
    if (!Number.isFinite(t) || t < 0) return "Tax cannot be negative.";
    if (t > (Number(amount) || 0)) return "Tax cannot exceed the amount paid.";
  }
  if (value.override && value.enteredTax === "") return "Enter the tax shown on the receipt.";
  if (preview?.overrideReasonRequired && !value.overrideReason.trim()) {
    return "The tax differs from the tax code - add a reason.";
  }
  return "";
};

const fmt = (n) =>
  n == null || n === "" ? "—" : (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Row = ({ label, value, sub, strong }) => (
  <div className={`flex items-center justify-between gap-3 py-1 ${strong ? "border-t border-gray-200 mt-1 pt-1.5" : ""}`}>
    <span className={`text-[11px] ${sub ? "pl-3 text-gray-500" : "text-gray-600"}`}>{label}</span>
    <span className={`text-xs tabular-nums ${strong ? "font-bold text-gray-900" : sub ? "text-gray-600" : "font-semibold text-gray-800"}`}>
      {value}
    </span>
  </div>
);

export default function TaxBreakdownPanel({
  amount,
  currencyId,
  currencyCode = "",
  expenseDate,
  categoryId,
  value,
  onChange,
  onPreview,
  error,
  disabled,
  /** Tax read from the receipt by OCR - shown as a comparison note. */
  ocrTaxAmount,
  /** A saved line's taxSource, to explain legacy lines. */
  savedTaxSource,
  savedTaxAmount,
}) {
  const [options, setOptions] = useState([]);
  const [defaultCodeId, setDefaultCodeId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const requestSeq = useRef(0);

  const set = (patch) => onChange({ ...value, ...patch });

  // Codes the employee may pick for this date, and the category's default.
  useEffect(() => {
    if (!expenseDate) return;
    let cancelled = false;
    taxService
      .applicable(categoryId || null, expenseDate)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setOptions(Array.isArray(data.options) ? data.options : []);
        setDefaultCodeId(data.defaultTaxCodeId || null);
      })
      .catch((err) => console.error("Failed to load applicable tax codes:", err));
    return () => {
      cancelled = true;
    };
  }, [categoryId, expenseDate]);

  // Server preview, debounced; stale responses are dropped.
  const enteredForPreview = value.override && value.enteredTax !== "" ? Number(value.enteredTax) : null;
  const numericAmount = Number(amount);
  const ocrForPreview = ocrTaxAmount != null && Number(ocrTaxAmount) >= 0 ? Number(ocrTaxAmount) : null;
  useEffect(() => {
    if (!(numericAmount > 0) || !currencyId || !expenseDate) {
      setPreview(null);
      onPreview?.(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      taxService
        .calculate({
          amount: numericAmount,
          currencyId,
          expenseDate,
          categoryId: categoryId || null,
          taxCodeId: value.taxCodeId || null,
          enteredTax: enteredForPreview != null && enteredForPreview >= 0 ? enteredForPreview : null,
          ocrTaxAmount: ocrForPreview,
        })
        .then((res) => {
          if (seq !== requestSeq.current) return;
          const data = res.data?.data || null;
          setPreview(data);
          setPreviewError("");
          onPreview?.(data);
        })
        .catch((err) => {
          if (seq !== requestSeq.current) return;
          setPreview(null);
          onPreview?.(null);
          setPreviewError(err.response?.data?.message || "Could not calculate the tax.");
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
    // onPreview is a setter from the parent; leaving it out avoids re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericAmount, currencyId, expenseDate, categoryId, value.taxCodeId, enteredForPreview, ocrForPreview]);

  const noCode = noCodeApplies(preview);
  const showEnteredInput = value.override || noCode;
  const selectedCodeId = value.taxCodeId || defaultCodeId || "";
  const codeLabel = preview?.taxCode ? `${preview.taxName || preview.taxCode}` : "No tax code";
  const reasons = preview?.validationReasons || [];
  const ocrDiffers = reasons.includes("OCR_MISMATCH");
  const ocrMatches = preview?.validationStatus === "MATCHED";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-gray-700">Tax</label>
        <select
          aria-label="Tax code"
          value={selectedCodeId}
          disabled={disabled || options.length === 0}
          onChange={(e) => {
            const id = e.target.value || null;
            set({ taxCodeId: id && id !== defaultCodeId ? id : null });
          }}
          className="max-w-[60%] px-2 py-1 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          {!defaultCodeId && <option value="">No tax code (category not mapped)</option>}
          {options.map((o) => (
            <option key={o.taxCodeId} value={o.taxCodeId}>
              {o.taxCode} · {o.taxName}
              {o.taxCodeId === defaultCodeId ? " (category default)" : ""}
            </option>
          ))}
        </select>
      </div>

      {noCode && (
        <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
          <Info size={12} className="mt-0.5 shrink-0" />
          No tax setup for this category. Enter the tax from the receipt, if any.
        </p>
      )}

      <div className="rounded-md bg-white border border-gray-100 px-2.5 py-1.5">
        {loading && !preview ? (
          <div className="flex items-center gap-2 py-2 text-[11px] text-gray-500">
            <Loader2 size={12} className="animate-spin" /> Calculating…
          </div>
        ) : preview ? (
          <>
            <Row label="Amount paid (incl. tax)" value={`${fmt(preview.amount)} ${currencyCode}`} />
            <Row label={`Tax · ${codeLabel}`} value={fmt(preview.taxAmount)} />
            {(preview.components || []).map((c) => (
              <Row key={c.componentCode} sub label={c.label} value={fmt(c.taxAmount)} />
            ))}
            <Row label="Amount before tax" value={fmt(preview.taxableAmount)} strong />
          </>
        ) : (
          <p className="py-2 text-[11px] text-gray-400">
            {previewError || "Enter the amount, currency and date to see the tax."}
          </p>
        )}
      </div>

      {!noCode && (
        <label className="flex items-center gap-2 text-[11px] text-gray-700">
          <input
            type="checkbox"
            checked={value.override}
            disabled={disabled}
            onChange={(e) =>
              set({
                override: e.target.checked,
                enteredTax: e.target.checked ? value.enteredTax || String(preview?.taxAmount ?? "") : "",
                overrideReason: e.target.checked ? value.overrideReason : "",
              })
            }
          />
          Receipt shows different tax
        </label>
      )}

      {showEnteredInput && (
        <div className="space-y-1">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Tax on the receipt"
            aria-label="Tax on the receipt"
            value={value.enteredTax}
            disabled={disabled}
            onChange={(e) => set({ enteredTax: e.target.value })}
            onWheel={(e) => e.target.blur()}
            className="w-full px-2.5 py-1.5 h-[34px] rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {preview?.overrideReasonRequired && (
            <>
              <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                Tax differs from {preview.taxCode} by {fmt(Math.abs(Number(preview.difference)))} {currencyCode}. Add a reason.
              </p>
              <textarea
                rows={2}
                maxLength={500}
                placeholder="e.g. Receipt charges 12% (composition dealer)"
                aria-label="Reason the tax differs"
                value={value.overrideReason}
                disabled={disabled}
                onChange={(e) => set({ overrideReason: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </>
          )}
        </div>
      )}

      {ocrDiffers && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Tax differs from the receipt (OCR {fmt(ocrTaxAmount)} vs {fmt(preview.taxAmount)}). Finance will review it.
        </p>
      )}
      {ocrMatches && <p className="text-[11px] text-emerald-700">Matches the tax on the receipt.</p>}
      {reasons.includes("LOW_OCR_CONFIDENCE") && (
        <p className="text-[11px] text-gray-500">The receipt scan was too unclear to compare the tax.</p>
      )}
      {savedTaxSource === "LEGACY" && (
        <p className="text-[11px] text-gray-500">
          Entered before tax codes ({fmt(savedTaxAmount)}). Saving recalculates it from the tax code.
        </p>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
