import FormInput from "./FormInput";
import FormSelect from "./FormSelect";

export default function ProfileForm({
  form,
  handleChange,
  isGenerated,
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
        required
      />
      <FormInput
        label="Middle Name"
        name="empMiddleName"
        value={form.empMiddleName || ""}
        onChange={handleChange}

      />
      <FormInput
        label="Last Name"
        name="empLastName"
        value={form.empLastName || ""}
        onChange={handleChange}
        required
      />
      <FormInput
        label="Date of Birth"
        type="date"
        name="empDob"
        value={form.empDob || ""}
        onChange={handleChange}
        required
      />
      <FormSelect
        label="Gender"
        name="gender"
        value={form.gender || ""}
        onChange={handleChange}
        options={["Male", "Female", "Other"]}
        required
      />
      <FormInput
        label="Contact"
        name="contact"
        value={form.contact || ""}
        onChange={handleChange}
        required
      />
      <FormInput
        label="Blood Group"
        name="bloodGroup"
        value={form.bloodGroup || ""}
        onChange={handleChange}
        required
      />
      <FormSelect
        label="Marital Status"
        name="maritalStatus"
        value={form.maritalStatus || ""}
        onChange={handleChange}
        options={["Single", "Married", "Divorced"]}
        required
      />
    </div>
  );
}
