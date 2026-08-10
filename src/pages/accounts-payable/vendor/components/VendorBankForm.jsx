import FormInput from "../../../../components/forms/FormInput";

export const DEFAULT_BANK_FORM = {
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  iban: "",
  swift_code: "",
  routing_number: "",
  ifsc_code: "",
  is_primary: false,
};

/**
 * Vendor bank account form. Matches VendorBankCreateRequest/UpdateRequest
 * (Backend/API_Layer/interface/vendor_interface.py).
 */
const VendorBankForm = ({ formData, errors = {}, onChange }) => {
  const handleCheckboxChange = (e) => {
    onChange({ target: { name: "is_primary", value: e.target.checked } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          label="Bank Name"
          name="bank_name"
          value={formData.bank_name}
          onChange={onChange}
          error={errors.bank_name}
          requiredMark
        />
        <FormInput
          label="Account Holder Name"
          name="account_holder_name"
          value={formData.account_holder_name}
          onChange={onChange}
          error={errors.account_holder_name}
          requiredMark
        />
        <FormInput
          label="Account Number"
          name="account_number"
          value={formData.account_number}
          onChange={onChange}
          error={errors.account_number}
        />
        <FormInput label="IBAN" name="iban" value={formData.iban} onChange={onChange} error={errors.iban} />
        <FormInput
          label="SWIFT Code"
          name="swift_code"
          value={formData.swift_code}
          onChange={onChange}
          error={errors.swift_code}
        />
        <FormInput
          label="Routing Number"
          name="routing_number"
          value={formData.routing_number}
          onChange={onChange}
          error={errors.routing_number}
        />
        <FormInput
          label="IFSC Code"
          name="ifsc_code"
          value={formData.ifsc_code}
          onChange={onChange}
          error={errors.ifsc_code}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!formData.is_primary}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
        />
        Set as primary account
      </label>
      {formData.is_primary && (
        <p className="text-xs text-gray-400">
          Setting this account as primary will close out the current primary account (kept for history, not deleted).
        </p>
      )}
    </div>
  );
};

export default VendorBankForm;
