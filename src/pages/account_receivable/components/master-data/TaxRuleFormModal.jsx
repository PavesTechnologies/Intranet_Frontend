import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  createTaxRateConfiguration,
  updateTaxRateConfiguration,
  getApiErrorMessage,
  getActiveTaxRegions,
  APPLICABILITY_LABELS,
} from "../../services/taxRateConfigurationService";
import { getTaxStructureByRegion } from "../../services/taxStructureService";
import {
  buildComponentValues,
  buildTaxConfigurationPayload,
  findUnmappedConfigComponents,
  getComponentBounds,
  getComponentLabel,
  getInputTypeConfig,
  resolveConfiguredRegime,
  validateComponentValues,
} from "../../utils/taxRuleComponents";

const SELECT_CLASS =
  "w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition bg-white focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 disabled:cursor-not-allowed disabled:bg-gray-100";

const today = () => new Date().toISOString().split("T")[0];

// 1–2 components sit in the same two-column rhythm as the rest of the form;
// more wrap into a three-column grid instead of stretching the modal.
const componentGridClass = (count) =>
  count <= 2 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3";

/**
 * Create/Edit Tax Configuration modal. The fields for tax components are not
 * known up front: they come from the tax structure of the selected region
 * (GET /api/tax-structure/regions/{id}) and are rendered per component
 * metadata, so new regions/regimes/components need no change here.
 *
 * `region` fixes the tax region (region detail page); without it the modal
 * lets the user pick one from the active tax regions.
 */
export default function TaxRuleFormModal({
  isOpen,
  onClose,
  region,
  editingConfig,
  existingConfigs = [],
  onOpenManageExisting,
  onSaved,
}) {
  const [regionOptions, setRegionOptions] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");

  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const forceReloadRef = useRef(false);
  const structureRequestRef = useRef(0);

  const [selectedRegimeId, setSelectedRegimeId] = useState("");
  const [configuredRegimeId, setConfiguredRegimeId] = useState("");
  const [componentValues, setComponentValues] = useState([]);

  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [effectiveTo, setEffectiveTo] = useState("");
  const [active, setActive] = useState(true);

  const [formErrors, setFormErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegionFixed = Boolean(region?.taxRegionId) || Boolean(editingConfig);

  // Reset everything whenever the modal opens for a new create/edit session.
  useEffect(() => {
    if (!isOpen) return;
    setDuplicateError(null);
    setFormErrors({});
    setSelectedRegionId(region?.taxRegionId || editingConfig?.taxRegionId || "");
    setEffectiveFrom(editingConfig ? editingConfig.effectiveFrom || "" : today());
    setEffectiveTo(editingConfig?.effectiveTo || "");
    setActive(editingConfig ? Boolean(editingConfig.active) : true);
  }, [isOpen, editingConfig, region]);

  // Region choices are only needed when the region is not fixed by context.
  useEffect(() => {
    if (!isOpen || isRegionFixed) return;
    let cancelled = false;
    getActiveTaxRegions()
      .then((regions) => !cancelled && setRegionOptions(regions || []))
      .catch((error) => {
        if (!cancelled) showStatusToast(getApiErrorMessage(error, "Failed to load tax regions."), "error");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isRegionFixed]);

  // Load the tax structure for the selected region. Everything derived from the
  // previous region is cleared first so its components can never stay visible
  // or be submitted; responses for a region that is no longer selected are ignored.
  useEffect(() => {
    if (!isOpen) return;

    setStructure(null);
    setStructureError(null);
    setSelectedRegimeId("");
    setConfiguredRegimeId("");
    setComponentValues([]);

    if (!selectedRegionId) {
      setStructureLoading(false);
      return;
    }

    const requestId = ++structureRequestRef.current;
    setStructureLoading(true);

    const force = forceReloadRef.current;
    forceReloadRef.current = false;

    getTaxStructureByRegion(selectedRegionId, { force })
      .then((data) => {
        if (requestId !== structureRequestRef.current) return;
        setStructure(data);

        const regimes = data.taxRegimes;
        const editsThisRegion = editingConfig && String(editingConfig.taxRegionId) === String(selectedRegionId);
        const initialRegime = editsThisRegion
          ? resolveConfiguredRegime(regimes, editingConfig)
          : regimes.length === 1
          ? regimes[0]
          : null;

        if (initialRegime) {
          setSelectedRegimeId(initialRegime.taxRegimeId);
          setComponentValues(buildComponentValues(initialRegime, editsThisRegion ? editingConfig : null));
          if (editsThisRegion) setConfiguredRegimeId(initialRegime.taxRegimeId);
        }
      })
      .catch((error) => {
        if (requestId !== structureRequestRef.current) return;
        setStructureError(getApiErrorMessage(error, "Failed to load the tax structure for this region."));
      })
      .finally(() => {
        if (requestId === structureRequestRef.current) setStructureLoading(false);
      });
  }, [isOpen, selectedRegionId, editingConfig, reloadKey]);

  const taxRegimes = structure?.taxRegimes || [];
  const selectedRegime = useMemo(
    () => taxRegimes.find((r) => r.taxRegimeId === selectedRegimeId) || null,
    [taxRegimes, selectedRegimeId]
  );

  const selectedRegion =
    region?.taxRegionId ? region : regionOptions.find((r) => String(r.taxRegionId) === String(selectedRegionId));
  const currencyCode = structure?.taxRegion?.currencyCode || selectedRegion?.currencyCode || "";
  const regionLabel = selectedRegion
    ? selectedRegion.label || `${selectedRegion.taxRegionName} (${selectedRegion.taxRegionCode})`
    : editingConfig?.taxRegionLabel || "";

  const unmappedComponents = useMemo(
    () => (editingConfig && structure ? findUnmappedConfigComponents(selectedRegime, editingConfig) : []),
    [editingConfig, structure, selectedRegime]
  );

  const handleRegionChange = (e) => {
    setSelectedRegionId(e.target.value);
    setFormErrors({});
    setDuplicateError(null);
  };

  const handleRegimeChange = (e) => {
    const regimeId = e.target.value;
    const regime = taxRegimes.find((r) => r.taxRegimeId === regimeId) || null;
    setSelectedRegimeId(regimeId);
    // Rebuild from the new regime's components only; values of other regimes are discarded.
    setComponentValues(buildComponentValues(regime, regimeId === configuredRegimeId ? editingConfig : null));
    setFormErrors({});
  };

  const updateComponentValue = (taxComponentId, patch) => {
    setComponentValues((prev) => prev.map((v) => (v.taxComponentId === taxComponentId ? { ...v, ...patch } : v)));
    setFormErrors((prev) => {
      if (!prev[taxComponentId] && !prev._components) return prev;
      const { [taxComponentId]: _removed, _components, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = () => {
    setDuplicateError(null);
    const errors = {};

    if (!selectedRegionId) errors.taxRegion = "Tax region is required";
    if (selectedRegionId && structure && !selectedRegime) errors.taxRegime = "Tax regime / type is required";

    Object.assign(errors, validateComponentValues(selectedRegime, componentValues));

    if (!effectiveFrom) {
      errors.effectiveFrom = "Effective From date is required";
    }

    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
      errors.effectiveTo = "Effective To cannot be earlier than Effective From";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const findMatchingExistingConfig = () => {
    if (!existingConfigs || existingConfigs.length === 0) return null;
    return (
      existingConfigs.find((cfg) => cfg.status === "ACTIVE" || cfg.active) ||
      existingConfigs[0]
    );
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (structureLoading || !structure) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setDuplicateError(null);
    try {
      const payload = buildTaxConfigurationPayload({
        taxRegionId: selectedRegionId,
        regime: selectedRegime,
        componentValues,
        effectiveFrom,
        effectiveTo,
      });

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
      const rawMsg = getApiErrorMessage(error, `Failed to ${editingConfig ? "update" : "create"} tax rule.`);
      const isDuplicate =
        rawMsg.toLowerCase().includes("already exists") ||
        error?.response?.data?.message?.toLowerCase().includes("already exists");

      if (isDuplicate) {
        const matchingConfig = findMatchingExistingConfig();
        setDuplicateError({
          message:
            "An active tax configuration already exists for this tax region and effective period. You can open and manage tax components on the existing configuration instead of creating a duplicate.",
          matchingConfig,
        });
      } else {
        showStatusToast(rawMsg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderComponentField = (component) => {
    const entry = componentValues.find((v) => v.taxComponentId === component.taxComponentId) || {};
    const typeConfig = getInputTypeConfig(component.inputType);
    const { min, max } = getComponentBounds(component);
    const fieldName = `taxComponent-${component.taxComponentId}`;
    const error = formErrors[component.taxComponentId];

    return (
      <div key={component.taxComponentId} className="space-y-1.5">
        <FormInput
          label={getComponentLabel(component, currencyCode)}
          name={fieldName}
          type="number"
          inputMode="decimal"
          step={typeConfig.step}
          min={min}
          max={max ?? undefined}
          value={entry.value ?? ""}
          onChange={(e) => updateComponentValue(component.taxComponentId, { value: e.target.value })}
          onKeyDown={(e) => {
            // Block characters a number input accepts but these values never need.
            if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
          }}
          placeholder={typeConfig.placeholder}
          requiredMark={component.required}
          error={error}
          disabled={submitting}
          title={component.description || undefined}
        />
        {!error && component.description ? (
          <p className="text-xs leading-snug text-slate-500">{component.description}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <label htmlFor={`${fieldName}-applicability`} className="shrink-0 text-xs text-slate-500">
            Applies to
          </label>
          <select
            id={`${fieldName}-applicability`}
            value={entry.applicabilityType || "ALL"}
            onChange={(e) => updateComponentValue(component.taxComponentId, { applicabilityType: e.target.value })}
            disabled={submitting}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          >
            {Object.entries(APPLICABILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderTaxStructure = () => {
    if (!selectedRegionId) {
      return <p className="text-sm text-slate-500">Select a tax region to load its tax regimes and components.</p>;
    }

    if (structureLoading) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tax structure...
        </div>
      );
    }

    if (structureError) {
      return (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{structureError}</span>
          </div>
          <Button type="button" variant="outline" size="small" onClick={() => {
              forceReloadRef.current = true;
              setReloadKey((k) => k + 1);
            }}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (!structure) return null;

    if (taxRegimes.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          No tax regime is configured for this region yet. Configure its tax structure before adding a tax configuration.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="taxRegimeSelect" className="text-sm font-medium text-gray-700">
            Tax Regime / Type<span className="ml-1 text-red-500">*</span>
          </label>
          <select
            id="taxRegimeSelect"
            value={selectedRegimeId}
            onChange={handleRegimeChange}
            disabled={submitting}
            className={`${SELECT_CLASS} ${formErrors.taxRegime ? "border-red-300" : "border-gray-300"}`}
          >
            <option value="">Select tax regime...</option>
            {taxRegimes.map((regime) => (
              <option key={regime.taxRegimeId} value={regime.taxRegimeId}>
                {regime.taxRegimeName}
                {regime.taxRegimeCode && regime.taxRegimeCode !== regime.taxRegimeName ? ` (${regime.taxRegimeCode})` : ""}
              </option>
            ))}
          </select>
          {formErrors.taxRegime ? (
            <p className="text-xs text-red-500">{formErrors.taxRegime}</p>
          ) : selectedRegime?.description ? (
            <p className="text-xs text-slate-500">{selectedRegime.description}</p>
          ) : null}
        </div>

        {editingConfig && unmappedComponents.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {unmappedComponents.map((c) => c.taxTypeName || c.taxTypeCode).join(", ")}{" "}
              {unmappedComponents.length === 1 ? "is" : "are"} configured on this rule but not part of the selected
              regime, and will be removed when you save.
            </span>
          </div>
        )}

        {selectedRegime && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Tax Components</p>
            {selectedRegime.components.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                This tax regime has no components configured.
              </p>
            ) : (
              <div className={componentGridClass(selectedRegime.components.length)}>
                {selectedRegime.components.map(renderComponentField)}
              </div>
            )}
            {formErrors._components ? <p className="text-xs text-red-500">{formErrors._components}</p> : null}
          </div>
        )}
      </div>
    );
  };

  const canSubmit = Boolean(structure) && !structureLoading && taxRegimes.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingConfig ? "Edit Tax Configuration" : "Add Tax Configuration"}
      subtitle={
        regionLabel
          ? editingConfig
            ? `Update configuration details and tax rates for ${regionLabel}`
            : `Create a new tax configuration for ${regionLabel}`
          : "Create a new tax configuration"
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitForm}
            loading={submitting}
            loadingText="Saving..."
            disabled={!canSubmit}
          >
            {editingConfig ? "Update Configuration" : "Create Configuration"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmitForm} className="space-y-4">
        {duplicateError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-700">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-900">Active Configuration Already Exists</p>
                <p className="text-amber-800 leading-relaxed">{duplicateError.message}</p>
              </div>
            </div>
            {duplicateError.matchingConfig && onOpenManageExisting && (
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="small"
                  onClick={() => {
                    onClose();
                    onOpenManageExisting(duplicateError.matchingConfig);
                  }}
                  className="text-xs font-semibold"
                >
                  Manage Existing Components &rarr;
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isRegionFixed ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tax Region</label>
              <div className="flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-slate-700">
                {regionLabel}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="taxRegionSelect" className="text-sm font-medium text-gray-700">
                Tax Region<span className="ml-1 text-red-500">*</span>
              </label>
              <select
                id="taxRegionSelect"
                value={selectedRegionId}
                onChange={handleRegionChange}
                disabled={submitting}
                className={`${SELECT_CLASS} ${formErrors.taxRegion ? "border-red-300" : "border-gray-300"}`}
              >
                <option value="">Select tax region...</option>
                {regionOptions.map((r) => (
                  <option key={r.taxRegionId} value={r.taxRegionId}>
                    {r.label}
                  </option>
                ))}
              </select>
              {formErrors.taxRegion ? <p className="text-xs text-red-500">{formErrors.taxRegion}</p> : null}
            </div>
          )}
        </div>

        {renderTaxStructure()}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Effective From"
            name="effectiveFrom"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            requiredMark
            error={formErrors.effectiveFrom}
          />

          <FormInput
            label="Effective To"
            name="effectiveTo"
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            error={formErrors.effectiveTo}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="activeCheckbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
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
