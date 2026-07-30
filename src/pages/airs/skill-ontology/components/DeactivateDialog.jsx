import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";

// Usage impact (T01) is read directly off the skill object already in hand
// (jdCount/candidateCount from GET .../{skill_id}, children from the same
// response) — no separate check call. The actual blocking child-hierarchy
// validation still happens server-side on submit (see SkillOntologyPage's
// confirmDeactivate / ChildHandlingDialog).
export default function DeactivateDialog({ open, skill, onClose, onConfirm, isSubmitting }) {
  const childCount = (skill?.children || []).length;
  const hasDependents = childCount > 0;

  return (
    <Modal isOpen={open} onClose={onClose} title="Deactivate Skill" width="460px">
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          Are you sure you want to deactivate <span className="font-semibold text-slate-900">{skill?.canonicalName}</span>?
          It will be hidden from new JD/candidate matching; existing references are preserved.
        </p>

        <div className="grid grid-cols-3 gap-3 text-[12.5px]">
          <div className="p-3 rounded-xl bg-slate-50">
            <div className="text-slate-400 text-[11px]">JD usage</div>
            <div className="font-bold text-slate-900">{skill?.jdCount ?? 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <div className="text-slate-400 text-[11px]">Candidate usage</div>
            <div className="font-bold text-slate-900">{skill?.candidateCount ?? 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <div className="text-slate-400 text-[11px]">Child skills</div>
            <div className="font-bold text-slate-900">{childCount}</div>
          </div>
        </div>

        {hasDependents && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-amber-700">
              This skill has {childCount} child skill{childCount > 1 ? "s" : ""} in the hierarchy. You'll be asked how
              to handle them if deactivation requires it.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="small" onClick={onConfirm} loading={isSubmitting}>
            Deactivate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
