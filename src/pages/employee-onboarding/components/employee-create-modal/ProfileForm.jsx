import FormInput from "./FormInput";
import FormSelect from "./FormSelect";

export default function ProfileForm({
  form,
  handleChange,
  isGenerated,
  isEditMode,
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {isGenerated && (
        <FormInput
          label="Employee ID"
          name="empId"
          value={form.empId || ""}
          onChange={handleChange}
          disabled={isGenerated}
        />
      )}

      {isGenerated && (
        <FormInput
          label="Employee Email"
          name="email"
          value={form.email || ""}
          onChange={handleChange}
          disabled={isGenerated}
        />
      )}

      <FormInput
        label="First Name"
        name="empFirstName"
        value={form.empFirstName || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />
      <FormInput
        label="Middle Name"
        name="empMiddleName"
        value={form.empMiddleName || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />
      <FormInput
        label="Last Name"
        name="empLastName"
        value={form.empLastName || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />
      <FormInput
        label="Date of Birth"
        type="date"
        name="empDob"
        value={form.empDob || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />
      <FormSelect
        label="Gender"
        name="gender"
        value={form.gender || ""}
        onChange={handleChange}
        options={["Male", "Female", "Other"]}
      />
      <FormInput
        label="Contact"
        name="contact"
        value={form.contact || ""}
        onChange={handleChange}
      />
      <FormInput
        label="Blood Group"
        name="bloodGroup"
        value={form.bloodGroup || ""}
        onChange={handleChange}
        disabled={isEditMode}
      />
      <FormSelect
        label="Marital Status"
        name="maritalStatus"
        value={form.maritalStatus || ""}
        onChange={handleChange}
        options={["Single", "Married", "Divorced"]}
      />
    </div>
  );
}
