import React, { useEffect, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import SkillForm from "./SkillForm";
import { EMPTY_SKILL_FORM } from "../constants/skillOntologyConstants";
import { validateSkillForm } from "../utils/skillOntologyUtils.jsx";

// Uses the project's existing global Modal (centered, same backdrop/animation
// as EditSkillModal) instead of a drawer, so Add and Edit are consistent.
//
// initialValues is optional — omitted for the normal "Add Skill" toolbar
// button (starts blank), passed by SkillOntologyPage's "Promote to skill"
// action (from the Unknown Skills tab) to pre-fill the canonical name.
export default function AddSkillModal({ open, existingSkills = [], categoryOptions, initialValues, onClose, onSubmit, isSubmitting }) {
  const [values, setValues] = useState(EMPTY_SKILL_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setValues(initialValues || EMPTY_SKILL_FORM);
    setErrors({});
  }, [open, initialValues]);

  const setField = (field, value) => setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = () => {
    const nextErrors = validateSkillForm(values, existingSkills);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Skill" width="520px">
      <div className="space-y-4">
        {open && (
          <SkillForm values={values} errors={errors} onFieldChange={setField} categoryOptions={categoryOptions} />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSubmit} loading={isSubmitting}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
