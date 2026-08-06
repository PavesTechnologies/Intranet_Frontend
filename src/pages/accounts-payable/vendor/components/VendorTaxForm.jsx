import React from "react";
import FormInput from "../../../../components/forms/FormInput";

export const DEFAULT_TAX_FORM = { registration_type: "", registration_number: "" };

/**
 * `registration_type`/`registration_number` are plain strings on the backend
 * (no enum) — it upper-cases both server-side, so we mirror that on submit.
 */
const VendorTaxForm = ({ formData, errors = {}, onChange }) => (
  <div className="space-y-4">
    <FormInput
      label="Registration Type"
      name="registration_type"
      value={formData.registration_type}
      onChange={onChange}
      error={errors.registration_type}
      placeholder="e.g. GST, PAN, VAT"
      requiredMark
    />
    <FormInput
      label="Registration Number"
      name="registration_number"
      value={formData.registration_number}
      onChange={onChange}
      error={errors.registration_number}
      requiredMark
    />
  </div>
);

export default VendorTaxForm;
