import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Eye, Mail, XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import {
  bulkSendRejectionEmail, checkBulkRejectionEmail, previewBulkRejectionEmail,
} from "../../candidates/services/candidateScoreService";

const message = (error, fallback) => error?.response?.data?.message || fallback;

// Bulk rejection email (email plan phase 3), on the campaign page:
// 1. the check - who will and won't receive it, with every reason, for the selected candidates;
// 2. a preview of any one recipient's email, exactly as it will be sent;
// 3. a confirm step naming the count, then the send - to exactly the list the check showed (check_hash).
// If who will receive it changed since the check, the send is refused and the check runs again.
export default function BulkRejectionEmailModal({ campaignCandidateIds, nameFor, onClose, onSent }) {
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      setCheck(await checkBulkRejectionEmail(campaignCandidateIds));
    } catch (error) {
      setCheckError(message(error, "Couldn't check who will receive the email."));
    } finally {
      setChecking(false);
    }
  }, [campaignCandidateIds]);

  useEffect(() => { runCheck(); }, [runCheck]);

  const showPreview = async (id) => {
    setPreviewId(id);
    setPreview(null);
    setPreviewing(true);
    try {
      setPreview(await previewBulkRejectionEmail(id));
    } catch (error) {
      toast.error(message(error, "Couldn't load the preview."));
      setPreviewId(null);
    } finally {
      setPreviewing(false);
    }
  };

  const will = check?.will_receive || [];
  const wont = check?.wont_receive || [];
  const label = (entry) => entry.candidate_name || nameFor?.(entry.campaign_candidate_id) || entry.campaign_candidate_id;
  const count = will.length;
  const plural = count === 1 ? "" : "s";

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await bulkSendRejectionEmail(campaignCandidateIds, check.check_hash);
      const queued = res?.data?.queued?.length ?? 0;
      const failed = res?.data?.failed || [];
      if (queued > 0) toast.success(`Rejection email sent to ${queued} candidate${queued === 1 ? "" : "s"}.`);
      if (failed.length > 0) toast.error(`${failed.length} not sent: ${failed.slice(0, 3).map((f) => f.reason).join("; ")}`);
      setConfirming(false);
      onSent?.();
      onClose();
    } catch (error) {
      setConfirming(false);
      toast.error(message(error, "Couldn't send the rejection emails."));
      if (error?.response?.data?.data?.code === "CHECK_CHANGED") runCheck();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} title="Bulk rejection email" width="720px">
        {checking && <div className="py-10 flex justify-center"><LoadingSpinner text="Checking who will receive it..." /></div>}
        {!checking && checkError && (
          <div className="space-y-3">
            <p className="text-[12.5px] text-rose-600">{checkError}</p>
            <Button variant="outline" size="small" onClick={runCheck}>Check again</Button>
          </div>
        )}
        {!checking && check && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <h4 className="text-[12px] font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Will receive it ({will.length})
                </h4>
                {will.length === 0 && <p className="text-[11.5px] text-slate-500 mt-1">No one in this selection.</p>}
                <ul className="mt-1 max-h-56 overflow-auto divide-y divide-emerald-100">
                  {will.map((entry) => (
                    <li key={entry.campaign_candidate_id} className="py-1.5 flex items-center justify-between gap-2">
                      <span className="text-[12px] text-slate-800 truncate">{label(entry)}</span>
                      <button type="button" onClick={() => showPreview(entry.campaign_candidate_id)}
                        className="text-[11px] text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1 shrink-0">
                        <Eye size={12} /> Preview
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                <h4 className="text-[12px] font-bold text-rose-800 flex items-center gap-1.5">
                  <XCircle size={13} /> Won't receive it ({wont.length})
                </h4>
                {wont.length === 0 && <p className="text-[11.5px] text-slate-500 mt-1">Everyone selected can receive it.</p>}
                <ul className="mt-1 max-h-56 overflow-auto divide-y divide-rose-100">
                  {wont.map((entry) => (
                    <li key={entry.campaign_candidate_id} className="py-1.5">
                      <div className="text-[12px] text-slate-800">{label(entry)}</div>
                      <div className="text-[11px] text-rose-700">{(entry.problems || []).map((p) => p.message).join(" ")}</div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {check.repeated > 0 && (
              <p className="text-[11px] text-slate-500">{check.repeated} repeated selection{check.repeated === 1 ? "" : "s"} counted once.</p>
            )}

            {previewId && (
              <section className="rounded-lg border border-slate-200 p-3 space-y-2">
                {previewing && <LoadingSpinner text="Preparing the preview..." />}
                {preview && (
                  <>
                    <div className="text-[12px] text-slate-600 space-y-0.5">
                      <div><span className="font-semibold text-slate-800">To:</span> {preview.recipient_name}{preview.recipient_address ? ` <${preview.recipient_address}>` : ""}</div>
                      <div><span className="font-semibold text-slate-800">Subject:</span> {preview.subject || "-"}</div>
                    </div>
                    {preview.problems?.length > 0 && (
                      <div className="text-[11.5px] text-rose-700 flex items-start gap-1.5" role="alert">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {preview.problems.map((p) => p.message).join(" ")}
                      </div>
                    )}
                    <iframe title="Email body" sandbox="" srcDoc={preview.body || "<p>(empty)</p>"}
                      className="w-full h-64 rounded border border-slate-200 bg-white" />
                  </>
                )}
              </section>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="small" onClick={onClose}>Close</Button>
              <Button variant="outline" size="small" onClick={runCheck}>Check again</Button>
              <Button variant="danger" size="small" disabled={count === 0} onClick={() => setConfirming(true)}>
                <Mail size={13} /> Send to {count}…
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmationModal
        isOpen={confirming}
        title={`Send ${count} rejection email${plural}?`}
        message={`This emails the ${count} candidate${plural} listed under "Will receive it" now. `
          + `${wont.length > 0 ? `The ${wont.length} under "Won't receive it" get nothing. ` : ""}`
          + "Emails can't be recalled once sent."}
        confirmText={`Send ${count} email${plural}`}
        variant="danger"
        isLoading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
