import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-rose-400" : "border-slate-200"
  }`;

// Reuses PATCH /interviews/{id}/reschedule with the round's date/time/
// platform/etc. unchanged and only the interviewer list actually
// different — the backend detects nothing schedule-related changed and
// skips appending a history entry for it. Same reason requirement as a
// full reschedule, since it's the same endpoint/validation.
export default function EditInterviewersModal({ round, isSubmitting, onClose, onSubmit }) {
  const [interviewers, setInterviewers] = useState(round?.interviewers || []);
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [interviewerFormError, setInterviewerFormError] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  const handleAddInterviewer = () => {
    const name = interviewerName.trim();
    const email = interviewerEmail.trim();

    if (!name || !email) {
      setInterviewerFormError("Please enter the interviewer's name and email.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setInterviewerFormError("Please enter a valid email address.");
      return;
    }
    if (interviewers.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      setInterviewerFormError("This interviewer has already been added.");
      return;
    }

    setInterviewers((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, name, email }]);
    setInterviewerName("");
    setInterviewerEmail("");
    setInterviewerFormError("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.interviewers;
      return next;
    });
  };

  // Removing an interviewer who already submitted feedback is allowed —
  // deliberately, per the backend. Their feedback/history stays intact,
  // they just stop showing up as an active interviewer on the round.
  const handleRemoveInterviewer = (id) => setInterviewers((prev) => prev.filter((i) => i.id !== id));

  const handleConfirm = () => {
    const nextErrors = {};
    if (!interviewers.length) nextErrors.interviewers = "Please add at least one interviewer.";
    if (!reason.trim()) nextErrors.reason = "A reason is required to change the interviewer list.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({ interviewers, reason: reason.trim() });
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Interviewers" width="480px">
      <div className="space-y-4">
        <div>
          <label className="text-[12px] font-semibold text-slate-600 block mb-1">
            Interviewers <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={interviewerName}
              onChange={(e) => {
                setInterviewerName(e.target.value);
                if (interviewerFormError) setInterviewerFormError("");
              }}
              placeholder="Interviewer name"
              className={inputClass(false) + " flex-1"}
            />
            <input
              type="email"
              value={interviewerEmail}
              onChange={(e) => {
                setInterviewerEmail(e.target.value);
                if (interviewerFormError) setInterviewerFormError("");
              }}
              placeholder="Interviewer email"
              className={inputClass(false) + " flex-1"}
            />
            <Button type="button" variant="outline" size="small" onClick={handleAddInterviewer} className="shrink-0">
              <Plus size={14} /> Add
            </Button>
          </div>
          {interviewerFormError && <p className="text-[11px] text-rose-600 mt-1">{interviewerFormError}</p>}
          {errors.interviewers && <p className="text-[11px] text-rose-600 mt-1">{errors.interviewers}</p>}

          {interviewers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {interviewers.map((i) => (
                <span
                  key={i.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 text-[12px] font-medium text-slate-700 pl-2.5 pr-1.5 py-1"
                >
                  {i.name}
                  <span className="text-slate-400 font-normal">({i.email})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterviewer(i.id)}
                    className="text-slate-400 hover:text-rose-600"
                    aria-label={`Remove ${i.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[12px] font-semibold text-slate-600 block mb-1">
            Reason for Change <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.reason;
                return next;
              });
            }}
            placeholder="Why is the interviewer list changing?"
            className={inputClass(errors.reason)}
          />
          {errors.reason && <p className="text-[11px] text-rose-600 mt-1">{errors.reason}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleConfirm} loading={isSubmitting} loadingText="Saving...">
            Save Interviewers
          </Button>
        </div>
      </div>
    </Modal>
  );
}
