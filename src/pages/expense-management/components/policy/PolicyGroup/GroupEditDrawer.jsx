import React, { useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import PolicyDrawer, { DRAWER_WIDTH_CREATE, DRAWER_WIDTH_EDIT } from "@/pages/expense-management/components/policy/common/PolicyDrawer";

const emptyForm = { groupName: "", description: "", status: "ACTIVE" };

export default function GroupEditDrawer({ open, onClose, group, onSubmit, submitting }) {
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (group) {
      setFormData({
        groupName: group.groupName || "",
        description: group.description || "",
        status: group.status || "ACTIVE",
      });
    } else {
      setFormData(emptyForm);
    }
    setFormErrors({});
  }, [open, group]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.groupName.trim()) errors.groupName = "Group name is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      groupName: formData.groupName.trim(),
      description: formData.description ? formData.description.trim() : "",
      status: formData.status,
    });
  };

  return (
    <PolicyDrawer
      open={open}
      onClose={onClose}
      title={group ? "Edit Policy Group" : "New Policy Group"}
      subtitle={group ? "Update this group's name, description, or status." : "Create a group, then add members from its workspace."}
      widthClassName={group ? DRAWER_WIDTH_EDIT : DRAWER_WIDTH_CREATE}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            form="policy-group-form"
            variant="primary"
            loading={submitting}
            loadingText="Saving..."
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {group ? "Save Changes" : "Create Group"}
          </Button>
        </div>
      }
    >
      <form id="policy-group-form" onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Group Name"
          name="groupName"
          placeholder="e.g. Field Sales"
          value={formData.groupName}
          onChange={handleChange}
          requiredMark
          disabled={submitting}
          error={formErrors.groupName}
        />

        <FormTextArea
          label="Description"
          name="description"
          placeholder="Optional description of this group..."
          value={formData.description}
          onChange={handleChange}
          disabled={submitting}
        />

        <FormSelect
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Inactive", value: "INACTIVE" },
          ]}
        />
      </form>
    </PolicyDrawer>
  );
}
