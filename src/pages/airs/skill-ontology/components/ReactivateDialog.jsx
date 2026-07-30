import React from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import { renderVerificationBadge, formatDate } from "../utils/skillOntologyUtils.jsx";

export default function ReactivateDialog({ open, skill, onClose, onConfirm, isSubmitting }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Reactivate Skill" width="420px">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-slate-50">
          <div className="text-[13px] font-semibold text-slate-900">{skill?.canonicalName}</div>
          <div className="text-[11px] text-slate-400 mb-2">{skill?.category}</div>
          <div className="flex items-center gap-2">
            {skill && renderVerificationBadge(skill.confidence)}
            <span className="text-[11px] text-slate-400">Last seen {formatDate(skill?.lastSeen)}</span>
          </div>
        </div>

        <p className="text-[12.5px] text-slate-500">
          Reactivating this skill makes it available again for JD and candidate matching.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={onConfirm} loading={isSubmitting}>
            Reactivate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
