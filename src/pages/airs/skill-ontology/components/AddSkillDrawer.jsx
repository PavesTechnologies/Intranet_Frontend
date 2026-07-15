import React, { useEffect, useState } from "react";
import Button from "../../../../components/Button/Button";
import SkillDrawer from "./SkillDrawer";
import SkillForm from "./SkillForm";
import { EMPTY_SKILL_FORM } from "../constants/skillOntologyConstants";
import { validateSkillForm } from "../utils/skillOntologyUtils.jsx";

export default function AddSkillDrawer({ open, existingSkills = [], categoryOptions, onClose, onSubmit, isSubmitting }) {
  const [values, setValues] = useState(EMPTY_SKILL_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setValues(EMPTY_SKILL_FORM);
    setErrors({});
  }, [open]);

  const setField = (field, value) => setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = () => {
    const nextErrors = validateSkillForm(values, existingSkills);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  return (
    <SkillDrawer
      open={open}
      onClose={onClose}
      title="Add Skill"
      subtitle="Register a new canonical skill in the ontology."
      footer={
        <>
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSubmit} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      {open && (
        <SkillForm values={values} errors={errors} onFieldChange={setField} categoryOptions={categoryOptions} />
      )}
    </SkillDrawer>
  );
}
