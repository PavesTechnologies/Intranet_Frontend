import React, { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import { fileInputClass } from "@/pages/expense-management/components/common/fileInputClass";
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

const EMPTY_FORM = { expenseDate: "", categoryId: "", merchantName: "", amount: "", description: "", employeePaymentMethod: "", notes: "" };

/**
 * Automatic way to add a missing expense: upload the receipt, let OCR read it, then confirm the expense. The date,
 * amount and merchant are filled from the receipt; the employee checks them and picks the category before saving.
 * The manual form stays available below it for expenses with no receipt.
 */
export default function ReceiptFirstExpense({ claimId, periodStart, periodEnd, categories = [], onClaimChanged }) {
  const [receiptId, setReceiptId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | reading | ready
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [readNote, setReadNote] = useState("");

  const reset = () => {
    setReceiptId(null);
    setFileName("");
    setPhase("idle");
    setAttempt(0);
    setForm(EMPTY_FORM);
    setFormError("");
    setReadNote("");
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
          const inPeriod = Boolean(suggestion?.receiptDate && periodStart && periodEnd
            && suggestion.receiptDate >= periodStart && suggestion.receiptDate <= periodEnd);
          setForm((prev) => ({
            ...prev,
            expenseDate: inPeriod ? suggestion.receiptDate : prev.expenseDate,
            amount: suggestion?.amount != null ? String(suggestion.amount) : prev.amount,
            merchantName: suggestion?.merchantName || prev.merchantName,
          }));
          setReadNote(
            suggestion?.ocrStatus === "OCR_COMPLETED"
              ? "Read from the receipt. Check the details before saving."
              : "We couldn't read this receipt. Enter the details, then save.",
          );
          setPhase("ready");
        } else {
          setAttempt((a) => a + 1);
        }
      } catch (err) {
        if (!cancelled) {
          setReadNote(errorMessage(err, "Couldn't check the receipt. Enter the details, then save."));
          setPhase("ready");
        }
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, receiptId, attempt, periodStart, periodEnd]);

  const onChooseFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!PROOF_TYPES.includes(file.type)) {
      showStatusToast("Upload a JPG, PNG, WEBP or PDF receipt.", "error");
      return;
    }
    setBusy(true);
    try {
      const uploaded = unwrap(await supplementaryReceiptService.uploadScan(claimId, file));
      setReceiptId(uploaded.receiptId);
      setFileName(file.name);
      setAttempt(0);
      setPhase("reading");
      setReadNote("Reading the receipt…");
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not upload the receipt."), "error");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.expenseDate) return setFormError("Enter the date of the expense.");
    if (!form.categoryId) return setFormError("Choose a category.");
    const amount = Number(form.amount);
    if (!(amount > 0)) return setFormError("Enter an amount greater than zero.");
    setBusy(true);
    try {
      const res = await supplementaryClaimService.addItemFromReceipt(claimId, receiptId, {
        expenseDate: form.expenseDate,
        categoryId: form.categoryId,
        merchantName: form.merchantName.trim() || null,
        description: form.description.trim() || null,
        amount,
        employeePaymentMethod: form.employeePaymentMethod || null,
        notes: form.notes.trim() || null,
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

  const categoryOptions = categories.map((c) => ({ value: c.categoryId, label: c.categoryName }));

  return (
    <div className="space-y-4">
      {phase === "idle" && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-white px-6 py-10 text-center transition hover:border-indigo-600">
          <div className="rounded-full bg-indigo-50 p-4 text-indigo-700">
            <ScanLine size={26} aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Upload receipt</span>
          <span className="text-xs text-gray-400">JPG, PNG, WEBP or PDF, up to 10 MB. The details are read for you.</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Choose receipt file"
            disabled={busy}
            onChange={onChooseFile}
          />
        </label>
      )}

      {phase === "reading" && (
        <p className="text-xs text-gray-600" role="status">
          {fileName && <span className="font-medium">{fileName}: </span>}
          {readNote || "Reading the receipt…"}
        </p>
      )}

      {phase === "ready" && (
        <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <p className="sm:col-span-2 lg:col-span-3 text-xs text-gray-600" role="status">
            {fileName && <span className="font-medium">{fileName}. </span>}
            {readNote}
          </p>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Date of expense</span>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.expenseDate}
              min={periodStart || undefined}
              max={periodEnd || undefined}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            />
          </label>
          <FormSelect
            label="Category"
            name="categoryId"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            options={categoryOptions}
            placeholder="Select category"
          />
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Merchant</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.merchantName}
              maxLength={255}
              onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
            />
          </label>
          <FormSelect
            label="How was it paid?"
            name="employeePaymentMethod"
            value={form.employeePaymentMethod}
            onChange={(e) => setForm({ ...form, employeePaymentMethod: e.target.value })}
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Select"
          />
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-gray-600">Description (optional)</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.description}
              maxLength={500}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {formError && <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600" role="alert">{formError}</p>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button variant="primary" size="small" type="submit" disabled={busy}>
              Save expense
            </Button>
            <Button variant="outline" size="small" type="button" onClick={reset} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
