import React from "react";
import FormInput from "../../../../../components/forms/FormInput";
import FormTextArea from "../../../../../components/forms/FormTextArea";
import FormSelect from "../../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../../components/forms/FormDatePicker";

const EpicFields = ({ formData, onChange, statuses, today }) => (
  
  <>
    <FormInput label="Epic Name *" name="name" value={formData.name || ""} onChange={onChange} required />

    <FormTextArea label="Description" name="description" value={formData.description || ""} onChange={onChange} />

    <FormSelect label="Status *" name="statusId" value={formData.statusId ?? ""} onChange={onChange}
      options={statuses.map((s) => ({ label: s.name, value: s.id }))} />

    <FormSelect label="Priority" name="priority" value={formData.priority || "MEDIUM"} onChange={onChange}
      options={[
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Critical", value: "CRITICAL" },
      ]} />

    <FormDatePicker label="Start Date" name="startDate" value={formData.startDate || ""} onChange={onChange} min={today} />

    <FormDatePicker label="Due Date" name="dueDate" value={formData.dueDate || ""} onChange={onChange} min={today} />
  </>
);

export default EpicFields;
