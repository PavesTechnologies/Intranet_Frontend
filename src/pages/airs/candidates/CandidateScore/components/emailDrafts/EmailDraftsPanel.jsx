import React, { useState } from "react";
import { toast } from "react-toastify";
import { Mail, Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import useEmailDrafts, { useInvalidateEmailDrafts } from "../../../hooks/useEmailDrafts";
import { discardEmailDraft, draftErrorMessage } from "../../../services/emailDraftService";
import { formatDateTime } from "../../../utils/candidateDataUtils";
import EmailPreviewModal from "./EmailPreviewModal";
import { EMAIL_LABEL } from "./emailLabels";

// Email plan phase 3: a candidate's emails waiting for Send - nothing goes to a candidate or an interviewer
// on its own. Each can be previewed (then sent after a confirm step naming the recipient) or discarded.
// `only` limits the panel to some emails (e.g. the Final status tab shows rejection and selection).
export default function EmailDraftsPanel({ campaignCandidateId, only, canAct = true, title = "Emails waiting to be sent" }) {
  const { drafts, isLoading } = useEmailDrafts(campaignCandidateId);
  const invalidate = useInvalidateEmailDrafts();
  const [previewId, setPreviewId] = useState(null);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [discarding, setDiscarding] = useState(false);

  const shown = only ? drafts.filter((d) => only.includes(d.trigger_event)) : drafts;
  if (isLoading || shown.length === 0) return null;

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      await discardEmailDraft(discardTarget.id);
      toast.success("Email discarded.");
    } catch (error) {
      toast.error(draftErrorMessage(error, "Couldn't discard the email."));
    } finally {
      setDiscarding(false);
      setDiscardTarget(null);
      invalidate(campaignCandidateId);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-900">
        <Mail size={13} /> {title} ({shown.length})
      </div>
      <p className="text-[11px] text-amber-800 mt-0.5">Nothing is sent until you preview an email and click Send.</p>
      <ul className="mt-2 divide-y divide-amber-100">
        {shown.map((draft) => (
          <li key={draft.id} className="py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[12px] text-slate-700 min-w-0">
              <span className="font-semibold text-slate-900">{EMAIL_LABEL[draft.trigger_event] || draft.trigger_event}</span>
              <span className="text-slate-500">
                {" "}to {draft.recipient_type === "CANDIDATE" ? "the candidate" : (draft.recipient_name || "an interviewer")}
                {draft.prepared_at && <> · prepared {formatDateTime(draft.prepared_at)}</>}
              </span>
            </div>
            {canAct && (
              <div className="flex gap-2 shrink-0">
                <Button variant="primary" size="small" onClick={() => setPreviewId(draft.id)}>Preview & send</Button>
                <Button variant="outline" size="small" onClick={() => setDiscardTarget(draft)} title="Discard">
                  <Trash2 size={13} />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {previewId && (
        <EmailPreviewModal draftId={previewId} onClose={() => setPreviewId(null)} onSent={() => invalidate(campaignCandidateId)} />
      )}
      <ConfirmationModal
        isOpen={!!discardTarget}
        title="Discard this email?"
        message={`The ${EMAIL_LABEL[discardTarget?.trigger_event]?.toLowerCase() || "email"} won't be sent.`}
        confirmText="Discard"
        variant="danger"
        isLoading={discarding}
        onConfirm={handleDiscard}
        onCancel={() => setDiscardTarget(null)}
      />
    </div>
  );
}
