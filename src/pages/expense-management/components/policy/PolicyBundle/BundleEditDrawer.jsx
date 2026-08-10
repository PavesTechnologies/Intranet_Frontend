import React, { useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import PolicyDrawer, { DRAWER_WIDTH_CREATE, DRAWER_WIDTH_EDIT } from "@/pages/expense-management/components/policy/common/PolicyDrawer";

const emptyForm = { policyName: "", description: "", status: "DRAFT" };

export default function BundleEditDrawer({ open, onClose, bundle, onSubmit, submitting }) {
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (bundle) {
      setFormData({
        policyName: bundle.policyName || "",
        description: bundle.description || "",
        status: bundle.status || "DRAFT",
      });
    } else {
      setFormData(emptyForm);
    }
    setFormErrors({});
  }, [open, bundle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.policyName.trim()) errors.policyName = "Policy name is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      policyName: formData.policyName.trim(),
      description: formData.description ? formData.description.trim() : "",
      status: formData.status,
    });
  };

  return (
    <PolicyDrawer
      open={open}
      onClose={onClose}
      title={bundle ? "Edit Policy Bundle" : "New Policy Bundle"}
      subtitle={
        bundle
          ? "Update this bundle's name, description, or status."
          : "Group related expense policy rules together under one bundle."
      }
      widthClassName={bundle ? DRAWER_WIDTH_EDIT : DRAWER_WIDTH_CREATE}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            form="policy-bundle-form"
            variant="primary"
            loading={submitting}
            loadingText="Saving..."
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {bundle ? "Save Changes" : "Create Bundle"}
          </Button>
        </div>
      }
    >
      <form id="policy-bundle-form" onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Policy Name"
          name="policyName"
          placeholder="e.g. Field Sales Policy"
          value={formData.policyName}
          onChange={handleChange}
          requiredMark
          disabled={submitting}
          error={formErrors.policyName}
        />

        <FormTextArea
          label="Description"
          name="description"
          placeholder="Optional summary of what this bundle covers..."
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
            { label: "Draft", value: "DRAFT" },
            { label: "Active", value: "ACTIVE" },
            { label: "Inactive", value: "INACTIVE" },
          ]}
        />
      </form>
    </PolicyDrawer>
  );
}
