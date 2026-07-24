import React, { useEffect, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";

const OPTIONS = [
  {
    value: "PROMOTE",
    label: "Promote child skills",
    description: "Move every child to this skill's parent.",
  },
  {
    value: "ROOT",
    label: "Make child skills root skills",
    description: "Child skills become top-level skills in the hierarchy.",
  },
  {
    value: "CANCEL",
    label: "Cancel",
    description: "Close this dialog. The skill will not be deactivated.",
  },
];

// Shown when the backend refuses PATCH .../status { is_active: false } because
// the skill has child skills — it returns the affected children and requires
// an explicit child_handling choice on the retried call (S05/T03, S06/T02).
export default function ChildHandlingDialog({ open, skill, childSkills = [], onClose, onConfirm, isSubmitting }) {
  const [selected, setSelected] = useState("PROMOTE");

  useEffect(() => {
    if (open) setSelected("PROMOTE");
  }, [open]);

  const handleContinue = () => {
    if (selected === "CANCEL") {
      onClose();
      return;
    }
    onConfirm(selected);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Deactivate Skill" width="480px">
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">This skill has child skills. Choose how they should be handled.</p>

        <div>
          <div className="text-[12px] font-semibold text-slate-600 mb-1.5">
            {childSkills.length} affected child skill{childSkills.length === 1 ? "" : "s"}
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5">
            {childSkills.map((child) => (
              <div key={child.id} className="p-2.5 rounded-xl bg-slate-50 text-[12.5px] font-semibold text-slate-900">
                {child.canonical_name || child.canonicalName}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"
            >
              <input
                type="radio"
                name="childHandling"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <span>
                <span className="block text-[12.5px] font-semibold text-slate-900">{opt.label}</span>
                <span className="block text-[11.5px] text-slate-400">{opt.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" size="small" onClick={handleContinue} loading={isSubmitting}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
