import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Receipt, ScanLine, Sparkles } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import {
  PAYMENT_METHOD_OPTIONS,
  errorMessage,
  supplementaryClaimService,
  supplementaryReceiptService,
  unwrap,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 15;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const EMPTY_FORM = {
  expenseDate: "", categoryId: "", merchantName: "", amount: "", description: "", employeePaymentMethod: "",
  taxAmount: "", supplierGstin: "", invoiceNumber: "", notes: "",
};

/** The payment method printed on a receipt ("UPI", "Cash", "Credit Card"...) as one of the claim's options. */
export function paymentMethodFromReceipt(raw) {
  const t = String(raw || "").toLowerCase();
  if (!t) return "";
  if (t.includes("upi") || t.includes("gpay") || t.includes("phonepe") || t.includes("paytm")) return "UPI";
  if (t.includes("cash")) return "CASH";
  if (t.includes("corporate") || t.includes("company")) return "COMPANY_CARD";
  if (t.includes("card") || t.includes("credit") || t.includes("debit") || t.includes("visa") || t.includes("master")) return "PERSONAL_CARD";
  return "OTHER";
}

/** The form filled from what the scan read, the same way a report's receipt scan fills a line item. */
export function formFromSuggestion(suggestion, { categories = [], periodStart, periodEnd } = {}) {
  const s = suggestion || {};
  const inPeriod = Boolean(s.receiptDate && (!periodStart || s.receiptDate >= periodStart) && (!periodEnd || s.receiptDate <= periodEnd));
  let categoryId = "";
  if (s.categoryId && categories.some((c) => c.categoryId === s.categoryId)) categoryId = s.categoryId;
  else if (s.categoryName) {
    const name = s.categoryName.toLowerCase();
    categoryId = categories.find((c) => c.categoryName?.toLowerCase() === name || c.categoryCode?.toLowerCase() === name)?.categoryId || "";
  }
  const merchant = (s.merchantName || "").trim();
  return {
    ...EMPTY_FORM,
    expenseDate: inPeriod ? s.receiptDate : "",
    categoryId,
    merchantName: merchant,
    amount: Number(s.amount) > 0 ? Number(s.amount).toFixed(2) : "",
    employeePaymentMethod: paymentMethodFromReceipt(s.paymentMethod),
    description: s.invoiceNumber ? `${merchant || "Receipt"} · invoice ${s.invoiceNumber}` : merchant ? `${merchant} receipt` : "",
    taxAmount: Number(s.taxAmount) > 0 ? Number(s.taxAmount).toFixed(2) : "",
    supplierGstin: s.supplierGstin || "",
    invoiceNumber: s.invoiceNumber || "",
  };
}

/** GST details read from the bill, kept in the expense's notes (a claim expense has no tax fields of its own). */
export function notesWithTax(form) {
  const tax = [
    form.taxAmount ? `GST on receipt: ${form.taxAmount}` : null,
    form.supplierGstin ? `Supplier GSTIN: ${form.supplierGstin}` : null,
    form.invoiceNumber ? `Invoice: ${form.invoiceNumber}` : null,
  ].filter(Boolean).join(" · ");
  return [tax, form.notes.trim()].filter(Boolean).join("\n") || null;
}

const fieldClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15";
const Label = ({ children, required }) => (
  <span className="mb-1 block text-sm font-medium text-gray-700">
    {children}
    {required && <span className="text-red-500"> *</span>}
  </span>
);

/**
 * Automatic way to add a missing expense, laid out like a report's receipt scan: the receipt on the left, and on the
 * right every field filled from what the scan read (category, date, merchant, payment, description, amount, GST). The
 * employee checks them and saves. The receipt is attached to the expense.
 */
export default function ReceiptFirstExpense({ claimId, periodStart, periodEnd, categories = [], currencyCode = "INR", onClaimChanged }) {
  const [receiptId, setReceiptId] = useState(null);
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | reading | ready
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [readNote, setReadNote] = useState({ tone: "info", text: "" });
  const [receiptDate, setReceiptDate] = useState(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const reset = () => {
    setReceiptId(null);
    setFile(null);
    setPhase("idle");
    setAttempt(0);
    setForm(EMPTY_FORM);
    setFormError("");
    setReadNote({ tone: "info", text: "" });
    setReceiptDate(null);
  };

  // Poll OCR until the receipt is read, or give up after a short while and let the employee type the details.
  useEffect(() => {
    if (phase !== "reading" || !receiptId) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const suggestion = unwrap(await supplementaryReceiptService.suggestion(receiptId));
        if (cancelled) return;
        if (suggestion?.ocrStatus === "OCR_COMPLETED" || attempt + 1 >= POLL_ATTEMPTS) {
          const read = suggestion?.ocrStatus === "OCR_COMPLETED";
          setForm(formFromSuggestion(read ? suggestion : null, { categories, periodStart, periodEnd }));
          setReceiptDate(suggestion?.receiptDate || null);
          const lowConfidence = read && suggestion?.confidenceScore != null && Number(suggestion.confidenceScore) < 0.6;
          setReadNote(
            !read
              ? { tone: "warn", text: "We couldn't read this receipt. Enter the details from it, then save." }
              : lowConfidence
                ? { tone: "warn", text: "Parts of this scan couldn't be read reliably. The fields are filled from the scan: check them against the receipt." }
                : { tone: "info", text: "Filled from the receipt. Check the details before saving." },
          );
          setPhase("ready");
        } else {
          setAttempt((a) => a + 1);
        }
      } catch (err) {
        if (!cancelled) {
          setReadNote({ tone: "warn", text: errorMessage(err, "Couldn't check the receipt. Enter the details, then save.") });
          setPhase("ready");
        }
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, receiptId, attempt, periodStart, periodEnd, categories]);

  const onChooseFile = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    if (!PROOF_TYPES.includes(chosen.type)) {
      showStatusToast("Upload a JPG, PNG, WEBP or PDF receipt.", "error");
      return;
    }
    setBusy(true);
    try {
      const uploaded = unwrap(await supplementaryReceiptService.uploadScan(claimId, chosen));
      setReceiptId(uploaded.receiptId);
      setFile(chosen);
      setAttempt(0);
      setPhase("reading");
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not upload the receipt."), "error");
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.categoryId) return setFormError("Choose a category.");
    if (!form.expenseDate) return setFormError("Enter the date of the expense.");
    if (!form.merchantName.trim()) return setFormError("Enter the merchant.");
    if (!form.employeePaymentMethod) return setFormError("Choose how it was paid.");
    const amount = Number(form.amount);
    if (!(amount > 0)) return setFormError("Enter an amount greater than zero.");
    if (form.taxAmount && Number(form.taxAmount) > amount) return setFormError("GST can't be more than the amount.");
    setBusy(true);
    try {
      const res = await supplementaryClaimService.addItemFromReceipt(claimId, receiptId, {
        expenseDate: form.expenseDate,
        categoryId: form.categoryId,
        merchantName: form.merchantName.trim() || null,
        description: form.description.trim() || null,
        amount,
        employeePaymentMethod: form.employeePaymentMethod || null,
        notes: notesWithTax(form),
      });
      onClaimChanged(res);
      showStatusToast("Expense added from the receipt.", "success");
      reset();
    } catch (err) {
      setFormError(errorMessage(err, "Could not add the expense."));
    } finally {
      setBusy(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.categoryId, label: c.categoryCode ? `${c.categoryCode} - ${c.categoryName}` : c.categoryName }));
  const outOfPeriod = receiptDate && !form.expenseDate;
  const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

  if (phase === "idle") {
    return (
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-white px-6 py-10 text-center transition hover:border-indigo-600">
        <div className="rounded-full bg-indigo-50 p-4 text-indigo-700">
          <ScanLine size={26} aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-gray-800">Upload receipt</span>
        <span className="text-xs text-gray-400">JPG, PNG, WEBP or PDF, up to 10 MB. Every detail is read for you.</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose receipt file"
          disabled={busy}
          onChange={onChooseFile}
        />
      </label>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5" data-receipt-review>
      {/* Left: the receipt itself, so every field can be checked against it */}
      <div className="lg:col-span-2">
        <div className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:sticky lg:top-0 lg:h-[calc(100vh-11rem)]">
          <p className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <Receipt size={13} aria-hidden="true" /> <span className="truncate">{file?.name || "Receipt"}</span>
          </p>
          <div className="flex flex-1 items-center justify-center p-3">
            {previewUrl && file?.type === "application/pdf" ? (
              <iframe title="Receipt preview" src={previewUrl} className="h-[26rem] w-full rounded-lg bg-white lg:h-full" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Receipt preview" className="max-h-[26rem] w-auto rounded-lg object-contain shadow-sm lg:max-h-full" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs text-slate-400"><FileText size={22} aria-hidden="true" /> No preview</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: every field, filled from the scan */}
      <div className="lg:col-span-3">
        {phase === "reading" ? (
          <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 text-center lg:h-[calc(100vh-11rem)]" role="status">
            <Sparkles className="animate-pulse text-indigo-600" size={26} aria-hidden="true" />
            <p className="text-sm font-semibold text-[#0a174e]">Reading the receipt…</p>
            <p className="text-xs text-slate-500">Merchant, date, amount, GST, category and payment method are filled in for you.</p>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4" noValidate data-receipt-form>
            <p
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${readNote.tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-indigo-50 text-indigo-900"}`}
              role="status"
            >
              {readNote.tone === "warn" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
              <span>{readNote.text}</span>
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect label="Category" required name="categoryId" value={form.categoryId} onChange={set("categoryId")}
                options={categoryOptions} placeholder="Select expense category..." className="[&>label]:mb-1" />
              <label className="block">
                <Label required>Expense Date</Label>
                <input type="date" className={fieldClass} value={form.expenseDate} min={periodStart || undefined} max={periodEnd || undefined}
                  onChange={set("expenseDate")} aria-label="Expense Date" />
                <span className={`mt-1 block text-[11px] ${outOfPeriod ? "text-amber-700" : "text-gray-500"}`}>
                  {outOfPeriod
                    ? `The receipt is dated ${fmt(receiptDate)}, outside the report's dates. Enter a date between ${fmt(periodStart)} and ${fmt(periodEnd)}.`
                    : `Permitted dates: ${fmt(periodStart)} to ${fmt(periodEnd)} (the report's trip dates).`}
                </span>
              </label>
              <label className="block">
                <Label required>Merchant</Label>
                <input className={fieldClass} value={form.merchantName} maxLength={255} onChange={set("merchantName")} aria-label="Merchant" />
              </label>
              <FormSelect label="How did you pay?" required name="employeePaymentMethod" value={form.employeePaymentMethod}
                onChange={set("employeePaymentMethod")} options={PAYMENT_METHOD_OPTIONS} placeholder="Select how you paid" className="[&>label]:mb-1" />
              <label className="block sm:col-span-2">
                <Label>Description</Label>
                <textarea rows={2} className={`${fieldClass} h-auto py-2`} value={form.description} maxLength={500} onChange={set("description")} aria-label="Description" />
              </label>
              <label className="block">
                <Label required>Amount</Label>
                <input type="number" min="0.01" step="0.01" className={fieldClass} value={form.amount} onChange={set("amount")} aria-label="Amount" />
              </label>
              <label className="block">
                <Label>Currency</Label>
                <input className={`${fieldClass} bg-slate-50 text-slate-600`} value={currencyCode} readOnly aria-label="Currency" />
                <span className="mt-1 block text-[11px] text-gray-500">The claim's currency, the same as the original report.</span>
              </label>
            </div>

            {/* GST read from the receipt, as on a report line */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-receipt-tax>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tax on the receipt</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <Label>GST amount</Label>
                  <input type="number" min="0" step="0.01" className={fieldClass} value={form.taxAmount} onChange={set("taxAmount")} aria-label="GST amount" />
                </label>
                <label className="block">
                  <Label>Supplier GSTIN</Label>
                  <input className={`${fieldClass} font-mono uppercase`} maxLength={15} value={form.supplierGstin} onChange={set("supplierGstin")} aria-label="Supplier GSTIN" />
                </label>
                <label className="block">
                  <Label>Invoice number</Label>
                  <input className={fieldClass} maxLength={60} value={form.invoiceNumber} onChange={set("invoiceNumber")} aria-label="Invoice number" />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Saved with the expense for Finance's tax check.</p>
            </div>

            <label className="block">
              <Label>Notes</Label>
              <input className={fieldClass} maxLength={300} value={form.notes} onChange={set("notes")} aria-label="Notes" />
            </label>

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Receipt size={13} aria-hidden="true" /> {file?.name} will be attached to this expense.
            </p>
            {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" size="small" type="button" onClick={reset} disabled={busy}>Cancel</Button>
              <Button variant="primary" size="small" type="submit" disabled={busy}>Save Line Item</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
