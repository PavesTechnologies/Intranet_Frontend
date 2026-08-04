import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  mapGstinResponseToVendorFields,
  mapGstinResponseToAddressFields,
  findIndiaCountryId,
} from "../../utils/gstMapping";
import apLookupService from "../../services/apLookupService";
import useApLookups from "../../hooks/useApLookups";
import vendorAddressService from "../services/vendorAddressService";
import vendorTaxService from "../services/vendorTaxService";
import VendorForm, { DEFAULT_VENDOR_FORM } from "../components/VendorForm";
import { useCreateVendor } from "../hooks/useVendorMutations";

const REQUIRED_FIELDS = ["vendor_name", "country_id"];

const validateForm = (formData) => {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!String(formData[field] || "").trim()) {
      errors[field] = "This field is required.";
    }
  });

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
};

const buildCreatePayload = (formData) => ({
  vendor_name: formData.vendor_name.trim(),
  country_id: Number(formData.country_id),
  vendor_code: formData.vendor_code?.trim() || null,
  payment_term_id: formData.payment_term_id ? Number(formData.payment_term_id) : null,
  currency_id: formData.currency_id ? Number(formData.currency_id) : null,
  pan_number: formData.pan_number?.trim() || null,
  phone_number: formData.phone_number?.trim() || null,
  email: formData.email?.trim() || null,
});

const GstSummaryRow = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-emerald-100 py-1 last:border-0">
    <span className="text-xs font-medium text-emerald-700">{label}</span>
    <span className="text-xs text-emerald-900">{value || "—"}</span>
  </div>
);

export default function VendorRegistrationPage() {
  const navigate = useNavigate();
  const { countryOptions } = useApLookups();
  const [formData, setFormData] = useState(DEFAULT_VENDOR_FORM);
  const [errors, setErrors] = useState({});

  const [hasRegistrationNumber, setHasRegistrationNumber] = useState("no");
  const [gstin, setGstin] = useState("");
  const [gstStatus, setGstStatus] = useState("idle"); // idle | verifying | verified | error
  const [gstError, setGstError] = useState("");
  const [gstMapped, setGstMapped] = useState(null); // { vendorFields, addressFields }
  const [isRegistering, setIsRegistering] = useState(false);

  const createMutation = useCreateVendor();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleHasRegistrationNumberChange = (value) => {
    setHasRegistrationNumber(value);
    if (value === "no") {
      setGstin("");
      setGstStatus("idle");
      setGstError("");
      setGstMapped(null);
    }
  };

  const handleGstinInputChange = (e) => {
    setGstin(e.target.value);
    if (gstStatus !== "idle") {
      // Any edit after a verify/error invalidates it — force re-verification.
      setGstStatus("idle");
      setGstError("");
      setGstMapped(null);
    }
  };

  const handleVerifyGstin = async () => {
    if (!gstin.trim()) {
      showStatusToast("Enter a GSTIN to verify.", "warning");
      return;
    }

    setGstStatus("verifying");
    setGstError("");

    try {
      const details = await apLookupService.getGstinDetails(gstin.trim());
      console.log("GSTIN details:", details);
      const vendorFields = mapGstinResponseToVendorFields(details);
      const addressFields = mapGstinResponseToAddressFields(details);

      setFormData((prev) => ({
        ...prev,
        vendor_name: vendorFields.vendor_name || prev.vendor_name,
        pan_number: vendorFields.pan_number || prev.pan_number,
        currency_id: 1, // Default to INR for GST-verified vendors
        country_id: 1, // Default to IN for GST-verified vendors
      }));
      setGstMapped({ vendorFields, addressFields });
      setGstStatus("verified");
      showStatusToast("GSTIN verified. Vendor details auto-filled.", "success");
    } catch (error) {
      setGstStatus("error");
      const message = getApiErrorMessage(error, "GSTIN verification failed.");
      setGstError(message);
      showStatusToast(message, "error");
    }
  };

  const isGstGateBlocking = hasRegistrationNumber === "yes" && gstStatus !== "verified";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isGstGateBlocking) {
      showStatusToast("Please verify the GSTIN before registering.", "warning");
      return;
    }

    setIsRegistering(true);
    try {
      const { vendor_id } = await createMutation.mutateAsync(buildCreatePayload(formData));

      if (hasRegistrationNumber === "yes" && gstMapped) {
        try {
          const indiaId = findIndiaCountryId(countryOptions);
          console.log("1. Vendor created");

          console.log("2. hasRegistrationNumber:", hasRegistrationNumber);

          console.log("3. gstMapped:", gstMapped);

          console.log("4. Before createAddress");
          const address = await vendorAddressService.createAddress(vendor_id, {
            address_type: "REGISTERED",
            address_line1: gstMapped.addressFields.address_line1,
            address_line2: gstMapped.addressFields.address_line2 || null,
            city: gstMapped.addressFields.city,
            state: gstMapped.addressFields.state || null,
            postal_code: gstMapped.addressFields.postal_code || null,
            country_id: indiaId ? Number(indiaId) : Number(formData.country_id),
            is_primary: true,
          });
          console.log("5. After createAddress");

          await vendorTaxService.createTax(address.vendor_address_id, {
            registration_type: "GST",
            registration_number: gstMapped.vendorFields.registration_number,
            is_verified: true,
          });

          showStatusToast("Vendor registered with the verified GST address and tax registration.", "success");
        } catch (chainError) {
          showStatusToast(
            getApiErrorMessage(
              chainError,
              "Vendor registered, but the GST address/tax registration couldn't be saved automatically — add them from the vendor's Addresses/Tax tabs.",
            ),
            "warning",
          );
        }
      } else {
        showStatusToast("Vendor registered. Add addresses and bank accounts next.", "success");
      }

      navigate(`/accounts-payable/vendors/${vendor_id}`);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to register vendor."), "error");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Register Vendor" subtitle="Add a new vendor master record for Accounts Payable." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PageCard>
          <PageCardContent className="space-y-4">
            <h2 className={Fonts.subheading}>GST Registration</h2>

            <fieldset className="space-y-2">
              <legend className="text-sm text-gray-700">Does this vendor have a registration number (GSTIN)?</legend>
              <div className="flex gap-6">
                {[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="hasRegistrationNumber"
                      value={option.value}
                      checked={hasRegistrationNumber === option.value}
                      onChange={() => handleHasRegistrationNumberChange(option.value)}
                      className="h-4 w-4 border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {hasRegistrationNumber === "yes" && (
              <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
                <div className="flex items-end gap-2">
                  <FormInput
                    label="GSTIN"
                    name="gstin"
                    value={gstin}
                    onChange={handleGstinInputChange}
                    placeholder="Enter GSTIN"
                    className="flex-1"
                    disabled={gstStatus === "verifying"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyGstin}
                    loading={gstStatus === "verifying"}
                    loadingText="Verifying..."
                  >
                    Verify GSTIN
                  </Button>
                </div>

                {gstStatus === "error" && <p className="text-xs text-red-500">{gstError}</p>}

                {gstStatus === "verified" && gstMapped && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      GST Verification Details
                    </p>
                    <GstSummaryRow label="Legal Name" value={gstMapped.vendorFields.legal_name} />
                    <GstSummaryRow label="Trade Name" value={gstMapped.vendorFields.trade_name} />
                    <GstSummaryRow label="Tax Type" value={gstMapped.vendorFields.tax_type} />
                    <GstSummaryRow label="Business Type" value={gstMapped.vendorFields.business_type} />
                    <GstSummaryRow label="GST Status" value={gstMapped.vendorFields.gst_status} />
                    <p className="mt-2 text-xs text-emerald-700">
                      Vendor Name and PAN Number below were auto-filled from this GSTIN. A primary address and GST
                      tax registration will be created automatically once you register this vendor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent className="space-y-4">
            <h2 className={Fonts.subheading}>Vendor Details</h2>
            <VendorForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode="create"
              disabledFields={isGstGateBlocking ? ["vendor_name", "pan_number"] : []}
            />
            <p className="text-xs text-gray-400">
              Addresses, bank accounts, and tax registrations can be added once the vendor is saved.
            </p>
          </PageCardContent>
        </PageCard>

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={() => navigate("/accounts-payable/vendors")}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || isRegistering}
            loadingText="Registering..."
            disabled={isGstGateBlocking}
          >
            Register Vendor
          </Button>
        </div>
      </form>
    </div>
  );
}
