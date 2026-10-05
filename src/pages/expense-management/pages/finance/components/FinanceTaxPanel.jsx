import React, { useEffect, useState } from "react";
import { Receipt, Pencil, History } from "lucide-react";
import TaxAuditHistoryModal from "@/pages/expense-management/components/expense-reports/TaxAuditHistoryModal";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import { taxService } from "@/pages/expense-management/api/expenseReportsApi";
import TaxStatusBadge from "@/pages/expense-management/components/expense-reports/TaxStatusBadge";
import { formatMoney } from "../../../approval-engine/constants/approvalLabels";

/** Statuses Finance must explicitly confirm before verifying (BR-TAX-011). */
export const TAX_REVIEW_STATUSES = ["MISMATCH", "REQUIRES_FINANCE_REVIEW"];
export const needsTaxConfirmation = (line) => TAX_REVIEW_STATUSES.includes(line?.tax?.validationStatus);

const REASON_TEXT = {
  OVERRIDE: "Tax differs from the tax code's calculation",
  CONFIG_MISMATCH: "Receipt agrees with the entered tax, not the tax code",
  OCR_MISMATCH: "Tax differs from what OCR read on the receipt",
  NO_TAX_CODE: "Tax entered for a category with no tax code",
  LOW_OCR_CONFIDENCE: "OCR reading too uncertain to compare",
};

const Item = ({ label, value, emphasis }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-0.5 text-sm break-words ${emphasis ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>{value ?? "—"}</p>
  </div>
);

/**
 * Finance view of one line's tax snapshot (design §13): code, components, entered vs calculated
 * vs OCR, ITC and status. FINANCE_EXECUTIVE can open the adjust dialog.
 */
export default function FinanceTaxPanel({ line, canAdjust, onAdjust }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const tax = line?.tax;
  const cur = line?.currencyCode;
  if (!tax) {
    return line?.taxAmount != null ? <Item label="Tax / GST" value={formatMoney(line.taxAmount, cur)} /> : null;
  }
  const reasons = (tax.validationReasons || []).filter((r) => REASON_TEXT[r]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">
            {tax.taxCode ? `${tax.taxCode} · ${Number(tax.taxRatePercent)}%` : "No tax code"}
          </span>
          <TaxStatusBadge tax={tax} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" onClick={() => setHistoryOpen(true)}>
            <History className="h-3.5 w-3.5" /> History
          </Button>
          {canAdjust && (
            <Button variant="outline" size="small" onClick={onAdjust}>
              <Pencil className="h-3.5 w-3.5" /> Adjust tax
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Item label="Before tax" value={formatMoney(tax.taxableAmount, cur)} />
        <Item label="Tax" value={formatMoney(tax.taxAmount, cur)} emphasis />
        <Item label="Calculated" value={tax.calculatedTaxAmount != null ? formatMoney(tax.calculatedTaxAmount, cur) : "—"} />
        <Item label="OCR read" value={tax.ocrTaxAmount != null ? formatMoney(tax.ocrTaxAmount, cur) : "—"} />
        <Item label="ITC recoverable" value={`${Number(tax.itcRecoverablePercent || 0)}% · ${formatMoney(tax.recoverableTaxAmount, cur)}`} />
        <Item label="Source" value={(tax.taxSource || "—").replace(/_/g, " ").toLowerCase()} />
      </div>

      {(tax.components || []).length > 0 && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          {tax.components.map((c) => (
            <div key={c.componentCode} className="flex justify-between py-0.5 text-xs text-gray-600">
              <span>{c.label}</span>
              <span className="tabular-nums">{formatMoney(c.taxAmount, cur)}</span>
            </div>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">
          {reasons.map((r) => (
            <li key={r}>{REASON_TEXT[r]}</li>
          ))}
        </ul>
      )}
      {tax.taxOverrideReason && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Employee's reason:</span> {tax.taxOverrideReason}
        </p>
      )}

      <TaxAuditHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="line-items"
        entityId={line?.lineItemId}
        title={`Tax History · ${line?.merchantName || line?.categoryName || "Line item"}`}
      />
    </div>
  );
}

/** Per-line tax correction (FINANCE_EXECUTIVE). Gross never changes here - that is a correction request. */
export function AdjustTaxModal({ isOpen, onClose, line, onSubmit, submitting }) {
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ taxCodeId: "", taxAmount: "", itcRecoverablePercent: "", reason: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !line) return;
    setForm({
      taxCodeId: line.tax?.taxCodeId || "",
      taxAmount: line.tax?.taxAmount != null ? String(line.tax.taxAmount) : "",
      itcRecoverablePercent: line.tax?.itcRecoverablePercent != null ? String(Number(line.tax.itcRecoverablePercent)) : "",
      reason: "",
    });
    setErrors({});
    taxService
      .applicable(line.categoryId || null, line.expenseDate)
      .then((res) => setOptions(Array.isArray(res.data?.data?.options) ? res.data.data.options : []))
      .catch((err) => console.error("Failed to load tax codes:", err));
  }, [isOpen, line]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const submit = () => {
    const e = {};
    const t = form.taxAmount === "" ? null : Number(form.taxAmount);
    const itc = form.itcRecoverablePercent === "" ? null : Number(form.itcRecoverablePercent);
    if (t != null && (!Number.isFinite(t) || t < 0)) e.taxAmount = "Tax cannot be negative.";
    else if (t != null && t > Number(line?.amount || 0)) e.taxAmount = "Tax cannot exceed the line amount.";
    if (itc != null && (!Number.isFinite(itc) || itc < 0 || itc > 100)) e.itcRecoverablePercent = "Enter 0 to 100.";
    if (!form.reason.trim()) e.reason = "A reason is required.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ taxCodeId: form.taxCodeId || null, taxAmount: t, itcRecoverablePercent: itc, reason: form.reason.trim() });
  };

  const codeOptions = [
    ...(form.taxCodeId && !options.some((o) => o.taxCodeId === form.taxCodeId)
      ? [{ label: `${line?.tax?.taxCode || "Current code"} (current)`, value: form.taxCodeId }]
      : []),
    ...options.map((o) => ({ label: `${o.taxCode} · ${o.taxName}`, value: o.taxCodeId })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Tax"
      subtitle="Corrects this line's tax only. The amount paid cannot change here - request a correction for that."
      size="md"
      fullScreenMobile
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={submitting} loadingText="Saving..." disabled={submitting}>
            Save adjustment
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <p className="text-xs text-gray-500">
          Amount paid: <span className="font-semibold text-gray-800">{formatMoney(line?.amount, line?.currencyCode)}</span>
        </p>
        <FormSelect
          label="Tax code"
          name="taxCodeId"
          value={form.taxCodeId}
          onChange={(e) => set("taxCodeId", e.target.value)}
          options={codeOptions}
          placeholder="Select a tax code"
          anchorOptions
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            label="Tax amount (blank = calculate from code)"
            name="taxAmount"
            type="number"
            step="0.01"
            min="0"
            value={form.taxAmount}
            onChange={(e) => set("taxAmount", e.target.value)}
            onWheel={(e) => e.target.blur()}
            error={errors.taxAmount}
          />
          <FormInput
            label="ITC recoverable (%)"
            name="itcRecoverablePercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.itcRecoverablePercent}
            onChange={(e) => set("itcRecoverablePercent", e.target.value)}
            onWheel={(e) => e.target.blur()}
            error={errors.itcRecoverablePercent}
          />
        </div>
        <FormTextArea
          label="Reason"
          name="reason"
          placeholder="Recorded in the audit log, e.g. inter-state hotel - IGST applies"
          value={form.reason}
          onChange={(e) => set("reason", e.target.value)}
          requiredMark
          error={errors.reason}
        />
      </div>
    </Modal>
  );
}
