import React, { useEffect, useState } from "react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  createTaxRateConfiguration,
  updateTaxRateConfiguration,
  getApiErrorMessage,
} from "../../services/taxRateConfigurationService";

const buildDefaultForm = (region) => ({
  taxRegime: region?.taxRegime || "GST",
  cgstRate: "0",
  sgstRate: "0",
  igstRate: "0",
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: "",
  active: true,
});

/**
 * Create/Edit Tax Rule modal, scoped to a single tax region (the region
 * detail page is the only place a tax rule is created/edited now, so the
 * region is always known from context and is shown read-only rather than
 * asked for again).
 */
export default function TaxRuleFormModal({ isOpen, onClose, region, editingConfig, onSaved }) {
  const [formData, setFormData] = useState(() => buildDefaultForm(region));
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingConfig) {
      let cgstVal = editingConfig.cgstRate !== null && editingConfig.cgstRate !== undefined ? String(editingConfig.cgstRate) : "";
      let sgstVal = editingConfig.sgstRate !== null && editingConfig.sgstRate !== undefined ? String(editingConfig.sgstRate) : "";
      let igstVal = editingConfig.igstRate !== null && editingConfig.igstRate !== undefined ? String(editingConfig.igstRate) : "";

      const cgstNum = Number(cgstVal);
      const sgstNum = Number(sgstVal);
      const igstNum = Number(igstVal);

      if (cgstNum > 0 && sgstNum > 0 && igstNum === 0) {
        igstVal = "";
      }
      if (igstNum > 0 && (cgstNum === 0 || cgstVal === "") && (sgstNum === 0 || sgstVal === "")) {
        cgstVal = "";
        sgstVal = "";
      }

      setFormData({
        taxRegime: editingConfig.taxRegime || "GST",
        cgstRate: cgstVal,
        sgstRate: sgstVal,
        igstRate: igstVal,
        effectiveFrom: editingConfig.effectiveFrom || "",
        effectiveTo: editingConfig.effectiveTo || "",
        active: editingConfig.active,
      });
    } else {
      setFormData(buildDefaultForm(region));
    }
    setFormErrors({});
  }, [isOpen, editingConfig, region]);

  const validateForm = () => {
    const errors = {};

    if (!formData.taxRegime || !formData.taxRegime.trim()) {
      errors.taxRegime = "Tax regime / type is required";
    }

    const parseVal = (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const str = String(val).trim();
      if (str === "") return null;
      const num = Number(str);
      return isNaN(num) ? "INVALID" : num;
    };

    const cgstVal = parseVal(formData.cgstRate);
    const sgstVal = parseVal(formData.sgstRate);
    const igstVal = parseVal(formData.igstRate);

    if (cgstVal === "INVALID") errors.cgstRate = "CGST rate must be a valid number";
    else if (typeof cgstVal === "number" && cgstVal < 0) errors.cgstRate = "Tax rates cannot be negative";

    if (sgstVal === "INVALID") errors.sgstRate = "SGST rate must be a valid number";
    else if (typeof sgstVal === "number" && sgstVal < 0) errors.sgstRate = "Tax rates cannot be negative";

    if (igstVal === "INVALID") errors.igstRate = "IGST rate must be a valid number";
    else if (typeof igstVal === "number" && igstVal < 0) errors.igstRate = "Tax rates cannot be negative";

    const hasCgst = typeof cgstVal === "number" && cgstVal > 0;
    const hasSgst = typeof sgstVal === "number" && sgstVal > 0;
    const hasIgst = typeof igstVal === "number" && igstVal > 0;

    if (hasIgst && (hasCgst || hasSgst)) {
      errors.igstRate = "Cannot configure IGST together with CGST and SGST";
      errors.cgstRate = "Cannot configure IGST together with CGST and SGST";
      errors.sgstRate = "Cannot configure IGST together with CGST and SGST";
    } else if (hasCgst && !hasSgst) {
      errors.sgstRate = "Both CGST and SGST rates are required for CGST+SGST configuration";
    } else if (hasSgst && !hasCgst) {
      errors.cgstRate = "Both CGST and SGST rates are required for CGST+SGST configuration";
    } else if (!hasCgst && !hasSgst && !hasIgst) {
      errors.cgstRate = "Please configure either CGST + SGST rates or IGST rate";
    }

    if (!formData.effectiveFrom) {
      errors.effectiveFrom = "Effective From date is required";
    }

    if (formData.effectiveTo && formData.effectiveFrom) {
      if (formData.effectiveTo < formData.effectiveFrom) {
        errors.effectiveTo = "Effective To cannot be earlier than Effective From";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const parseRatePayload = (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === "") return null;
        const num = Number(str);
        return isNaN(num) || num <= 0 ? null : num;
      };

      const cgstPayload = parseRatePayload(formData.cgstRate);
      const sgstPayload = parseRatePayload(formData.sgstRate);
      const igstPayload = parseRatePayload(formData.igstRate);

      const payload = {
        taxRegionId: region.taxRegionId,
        taxRegionName: region.taxRegionName || "",
        taxRegionCode: region.taxRegionCode || "",
        taxType: formData.taxRegime.trim(),
        taxRegime: formData.taxRegime.trim(),
        cgstRate: cgstPayload,
        sgstRate: sgstPayload,
        igstRate: igstPayload,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        active: formData.active,
        isActive: formData.active,
      };

      let saved;
      if (editingConfig) {
        saved = await updateTaxRateConfiguration(editingConfig.id, payload);
        showStatusToast("Tax rule updated successfully.", "success");
      } else {
        saved = await createTaxRateConfiguration(payload);
        showStatusToast("Tax rule created successfully.", "success");
      }

      onSaved?.(saved, Boolean(editingConfig));
      onClose?.();
    } catch (error) {
      const msg = getApiErrorMessage(error, `Failed to ${editingConfig ? "update" : "create"} tax rule.`);
      showStatusToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const regionLabel = region ? (region.label || `${region.taxRegionName} (${region.taxRegionCode})`) : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingConfig ? "Edit Tax Rule" : "Add Tax Rule"}
      subtitle={
        editingConfig
          ? `Update tax rates and effective range for ${regionLabel}`
          : `Define tax rates and effective period for ${regionLabel}`
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmitForm} loading={submitting} loadingText="Saving...">
            {editingConfig ? "Update Tax Rule" : "Create Tax Rule"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tax Region</label>
            <div className="flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-slate-700">
              {regionLabel}
            </div>
          </div>

          <FormInput
            label="Tax Regime / Type"
            name="taxRegime"
            value={formData.taxRegime}
            onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
            placeholder="e.g. GST"
            requiredMark
            error={formErrors.taxRegime}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormInput
            label="CGST Rate (%)"
            name="cgstRate"
            type="number"
            step="0.01"
            min="0"
            value={formData.cgstRate}
            onChange={(e) => setFormData({ ...formData, cgstRate: e.target.value })}
            placeholder="0.00"
            error={formErrors.cgstRate}
          />

          <FormInput
            label="SGST Rate (%)"
            name="sgstRate"
            type="number"
            step="0.01"
            min="0"
            value={formData.sgstRate}
            onChange={(e) => setFormData({ ...formData, sgstRate: e.target.value })}
            placeholder="0.00"
            error={formErrors.sgstRate}
          />

          <FormInput
            label="IGST Rate (%)"
            name="igstRate"
            type="number"
            step="0.01"
            min="0"
            value={formData.igstRate}
            onChange={(e) => setFormData({ ...formData, igstRate: e.target.value })}
            placeholder="0.00"
            error={formErrors.igstRate}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Effective From"
            name="effectiveFrom"
            type="date"
            value={formData.effectiveFrom}
            onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            requiredMark
            error={formErrors.effectiveFrom}
          />

          <FormInput
            label="Effective To"
            name="effectiveTo"
            type="date"
            value={formData.effectiveTo}
            onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
            error={formErrors.effectiveTo}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="activeCheckbox"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]"
          />
          <label htmlFor="activeCheckbox" className="text-sm font-medium text-slate-700">
            Active Rule
          </label>
        </div>
      </form>
    </Modal>
  );
}
