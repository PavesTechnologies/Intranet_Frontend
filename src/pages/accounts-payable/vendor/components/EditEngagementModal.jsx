import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";

import { getApiErrorMessage } from "../../utils/apiError";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import {
  useUpdateVendorEngagement,
  useUpdateNdaDecision,
} from "../../vendor-intake/hooks/useVendorIntakeMutations";
import {
  buildEngagementUpdatePayload,
  effectiveNdaRequired,
  isEngagementConflictError,
  DUPLICATE_ENGAGEMENT_MESSAGE,
} from "../../vendor-intake/constants/vendorIntake";

const YES = "yes";
const NO = "no";

/** The form's NDA radio value for the requirement that stands today ("" while undecided). */
const ndaFormValue = (engagement) => {
  const required = effectiveNdaRequired(engagement);
  if (required === null || required === undefined) return "";
  return required ? YES : NO;
};

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertTriangle className="h-3.5 w-3.5" /> {message}
    </p>
  ) : null;

/**
 * Edit Engagement — Vendor Details > Vendor Engagements > Edit.
 *
 * Two endpoints, deliberately kept apart, because the backend keeps them apart:
 *  1. PUT /apm/vendor-intake/{engagement_id} carries ONLY the changed department / category /
 *     purpose. It is a partial update, so unchanged fields are omitted and a cleared purpose is
 *     sent as an explicit null (see buildEngagementUpdatePayload).
 *  2. A changed NDA requirement goes separately to the EXISTING
 *     PATCH /apm/vendor-intake/{engagement_id}/nda-decision, with the override reason the
 *     backend requires. No NDA rule is re-implemented here — the same hook NdaDecisionPanel
 *     uses is called, and the resulting requirement is whatever the backend returns.
 *
 * @param {{ isOpen: boolean, engagement: object|null, vendorId: string|number,
 *   onClose: () => void, onSaved?: () => void }} props
 */
export default function EditEngagementModal({ isOpen, engagement, vendorId, onClose, onSaved }) {
  const [form, setForm] = useState({
    department_id: "",
    category_id: "",
    purpose_of_onboarding: "",
    nda_required: "",
    nda_override_reason: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  // Guards a second save while the first is still in flight — the mutations' isPending covers
  // the buttons, but this also blocks a double submit fired before React re-renders.
  const submittingRef = useRef(false);

  const engagementId = engagement?.engagement_id;

  const updateEngagementMutation = useUpdateVendorEngagement(engagementId, vendorId);
  const updateNdaMutation = useUpdateNdaDecision(engagementId, vendorId);

  const isSaving = updateEngagementMutation.isPending || updateNdaMutation.isPending;

  // Re-seed the form whenever a different engagement is opened, so the modal always starts from
  // the engagement's current server values rather than the previous row's edits.
  useEffect(() => {
    if (!isOpen || !engagement) return;

    setForm({
      department_id: engagement.department_id ?? "",
      category_id: engagement.category_id ?? "",
      purpose_of_onboarding: engagement.purpose_of_onboarding || "",
      nda_required: ndaFormValue(engagement),
      nda_override_reason: "",
    });
    setErrors({});
    setSubmitError("");
    submittingRef.current = false;
  }, [isOpen, engagement]);

  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsError,
  } = useDepartments();

  // Purchase Category depends on Department — scoped server-side through the existing
  // department_id filter on GET /master/purchase-categories, the same way the onboarding form
  // does it, never fetched-all-then-filtered in the browser.
  const selectedDepartmentId = form.department_id ? Number(form.department_id) : undefined;
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = usePurchaseCategoriesByDepartment(selectedDepartmentId);

  const departmentOptions = departments.map((d) => ({ value: d.id, label: d.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const categoryPlaceholder = !form.department_id
    ? "Select a department first"
    : categoriesLoading
      ? "Loading categories..."
      : categoryOptions.length === 0
        ? "No categories for this department"
        : "Select";

  // What the NDA requirement is today, and therefore whether the user has changed it.
  const currentNda = ndaFormValue(engagement);
  const ndaChanged = form.nda_required !== "" && form.nda_required !== currentNda;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      // A different department has a different set of categories — drop the stale selection
      // rather than submitting a category that no longer belongs to the department.
      ...(name === "department_id" ? { category_id: "" } : {}),
    }));

    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.department_id) nextErrors.department_id = "Department is required.";
    if (!form.category_id) nextErrors.category_id = "Purchase category is required.";

    // The backend rejects an override with no reason (422); asking here keeps that round trip
    // from being the first time the user hears about it.
    if (ndaChanged && !form.nda_override_reason.trim()) {
      nextErrors.nda_override_reason =
        "A reason is required when the NDA decision is changed.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const describeError = (error, fallback) => {
    if (isEngagementConflictError(error)) return DUPLICATE_ENGAGEMENT_MESSAGE;
    if (error?.response?.status === 404) {
      return "This engagement no longer exists. Refresh the page and try again.";
    }
    // 422 (inactive department/category, category outside the department, missing override
    // reason) arrives with the backend's own explanation — show it rather than a generic line.
    return getApiErrorMessage(error, fallback);
  };

  const handleSave = async () => {
    if (submittingRef.current || isSaving) return;
    if (!validate()) return;

    const payload = buildEngagementUpdatePayload(form, engagement);
    const hasScopeChange = Object.keys(payload).length > 0;

    if (!hasScopeChange && !ndaChanged) {
      toast.info("No changes to save.");
      onClose();
      return;
    }

    submittingRef.current = true;
    setSubmitError("");

    try {
      if (hasScopeChange) {
        await updateEngagementMutation.mutateAsync(payload);
      }
    } catch (error) {
      submittingRef.current = false;
      setSubmitError(describeError(error, "Failed to update the engagement."));
      return;
    }

    if (ndaChanged) {
      try {
        // The recorded decision is an explicit override, which is why the reason is mandatory.
        await updateNdaMutation.mutateAsync({
          overrideRequired: form.nda_required === YES,
          reason: form.nda_override_reason.trim(),
        });
      } catch (error) {
        submittingRef.current = false;
        // The scope change (if any) already went through — say so instead of implying the
        // whole save was rolled back.
        setSubmitError(
          `${hasScopeChange ? "The engagement was updated, but the NDA decision was not saved. " : ""}${describeError(
            error,
            "Failed to record the NDA decision.",
          )}`,
        );
        onSaved?.();
        return;
      }
    }

    submittingRef.current = false;
    toast.success("Engagement updated.");
    onSaved?.();
    onClose();
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Engagement"
      subtitle="Department, purchase category, purpose and the NDA requirement for this engagement."
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving} loadingText="Saving...">
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {submitError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FormSelect
              label="Department *"
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              options={departmentOptions}
              placeholder={departmentsLoading ? "Loading departments..." : "Select"}
            />
            <FieldError message={errors.department_id} />
            {departmentsError ? (
              <p className="mt-1 text-xs text-red-500">Unable to load departments.</p>
            ) : null}
          </div>

          <div>
            <FormSelect
              label="Purchase Category *"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              options={categoryOptions}
              placeholder={categoryPlaceholder}
            />
            <FieldError message={errors.category_id} />
            {categoriesError ? (
              <p className="mt-1 text-xs text-red-500">Unable to load purchase categories.</p>
            ) : null}
          </div>
        </div>

        <div>
          <FormTextArea
            label="Purpose of Onboarding"
            name="purpose_of_onboarding"
            value={form.purpose_of_onboarding}
            onChange={handleChange}
            placeholder="Why is this vendor being onboarded for this department and category?"
            rows={3}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave this empty to clear the purpose recorded on the engagement.
          </p>
        </div>

        <fieldset className="space-y-2 border-t border-gray-100 pt-4">
          <legend className="text-sm font-medium text-gray-700">NDA Required</legend>

          <div className="flex gap-6">
            {[
              { value: YES, label: "Yes" },
              { value: NO, label: "No" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="nda_required"
                  value={option.value}
                  checked={form.nda_required === option.value}
                  onChange={handleChange}
                  className="h-4 w-4 border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
                />
                {option.label}
              </label>
            ))}
          </div>

          {ndaChanged ? (
            <div className="pt-2">
              <FormTextArea
                label="Override Reason *"
                name="nda_override_reason"
                value={form.nda_override_reason}
                onChange={handleChange}
                placeholder="Why is the NDA requirement being changed?"
                rows={3}
              />
              <FieldError message={errors.nda_override_reason} />
              <p className="mt-1 text-xs text-gray-500">
                Saved through the NDA decision endpoint, separately from the changes above.
              </p>
            </div>
          ) : null}
        </fieldset>
      </div>
    </Modal>
  );
}
