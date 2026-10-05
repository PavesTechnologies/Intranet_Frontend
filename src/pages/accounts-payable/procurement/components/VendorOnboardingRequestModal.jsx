import { useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { getApiErrorMessage } from "../../utils/apiError";
import { useCreateOnboardingRequest } from "../hooks/useVendorOnboardingMutations";

/**
 * Raises a Vendor Onboarding Request for a PR that has no available vendor.
 *
 * Everything the PR already knows — its number, department, purchase category and
 * justification — is carried across automatically: department and purchase category are read
 * from the PR server-side (they are deliberately not accepted in the payload), and the
 * justification pre-fills Business Requirement. The officer only adds what the PR can't say,
 * namely who the vendor is expected to be.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, pr:object, departmentName:string,
 *   categoryName:string, onCreated?:(result:object)=>void }} props
 */
export default function VendorOnboardingRequestModal({
  isOpen,
  onClose,
  pr,
  departmentName,
  categoryName,
  onCreated,
}) {
  const [form, setForm] = useState({
    business_requirement: pr?.justification || "",
    purpose_of_onboarding: "",
    requested_vendor_name: "",
    requested_vendor_email: "",
  });
  const [errors, setErrors] = useState({});

  const createMutation = useCreateOnboardingRequest(pr?.id);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const handleSubmit = async () => {
    if (
      form.requested_vendor_email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requested_vendor_email.trim())
    ) {
      setErrors({ requested_vendor_email: "Enter a valid email address." });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        pr_id: Number(pr.id),
        business_requirement: form.business_requirement.trim() || null,
        purpose_of_onboarding: form.purpose_of_onboarding.trim() || null,
        requested_vendor_name: form.requested_vendor_name.trim() || null,
        requested_vendor_email: form.requested_vendor_email.trim() || null,
      });

      toast.success(result?.message || "Vendor onboarding request created.");
      onCreated?.(result);
      handleClose();
    } catch (err) {
      // 409 from the partial unique index = an open request already exists for this
      // PR + department + category; the backend's message says so precisely.
      toast.error(getApiErrorMessage(err, "Could not create the vendor onboarding request."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Vendor Onboarding Request"
      subtitle="Sends this requisition's vendor requirement to a Vendor Intaker for onboarding."
      size="md"
      closeOnBackdrop={false}
      bodyClassName="max-w-full overflow-x-hidden p-4 sm:p-5"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            loading={createMutation.isPending}
            loadingText="Creating..."
          >
            Create Request
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Carried over from this requisition
          </p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {[
              { label: "Purchase Requisition", value: pr?.pr_number },
              { label: "Department", value: departmentName },
              { label: "Purchase Category", value: categoryName },
              { label: "Requested By", value: "You (current user)" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-3 py-0.5">
                <dt className="text-xs text-gray-500">{row.label}</dt>
                <dd className="text-xs font-medium text-gray-900">{row.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <FormTextArea
          label="Business Requirement"
          name="business_requirement"
          value={form.business_requirement}
          onChange={handleChange}
          placeholder="What is the vendor needed for?"
          rows={3}
        />

        <FormTextArea
          label="Purpose of Onboarding"
          name="purpose_of_onboarding"
          value={form.purpose_of_onboarding}
          onChange={handleChange}
          placeholder="Optional — why this vendor specifically?"
          rows={2}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Requested Vendor Name"
            name="requested_vendor_name"
            value={form.requested_vendor_name}
            onChange={handleChange}
            placeholder="Optional"
          />
          <div>
            <FormInput
              label="Requested Vendor Email"
              name="requested_vendor_email"
              type="email"
              value={form.requested_vendor_email}
              onChange={handleChange}
              placeholder="Optional"
              error={errors.requested_vendor_email}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
