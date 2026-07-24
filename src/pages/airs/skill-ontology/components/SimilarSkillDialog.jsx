import React from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import { SIMILAR_SKILL_ACTIONS } from "../constants/skillOntologyConstants";

export default function SimilarSkillDialog({ open, newSkill, similarSkills, onClose, onAction, isSubmitting }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Similar Skills Detected" width="520px">
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          "{newSkill?.canonicalName}" looks similar to {similarSkills?.length || 0} existing skill
          {similarSkills?.length === 1 ? "" : "s"}. Review before keeping it as a separate canonical skill.
        </p>

        <div className="space-y-2">
          {(similarSkills || []).map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">{s.canonicalName}</div>
                <div className="text-[11px] text-slate-400">{s.category}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-600">{Math.round(s.similarity * 100)}% match</span>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => onAction(SIMILAR_SKILL_ACTIONS.ADD_AS_ALIAS, s)}
                  disabled={isSubmitting}
                >
                  Add As Alias
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onAction(SIMILAR_SKILL_ACTIONS.MERGE_EXISTING, s)}
                  disabled={isSubmitting}
                >
                  Merge
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="small"
            onClick={() => onAction(SIMILAR_SKILL_ACTIONS.KEEP_NEW, null)}
            loading={isSubmitting}
          >
            Keep New Skill
          </Button>
        </div>
      </div>
    </Modal>
  );
}
