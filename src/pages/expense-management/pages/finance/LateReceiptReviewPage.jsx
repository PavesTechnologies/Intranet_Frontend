import React, { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { lateReceiptService, receiptService } from "@/pages/expense-management/api/expenseReportsApi";
import SourceBadge from "@/pages/expense-management/approval-engine/components/SourceBadge";

const MIN_REJECT_NOTE = 10;

const unwrap = (res) => res?.data?.data ?? res?.data ?? [];

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

// The work queue first; the other tabs are the reviewed history, newest first.
const TABS = [
  { key: "", label: "To review", empty: "No late receipts are waiting for review." },
  { key: "VERIFIED", label: "Verified", empty: "No late receipts have been verified yet." },
  { key: "REJECTED", label: "Rejected", empty: "No late receipts have been rejected yet." },
  { key: "ALL", label: "All", empty: "No late receipts yet." },
];

const DECISION = {
  PENDING_REVIEW: { label: "Waiting for review", className: "border-amber-200 bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700" },
};

const money = (value) => (value != null ? `₹${value}` : "—");

// Receipt total from OCR compared with the claimed amount. Only computed when both exist; a difference within one paisa
// is treated as a match, the same tolerance the server uses before it asks for a note.
const amountComparison = (item) => {
  if (item.receiptTotal == null || item.lineAmount == null) return null;
  const diff = Number(item.lineAmount) - Number(item.receiptTotal);
  if (Math.abs(diff) <= 0.01) return { text: "Matches the claim", className: "text-emerald-700" };
  return diff > 0
    ? { text: `₹${diff.toFixed(2)} less than claimed`, className: "text-red-700" }
    : { text: `₹${Math.abs(diff).toFixed(2)} more than claimed`, className: "text-amber-700" };
};

// A receipt dated outside the trip should already be refused on attach; this flags older receipts attached before that
// check existed. The claimed expense date counts as inside, as it does on the server.
const outsideTrip = (item) => {
  const date = item.actualReceiptDate;
  if (!date || (!item.tripStartDate && !item.tripEndDate) || date === item.expenseDate) return false;
  return (item.tripStartDate && date < item.tripStartDate) || (item.tripEndDate && date > item.tripEndDate);
};

const errorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

/**
 * Finance and AP review queue for late receipts: receipts attached after a report was approved, reimbursed or closed.
 * Verify and reject are checked again by the server (duplicates, amount mismatch, self-review), and the server's message
 * is shown when it refuses. Verify is disabled here when a duplicate blocks it, so the reviewer rejects instead.
 */
export default function LateReceiptReviewPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("");
  const activeTab = TABS.find((t) => t.key === tab) || TABS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const payload = unwrap(await lateReceiptService.pendingReview(tab || undefined));
      setItems(Array.isArray(payload) ? payload : payload?.content || []);
    } catch (err) {
      setLoadError(errorMessage(err, "The late receipts could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // The tab opens before the link is requested, so the browser's pop-up blocker does not stop it.
  const openReceipt = async (receiptId) => {
    const win = window.open("", "_blank");
    if (!win) {
      showStatusToast("Allow pop-ups for this site to open the receipt.", "error");
      return;
    }
    try {
      const url = unwrap(await receiptService.getViewUrl(receiptId))?.url;
      if (!url) throw new Error("No link was returned for this receipt.");
      win.opener = null;
      win.location.href = url;
    } catch (err) {
      win.close();
      showStatusToast(errorMessage(err, "The receipt could not be opened."), "error");
    }
  };

  const decide = async (item, decision) => {
    const note = (notes[item.receiptId] || "").trim();
    if (decision === "reject" && note.length < MIN_REJECT_NOTE) {
      showStatusToast(`Give a reason for rejecting this receipt (at least ${MIN_REJECT_NOTE} characters).`, "error");
      return;
    }
    setBusyId(item.receiptId);
    try {
      if (decision === "verify") {
        await lateReceiptService.verify(item.receiptId, note || null);
        showStatusToast("Late receipt verified.", "success");
      } else {
        await lateReceiptService.reject(item.receiptId, note);
        showStatusToast("Late receipt rejected.", "success");
      }
      setNotes((prev) => {
        const next = { ...prev };
        delete next[item.receiptId];
        return next;
      });
      await load();
    } catch (err) {
      showStatusToast(errorMessage(err, "The decision could not be saved."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-[#0A0082]">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a174e]">Late receipts to review</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Receipts employees found after a report was settled. Verifying or rejecting one does not change the expense's
              amount or payment.
            </p>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Late receipts" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              t.key === tab
                ? "border-[#0A0082] bg-indigo-50 text-[#0A0082]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading late receipts…</p>
      ) : loadError ? (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <span>{loadError}</span>
          <Button variant="secondary" size="small" onClick={load} className="w-fit">Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
          {activeTab.empty}
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const busy = busyId === item.receiptId;
            const blocked = item.duplicateStatus === "BLOCKING";
            const comparison = amountComparison(item);
            const pending = !item.verificationStatus || item.verificationStatus === "PENDING_REVIEW";
            const decision = DECISION[item.verificationStatus];
            return (
              <li key={item.receiptId} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid="late-review-item">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate text-sm font-semibold text-gray-900">{item.originalFileName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Report {item.reportNumber || "—"}
                    {item.expenseSource && <SourceBadge source={item.expenseSource} />}
                  </span>
                </div>

                <p className="text-xs text-gray-600">
                  Employee {item.employeeId || "—"} · Expense {formatDate(item.expenseDate)} · Claimed {money(item.lineAmount)}
                </p>
                {(item.tripStartDate || item.tripEndDate) && (
                  <p className="text-xs text-gray-600">
                    Trip {formatDate(item.tripStartDate)} – {formatDate(item.tripEndDate)}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  Receipt dated {formatDate(item.actualReceiptDate)} · Uploaded {formatDate(item.uploadedAt)} by {item.uploadedBy || "—"}
                </p>
                {outsideTrip(item) && (
                  <p className="text-xs text-red-700">The receipt date is outside the trip.</p>
                )}
                <p className="text-xs text-gray-600" data-testid="amount-comparison">
                  Receipt total {item.receiptTotal != null ? money(item.receiptTotal) : "not read yet"}
                  {comparison && <span className={`ml-1 font-medium ${comparison.className}`}>· {comparison.text}</span>}
                </p>
                <p className="text-xs text-gray-600">Reason: {item.lateReason || "—"}</p>

                {item.duplicateStatus && item.duplicateStatus !== "NONE" && (
                  <p className={`text-xs ${blocked ? "text-red-700" : "text-amber-700"}`}>
                    {item.duplicateMessage || "This receipt matches another claim."}
                    {blocked && " Verification is blocked. Reject this receipt instead."}
                  </p>
                )}

                {pending ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1 text-xs">
                      <span className="font-medium text-gray-700">Review note</span>
                      <input
                        aria-label={`Review note for ${item.originalFileName}`}
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        value={notes[item.receiptId] || ""}
                        onChange={(e) => setNotes({ ...notes, [item.receiptId]: e.target.value })}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="small" onClick={() => openReceipt(item.receiptId)}>
                        View receipt
                      </Button>
                      <Button variant="secondary" size="small" disabled={busy} onClick={() => decide(item, "reject")}>
                        Reject
                      </Button>
                      <Button variant="primary" size="small" disabled={busy || blocked} onClick={() => decide(item, "verify")}>
                        Verify
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Already decided: the outcome as history, with no actions but viewing the receipt.
                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between" data-testid="late-review-decision">
                    <div className="space-y-1 text-xs text-gray-600">
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 font-medium ${decision?.className || ""}`}>
                        {decision?.label || item.verificationStatus}
                      </span>
                      <p>
                        By {item.verifiedBy || "—"} on {formatDate(item.verifiedAt)}
                      </p>
                      {item.verificationNote && <p>Note: {item.verificationNote}</p>}
                    </div>
                    <Button variant="secondary" size="small" className="w-fit" onClick={() => openReceipt(item.receiptId)}>
                      View receipt
                    </Button>
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
