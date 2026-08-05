import { useState } from "react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { CURRENCY_OPTIONS } from "../../data/wizardOptions";

const REQUIRED_FIELDS = ["clientName", "projectName", "projectCode", "currency", "startDate", "endDate"];

function validate(project) {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!project[field]) {
      errors[field] = "This field is required.";
    }
  });

  if (project.startDate && project.endDate && project.endDate < project.startDate) {
    errors.endDate = "End date must be after the start date.";
  }

  return errors;
}

export default function ManualProjectCreationStep({ value = {}, onChange }) {
  const [touched, setTouched] = useState({});
  const errors = validate(value);

  const handleFieldChange = (event) => {
    const { name, value: fieldValue } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    onChange({ ...value, [name]: fieldValue });
  };

  const showError = (field) => touched[field] && errors[field];

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Standalone Project Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage billing details directly within Accounts Receivable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          label="Client Name"
          requiredMark
          name="clientName"
          value={value.clientName || ""}
          onChange={handleFieldChange}
          error={showError("clientName")}
          placeholder="e.g. Meridian Financial Group"
        />
        <FormInput
          label="Project Name"
          requiredMark
          name="projectName"
          value={value.projectName || ""}
          onChange={handleFieldChange}
          error={showError("projectName")}
          placeholder="e.g. Core Banking Platform Upgrade"
        />
        <FormInput
          label="Project Code"
          requiredMark
          name="projectCode"
          value={value.projectCode || ""}
          onChange={handleFieldChange}
          error={showError("projectCode")}
          placeholder="e.g. MAN-1004"
        />
        <FormInput
          label="Contract Reference"
          name="contractReference"
          value={value.contractReference || ""}
          onChange={handleFieldChange}
          placeholder="e.g. CR-2026-0098"
        />
        <div className="space-y-1">
          <FormSelect
            label="Currency *"
            name="currency"
            value={value.currency || ""}
            onChange={handleFieldChange}
            options={CURRENCY_OPTIONS}
          />
          {showError("currency") && <p className="text-xs text-red-500">{errors.currency}</p>}
        </div>
        <div className="hidden md:block" />
        <div className="space-y-1">
          <FormDatePicker
            label="Project Start Date *"
            name="startDate"
            value={value.startDate || ""}
            onChange={handleFieldChange}
          />
          {showError("startDate") && <p className="text-xs text-red-500">{errors.startDate}</p>}
        </div>
        <div className="space-y-1">
          <FormDatePicker
            label="Project End Date *"
            name="endDate"
            value={value.endDate || ""}
            onChange={handleFieldChange}
            min={value.startDate || undefined}
          />
          {showError("endDate") && <p className="text-xs text-red-500">{errors.endDate}</p>}
        </div>
      </div>

      <FormTextArea
        label="Project Description"
        name="description"
        value={value.description || ""}
        onChange={handleFieldChange}
        placeholder="Brief description of project scope..."
        rows={4}
      />
    </div>
  );
}
