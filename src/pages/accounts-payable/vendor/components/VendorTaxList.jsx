import React, { useState } from "react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { getApiErrorMessage } from "../../utils/apiError";
import VendorTaxForm, { DEFAULT_TAX_FORM } from "./VendorTaxForm";
import { useCreateTax, useUpdateTax, useDeleteTax } from "../hooks/useVendorMutations";

const validateTaxForm = (formData) => {
  const errors = {};
  if (!formData.registration_type?.trim()) errors.registration_type = "This field is required.";
  if (!formData.registration_number?.trim()) errors.registration_number = "This field is required.";
  return errors;
};

/**
 * Tax registrations (GST/PAN/VAT/etc.) for a single vendor address.
 * `is_verified` is backend-managed and shown read-only.
 */
const VendorTaxList = ({ vendorId, address }) => {
  const taxes = address.vendor_tax || [];

  const [modalTarget, setModalTarget] = useState(null); // { tax } | { tax: null } for add | null
  const [formData, setFormData] = useState(DEFAULT_TAX_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createMutation = useCreateTax(vendorId);
  const updateMutation = useUpdateTax(vendorId);
  const deleteMutation = useDeleteTax(vendorId);

  const openAdd = () => {
    setFormData(DEFAULT_TAX_FORM);
    setErrors({});
    setModalTarget({ tax: null });
  };

  const openEdit = (tax) => {
    setFormData({ registration_type: tax.registration_type, registration_number: tax.registration_number });
    setErrors({});
    setModalTarget({ tax });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateTaxForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      registration_type: formData.registration_type.trim().toUpperCase(),
      registration_number: formData.registration_number.trim().toUpperCase(),
    };

    try {
      if (modalTarget.tax) {
        await updateMutation.mutateAsync({
          vendorAddressId: address.vendor_address_id,
          taxId: modalTarget.tax.vendor_tax_id,
          payload,
        });
        showStatusToast("Tax registration updated.", "success");
      } else {
        await createMutation.mutateAsync({ vendorAddressId: address.vendor_address_id, payload });
        showStatusToast("Tax registration added.", "success");
      }
      setModalTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save tax registration."), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        vendorAddressId: address.vendor_address_id,
        taxId: deleteTarget.vendor_tax_id,
      });
      showStatusToast("Tax registration deleted.", "success");
      setDeleteTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete tax registration."), "error");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tax Registrations
        </span>
        <Button size="small" variant="outline" onClick={openAdd}>
          Add Tax
        </Button>
      </div>

      {taxes.length === 0 ? (
        <p className="text-xs italic text-gray-400">No tax registrations added.</p>
      ) : (
        <ul className="space-y-1.5">
          {taxes.map((tax) => (
            <li
              key={tax.vendor_tax_id}
              className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-sm shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium text-gray-700">{tax.registration_type}</span>
                <span className="text-gray-500">{tax.registration_number}</span>
                <StatusBadge label={tax.is_verified ? "Verified" : "Unverified"} size="sm" />
              </span>
              <span className="flex gap-1.5">
                <Button size="small" variant="ghost" onClick={() => openEdit(tax)}>
                  Edit
                </Button>
                <Button size="small" variant="ghost" onClick={() => setDeleteTarget(tax)}>
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={!!modalTarget}
        onClose={() => setModalTarget(null)}
        title={modalTarget?.tax ? "Edit Tax Registration" : "Add Tax Registration"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSaving} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <VendorTaxForm formData={formData} errors={errors} onChange={handleChange} />
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Tax Registration"
        message={`This will permanently remove the ${deleteTarget?.registration_type || ""} registration. Continue?`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default VendorTaxList;
