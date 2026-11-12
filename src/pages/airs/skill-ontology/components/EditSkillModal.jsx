import React, { useEffect, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import SkillForm from "./SkillForm";
import { EMPTY_SKILL_FORM } from "../constants/skillOntologyConstants";
import { validateSkillForm } from "../utils/skillOntologyUtils.jsx";
import ReferenceImpactNote from "../../settings/components/ReferenceImpactNote";

// Edit uses the project's existing global Modal (centered, same backdrop/animation
// as every other edit dialog in the app) instead of a drawer — clicking the Edit
// icon opens this in place, no navigation to a separate page.
export default function EditSkillModal({ open, skill, existingSkills = [], categoryOptions, onClose, onSubmit, isSubmitting }) {
  const [values, setValues] = useState(EMPTY_SKILL_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !skill) return;
    setValues({
      canonicalName: skill.canonicalName,
      category: skill.category,
      description: skill.description || "",
      notDescription: skill.notDescription || "",
      aliases: skill.aliases || [],
      parentSkillId: skill.parentSkillId || "",
      parentSkillName: skill.parentSkillName || "",
      confidence: skill.confidence,
      status: skill.status,
    });
    setErrors({});
  }, [open, skill]);

  const setField = (field, value) => setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = () => {
    const nextErrors = validateSkillForm(values, existingSkills, skill?.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit Skill" width="520px">
      <div className="space-y-4">
        {open && (
          <SkillForm
            values={values}
            errors={errors}
            onFieldChange={setField}
            excludeSkillId={skill?.id}
            categoryOptions={categoryOptions}
          />
        )}

        {/* Settings phase 3: the live campaigns this skill change affects. */}
        {open && skill?.id && <ReferenceImpactNote target={{ kind: "skill", skill_ids: [skill.id] }} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSubmit} loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
