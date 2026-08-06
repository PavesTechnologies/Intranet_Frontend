import React, { useState } from "react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { getApiErrorMessage } from "../../utils/apiError";
import useApLookups from "../../hooks/useApLookups";
import VendorAddressForm, { DEFAULT_ADDRESS_FORM } from "./VendorAddressForm";
import VendorTaxList from "./VendorTaxList";
import { useCreateAddress, useUpdateAddress, useDeleteAddress } from "../hooks/useVendorMutations";

const validateAddressForm = (formData) => {
  const errors = {};
  if (!formData.address_line1?.trim()) errors.address_line1 = "This field is required.";
  if (!formData.city?.trim()) errors.city = "This field is required.";
  if (!formData.country_id) errors.country_id = "This field is required.";
  return errors;
};

const buildAddressPayload = (formData) => ({
  address_type: formData.address_type,
  address_line1: formData.address_line1.trim(),
  address_line2: formData.address_line2?.trim() || null,
  city: formData.city.trim(),
  state: formData.state?.trim() || null,
  postal_code: formData.postal_code?.trim() || null,
  country_id: Number(formData.country_id),
  is_primary: !!formData.is_primary,
});

const VendorAddressList = ({ vendorId, addresses = [] }) => {
  const { countries } = useApLookups();
  const countryNameById = new Map(countries.map((c) => [c.country_id, c.country_name]));

  const [modalTarget, setModalTarget] = useState(null); // { address: null | address }
  const [formData, setFormData] = useState(DEFAULT_ADDRESS_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createMutation = useCreateAddress(vendorId);
  const updateMutation = useUpdateAddress(vendorId);
  const deleteMutation = useDeleteAddress(vendorId);

  const openAdd = () => {
    setFormData(DEFAULT_ADDRESS_FORM);
    setErrors({});
    setModalTarget({ address: null });
  };

  const openEdit = (address) => {
    setFormData({
      address_type: address.address_type,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      state: address.state || "",
      postal_code: address.postal_code || "",
      country_id: address.country_id,
      is_primary: address.is_primary,
    });
    setErrors({});
    setModalTarget({ address });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateAddressForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildAddressPayload(formData);

    try {
      if (modalTarget.address) {
        await updateMutation.mutateAsync({ addressId: modalTarget.address.vendor_address_id, payload });
        showStatusToast("Address updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showStatusToast("Address added.", "success");
      }
      setModalTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save address."), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.vendor_address_id);
      showStatusToast("Address deleted.", "success");
      setDeleteTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete address."), "error");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>Add Address</Button>
      </div>

      {addresses.length === 0 ? (
        <PageCard>
          <PageCardContent className="text-center text-sm italic text-gray-500">
            No addresses added yet.
          </PageCardContent>
        </PageCard>
      ) : (
        addresses.map((address) => (
          <PageCard key={address.vendor_address_id}>
            <PageCardContent className="space-y-3">
              <div className="flex flex-col items-start justify-between gap-2 md:flex-row">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    {address.address_type}
                    {address.is_primary && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ""}, {address.city}
                    {address.state ? `, ${address.state}` : ""} {address.postal_code || ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {countryNameById.get(address.country_id) || `Country #${address.country_id}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="small" variant="outline" onClick={() => openEdit(address)}>
                    Edit
                  </Button>
                  <Button size="small" variant="outline" onClick={() => setDeleteTarget(address)}>
                    Delete
                  </Button>
                </div>
              </div>

              <VendorTaxList vendorId={vendorId} address={address} />
            </PageCardContent>
          </PageCard>
        ))
      )}

      <Modal
        isOpen={!!modalTarget}
        onClose={() => setModalTarget(null)}
        title={modalTarget?.address ? "Edit Address" : "Add Address"}
        size="lg"
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
        <VendorAddressForm formData={formData} errors={errors} onChange={handleChange} />
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Address"
        message="This will permanently remove this address and its tax registrations. Continue?"
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default VendorAddressList;
