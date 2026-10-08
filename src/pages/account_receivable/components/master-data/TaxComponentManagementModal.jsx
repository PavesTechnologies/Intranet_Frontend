import React, { useEffect, useState } from "react";
import { Plus, Pencil, Layers, AlertCircle, CheckCircle2, X } from "lucide-react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  addTaxConfigurationComponent,
  updateTaxConfigurationComponent,
  getTaxRateConfigurationById,
  getActiveTaxTypes,
  getApplicabilityLabel,
  getApiErrorMessage,
  APPLICABILITY_LABELS,
} from "../../services/taxRateConfigurationService";

const formatDateValue = (val) => {
  if (!val) return "—";
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return val;
  }
};

const APPLICABILITY_OPTIONS = [
  { value: "SAME_JURISDICTION", label: "Same Jurisdiction (Intra-state / CGST, SGST)" },
  { value: "DIFFERENT_JURISDICTION", label: "Different Jurisdiction (Inter-state / IGST)" },
  { value: "ALL", label: "All Jurisdictions" },
];

export default function TaxComponentManagementModal({
  isOpen,
  onClose,
  configuration,
  region,
  taxTypes: propTaxTypes = [],
  onSaved,
}) {
  const [currentConfig, setCurrentConfig] = useState(configuration);
  const [availableTaxTypes, setAvailableTaxTypes] = useState(propTaxTypes);
  const [loadingTaxTypes, setLoadingTaxTypes] = useState(false);

  // Add component state
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [addFormData, setAddFormData] = useState({
    taxTypeId: "",
    taxRate: "",
    applicabilityType: "SAME_JURISDICTION",
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [savingComponent, setSavingComponent] = useState(false);
  const [addApiError, setAddApiError] = useState("");

  // Edit component state
  const [editingComponent, setEditingComponent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    taxRate: "",
    applicabilityType: "SAME_JURISDICTION",
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editApiError, setEditApiError] = useState("");

  useEffect(() => {
    setCurrentConfig(configuration);
    setIsAddingComponent(false);
    setEditingComponent(null);
    setAddApiError("");
    setEditApiError("");
    setAddFormErrors({});
    setEditFormErrors({});
  }, [configuration, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (propTaxTypes && propTaxTypes.length > 0) {
      setAvailableTaxTypes(propTaxTypes);
    } else {
      setLoadingTaxTypes(true);
      getActiveTaxTypes()
        .then((types) => setAvailableTaxTypes(types || []))
        .catch((err) => {
          console.warn("[TaxComponentManagementModal] Could not fetch tax types:", err?.message);
        })
        .finally(() => setLoadingTaxTypes(false));
    }
  }, [isOpen, propTaxTypes]);

  const components = Array.isArray(currentConfig?.components) ? currentConfig.components : [];

  const refreshConfig = async () => {
    if (!currentConfig?.id) return;
    try {
      const refreshed = await getTaxRateConfigurationById(currentConfig.id);
      if (refreshed) {
        setCurrentConfig(refreshed);
        onSaved?.(refreshed);
      }
    } catch (err) {
      console.warn("[TaxComponentManagementModal] Could not refresh configuration:", err?.message);
    }
  };

  // --- Add Component Handlers ---
  const handleOpenAdd = () => {
    setEditingComponent(null);
    setEditApiError("");
    setAddApiError("");
    setAddFormData({
      taxTypeId: "",
      taxRate: "",
      applicabilityType: "SAME_JURISDICTION",
    });
    setAddFormErrors({});
    setIsAddingComponent(true);
  };

  const handleCancelAdd = () => {
    setIsAddingComponent(false);
    setAddApiError("");
    setAddFormErrors({});
  };

  const validateAddForm = () => {
    const errors = {};
    if (!addFormData.taxTypeId) {
      errors.taxTypeId = "Please select a tax type";
    } else {
      // Prevent duplicate tax types within the same configuration
      const alreadyExists = components.some(
        (c) => String(c.taxTypeId).toLowerCase() === String(addFormData.taxTypeId).toLowerCase()
      );
      if (alreadyExists) {
        errors.taxTypeId = "This tax type is already configured in this configuration.";
      }
    }

    if (addFormData.taxRate === "" || addFormData.taxRate === null || addFormData.taxRate === undefined) {
      errors.taxRate = "Tax rate is required";
    } else {
      const num = Number(addFormData.taxRate);
      if (isNaN(num)) {
        errors.taxRate = "Tax rate must be a valid number";
      } else if (num < 0) {
        errors.taxRate = "Tax rate cannot be negative";
      } else if (num > 100) {
        errors.taxRate = "Tax rate cannot exceed 100%";
      }
    }

    if (!addFormData.applicabilityType) {
      errors.applicabilityType = "Applicability type is required";
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveComponent = async (e) => {
    e?.preventDefault?.();
    setAddApiError("");
    if (!validateAddForm()) return;

    setSavingComponent(true);
    try {
      await addTaxConfigurationComponent(currentConfig.id, {
        taxTypeId: addFormData.taxTypeId,
        taxRate: Number(addFormData.taxRate),
        applicabilityType: addFormData.applicabilityType,
      });

      showStatusToast("Tax component added successfully.", "success");
      setIsAddingComponent(false);
      await refreshConfig();
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to add tax component.");
      setAddApiError(msg);
      showStatusToast(msg, "error");
    } finally {
      setSavingComponent(false);
    }
  };

  // --- Edit Component Handlers ---
  const handleOpenEdit = (comp) => {
    setIsAddingComponent(false);
    setAddApiError("");
    setEditApiError("");
    setEditingComponent(comp);
    setEditFormData({
      taxRate: comp.taxRate !== undefined && comp.taxRate !== null ? String(comp.taxRate) : "",
      applicabilityType: comp.applicabilityType || "SAME_JURISDICTION",
    });
    setEditFormErrors({});
  };

  const handleCancelEdit = () => {
    setEditingComponent(null);
    setEditApiError("");
    setEditFormErrors({});
  };

  const validateEditForm = () => {
    const errors = {};
    if (editFormData.taxRate === "" || editFormData.taxRate === null || editFormData.taxRate === undefined) {
      errors.taxRate = "Tax rate is required";
    } else {
      const num = Number(editFormData.taxRate);
      if (isNaN(num)) {
        errors.taxRate = "Tax rate must be a valid number";
      } else if (num < 0) {
        errors.taxRate = "Tax rate cannot be negative";
      } else if (num > 100) {
        errors.taxRate = "Tax rate cannot exceed 100%";
      }
    }

    if (!editFormData.applicabilityType) {
      errors.applicabilityType = "Applicability type is required";
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault?.();
    setEditApiError("");
    if (!validateEditForm()) return;

    setSavingEdit(true);
    try {
      const updated = await updateTaxConfigurationComponent(currentConfig, editingComponent.id || editingComponent.taxTypeId, {
        taxRate: Number(editFormData.taxRate),
        applicabilityType: editFormData.applicabilityType,
      });

      showStatusToast("Tax component updated successfully.", "success");
      setEditingComponent(null);
      setCurrentConfig(updated);
      onSaved?.(updated);
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to update tax component.");
      setEditApiError(msg);
      showStatusToast(msg, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const regionName = region?.taxRegionName || currentConfig?.taxRegionName || "Tax Region";
  const regionCode = region?.taxRegionCode || currentConfig?.taxRegionCode || "";
  const regionLabel = regionCode && regionCode !== regionName ? `${regionName} (${regionCode})` : regionName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Tax Components"
      subtitle={`Configure individual tax components for ${regionLabel} (${currentConfig?.taxRegime || "GST"})`}
      size="2xl"
      footer={
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Configuration Context Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div>
              <span className="block font-semibold uppercase tracking-wider text-slate-400">Tax Region</span>
              <span className="font-semibold text-slate-800">{regionLabel}</span>
            </div>
            <div>
              <span className="block font-semibold uppercase tracking-wider text-slate-400">Tax Regime</span>
              <span className="font-semibold text-slate-800">{currentConfig?.taxRegime || "GST"}</span>
            </div>
            <div>
              <span className="block font-semibold uppercase tracking-wider text-slate-400">Effective Period</span>
              <span className="font-medium text-slate-700">
                {formatDateValue(currentConfig?.effectiveFrom)} — {formatDateValue(currentConfig?.effectiveTo)}
              </span>
            </div>
            <div>
              <span className="block font-semibold uppercase tracking-wider text-slate-400">Status</span>
              <div className="mt-0.5">
                <StatusBadge label={currentConfig?.status || (currentConfig?.active ? "ACTIVE" : "INACTIVE")} size="sm" />
              </div>
            </div>
          </div>
          {currentConfig?.id && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">Configuration ID:</span>
              <span className="font-mono text-slate-700 select-all">{currentConfig.id}</span>
            </div>
          )}
        </div>

        {/* Section Header & Add Component Button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0A0082]" />
              Configured Tax Components
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                {components.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Individual tax components (CGST, SGST, IGST, etc.) applied for this configuration.
            </p>
          </div>
          {!isAddingComponent && !editingComponent && (
            <Button
              onClick={handleOpenAdd}
              size="small"
              className="flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Component
            </Button>
          )}
        </div>

        {/* Add Component Form Panel */}
        {isAddingComponent && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-indigo-600" /> Add Tax Component
              </h4>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="text-slate-400 hover:text-slate-600"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addApiError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{addApiError}</div>
              </div>
            )}

            <form onSubmit={handleSaveComponent} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="addTaxTypeSelect" className="text-xs font-medium text-slate-700">
                    Tax Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="addTaxTypeSelect"
                    aria-label="Tax Type"
                    value={addFormData.taxTypeId}
                    onChange={(e) => setAddFormData({ ...addFormData, taxTypeId: e.target.value })}
                    disabled={loadingTaxTypes || savingComponent}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                  >
                    <option value="">Select tax type...</option>
                    {availableTaxTypes.map((type) => {
                      const alreadyInConfig = components.some(
                        (c) => String(c.taxTypeId).toLowerCase() === String(type.taxTypeId || type.id).toLowerCase()
                      );
                      return (
                        <option
                          key={type.taxTypeId || type.id}
                          value={type.taxTypeId || type.id}
                          disabled={alreadyInConfig}
                        >
                          {type.taxTypeName} ({type.taxTypeCode}) {alreadyInConfig ? "— Already configured" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {addFormErrors.taxTypeId && (
                    <p className="text-[11px] text-rose-600 font-medium">{addFormErrors.taxTypeId}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <FormInput
                    label="Tax Rate (%)"
                    name="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={addFormData.taxRate}
                    onChange={(e) => setAddFormData({ ...addFormData, taxRate: e.target.value })}
                    placeholder="e.g. 9.00"
                    requiredMark
                    error={addFormErrors.taxRate}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="addApplicabilitySelect" className="text-xs font-medium text-slate-700">
                    Applicability <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="addApplicabilitySelect"
                    aria-label="Applicability"
                    value={addFormData.applicabilityType}
                    onChange={(e) => setAddFormData({ ...addFormData, applicabilityType: e.target.value })}
                    disabled={savingComponent}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                  >
                    {APPLICABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {addFormErrors.applicabilityType && (
                    <p className="text-[11px] text-rose-600 font-medium">{addFormErrors.applicabilityType}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200/60">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleCancelAdd}
                  disabled={savingComponent}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={handleSaveComponent}
                  loading={savingComponent}
                  loadingText="Saving..."
                  className="text-xs font-semibold"
                >
                  Save Component
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Component Form Panel */}
        {editingComponent && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="h-4 w-4 text-amber-600" /> Edit Component: {editingComponent.taxTypeName} ({editingComponent.taxTypeCode})
              </h4>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-slate-600"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editApiError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{editApiError}</div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Tax Type</label>
                  <div className="flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-slate-700">
                    {editingComponent.taxTypeName} ({editingComponent.taxTypeCode})
                  </div>
                </div>

                <div className="space-y-1">
                  <FormInput
                    label="Tax Rate (%)"
                    name="editTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editFormData.taxRate}
                    onChange={(e) => setEditFormData({ ...editFormData, taxRate: e.target.value })}
                    requiredMark
                    error={editFormErrors.taxRate}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Applicability <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.applicabilityType}
                    onChange={(e) => setEditFormData({ ...editFormData, applicabilityType: e.target.value })}
                    disabled={savingEdit}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                  >
                    {APPLICABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {editFormErrors.applicabilityType && (
                    <p className="text-[11px] text-rose-600 font-medium">{editFormErrors.applicabilityType}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={handleSaveEdit}
                  loading={savingEdit}
                  loadingText="Updating..."
                  className="text-xs font-semibold"
                >
                  Update Component
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Components Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Tax Type</th>
                <th className="px-4 py-3 text-right">Tax Rate</th>
                <th className="px-4 py-3">Applicability</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No tax components configured yet for this configuration.
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={handleOpenAdd}
                        className="text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add First Component
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                components.map((comp, idx) => (
                  <tr key={comp.id || comp.taxTypeId || idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{comp.taxTypeName}</span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                          {comp.taxTypeCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {comp.taxRate !== undefined && comp.taxRate !== null ? `${comp.taxRate}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {getApplicabilityLabel(comp.applicabilityType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={comp.status || (comp.isActive ? "ACTIVE" : "INACTIVE")} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        onClick={() => handleOpenEdit(comp)}
                        className="text-xs text-slate-600 hover:text-[#0A0082]"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
