import React from "react";
// import FormInput from "../../../../../forms/FormInput";
import FormInput from "../../../../../components/forms/FormInput";
import FormTextArea from "../../../../../components/forms/FormTextArea";
import FormSelect from "../../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../../components/forms/FormDatePicker";

const TaskFields = ({ formData, onChange, statuses, stories, sprints, users, today }) => (
  <>
    <FormInput label="Title *" name="title" value={formData.title || ""} onChange={onChange} required />

    <FormTextArea label="Description" name="description" value={formData.description || ""} onChange={onChange} />

    <FormSelect label="Story" name="storyId" value={formData.storyId ?? ""} onChange={onChange}
      options={stories.map((s) => ({ label: s.title, value: s.id }))} />

    <FormSelect label="Status *" name="statusId" value={formData.statusId ?? ""} onChange={onChange}
      options={statuses.map((s) => ({ label: s.name, value: s.id }))} />

    <FormSelect label="Priority" name="priority" value={formData.priority || "MEDIUM"} onChange={onChange}
      options={[
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Critical", value: "CRITICAL" },
      ]} />

    <FormSelect label="Sprint" name="sprintId" value={formData.sprintId ?? ""} onChange={onChange}
      options={sprints.map((s) => ({ label: s.name, value: s.id }))} />

    <FormSelect label="Assignee" name="assigneeId" value={formData.assigneeId ?? ""} onChange={onChange}
      options={users.map((u) => ({ label: u.name, value: u.id }))} />

    <FormSelect label="Reporter *" name="reporterId" value={formData.reporterId ?? ""} onChange={onChange}
      options={users.map((u) => ({ label: u.name, value: u.id }))} />

    <FormDatePicker label="Start Date" name="startDate" value={formData.startDate || ""} onChange={onChange} min={today} />

    <FormDatePicker label="Due Date" name="dueDate" value={formData.dueDate || ""} onChange={onChange} min={today} />

    <FormSelect label="Billable" name="Billable" value={String(!!formData.Billable)} onChange={onChange}
      options={[
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ]} />
  </>
);

export default TaskFields;
