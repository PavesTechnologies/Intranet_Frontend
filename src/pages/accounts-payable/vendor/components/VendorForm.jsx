import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import useApLookups from "../../hooks/useApLookups";

export const DEFAULT_VENDOR_FORM = {
  vendor_name: "",
  vendor_code: "",
  country_id: "",
  payment_term_id: "",
  currency_id: "",
  pan_number: "",
  phone_number: "",
  email: "",
  status_id: "",
};

/**
 * Shared vendor create/edit form. `formData` shape matches
 * VendorCreateRequest/VendorUpdateRequest (see Backend/API_Layer/interface/vendor_interface.py).
 * `mode="edit"` also surfaces the status dropdown (backed by the
 * /system/status?module_name=VENDOR lookup).
 */
const VendorForm = ({ formData, errors = {}, onChange, mode = "create", disabledFields = [] }) => {
  const { countryOptions, currencyOptions, paymentTermOptions, vendorStatusOptions } = useApLookups();
  const isDisabled = (name) => disabledFields.includes(name);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormInput
        label="Vendor Name"
        name="vendor_name"
        value={formData.vendor_name}
        onChange={onChange}
        error={errors.vendor_name}
        disabled={isDisabled("vendor_name")}
        placeholder={isDisabled("vendor_name") ? "Verify GSTIN to fill this in" : undefined}
        requiredMark
      />
      <FormInput
        label="Vendor Code"
        name="vendor_code"
        value={formData.vendor_code}
        onChange={onChange}
        error={errors.vendor_code}
        placeholder="Optional"
      />
      <FormSelect
        label="Country *"
        name="country_id"
        options={countryOptions}
        value={formData.country_id}
        onChange={onChange}
      />
      <FormSelect
        label="Payment Term"
        name="payment_term_id"
        options={[{ value: "", label: "None" }, ...paymentTermOptions]}
        value={formData.payment_term_id}
        onChange={onChange}
      />
      <FormSelect
        label="Currency"
        name="currency_id"
        options={[{ value: "", label: "None" }, ...currencyOptions]}
        value={formData.currency_id}
        onChange={onChange}
      />
      <FormInput
        label="PAN Number"
        name="pan_number"
        value={formData.pan_number}
        onChange={onChange}
        error={errors.pan_number}
        disabled={isDisabled("pan_number")}
        placeholder={isDisabled("pan_number") ? "Verify GSTIN to fill this in" : undefined}
      />
      <FormInput
        label="Phone Number"
        name="phone_number"
        value={formData.phone_number}
        onChange={onChange}
        error={errors.phone_number}
      />
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={onChange}
        error={errors.email}
      />
      {mode === "edit" && (
        <FormSelect
          label="Status"
          name="status_id"
          options={vendorStatusOptions}
          value={formData.status_id}
          onChange={onChange}
        />
      )}
    </div>
  );
};

export default VendorForm;
