import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  mapGstinResponseToVendorFields,
  mapGstinResponseToAddressFields,
  findIndiaCountryId,
} from "../../utils/gstMapping";
import apLookupService from "../../services/apLookupService";
import useApLookups from "../../hooks/useApLookups";
import { AP_ROUTES } from "../../constants/routes";
import vendorAddressService from "../services/vendorAddressService";
import vendorTaxService from "../services/vendorTaxService";
import VendorForm, { DEFAULT_VENDOR_FORM } from "../components/VendorForm";
import CountrySpecificVendorFields from "../components/CountrySpecificVendorFields";
import { useCreateVendor } from "../hooks/useVendorMutations";
import {
  COUNTRY_KIND,
  getCountryKind,
  getCountryLabel,
  findCurrencyIdByKind,
  BRAZIL_MOCK_DATA,
  EMPTY_COUNTRY_FIELDS_BY_KIND,
  validateCountryFields,
} from "../config/vendorCountryConfig";

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

/** Route: /accounts-payable/vendors/onboard */
export default function VendorOnboardingPage() {
  const navigate = useNavigate();
  const { countryOptions, currencyOptions } = useApLookups();
  const [formData, setFormData] = useState(DEFAULT_VENDOR_FORM);
  const [errors, setErrors] = useState({});

  const [hasRegistrationNumber, setHasRegistrationNumber] = useState("no");
  const [gstin, setGstin] = useState("");
  const [gstStatus, setGstStatus] = useState("idle"); // idle | verifying | verified | error
  const [gstError, setGstError] = useState("");
  const [gstMapped, setGstMapped] = useState(null); // { vendorFields, addressFields }
  const [isRegistering, setIsRegistering] = useState(false);

  // Country-specific (non-India) vendor fields — Brazil/US/UK/Other, config-driven.
  // Kept separate from `formData` since none of these map to a backend column yet.
  const [countryFields, setCountryFields] = useState({});
  const [countryFieldErrors, setCountryFieldErrors] = useState({});
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState("idle"); // idle | verifying | verified | error
  const [cpfCnpjError, setCpfCnpjError] = useState("");

  const createMutation = useCreateVendor();

  const countryKind = getCountryKind(countryOptions, formData.country_id);
  const countryLabel = getCountryLabel(countryOptions, formData.country_id);
  const isIndiaOrUnselected = countryKind === null || countryKind === COUNTRY_KIND.INDIA;

  // Default the Country dropdown to India once the (async) lookup has loaded,
  // same India lookup already used at GST-submit time — no country picked yet
  // is a transient state, not a fourth "kind".
  useEffect(() => {
    if (!formData.country_id && countryOptions.length > 0) {
      const indiaId = findIndiaCountryId(countryOptions);
      if (indiaId) {
        setFormData((prev) => (prev.country_id ? prev : { ...prev, country_id: indiaId }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryOptions.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "country_id") {
      const nextKind = getCountryKind(countryOptions, value);
      const currencyId = findCurrencyIdByKind(currencyOptions, nextKind);

      setFormData((prev) => ({
        ...prev,
        country_id: value,
        ...(currencyId !== undefined ? { currency_id: currencyId } : {}),
      }));

      // Changing country must clear the previous country's mock/registration state —
      // country-specific values must never leak between countries.
      setCountryFields(EMPTY_COUNTRY_FIELDS_BY_KIND[nextKind] || {});
      setCountryFieldErrors({});
      setCpfCnpjStatus("idle");
      setCpfCnpjError("");

      if (nextKind !== COUNTRY_KIND.INDIA && nextKind !== null) {
        setHasRegistrationNumber("no");
        setGstin("");
        setGstStatus("idle");
        setGstError("");
        setGstMapped(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCountryFieldChange = (e) => {
    const { name, value } = e.target;
    setCountryFields((prev) => ({ ...prev, [name]: value }));
    setCountryFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleVerifyCpfCnpj = () => {
    if (!countryFields.cpf_cnpj?.trim()) {
      toast.warning("Enter a CPF or CNPJ to verify.");
      return;
    }

    setCpfCnpjStatus("verifying");
    setCpfCnpjError("");

    // Mock verification only — there is no backend service for Brazilian tax IDs yet.
    setTimeout(() => {
      setCountryFields((prev) => ({
        ...prev,
        postal_code: BRAZIL_MOCK_DATA.postal_code,
        number: BRAZIL_MOCK_DATA.number,
        street: BRAZIL_MOCK_DATA.street,
        complement: BRAZIL_MOCK_DATA.complement,
        neighborhood: BRAZIL_MOCK_DATA.neighborhood,
        city: BRAZIL_MOCK_DATA.city,
        state: BRAZIL_MOCK_DATA.state,
      }));
      setFormData((prev) => ({
        ...prev,
        vendor_name: prev.vendor_name?.trim() ? prev.vendor_name : BRAZIL_MOCK_DATA.name,
      }));
      setCountryFieldErrors({});
      setCpfCnpjStatus("verified");
      toast.success("CPF/CNPJ verified (mock). Vendor address auto-filled.");
    }, 300);
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
      toast.warning("Enter a GSTIN to verify.");
      return;
    }

    setGstStatus("verifying");
    setGstError("");

    try {
      const details = await apLookupService.getGstinDetails(gstin.trim());
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
      toast.success("GSTIN verified. Vendor details auto-filled.");
    } catch (error) {
      setGstStatus("error");
      const message = getApiErrorMessage(error, "GSTIN verification failed.");
      setGstError(message);
      toast.error(message);
    }
  };

  const isGstGateBlocking = hasRegistrationNumber === "yes" && gstStatus !== "verified";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm(formData);
    setErrors(nextErrors);

    const nextCountryFieldErrors = validateCountryFields(countryKind, countryFields);
    setCountryFieldErrors(nextCountryFieldErrors);

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextCountryFieldErrors).length > 0) return;

    if (isIndiaOrUnselected && isGstGateBlocking) {
      toast.warning("Please verify the GSTIN before registering.");
      return;
    }

    setIsRegistering(true);
    try {
      const { vendor_id } = await createMutation.mutateAsync(buildCreatePayload(formData));

      if (hasRegistrationNumber === "yes" && gstMapped) {
        try {
          const indiaId = findIndiaCountryId(countryOptions);
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

          await vendorTaxService.createTax(address.vendor_address_id, {
            registration_type: "GST",
            registration_number: gstMapped.vendorFields.registration_number,
            is_verified: true,
          });

          toast.success("Vendor registered with the verified GST address and tax registration.");
        } catch (chainError) {
          toast.warning(
            getApiErrorMessage(
              chainError,
              "Vendor registered, but the GST address/tax registration couldn't be saved automatically — add them from the vendor's Addresses/Tax tabs.",
            ),
          );
        }
      } else {
        toast.success("Vendor registered. Add addresses and bank accounts next.");
      }

      navigate(AP_ROUTES.VENDOR_DETAIL(vendor_id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to register vendor."));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6 p-6 pb-24">
      <PageHeader title="Register Vendor" subtitle="Add a new vendor master record for Accounts Payable." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PageCard>
          <PageCardContent>
            <FormSelect
              label="Country *"
              name="country_id"
              options={countryOptions}
              value={formData.country_id}
              onChange={handleChange}
              className="max-w-sm"
            />
          </PageCardContent>
        </PageCard>

        {isIndiaOrUnselected && (
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
        )}

        {countryKind === COUNTRY_KIND.BRAZIL && (
          <PageCard>
            <PageCardContent className="space-y-4">
              <h2 className={Fonts.subheading}>Brazil Vendor Registration</h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput
                  label="CPF or CNPJ"
                  name="cpf_cnpj"
                  value={countryFields.cpf_cnpj || ""}
                  onChange={handleCountryFieldChange}
                  error={countryFieldErrors.cpf_cnpj}
                  requiredMark
                />
                <div className="flex items-end gap-2">
                  <FormInput
                    label="Contact Now"
                    name="contact"
                    value={countryFields.contact || ""}
                    onChange={handleCountryFieldChange}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyCpfCnpj}
                    loading={cpfCnpjStatus === "verifying"}
                    loadingText="Verifying..."
                  >
                    Verify CPF/CNPJ
                  </Button>
                </div>
              </div>

              {cpfCnpjStatus === "error" && <p className="text-xs text-red-500">{cpfCnpjError}</p>}

              {cpfCnpjStatus === "verified" && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Verification Details (mock)
                  </p>
                  <GstSummaryRow label="Logradouro" value={`${countryFields.street}, ${countryFields.number}`} />
                  <GstSummaryRow label="Bairro" value={countryFields.neighborhood} />
                  <GstSummaryRow label="City / UF" value={`${countryFields.city} / ${countryFields.state}`} />
                  <p className="mt-2 text-xs text-emerald-700">
                    Vendor Name and the address fields below were auto-filled from this mock verification.
                  </p>
                </div>
              )}
            </PageCardContent>
          </PageCard>
        )}

        <PageCard>
          <PageCardContent className="space-y-4">
            <h2 className={Fonts.subheading}>Vendor Details</h2>
            <VendorForm
              formData={formData}
              errors={errors}
              onChange={handleChange}
              mode="create"
              disabledFields={isGstGateBlocking ? ["vendor_name", "pan_number"] : []}
              hideCountryField
            />

            {countryKind && countryKind !== COUNTRY_KIND.INDIA && (
              <CountrySpecificVendorFields
                kind={countryKind}
                countryLabel={countryLabel}
                values={countryFields}
                errors={countryFieldErrors}
                onChange={handleCountryFieldChange}
              />
            )}

            <p className="text-xs text-gray-400">
              Addresses, bank accounts, and tax registrations can be added once the vendor is saved.
            </p>
          </PageCardContent>
        </PageCard>

        <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={() => navigate(AP_ROUTES.VENDOR_LIST)}>
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
