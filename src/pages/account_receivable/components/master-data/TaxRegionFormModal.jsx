import React, { useEffect, useState } from "react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { createTaxRegion, updateTaxRegion, getApiErrorMessage } from "../../services/taxRegionService";

const CODE_MAX_LENGTH = 10;
const NAME_MAX_LENGTH = 100;
const REGIME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 500;

const EMPTY_FORM = { taxRegionCode: "", taxRegionName: "", taxRegime: "", currencyCode: "", description: "" };

/**
 * Create/Edit Tax Region modal, shared by the Tax Configuration master list
 * (create + row-level edit) and the region detail page ("Edit Region").
 */
export default function TaxRegionFormModal({ isOpen, onClose, editingItem, onSaved }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setFormData({
        taxRegionCode: editingItem.taxRegionCode,
        taxRegionName: editingItem.taxRegionName,
        taxRegime: editingItem.taxRegime,
        currencyCode: editingItem.currencyCode,
        description: editingItem.description || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormErrors({});
  }, [isOpen, editingItem]);

  const validateForm = () => {
    const errors = {};
    const code = (formData.taxRegionCode || "").trim();
    const name = (formData.taxRegionName || "").trim();
    const regime = (formData.taxRegime || "").trim();
    const currencyCode = (formData.currencyCode || "").trim();

    if (!code) errors.taxRegionCode = "Tax Region Code is required";
    else if (code.length > CODE_MAX_LENGTH) errors.taxRegionCode = `Must be ${CODE_MAX_LENGTH} characters or fewer`;

    if (!name) errors.taxRegionName = "Tax Region Name is required";
    else if (name.length > NAME_MAX_LENGTH) errors.taxRegionName = `Must be ${NAME_MAX_LENGTH} characters or fewer`;

    if (!regime) errors.taxRegime = "Tax Regime is required";
    else if (regime.length > REGIME_MAX_LENGTH) errors.taxRegime = `Must be ${REGIME_MAX_LENGTH} characters or fewer`;

    if (!currencyCode) errors.currencyCode = "Currency Code is required";
    else if (currencyCode.length > CODE_MAX_LENGTH) errors.currencyCode = `Must be ${CODE_MAX_LENGTH} characters or fewer`;

    if ((formData.description || "").length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      taxRegionCode: formData.taxRegionCode.trim(),
      taxRegionName: formData.taxRegionName.trim(),
      taxRegime: formData.taxRegime.trim(),
      currencyCode: formData.currencyCode.trim(),
      description: (formData.description || "").trim(),
    };

    setSubmitting(true);
    try {
      let saved;
      if (editingItem) {
        saved = await updateTaxRegion(editingItem.taxRegionId, payload);
        showStatusToast("Tax region updated successfully.", "success");
      } else {
        saved = await createTaxRegion(payload);
        showStatusToast("Tax region created successfully.", "success");
      }
      onSaved?.(saved, Boolean(editingItem));
      onClose?.();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save tax region."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "Edit Tax Region" : "Add Tax Region"}
      subtitle={
        editingItem
          ? "Update the details of this tax region."
          : "Create a new tax region for use across billing and receivables."
      }
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmitForm} loading={submitting} loadingText="Saving...">
            {editingItem ? "Update Tax Region" : "Create Tax Region"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Tax Region Code"
            name="taxRegionCode"
            value={formData.taxRegionCode}
            onChange={(e) => setFormData({ ...formData, taxRegionCode: e.target.value })}
            placeholder="e.g. IN-KA"
            requiredMark
            maxLength={CODE_MAX_LENGTH}
            error={formErrors.taxRegionCode}
          />
          <FormInput
            label="Currency Code"
            name="currencyCode"
            value={formData.currencyCode}
            onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
            placeholder="e.g. INR"
            requiredMark
            maxLength={CODE_MAX_LENGTH}
            error={formErrors.currencyCode}
          />
        </div>

        <FormInput
          label="Tax Region Name"
          name="taxRegionName"
          value={formData.taxRegionName}
          onChange={(e) => setFormData({ ...formData, taxRegionName: e.target.value })}
          placeholder="e.g. Karnataka"
          requiredMark
          maxLength={NAME_MAX_LENGTH}
          error={formErrors.taxRegionName}
        />

        <FormInput
          label="Tax Regime"
          name="taxRegime"
          value={formData.taxRegime}
          onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
          placeholder="e.g. GST"
          requiredMark
          maxLength={REGIME_MAX_LENGTH}
          error={formErrors.taxRegime}
        />

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter a short description"
            rows={4}
            maxLength={DESCRIPTION_MAX_LENGTH}
            className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${
              formErrors.description ? "border-red-300 focus:border-red-500" : "border-gray-300"
            }`}
          />
          <div className="flex items-center justify-between">
            {formErrors.description ? (
              <p className="text-xs text-red-500">{formErrors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400">
              {(formData.description || "").length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
