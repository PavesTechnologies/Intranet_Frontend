import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import {
  draftErrorCode, draftErrorMessage, previewEmailDraft, sendEmailDraft,
} from "../../../services/emailDraftService";
import { EMAIL_LABEL } from "./emailLabels";

// Email plan phase 3: the email exactly as it will be sent - recipient, subject, body and any reason it
// can't be sent - then Send, behind a confirm step that names the recipient. The body is shown in a
// sandboxed frame (no scripts, no links followed) since it is the HTML the recipient will get.
export default function EmailPreviewModal({ draftId, onClose, onSent }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPreview(await previewEmailDraft(draftId));
    } catch (error) {
      setLoadError(draftErrorMessage(error, "Couldn't load the email preview."));
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => { load(); }, [load]);

  const recipient = preview
    ? `${preview.recipient_name || "the recipient"}${preview.recipient_address ? ` <${preview.recipient_address}>` : ""}`
    : "";

  const handleSend = async () => {
    setSending(true);
    try {
      await sendEmailDraft(draftId, preview.preview_hash);
      toast.success(`Email sent to ${preview.recipient_name || "the recipient"}.`);
      setConfirming(false);
      onSent?.();
      onClose();
    } catch (error) {
      setConfirming(false);
      toast.error(draftErrorMessage(error, "Couldn't send the email. Please try again."));
      if (draftErrorCode(error) === "PREVIEW_CHANGED" || error?.response?.status === 422) load();
      if (draftErrorCode(error) === "NOT_A_DRAFT") { onSent?.(); onClose(); }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} title={preview ? (EMAIL_LABEL[preview.trigger_event] || "Email") : "Email preview"} width="640px">
        {loading && <div className="py-10 flex justify-center"><LoadingSpinner text="Preparing the preview..." /></div>}
        {!loading && loadError && (
          <div className="space-y-3">
            <p className="text-[12.5px] text-rose-600">{loadError}</p>
            <Button variant="outline" size="small" onClick={load}>Retry</Button>
          </div>
        )}
        {!loading && preview && (
          <div className="space-y-3">
            <div className="text-[12px] text-slate-600 space-y-1">
              <div><span className="font-semibold text-slate-800">To:</span> {recipient}</div>
              <div><span className="font-semibold text-slate-800">Subject:</span> {preview.subject || "-"}</div>
            </div>
            {preview.problems?.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700" role="alert">
                <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={13} /> This email can't be sent:</div>
                <ul className="list-disc ml-5 mt-1">
                  {preview.problems.map((p) => <li key={p.code}>{p.message}</li>)}
                </ul>
              </div>
            )}
            <iframe
              title="Email body"
              sandbox=""
              srcDoc={preview.body || "<p>(empty)</p>"}
              className="w-full h-80 rounded-lg border border-slate-200 bg-white"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="small" onClick={onClose}>Close</Button>
              <Button variant="primary" size="small" disabled={!preview.can_send} onClick={() => setConfirming(true)}>
                <Mail size={13} /> Send…
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmationModal
        isOpen={confirming}
        title="Send this email?"
        message={`This sends "${preview?.subject || "this email"}" to ${recipient} now. An email can't be recalled once sent.`}
        confirmText="Send email"
        variant="primary"
        isLoading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
