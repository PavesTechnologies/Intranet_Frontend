import React, { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Paperclip } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { useAuth } from "@/contexts/AuthContext";
import { fileInputClass } from "@/pages/expense-management/components/common/fileInputClass";
import {
  LATE_RECEIPT_REPORT_STATUSES,
  lateReceiptService,
  receiptService,
} from "@/pages/expense-management/api/expenseReportsApi";

const MIN_REASON_LENGTH = 10;
const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.webp";

const STATUS_LABEL = {
  PENDING_REVIEW: "Waiting for review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

const STATUS_CLASS = {
  PENDING_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
};

const unwrap = (res) => res?.data?.data ?? res?.data ?? [];

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const errorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const todayIso = () => new Date().toISOString().slice(0, 10);

// Receipt state of one expense, as the employee sees it in the "Expenses on this report" list. The labels differ from the
// late-receipt row labels (Verified, Rejected, Waiting for review) so the two lists can't be confused.
const LINE_STATUS = {
  NONE: { label: "No receipt", className: "border-gray-200 bg-gray-50 text-gray-600", canAdd: true },
  NEEDED: { label: "Receipt needed", className: "border-amber-200 bg-amber-50 text-amber-700", canAdd: true },
  ORIGINAL: { label: "Receipt attached", className: "border-emerald-200 bg-emerald-50 text-emerald-700", canAdd: false },
  PENDING: { label: "Late receipt under review", className: "border-amber-200 bg-amber-50 text-amber-700", canAdd: false },
  VERIFIED: { label: "Late receipt verified", className: "border-emerald-200 bg-emerald-50 text-emerald-700", canAdd: false },
  REJECTED: { label: "Late receipt rejected", className: "border-red-200 bg-red-50 text-red-700", canAdd: true },
};

const lineLabel = (line) =>
  [line.merchantName || "Expense", formatDate(line.expenseDate), line.amount != null ? `₹${line.amount}` : null]
    .filter(Boolean)
    .join(" · ");

/**
 * Late and missing receipts for an approved, reimbursed or closed report.
 *
 * The employee attaches a receipt found after approval, with the date printed on it and a reason. Finance/AP then verify
 * or reject it. Nothing here changes an expense's amount, status or payment.
 */
export default function LateReceiptPanel({ reportId, reportStatus, lineItems = [], tripStartDate, tripEndDate }) {
  const { hasRole } = useAuth();
  const canAttach = hasRole(["General", "Admin"]);
  const canReview = hasRole(["Finance", "Finance_Executive", "AP_Executive"]);
  const isLateStatus = LATE_RECEIPT_REPORT_STATUSES.includes(reportStatus);

  const [receipts, setReceipts] = useState([]);
  const [reportReceipts, setReportReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ lineItemId: "", file: null, actualReceiptDate: "", reason: "" });
  const [notes, setNotes] = useState({});
  const [busyReceiptId, setBusyReceiptId] = useState(null);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const [lateRes, allRes] = await Promise.all([
        lateReceiptService.forReport(reportId),
        receiptService.listForReport(reportId).catch(() => ({ data: { data: [] } })),
      ]);
      setReceipts(unwrap(lateRes));
      setReportReceipts(unwrap(allRes));
    } catch (err) {
      console.error("Failed to load late receipts:", err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (isLateStatus) load();
  }, [isLateStatus, load]);

  const lineById = (id) => lineItems.find((line) => line.lineItemId === id);

  // Receipt state of each expense. A verified late receipt wins, then one under review, then an original receipt. A late
  // receipt Finance rejected is not proof (the same rule the cash advance utilisation uses), so the employee can add
  // another. With no receipt at all, an expense whose category requires one is shown as needing it.
  const lateIds = new Set(receipts.map((r) => r.receiptId));
  const lineStatus = (line) => {
    const late = receipts.filter((r) => r.lineItemId === line.lineItemId);
    if (late.some((r) => r.verificationStatus === "VERIFIED")) return LINE_STATUS.VERIFIED;
    if (late.some((r) => r.verificationStatus === "PENDING_REVIEW")) return LINE_STATUS.PENDING;
    if (reportReceipts.some((r) => r.lineItemId === line.lineItemId && !lateIds.has(r.receiptId))) return LINE_STATUS.ORIGINAL;
    if (late.some((r) => r.verificationStatus === "REJECTED")) return LINE_STATUS.REJECTED;
    return line.receiptRequired ? LINE_STATUS.NEEDED : LINE_STATUS.NONE;
  };
  const tripText =
    tripStartDate || tripEndDate ? `${formatDate(tripStartDate)} – ${formatDate(tripEndDate)}` : null;

  const startAttachFor = (lineId) => {
    setForm((f) => ({ ...f, lineItemId: lineId }));
    setFormError("");
    setShowForm(true);
  };

  // The tab opens before the link is requested, so the browser's pop-up blocker does not stop it.
  const openReceipt = async (receipt) => {
    const win = window.open("", "_blank");
    if (!win) {
      showStatusToast("Allow pop-ups for this site to open the receipt.", "error");
      return;
    }
    try {
      const res = await receiptService.getViewUrl(receipt.receiptId);
      const url = unwrap(res)?.url;
      if (!url) throw new Error("No link was returned for this receipt.");
      win.opener = null;
      win.location.href = url;
    } catch (err) {
      win.close();
      showStatusToast(errorMessage(err, "The receipt could not be opened."), "error");
    }
  };

  const resetForm = () => {
    setForm({ lineItemId: "", file: null, actualReceiptDate: "", reason: "" });
    setFormError("");
    setShowForm(false);
  };

  const validate = () => {
    if (!form.lineItemId) return "Choose the expense this receipt belongs to.";
    if (!form.file) return "Choose the receipt file.";
    if (!form.actualReceiptDate) return "Enter the date printed on the receipt.";
    if (form.actualReceiptDate > todayIso()) return "The receipt date cannot be in the future.";
    if (form.reason.trim().length < MIN_REASON_LENGTH) {
      return `Give a reason for the late submission (at least ${MIN_REASON_LENGTH} characters).`;
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", form.file);
      body.append("actualReceiptDate", form.actualReceiptDate);
      body.append("reason", form.reason.trim());
      await lateReceiptService.attach(form.lineItemId, body);
      showStatusToast("Late receipt attached. It is waiting for Finance or AP review.", "success");
      resetForm();
      await load();
    } catch (err) {
      setFormError(errorMessage(err, "The late receipt could not be attached."));
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (receipt, decision) => {
    const note = (notes[receipt.receiptId] || "").trim();
    if (decision === "reject" && note.length < MIN_REASON_LENGTH) {
      showStatusToast(`Give a reason for rejecting this receipt (at least ${MIN_REASON_LENGTH} characters).`, "error");
      return;
    }
    setBusyReceiptId(receipt.receiptId);
    try {
      if (decision === "verify") {
        await lateReceiptService.verify(receipt.receiptId, note || null);
        showStatusToast("Late receipt verified.", "success");
      } else {
        await lateReceiptService.reject(receipt.receiptId, note);
        showStatusToast("Late receipt rejected.", "success");
      }
      await load();
    } catch (err) {
      showStatusToast(errorMessage(err, "The decision could not be saved."), "error");
    } finally {
      setBusyReceiptId(null);
    }
  };

  if (!isLateStatus && receipts.length === 0) return null;
  if (!canAttach && !canReview && receipts.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 mb-6" data-testid="late-receipt-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
            <Paperclip size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Late Receipts</h2>
            <p className="text-xs text-gray-500">
              A receipt found after approval. It does not change the expense's amount or payment.
            </p>
          </div>
        </div>
        {canAttach && isLateStatus && !showForm && (
          <Button variant="primary" size="small" onClick={() => setShowForm(true)} className="shadow-sm">
            Add late receipt
          </Button>
        )}
      </div>

      {showForm && canAttach && (
        <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2" noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Expense</span>
            <select
              aria-label="Expense"
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              value={form.lineItemId}
              onChange={(e) => setForm({ ...form, lineItemId: e.target.value })}
            >
              <option value="">Select an expense</option>
              {lineItems.map((line) => (
                <option key={line.lineItemId} value={line.lineItemId}>{lineLabel(line)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Date printed on the receipt</span>
            <input
              type="date"
              aria-label="Date printed on the receipt"
              max={todayIso()}
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              value={form.actualReceiptDate}
              onChange={(e) => setForm({ ...form, actualReceiptDate: e.target.value })}
            />
            {tripText && (
              <span className="text-xs text-gray-500">Trip: {tripText}. The receipt date must fall within the trip.</span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Receipt file</span>
            <input
              type="file"
              id="late-receipt-file" name="receiptFile" aria-label="Receipt file"
              accept={ACCEPTED_TYPES}
              className={fileInputClass}
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Why was it submitted late?</span>
            <textarea
              aria-label="Reason for late submission"
              rows={2}
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
          {formError && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" size="small" type="button" onClick={resetForm} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="small" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Attach receipt
            </Button>
          </div>
        </form>
      )}

      {canAttach && isLateStatus && lineItems.length > 0 && (
        <div className="mb-4 rounded-lg border border-gray-200 p-3" data-testid="expense-receipt-status">
          <p className="text-sm font-semibold text-gray-900">Expenses on this report</p>
          {tripText && <p className="text-xs text-gray-500">Trip: {tripText}</p>}
          <ul className="mt-2 divide-y divide-gray-100">
            {lineItems.map((line) => {
              const status = lineStatus(line);
              return (
                <li
                  key={line.lineItemId}
                  className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  data-testid="expense-status-row"
                >
                  <span className="text-sm text-gray-800">{lineLabel(line)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    {status.canAdd && (
                      <Button variant="secondary" size="small" onClick={() => startAttachFor(line.lineItemId)}>
                        Add receipt
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loading && receipts.length === 0 ? (
        <p className="text-sm text-gray-500">Loading late receipts…</p>
      ) : receipts.length === 0 ? (
        <p className="text-sm text-gray-500">No late receipts on this report.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {receipts.map((receipt) => {
            const line = lineById(receipt.lineItemId);
            const pending = receipt.verificationStatus === "PENDING_REVIEW";
            return (
              <li key={receipt.receiptId} className="py-3 flex flex-col gap-2" data-testid="late-receipt-row">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate text-sm font-medium text-gray-900">{receipt.originalFileName}</span>
                    {line && <span className="text-xs text-gray-500">{lineLabel(line)}</span>}
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[receipt.verificationStatus] || ""}`}>
                    {STATUS_LABEL[receipt.verificationStatus] || receipt.verificationStatus}
                  </span>
                  <Button variant="secondary" size="small" onClick={() => openReceipt(receipt)}>
                    View receipt
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Receipt dated {formatDate(receipt.actualReceiptDate)} · Uploaded {formatDate(receipt.uploadedAt)} by {receipt.uploadedBy}
                </p>
                <p className="text-xs text-gray-600">Reason: {receipt.lateReason}</p>
                {receipt.duplicateMessage && (
                  <p className="text-xs text-amber-700">{receipt.duplicateMessage}</p>
                )}
                {receipt.verificationNote && (
                  <p className="text-xs text-gray-600">Review note: {receipt.verificationNote}</p>
                )}
                {canReview && pending && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1 text-xs">
                      <span className="font-medium text-gray-700">Review note</span>
                      <input
                        aria-label={`Review note for ${receipt.originalFileName}`}
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        value={notes[receipt.receiptId] || ""}
                        onChange={(e) => setNotes({ ...notes, [receipt.receiptId]: e.target.value })}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={busyReceiptId === receipt.receiptId}
                        onClick={() => decide(receipt, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        disabled={busyReceiptId === receipt.receiptId}
                        onClick={() => decide(receipt, "verify")}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
