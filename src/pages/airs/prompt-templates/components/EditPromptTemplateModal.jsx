import React, { useEffect, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import PromptTemplateForm from "./PromptTemplateForm";
import { EMPTY_PROMPT_TEMPLATE_FORM } from "../constants/promptTemplateConstants";
import { validatePromptTemplateForm } from "../utils/promptTemplateUtils.jsx";

// Edit uses the project's existing global Modal — same pattern as
// src/pages/airs/skill-ontology/components/EditSkillModal.jsx — clicking the
// Edit icon (or the Edit button on the View page) opens this in place, no
// navigation to a separate page. Task Type is read-only in edit mode.
export default function EditPromptTemplateModal({ open, promptTemplate, onClose, onSubmit, isSubmitting }) {
  const [values, setValues] = useState(EMPTY_PROMPT_TEMPLATE_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !promptTemplate) return;
    setValues({
      name: promptTemplate.name || "",
      taskType: promptTemplate.taskType,
      promptTemplate: promptTemplate.promptTemplate,
      notes: promptTemplate.notes || "",
      status: promptTemplate.status,
    });
    setErrors({});
  }, [open, promptTemplate]);

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = () => {
    const nextErrors = validatePromptTemplateForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      name: values.name.trim(),
      promptTemplate: values.promptTemplate.trim(),
      notes: values.notes.trim(),
      status: values.status,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit Prompt Template" width="640px">
      <div className="space-y-4">
        {open && <PromptTemplateForm values={values} errors={errors} onFieldChange={setField} isEditMode />}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSubmit} loading={isSubmitting} loadingText="Updating...">
            Update
          </Button>
        </div>
      </div>
    </Modal>
  );
}
