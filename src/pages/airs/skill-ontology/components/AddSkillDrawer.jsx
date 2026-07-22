import React, { useEffect, useState } from "react";
import Button from "../../../../components/Button/Button";
import SkillDrawer from "./SkillDrawer";
import SkillForm from "./SkillForm";
import { EMPTY_SKILL_FORM } from "../constants/skillOntologyConstants";
import { validateSkillForm } from "../utils/skillOntologyUtils.jsx";

// initialValues is optional — omitted for the normal "Add Skill" toolbar
// button (starts blank), passed by SkillOntologyPage's "Promote to skill"
// action (from the Unknown Skills tab) to pre-fill the canonical name.
export default function AddSkillDrawer({ open, existingSkills = [], categoryOptions, initialValues, onClose, onSubmit, isSubmitting }) {
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
