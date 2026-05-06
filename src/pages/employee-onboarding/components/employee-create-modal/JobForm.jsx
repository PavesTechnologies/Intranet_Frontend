import React from "react";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";

export default function JobForm({
  form,
  handleChange,
  designations = [],
  departments = [],
  isEditMode,
}) {
  const employeeTypes = ["Full-Time", "Intern", "Contract"];
  const workModes = ["Remote", "Hybrid", "Office"];
  const experienceOptions = ["0", "0.5", "1"];
  const employeeStatus = [
    "Probation",
    "Active",
    "Resigned",
    "Terminated",
    "Absconded",
  ];

  const filteredDesignations = designations.filter(
    (d) => d.department_uuid === form.departmentUuid
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormSelect
        label="Department"
        name="departmentUuid"
        value={form.departmentUuid || ""}
        onChange={handleChange}
        options={departments.map((d) => ({
          value: d.department_uuid,
          label: d.department_name,
        }))}
        disabled={isEditMode}
      />

      <FormSelect
        label="Designation"
        name="designationUuid"
        value={form.designationUuid || ""}
        onChange={handleChange}
        disabled={!form.departmentUuid}
        options={filteredDesignations.map((d) => ({
          value: d.designation_uuid,
          label: d.designation_name,
        }))}
      />

      <FormSelect
        label="Employee Type"
        name="employeeType"
        value={form.employeeType || ""}
        onChange={handleChange}
        options={employeeTypes}
        disabled={isEditMode}
      />

      <FormSelect
        label="Work Mode"
        name="workMode"
        value={form.workMode || ""}
        onChange={handleChange}
        options={workModes}
        disabled={isEditMode}
      />

      <FormInput
        label="Location"
        name="location"
        value={form.location || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />

      <FormInput
        label="Date of Join"
        type="date"
        name="joiningDate"
        value={form.joiningDate || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />

      <FormInput
        label="Reporting Manager"
        name="reportingManagerUuid"
        value={form.reportingManagerUuid || ""}
        onChange={handleChange}
      />

      <FormSelect
        label="Employment Status"
        name="employmentStatus"
        value={form.employmentStatus || ""}
        onChange={handleChange}
        options={employeeStatus}
      />

      <FormSelect
        label="Experience Years"
        name="totalExperience"
        value={form.totalExperience || ""}
        onChange={handleChange}
        options={experienceOptions}
      />
    </div>
  );
}
