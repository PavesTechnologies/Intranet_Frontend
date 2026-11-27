import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import {
  errorMessage,
  receiptReleaseService,
  unwrap,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const MIN_REQUEST_REASON = 10;
const MIN_REJECT_REASON = 5;

/**
 * Two-person receipt release. A Finance user requests a release of a rejected receipt with a reason. A different Finance user
 * approves or rejects it from the queue. The backend refuses a self-decision, so the requester is never shown the decision buttons.
 */
export default function FinanceReceiptReleasePage() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [receiptId, setReceiptId] = useState("");
  const [reason, setReason] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [queue, setQueue] = useState([]);
  const [decisionReasons, setDecisionReasons] = useState({});
  const [loadingQueue, setLoadingQueue] = useState(true);

  const loadQueue = async () => {
    try {
      const res = await receiptReleaseService.queue();
      setQueue(unwrapList(res));
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not load the release queue."), "error");
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const findCandidates = async (e) => {
    e.preventDefault();
    setRequestError("");
    setReceiptId("");
    if (!employeeId.trim()) return setRequestError("Enter the employee's id.");
    try {
      const res = await receiptReleaseService.candidates(employeeId.trim());
      setCandidates(unwrapList(res));
    } catch (err) {
      setRequestError(errorMessage(err, "Could not load this employee's rejected receipts."));
    }
  };

  const request = async (e) => {
    e.preventDefault();
    setRequestError("");
    if (!receiptId) return setRequestError("Choose a rejected receipt.");
    if (reason.trim().length < MIN_REQUEST_REASON) {
      return setRequestError(`Give a reason for the release (at least ${MIN_REQUEST_REASON} characters).`);
    }
    setRequesting(true);
    try {
      unwrap(await receiptReleaseService.request(receiptId, reason.trim()));
      showStatusToast("Release requested. A different Finance user must approve it.", "success");
      setReceiptId("");
      setReason("");
      setCandidates([]);
      setEmployeeId("");
      setLoadingQueue(true);
      await loadQueue();
    } catch (err) {
      setRequestError(errorMessage(err, "Could not request the release."));
    } finally {
      setRequesting(false);
    }
  };

  const decide = async (releaseId, approve) => {
    const text = (decisionReasons[releaseId] || "").trim();
    if (!approve && text.length < MIN_REJECT_REASON) {
      return showStatusToast(`Give a reason for rejecting (at least ${MIN_REJECT_REASON} characters).`, "error");
    }
    try {
      unwrap(approve
        ? await receiptReleaseService.approve(releaseId, text || null)
        : await receiptReleaseService.reject(releaseId, text));
      showStatusToast(approve ? "Release approved." : "Release rejected.", "success");
      setLoadingQueue(true);
      await loadQueue();
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not record the decision."), "error");
    }
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/expense-management/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#0a174e]">Receipt release</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Release a receipt Finance rejected so it can be used on a supplementary claim. One Finance user requests it; a different one approves it.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-[#0a174e]">Request a release</h2>
        <form onSubmit={findCandidates} className="flex flex-wrap items-end gap-2" noValidate>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Employee id</span>
            <input className="w-56 rounded-md border border-gray-300 px-3 py-2" value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)} />
          </label>
          <Button variant="outline" size="small" type="submit">Find rejected receipts</Button>
        </form>

        {candidates.length === 0 ? (
          <p className="text-sm text-gray-500">Search for an employee to see their rejected receipts.</p>
        ) : (
          <form onSubmit={request} className="space-y-3" noValidate>
            <FormSelect
              label="Rejected receipt"
              name="receiptId"
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
              options={candidates.map((c) => ({ value: c.receiptId, label: `${c.originalFileName} · ${c.uploadedAt ? new Date(c.uploadedAt).toLocaleDateString() : ""}` }))}
              placeholder="Select a receipt"
            />
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Reason for the release</span>
              <textarea rows={2} maxLength={500} className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <Button variant="primary" size="small" type="submit" disabled={requesting}>Request release</Button>
          </form>
        )}
        {requestError && <p className="text-sm text-red-600" role="alert">{requestError}</p>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-base font-semibold text-[#0a174e]">Waiting for a second Finance user</h2>
        {loadingQueue ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-sm text-gray-500">No release requests are waiting.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {queue.map((r) => (
              <li key={r.releaseId} className="space-y-2 py-3 text-sm">
                <p className="text-gray-800">Receipt {r.receiptId} · requested by {r.requestedBy}</p>
                <p className="text-gray-600">Reason: {r.requestReason}</p>
                <textarea rows={2} maxLength={500} aria-label="Decision reason" placeholder="Reason (required to reject)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={decisionReasons[r.releaseId] || ""}
                  onChange={(e) => setDecisionReasons({ ...decisionReasons, [r.releaseId]: e.target.value })} />
                <div className="flex gap-2">
                  <Button variant="success" size="small" onClick={() => decide(r.releaseId, true)}>
                    <CheckCircle2 size={14} aria-hidden="true" /> Approve release
                  </Button>
                  <Button variant="danger" size="small" onClick={() => decide(r.releaseId, false)}>
                    <XCircle size={14} aria-hidden="true" /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
