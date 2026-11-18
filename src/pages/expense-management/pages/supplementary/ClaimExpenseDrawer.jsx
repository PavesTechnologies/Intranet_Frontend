import React, { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon, Loader2, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  PAYMENT_METHOD_OPTIONS,
  errorMessage,
  supplementaryClaimService,
  supplementaryReceiptService,
  unwrap,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const isPdf = (name = "") => /\.pdf$/i.test(name);
const isImage = (name = "") => /\.(png|jpe?g|webp|gif)$/i.test(name);

/**
 * Edit one expense on a supplementary claim. Laid out like the line item drawer on the expense report: full screen,
 * the receipt preview on the left, the expense form and receipts on the right. Stacks on narrow screens.
 * Every change goes through the claim's own endpoints, which check ownership and the claim's status.
 */
export default function ClaimExpenseDrawer({ claimId, claimNumber, item, editable, categories, periodStart, periodEnd, onChanged, onClose }) {
  const [form, setForm] = useState(() => ({
    expenseDate: item.expenseDate || "",
    categoryId: item.categoryId || "",
    merchantName: item.merchantName || "",
    amount: item.amount != null ? String(item.amount) : "",
    employeePaymentMethod: item.employeePaymentMethod || "",
    description: item.description || "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [receiptToRemove, setReceiptToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef(null);

  const receipts = Array.isArray(item.receipts) ? item.receipts : [];
  const activeReceipt = receipts.find((r) => r.receiptId === activeReceiptId) || receipts[0] || null;
  const activeReceiptKey = activeReceipt?.receiptId;

  // Load a fresh, short-lived preview link for the receipt on show. The backend checks that the caller may view it.
  useEffect(() => {
    if (!activeReceiptKey) {
      setPreviewUrl("");
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    supplementaryReceiptService
      .viewUrl(activeReceiptKey)
      .then((res) => {
        if (!cancelled) setPreviewUrl(unwrap(res)?.url || "");
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl("");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeReceiptKey]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.expenseDate) return setError("Enter the date of the expense.");
    if (!form.categoryId) return setError("Choose a category.");
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError("Enter an amount greater than zero.");
    setSaving(true);
    try {
      const res = await supplementaryClaimService.updateItem(claimId, item.claimItemId, {
        expenseDate: form.expenseDate,
        categoryId: form.categoryId,
        merchantName: form.merchantName.trim() || null,
        description: form.description.trim() || null,
        amount,
        employeePaymentMethod: form.employeePaymentMethod || null,
        // Not edited here, so it is sent back unchanged.
        notes: item.notes || null,
      });
      onChanged(res);
      showStatusToast("Expense updated.", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save the expense."));
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      showStatusToast("Upload a JPG, PNG, WEBP or PDF receipt.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      showStatusToast("Receipts must be 10 MB or smaller.", "error");
      return;
    }
    setUploading(true);
    try {
      const res = await supplementaryReceiptService.upload(claimId, item.claimItemId, file);
      onChanged(res);
      showStatusToast(`Receipt "${file.name}" uploaded.`, "success");
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not upload the receipt."), "error");
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = async () => {
    if (!receiptToRemove) return;
    setRemoving(true);
    try {
      const res = await supplementaryReceiptService.detach(claimId, item.claimItemId, receiptToRemove.receiptId);
      onChanged(res);
      showStatusToast("Receipt removed from the expense.", "success");
      setReceiptToRemove(null);
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not remove the receipt."), "error");
    } finally {
      setRemoving(false);
    }
  };

  const download = async (receipt) => {
    try {
      const res = await supplementaryReceiptService.downloadUrl(receipt.receiptId);
      const url = unwrap(res)?.url;
      if (!url) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = receipt.originalFileName || "receipt";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showStatusToast(errorMessage(err, "Failed to download receipt."), "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-[#f8fafc] animate-in fade-in duration-200">
      {/* Header: same structure as the line item drawer. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-indigo-50 p-2.5 text-indigo-700 shadow-sm">
            <Pencil size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">Edit Line Item</h2>
            <p className="truncate text-xs font-medium text-gray-500">
              Modify this expense, or attach supporting receipts. {claimNumber}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left: receipt preview, as on the line item drawer. */}
        <div className="relative flex h-64 min-w-0 shrink-0 items-center justify-center overflow-hidden border-b border-gray-100 bg-[#0b0f19] md:h-auto md:w-1/2 md:border-b-0 md:border-r">
          {!activeReceipt ? (
            <div className="px-6 text-center text-sm text-gray-400">
              <FileText size={28} className="mx-auto mb-2 text-gray-500" aria-hidden="true" />
              No receipt attached yet. Upload one on the right to see it here.
            </div>
          ) : previewLoading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" aria-hidden="true" />
              <span>Loading receipt…</span>
            </div>
          ) : !previewUrl ? (
            <p className="px-6 text-center text-sm text-gray-400">This receipt can't be previewed right now. Use Download instead.</p>
          ) : isPdf(activeReceipt.originalFileName) ? (
            <iframe src={previewUrl} title="Receipt preview" className="h-full w-full border-0" />
          ) : (
            <img src={previewUrl} alt={activeReceipt.originalFileName} className="max-h-full max-w-full object-contain" />
          )}
          {activeReceipt && (
            <span className="absolute bottom-3 left-3 max-w-[70%] truncate rounded-md bg-black/60 px-2 py-1 text-xs text-white">
              {activeReceipt.originalFileName}
            </span>
          )}
        </div>

        {/* Right: the expense form, then its receipts, then the actions. */}
        <form id="claim-expense-form" onSubmit={save} className="flex min-h-0 min-w-0 flex-1 flex-col bg-white md:w-1/2" noValidate>
          <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Expense details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  options={categories.map((c) => ({ value: c.categoryId, label: c.categoryName }))}
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
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-gray-600">Description</span>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    value={form.description}
                    maxLength={500}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                The expense date must fall within the trip period.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Receipts</h3>
                <span className="text-xs text-gray-500">{receipts.length} attached</span>
              </div>

              {editable && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    uploadFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center transition ${
                    dragging ? "border-[#0A0082] bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <UploadCloud className={dragging ? "text-[#0A0082]" : "text-gray-400"} size={22} aria-hidden="true" />
                  <p className="text-xs font-medium text-gray-600">
                    {uploading ? "Uploading…" : <>Drag &amp; drop a receipt, or <span className="font-semibold text-[#0A0082]">browse</span></>}
                  </p>
                  <p className="text-[10px] text-gray-400">PDF, PNG, JPG or WEBP up to 10MB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label="Choose receipt file"
                    onChange={(e) => {
                      uploadFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {receipts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-red-200 bg-red-50 px-3 py-4 text-center text-xs font-medium text-red-700">
                  No receipt yet. Every expense needs one before the claim is submitted.
                </p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => {
                    const active = activeReceipt?.receiptId === r.receiptId;
                    return (
                      <div
                        key={r.receiptId}
                        className={`flex items-center gap-3 rounded-lg border bg-white p-2.5 transition ${
                          active ? "border-indigo-300 bg-indigo-50/40" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
                          {isImage(r.originalFileName) ? <ImageIcon size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveReceiptId(r.receiptId)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-semibold text-gray-800">{r.originalFileName}</p>
                          <p className="text-[10px] text-gray-400">{active ? "Showing in preview" : "Click to preview"}</p>
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="link"
                            size="icon"
                            title="View"
                            aria-label={`View ${r.originalFileName}`}
                            className="h-7 w-7 rounded-md p-0 text-gray-600 hover:bg-gray-100"
                            onClick={() => setActiveReceiptId(r.receiptId)}
                          >
                            <Eye size={14} aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="icon"
                            title="Download"
                            aria-label={`Download ${r.originalFileName}`}
                            className="h-7 w-7 rounded-md p-0 text-gray-600 hover:bg-gray-100"
                            onClick={() => download(r)}
                          >
                            <Download size={14} aria-hidden="true" />
                          </Button>
                          {editable && (
                            <Button
                              type="button"
                              variant="link"
                              size="icon"
                              title="Remove receipt"
                              aria-label={`Remove ${r.originalFileName}`}
                              className="h-7 w-7 rounded-md p-0 text-red-600 hover:bg-red-50"
                              onClick={() => setReceiptToRemove(r)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3 sm:px-6">
            <Button variant="outline" size="small" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="small" type="submit" disabled={saving || uploading} loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={!!receiptToRemove}
        title="Remove Receipt"
        message={`Remove "${receiptToRemove?.originalFileName || "this receipt"}" from this expense? The expense will need a receipt again before the claim can be submitted.`}
        confirmText="Remove Receipt"
        cancelText="Cancel"
        onConfirm={removeReceipt}
        onCancel={() => setReceiptToRemove(null)}
        isLoading={removing}
        variant="danger"
      />
    </div>
  );
}
