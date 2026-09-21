import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import LoadingSpinner from "../../../../components/LoadingSpinner";
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
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import { AP_ROUTES } from "../../constants/routes";
import VendorForm, { DEFAULT_VENDOR_FORM } from "../components/VendorForm";
import VendorAddressForm, { DEFAULT_ADDRESS_FORM } from "../components/VendorAddressForm";
import CountrySpecificVendorFields from "../components/CountrySpecificVendorFields";
import VendorIntakeStepper from "../../vendor-intake/components/VendorIntakeStepper";
import PreScreenPanel from "../../vendor-intake/components/PreScreenPanel";
import VendorOnboardingProcessPanel from "../../procurement/components/VendorOnboardingProcessPanel";
import { useOnboardingRequest } from "../../procurement/hooks/useVendorOnboarding";
import { useStartOnboarding } from "../../procurement/hooks/useVendorOnboardingMutations";
import {
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
} from "../../procurement/constants/vendorOnboarding";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { useCreateVendorIntake } from "../../vendor-intake/hooks/useVendorIntakeMutations";
import { useVendorEngagement } from "../../vendor-intake/hooks/useVendorIntake";
import {
  DUPLICATE_ENGAGEMENT_MESSAGE,
  isDuplicateEngagementError,
} from "../../vendor-intake/constants/vendorIntake";
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

/** Onboarding context captured alongside the vendor details, posted as part of the intake. */
const DEFAULT_ONBOARDING_FORM = {
  department_id: "",
  category_id: "",
  business_requirement: "",
  purpose_of_onboarding: "",
};

const validateForm = (formData, onboarding) => {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!String(formData[field] || "").trim()) {
      errors[field] = "This field is required.";
    }
  });

  if (!onboarding.department_id) errors.department_id = "Department is required.";
  if (!onboarding.category_id) errors.category_id = "Purchase category is required.";

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
};

const GstSummaryRow = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-emerald-100 py-1 last:border-0">
    <span className="text-xs font-medium text-emerald-700">{label}</span>
    <span className="text-xs text-emerald-900">{value || "—"}</span>
  </div>
);

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

/**
 * Route: /accounts-payable/vendors/onboard
 *
 * The single vendor onboarding entry point: Register Vendor (step 1) followed by Pre-Screen
 * (step 2) on the same route. Step 1 keeps the existing vendor fields, GST verification and
 * country-specific sections and adds the Onboarding Details the engagement needs; it saves
 * through POST /apm/vendor-intake, which creates or reuses the vendor master itself.
 * POST /apm/vendor is no longer called from here — it stays the Vendor Management update path.
 */
export default function VendorOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { countryOptions, currencyOptions } = useApLookups();

  // Onboarding-request mode: the Vendor Intaker opens this same page from a Vendor Onboarding
  // Request, so the intake form is reused rather than duplicated. The difference is only where
  // it submits (POST /vendor-onboarding-requests/{id}/start instead of POST /apm/vendor-intake)
  // and that the PR context is displayed read-only, because the backend reads department,
  // category, business requirement and purpose from the request itself.
  const onboardingRequestId = searchParams.get("onboardingRequestId");
  const isOnboardingRequestMode = Boolean(onboardingRequestId);

  const {
    data: onboardingRequest,
    isLoading: onboardingRequestLoading,
    isError: onboardingRequestError,
    error: onboardingRequestErrorObj,
    refetch: refetchOnboardingRequest,
  } = useOnboardingRequest(onboardingRequestId);
  const [formData, setFormData] = useState(DEFAULT_VENDOR_FORM);
  const [onboarding, setOnboarding] = useState(DEFAULT_ONBOARDING_FORM);
  const [addressData, setAddressData] = useState(DEFAULT_ADDRESS_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null); // { message, isDuplicate }

  const [hasRegistrationNumber, setHasRegistrationNumber] = useState("no");
  const [gstin, setGstin] = useState("");
  const [gstStatus, setGstStatus] = useState("idle"); // idle | verifying | verified | error
  const [gstError, setGstError] = useState("");
  const [gstMapped, setGstMapped] = useState(null); // { vendorFields, addressFields }

  // Set once the intake is saved — switches this page to the Pre-Screen step and, together
  // with the ref below, makes a second submit impossible.
  const [engagementId, setEngagementId] = useState(null);
  const [intakeResult, setIntakeResult] = useState(null);
  const savedRef = useRef(false);

  // Country-specific (non-India) vendor fields — Brazil/US/UK/Other, config-driven.
  // Kept separate from `formData` since none of these map to a backend column yet.
  const [countryFields, setCountryFields] = useState({});
  const [countryFieldErrors, setCountryFieldErrors] = useState({});
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState("idle"); // idle | verifying | verified | error
  const [cpfCnpjError, setCpfCnpjError] = useState("");

  const createIntakeMutation = useCreateVendorIntake();
  const startOnboardingMutation = useStartOnboarding(onboardingRequestId, onboardingRequest?.pr_id);

  // One submit handler, two endpoints — whichever mode the page is in.
  const activeSubmitMutation = isOnboardingRequestMode
    ? startOnboardingMutation
    : createIntakeMutation;

  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsError,
  } = useDepartments();

  // Purchase Category depends on Department — scoped server-side through the existing
  // department_id filter on GET /master/purchase-categories, never fetched-all-and-filtered.
  const selectedDepartmentId = onboarding.department_id
    ? Number(onboarding.department_id)
    : undefined;
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = usePurchaseCategoriesByDepartment(selectedDepartmentId);

  // Step 2 reads the saved engagement so the NDA decision and stored verdict survive a re-run.
  const {
    data: engagement,
    isLoading: engagementLoading,
    isError: engagementError,
    error: engagementLoadError,
    refetch: refetchEngagement,
  } = useVendorEngagement(engagementId);

  const countryKind = getCountryKind(countryOptions, formData.country_id);
  const countryLabel = getCountryLabel(countryOptions, formData.country_id);
  const isIndiaOrUnselected = countryKind === null || countryKind === COUNTRY_KIND.INDIA;
  const isGstRegistered = hasRegistrationNumber === "yes";

  // Only active masters are offered — same filter the PR create form applies.
  const departmentOptions = departments
    .filter((d) => d.is_active)
    .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));
  const categoryOptions = categories
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));

  const departmentPlaceholder = departmentsLoading
    ? "Loading departments..."
    : departmentsError
      ? "Unable to load departments"
      : departmentOptions.length === 0
        ? "No active departments available"
        : "Select department";

  const categoryPlaceholder = !selectedDepartmentId
    ? "Select department first"
    : categoriesLoading
      ? "Loading categories..."
      : categoriesError
        ? "Unable to load purchase categories"
        : categoryOptions.length === 0
          ? "No active categories for this department"
          : "Select category";

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
    setSubmitError(null);
  };

  const handleOnboardingChange = (e) => {
    const { name, value } = e.target;

    setOnboarding((prev) => ({
      ...prev,
      [name]: value,
      // Changing the department invalidates whichever category was picked for the old one.
      ...(name === "department_id" ? { category_id: "" } : {}),
    }));

    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError(null);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
    setSubmitError(null);
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
    setSubmitError(null);
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
      const indiaId = findIndiaCountryId(countryOptions);

      setFormData((prev) => ({
        ...prev,
        // Preview only: on a GST-registered intake the backend takes the vendor name, PAN
        // and registered address from the GST response itself.
        vendor_name: vendorFields.vendor_name || prev.vendor_name,
        pan_number: vendorFields.pan_number || prev.pan_number,
        currency_id: 1, // Default to INR for GST-verified vendors
        country_id: indiaId || prev.country_id,
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

  const isGstGateBlocking = isGstRegistered && gstStatus !== "verified";

  /** Exactly VendorIntakeCreateRequest (Backend/API_Layer/interface/vendor_intake_interface.py). */
  const buildIntakePayload = () => ({
    department_id: Number(onboarding.department_id),
    category_id: Number(onboarding.category_id),
    business_requirement: onboarding.business_requirement.trim() || null,
    purpose_of_onboarding: onboarding.purpose_of_onboarding.trim() || null,

    gst_registered: isGstRegistered,
    gstin: isGstRegistered ? gstin.trim().toUpperCase() : null,

    // With gst_registered true the backend fills the vendor name, PAN and registered address
    // from the GST response and ignores anything sent for them here.
    vendor_name: isGstRegistered ? null : formData.vendor_name.trim(),
    pan_number: isGstRegistered ? null : formData.pan_number?.trim() || null,

    country_id: Number(formData.country_id),
    payment_term_id: formData.payment_term_id ? Number(formData.payment_term_id) : null,
    currency_id: formData.currency_id ? Number(formData.currency_id) : null,
    phone_number: formData.phone_number?.trim() || null,
    email: formData.email?.trim() || null,

    address_line1: isGstRegistered ? null : addressData.address_line1?.trim() || null,
    address_line2: isGstRegistered ? null : addressData.address_line2?.trim() || null,
    city: isGstRegistered ? null : addressData.city?.trim() || null,
    state: isGstRegistered ? null : addressData.state?.trim() || null,
    postal_code: isGstRegistered ? null : addressData.postal_code?.trim() || null,
  });

  /**
   * Exactly VendorOnboardingStartRequest — vendor identity only. Department, category,
   * business requirement and purpose are deliberately absent: the backend takes them from the
   * onboarding request so the onboarding context can never drift from the PR it belongs to.
   */
  const buildOnboardingStartPayload = () => {
    const payload = buildIntakePayload();

    delete payload.department_id;
    delete payload.category_id;
    delete payload.business_requirement;
    delete payload.purpose_of_onboarding;

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (savedRef.current || activeSubmitMutation.isPending) return;

    // In onboarding-request mode the department/category come from the request, so they are
    // not part of this form's validation.
    const nextErrors = validateForm(
      formData,
      isOnboardingRequestMode
        ? { department_id: "skip", category_id: "skip" }
        : onboarding,
    );
    setErrors(nextErrors);

    const nextCountryFieldErrors = validateCountryFields(countryKind, countryFields);
    setCountryFieldErrors(nextCountryFieldErrors);

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextCountryFieldErrors).length > 0) return;

    if (isIndiaOrUnselected && isGstGateBlocking) {
      toast.warning("Please verify the GSTIN before registering.");
      return;
    }

    setSubmitError(null);

    try {
      const result = isOnboardingRequestMode
        ? await startOnboardingMutation.mutateAsync(buildOnboardingStartPayload())
        : await createIntakeMutation.mutateAsync(buildIntakePayload());

      savedRef.current = true;
      setIntakeResult(result);
      setEngagementId(result.engagement_id);

      if (isOnboardingRequestMode) {
        // The request row now carries vendor_id/engagement_id and has moved on a status.
        refetchOnboardingRequest();
        toast.success(result?.message || "Vendor intake completed for this onboarding request.");
      } else {
        toast.success(result?.message || "Vendor registered. Running Pre-Screen checks.");
      }
    } catch (error) {
      const duplicate = isDuplicateEngagementError(error);
      const message = duplicate
        ? DUPLICATE_ENGAGEMENT_MESSAGE
        : getApiErrorMessage(
            error,
            isOnboardingRequestMode
              ? "Failed to complete the vendor intake for this request."
              : "Failed to register vendor.",
          );

      setSubmitError({ message, isDuplicate: duplicate });
      toast.error(duplicate ? "Duplicate engagement." : message);
    }
  };

  // In onboarding-request mode the request itself says whether intake already ran (a previous
  // visit may have completed it), so the step doesn't depend on this session's state alone.
  const isPreScreenStep = Boolean(engagementId) || Boolean(onboardingRequest?.engagement_id);

  // ── Onboarding-request mode: request must load before the form is meaningful ──
  if (isOnboardingRequestMode && onboardingRequestLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading the vendor onboarding request..." />
      </div>
    );
  }

  if (isOnboardingRequestMode && onboardingRequestError) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title="Vendor Onboarding" />
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>
            {getApiErrorMessage(
              onboardingRequestErrorObj,
              "Failed to load this vendor onboarding request.",
            )}
          </p>
          <Button variant="outline" size="small" onClick={() => refetchOnboardingRequest()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 sm:p-6">
      <PageHeader
        title={isOnboardingRequestMode ? "Vendor Onboarding" : "Register Vendor"}
        subtitle={
          isOnboardingRequestMode
            ? `Onboarding request #${onboardingRequest?.id} for purchase requisition #${onboardingRequest?.pr_id} — complete the intake, Pre-Screen and any NDA.`
            : "Capture the vendor and onboarding details, then run the Pre-Screen checks."
        }
      />

      <VendorIntakeStepper currentStep={isPreScreenStep ? 1 : 0} />

      {/* PR context carried by the onboarding request — read-only, since the backend reads
          department, category, requirement and purpose from the request itself. */}
      {isOnboardingRequestMode && onboardingRequest && (
        <PageCard>
          <PageCardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={Fonts.subheading}>Onboarding Request Context</h2>
              <StatusPill
                label={
                  ONBOARDING_STATUS_LABEL[onboardingRequest.status_code] ||
                  onboardingRequest.status_code ||
                  "—"
                }
                tone={ONBOARDING_STATUS_TONE[onboardingRequest.status_code] || "neutral"}
                size="md"
              />
            </div>

            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {[
                { label: "Purchase Requisition", value: `#${onboardingRequest.pr_id}` },
                {
                  label: "Department",
                  value:
                    departments.find((d) => d.id === onboardingRequest.department_id)?.name ||
                    `#${onboardingRequest.department_id}`,
                },
                {
                  label: "Purchase Category",
                  value: `#${onboardingRequest.purchase_category_id}`,
                },
                { label: "Assigned To", value: onboardingRequest.assigned_to || "Unassigned" },
                {
                  label: "Requested Vendor",
                  value: onboardingRequest.requested_vendor_name || "—",
                },
                {
                  label: "Requested Vendor Email",
                  value: onboardingRequest.requested_vendor_email || "—",
                },
                {
                  label: "Business Requirement",
                  value: onboardingRequest.business_requirement || "—",
                },
                {
                  label: "Purpose of Onboarding",
                  value: onboardingRequest.purpose_of_onboarding || "—",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 border-b border-gray-100 py-1.5 last:border-0"
                >
                  <dt className="text-xs text-gray-500">{row.label}</dt>
                  <dd className="text-xs font-medium text-gray-900 sm:max-w-[60%] sm:text-right">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </PageCardContent>
        </PageCard>
      )}

      {/* ── Step 2: onboarding workspace (Pre-Screen -> NDA -> Complete) ── */}
      {isOnboardingRequestMode && isPreScreenStep ? (
        <VendorOnboardingProcessPanel
          request={onboardingRequest}
          onCompleted={() => {
            refetchOnboardingRequest();
            navigate(AP_ROUTES.PROCUREMENT_PR_DETAIL(onboardingRequest.pr_id));
          }}
        />
      ) : isPreScreenStep ? (
        <>
          {engagementLoading && <LoadingSpinner text="Loading the saved vendor intake..." />}

          {engagementError && !engagementLoading && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{getApiErrorMessage(engagementLoadError, "Failed to load this vendor intake.")}</p>
              <Button type="button" variant="outline" size="small" onClick={() => refetchEngagement()}>
                Try again
              </Button>
            </div>
          )}

          {engagement && !engagementLoading && !engagementError && (
            <PageCard>
              <PageCardContent className="space-y-4 p-4 sm:p-5">
                <PreScreenPanel
                  engagementId={engagementId}
                  engagement={engagement}
                  intakeResult={intakeResult}
                  onRefreshEngagement={refetchEngagement}
                  onContinue={() => navigate(AP_ROUTES.VENDOR_DETAIL(engagement.vendor_id))}
                />
              </PageCardContent>
            </PageCard>
          )}
        </>
      ) : (
        /* ── Step 1: Register Vendor ──────────────────────────────────── */
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
                  <legend className="text-sm text-gray-700">
                    Does this vendor have a registration number (GSTIN)?
                  </legend>
                  <div className="flex gap-6">
                    {[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
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

                {isGstRegistered ? (
                  <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
                        className="w-full sm:w-auto"
                      >
                        Verify GSTIN
                      </Button>
                    </div>

                    {gstStatus === "error" && (
                      <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <div className="text-xs text-rose-700">
                          <p className="font-semibold">GST Verification Failed</p>
                          <p className="mt-0.5">{gstError}</p>
                        </div>
                      </div>
                    )}

                    {gstStatus === "verified" && gstMapped && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          GST Verification Details
                        </p>
                        <GstSummaryRow label="GST Status" value={gstMapped.vendorFields.gst_status} />
                        <GstSummaryRow label="Legal Name" value={gstMapped.vendorFields.legal_name} />
                        <GstSummaryRow label="Trade Name" value={gstMapped.vendorFields.trade_name} />
                        <GstSummaryRow label="Tax Type" value={gstMapped.vendorFields.tax_type} />
                        <GstSummaryRow
                          label="Business Type"
                          value={gstMapped.vendorFields.business_type}
                        />
                        <GstSummaryRow
                          label="Registered Address"
                          value={[
                            gstMapped.addressFields.address_line1,
                            gstMapped.addressFields.address_line2,
                            gstMapped.addressFields.city,
                            gstMapped.addressFields.state,
                            gstMapped.addressFields.postal_code,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        />
                        <p className="mt-2 text-xs text-emerald-700">
                          The vendor name, PAN and registered address are taken from this GST
                          record when the vendor is registered.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">GST Not Registered.</span> No
                    GSTIN is recorded for this vendor — enter the vendor details and address
                    manually below.
                  </p>
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
                    <GstSummaryRow
                      label="Logradouro"
                      value={`${countryFields.street}, ${countryFields.number}`}
                    />
                    <GstSummaryRow label="Bairro" value={countryFields.neighborhood} />
                    <GstSummaryRow
                      label="City / UF"
                      value={`${countryFields.city} / ${countryFields.state}`}
                    />
                    <p className="mt-2 text-xs text-emerald-700">
                      Vendor Name and the address fields below were auto-filled from this mock
                      verification.
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
                // vendor_code is always generated by the backend on this flow —
                // VendorIntakeCreateRequest has no vendor_code field.
                disabledFields={
                  isGstGateBlocking
                    ? ["vendor_name", "pan_number", "vendor_code"]
                    : ["vendor_code"]
                }
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
            </PageCardContent>
          </PageCard>

          {/* Address — the backend builds it from the GST record when GST registered. */}
          {!isGstRegistered && (
            <PageCard>
              <PageCardContent className="space-y-4">
                <h2 className={Fonts.subheading}>Address</h2>
                <p className="text-xs text-gray-500">
                  Saved as the vendor's registered address when both Address Line 1 and City are
                  provided. The Basic Eligibility pre-screen check looks for one.
                </p>
                <VendorAddressForm
                  formData={addressData}
                  errors={errors}
                  onChange={handleAddressChange}
                  variant="intake"
                />
              </PageCardContent>
            </PageCard>
          )}

          {/* Editable only when raising a fresh registration — in onboarding-request mode
              these come from the request and are shown read-only above. */}
          {!isOnboardingRequestMode && (
          <PageCard>
            <PageCardContent className="space-y-4">
              <h2 className={Fonts.subheading}>Onboarding Details</h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FormSelect
                    label="Department *"
                    name="department_id"
                    value={onboarding.department_id}
                    onChange={handleOnboardingChange}
                    options={departmentOptions}
                    placeholder={departmentPlaceholder}
                  />
                  <FieldError message={errors.department_id} />
                  {departmentsError && (
                    <p className="mt-1 text-xs text-red-500">Unable to load departments.</p>
                  )}
                </div>

                <div>
                  <FormSelect
                    label="Purchase Category *"
                    name="category_id"
                    value={onboarding.category_id}
                    onChange={handleOnboardingChange}
                    options={categoryOptions}
                    placeholder={categoryPlaceholder}
                  />
                  <FieldError message={errors.category_id} />
                  {categoriesError && (
                    <p className="mt-1 text-xs text-red-500">
                      Unable to load purchase categories.
                    </p>
                  )}
                </div>
              </div>

              <FormTextArea
                label="Business Requirement"
                name="business_requirement"
                value={onboarding.business_requirement}
                onChange={handleOnboardingChange}
                placeholder="What is this vendor needed for?"
                rows={3}
              />

              <FormTextArea
                label="Purpose of Onboarding"
                name="purpose_of_onboarding"
                value={onboarding.purpose_of_onboarding}
                onChange={handleOnboardingChange}
                placeholder="Optional — why this vendor specifically?"
                rows={3}
              />
            </PageCardContent>
          </PageCard>
          )}

          {submitError && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                submitError.isDuplicate
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  {submitError.isDuplicate
                    ? "Duplicate Engagement"
                    : isOnboardingRequestMode
                      ? "Could not save the vendor intake"
                      : "Could not register vendor"}
                </p>
                <p className="mt-0.5">{submitError.message}</p>
              </div>
            </div>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  isOnboardingRequestMode && onboardingRequest?.pr_id
                    ? AP_ROUTES.PROCUREMENT_PR_DETAIL(onboardingRequest.pr_id)
                    : AP_ROUTES.VENDOR_LIST,
                )
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={activeSubmitMutation.isPending}
              loadingText={isOnboardingRequestMode ? "Saving intake..." : "Registering..."}
              disabled={isGstGateBlocking || savedRef.current}
              className="w-full sm:w-auto"
            >
              {isOnboardingRequestMode ? "Save Vendor Intake" : "Register Vendor"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
