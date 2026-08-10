import { useState } from "react";
import { toast } from "react-toastify";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";
import apLookupService from "../../services/apLookupService";
import useApLookups from "../../hooks/useApLookups";
import { mapGstinResponseToAddressFields, findIndiaCountryId } from "../../utils/gstMapping";

export const DEFAULT_ADDRESS_FORM = {
  address_type: "REGISTERED",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country_id: "",
  is_primary: false,
};

// UI convenience only — the backend accepts any string for address_type.
const ADDRESS_TYPE_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "BILLING", label: "Billing" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

/**
 * Vendor address form + inline GSTIN lookup. Looking up a GSTIN auto-fills
 * the address fields below (best-effort — see mapGstinResponseToAddress);
 * the tax registration itself still has to be added separately on the
 * saved address (Vendor Tax is scoped to a vendor_address_id that only
 * exists once this address has been created).
 */
const VendorAddressForm = ({ formData, errors = {}, onChange }) => {
  const { countryOptions } = useApLookups();
  const [gstin, setGstin] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleChange = (e) => {
    onChange(e);
  };

  const handleCheckboxChange = (e) => {
    onChange({ target: { name: "is_primary", value: e.target.checked } });
  };

  const handleGstLookup = async () => {
    if (!gstin.trim()) {
      toast.warning("Enter a GSTIN to look up.");
      return;
    }

    setIsLookingUp(true);
    try {
      const details = await apLookupService.getGstinDetails(gstin.trim());
      const mapped = mapGstinResponseToAddressFields(details);

      Object.entries(mapped).forEach(([name, value]) => {
        if (value) onChange({ target: { name, value } });
      });

      const indiaId = findIndiaCountryId(countryOptions);
      if (indiaId) onChange({ target: { name: "country_id", value: indiaId } });

      toast.success(
        `GSTIN verified. Address fields auto-filled — review before saving, then add "${gstin.trim().toUpperCase()}" as a GST tax registration once this address is saved.`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "GSTIN lookup failed."));
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 rounded-lg border border-dashed border-gray-300 p-3">
        <FormInput
          label="Look up by GSTIN"
          name="gstin"
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          placeholder="Enter GSTIN to auto-fill address"
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleGstLookup} loading={isLookingUp} loadingText="Looking up...">
          Look up
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormSelect
          label="Address Type"
          name="address_type"
          options={ADDRESS_TYPE_OPTIONS}
          value={formData.address_type}
          onChange={handleChange}
        />
        <FormSelect
          label="Country *"
          name="country_id"
          options={countryOptions}
          value={formData.country_id}
          onChange={handleChange}
        />
        <FormInput
          label="Address Line 1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleChange}
          error={errors.address_line1}
          requiredMark
        />
        <FormInput
          label="Address Line 2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleChange}
          error={errors.address_line2}
        />
        <FormInput
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          error={errors.city}
          requiredMark
        />
        <FormInput label="State" name="state" value={formData.state} onChange={handleChange} error={errors.state} />
        <FormInput
          label="Postal Code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleChange}
          error={errors.postal_code}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!formData.is_primary}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
        />
        Set as primary address
      </label>
    </div>
  );
};

export default VendorAddressForm;
