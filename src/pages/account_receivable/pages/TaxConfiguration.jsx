import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Ban, Search, RefreshCw } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import ARTable from "../components/common/ARTable";
import StatusBadge from "../../../components/status/statusbadge";
import Modal from "../../../components/Modal/modal";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import ActionMenu from "../components/common/ActionMenu";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  getTaxRateConfigurations,
  getActiveTaxRegions,
  createTaxRateConfiguration,
  updateTaxRateConfiguration,
  deactivateTaxRateConfiguration,
  getApiErrorMessage,
} from "../services/taxRateConfigurationService";

const TABLE_HEADERS = [
  "Tax Region",
  "Tax Regime / Type",
  "CGST Rate",
  "SGST Rate",
  "IGST Rate",
  "Effective From",
  "Effective To",
  "Status",
  "Actions",
];

const TABLE_COLUMNS = [
  "taxRegionLabel",
  "taxRegime",
  "cgstDisplay",
  "sgstDisplay",
  "igstDisplay",
  "effectiveFromDisplay",
  "effectiveToDisplay",
  "statusBadge",
  "actions",
];

const DEFAULT_FORM_DATA = {
  taxRegionId: "",
  taxRegime: "GST",
  cgstRate: "0",
  sgstRate: "0",
  igstRate: "0",
  effectiveFrom: "",
  effectiveTo: "",
  active: true,
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

const formatRateDisplay = (rate) => {
  if (rate === null || rate === undefined || rate === "" || isNaN(Number(rate))) {
    return <span className="text-slate-400">—</span>;
  }
  return <span className="font-medium text-slate-700">{rate}%</span>;
};

export default function TaxConfiguration() {
  const [configurations, setConfigurations] = useState([]);
  const [taxRegions, setTaxRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTaxRegions, setLoadingTaxRegions] = useState(true);
  const [taxRegionsError, setTaxRegionsError] = useState("");
  const [permissionError, setPermissionError] = useState("");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegionFilter, setSelectedRegionFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Deactivate confirmation modal state
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Load active tax regions from backend
  const loadTaxRegionsData = async () => {
    setLoadingTaxRegions(true);
    setTaxRegionsError("");
    try {
      const regionsData = await getActiveTaxRegions();
      setTaxRegions(regionsData);
      return regionsData;
    } catch (err) {
      console.error("Failed to load active tax regions:", err);
      setTaxRegionsError("Unable to load tax regions. Please try again.");
      setTaxRegions([]);
      return [];
    } finally {
      setLoadingTaxRegions(false);
    }
  };

  // Load data from backend
  const loadData = async () => {
    setLoading(true);
    setPermissionError("");
    try {
      const [configsData, regionsData] = await Promise.all([
        getTaxRateConfigurations(),
        loadTaxRegionsData(),
      ]);
      setConfigurations(configsData);
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to load tax rate configurations.");
      if (error?.response?.status === 403) {
        setPermissionError(msg);
      }
      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter options for tax regions dropdown in form
  const taxRegionSelectOptions = useMemo(() => {
    if (loadingTaxRegions) {
      return [{ value: "", label: "Loading tax regions..." }];
    }
    if (taxRegionsError) {
      return [{ value: "", label: "Unable to load tax regions. Please try again." }];
    }
    if (!taxRegions || taxRegions.length === 0) {
      return [{ value: "", label: "No active tax regions are available." }];
    }
    return [
      { value: "", label: "Select Tax Region" },
      ...taxRegions.map((region) => ({
        value: region.taxRegionId,
        label: region.label || (region.taxRegionCode && region.taxRegionCode !== region.taxRegionName
          ? `${region.taxRegionName} (${region.taxRegionCode})`
          : region.taxRegionName || region.taxRegionId),
      })),
    ];
  }, [taxRegions, loadingTaxRegions, taxRegionsError]);

  const regionFilterOptions = useMemo(() => {
    const validRegions = taxRegions.map((region) => ({
      value: region.taxRegionId,
      label: region.label || region.taxRegionName,
    }));
    return [
      { value: "", label: "All Tax Regions" },
      ...validRegions,
    ];
  }, [taxRegions]);

  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ];

  // Filter configurations based on user selection
  const filteredConfigurations = useMemo(() => {
    return configurations.filter((item) => {
      // Filter by region
      if (selectedRegionFilter && item.taxRegionId !== selectedRegionFilter) {
        return false;
      }
      // Filter by status
      if (selectedStatusFilter && item.status !== selectedStatusFilter) {
        return false;
      }
      // Search query (region name, code, regime)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const regionName = (item.taxRegionName || "").toLowerCase();
        const regionCode = (item.taxRegionCode || "").toLowerCase();
        const regime = (item.taxRegime || "").toLowerCase();
        const label = (item.taxRegionLabel || "").toLowerCase();

        return (
          regionName.includes(query) ||
          regionCode.includes(query) ||
          regime.includes(query) ||
          label.includes(query)
        );
      }
      return true;
    });
  }, [configurations, selectedRegionFilter, selectedStatusFilter, searchQuery]);

  // Open modal for creating new configuration
  const handleOpenCreateModal = () => {
    setEditingConfig(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      taxRegionId: taxRegions.length > 0 ? taxRegions[0].taxRegionId : "",
      effectiveFrom: new Date().toISOString().split("T")[0],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing existing configuration
  const handleOpenEditModal = (config) => {
    setEditingConfig(config);

    let cgstVal = config.cgstRate !== null && config.cgstRate !== undefined ? String(config.cgstRate) : "";
    let sgstVal = config.sgstRate !== null && config.sgstRate !== undefined ? String(config.sgstRate) : "";
    let igstVal = config.igstRate !== null && config.igstRate !== undefined ? String(config.igstRate) : "";

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
      taxRegionId: config.taxRegionId || "",
      taxRegime: config.taxRegime || "GST",
      cgstRate: cgstVal,
      sgstRate: sgstVal,
      igstRate: igstVal,
      effectiveFrom: config.effectiveFrom || "",
      effectiveTo: config.effectiveTo || "",
      active: config.active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {};

    if (!formData.taxRegionId) {
      errors.taxRegionId = "Tax region is required";
    }

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

  // Submit create or edit form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const selectedRegionObj = taxRegions.find((r) => r.taxRegionId === formData.taxRegionId);

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
        taxRegionId: formData.taxRegionId,
        taxRegionName: selectedRegionObj?.taxRegionName || "",
        taxRegionCode: selectedRegionObj?.taxRegionCode || "",
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

      if (editingConfig) {
        await updateTaxRateConfiguration(editingConfig.id, payload);
        showStatusToast("Tax configuration updated successfully.", "success");
      } else {
        await createTaxRateConfiguration(payload);
        showStatusToast("Tax configuration created successfully.", "success");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      const msg = getApiErrorMessage(
        error,
        `Failed to ${editingConfig ? "update" : "create"} tax configuration.`
      );
      showStatusToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Deactivate handler
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivating(true);
    try {
      await deactivateTaxRateConfiguration(deactivateTarget.id);
      showStatusToast("Tax configuration deactivated successfully.", "success");
      setDeactivateTarget(null);
      await loadData();
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to deactivate tax configuration.");
      showStatusToast(msg, "error");
    } finally {
      setDeactivating(false);
    }
  };

  // Prepare table row objects
  const tableRows = useMemo(() => {
    return filteredConfigurations.map((item) => {
      const regionLabel = item.taxRegionLabel || item.taxRegionName || item.taxRegionId;

      return {
        taxRegionLabel: (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{regionLabel}</span>
            {item.taxRegionCode && item.taxRegionCode !== item.taxRegionName && (
              <span className="text-xs text-slate-500">Code: {item.taxRegionCode}</span>
            )}
          </div>
        ),
        taxRegime: <span className="font-medium text-slate-700">{item.taxRegime}</span>,
        cgstDisplay: formatRateDisplay(item.cgstRate),
        sgstDisplay: formatRateDisplay(item.sgstRate),
        igstDisplay: formatRateDisplay(item.igstRate),
        effectiveFromDisplay: (
          <span className="text-slate-600">{formatDateForDisplay(item.effectiveFrom)}</span>
        ),
        effectiveToDisplay: (
          <span className="text-slate-600">{formatDateForDisplay(item.effectiveTo)}</span>
        ),
        statusBadge: <StatusBadge label={item.status} size="sm" />,
        actions: (
          <div className="flex items-center justify-center">
            <ActionMenu
              items={[
                {
                  label: "Edit",
                  icon: <Pencil className="h-4 w-4 text-slate-600" />,
                  onClick: () => handleOpenEditModal(item),
                },
                {
                  label: "Deactivate",
                  icon: <Ban className="h-4 w-4 text-rose-600" />,
                  danger: true,
                  hidden: item.status !== "ACTIVE",
                  onClick: () => setDeactivateTarget(item),
                },
              ]}
            />
          </div>
        ),
      };
    });
  }, [filteredConfigurations]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tax Configuration"
        subtitle="Manage tax regions, regimes, and rate rules for Account Receivable"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              disabled={loading || Boolean(permissionError)}
              className="flex items-center gap-1.5 bg-[#0A0082] text-white hover:bg-[#0A0082]/90"
            >
              <Plus className="h-4 w-4" />
              Add Tax Configuration
            </Button>
          </div>
        }
      />

      {/* Permission Denied Alert */}
      {permissionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{permissionError}</p>
          <p className="mt-1 text-xs text-red-600">
            Please contact an administrator if you believe you should have access to this feature.
          </p>
        </div>
      )}

      {/* Filters Card */}
      <PageCard className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tax region or regime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
              />
            </div>

            {/* Region Filter */}
            <FormSelect
              name="regionFilter"
              value={selectedRegionFilter}
              onChange={(e) => setSelectedRegionFilter(e.target.value)}
              options={regionFilterOptions}
              className="min-w-[180px]"
            />

            {/* Status Filter */}
            <FormSelect
              name="statusFilter"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              options={statusFilterOptions}
              className="min-w-[150px]"
            />
          </div>

          {(searchQuery || selectedRegionFilter || selectedStatusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedRegionFilter("");
                setSelectedStatusFilter("");
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </PageCard>

      {/* Tax Configuration List View */}
      <ARTable
        headers={TABLE_HEADERS}
        columns={TABLE_COLUMNS}
        rows={tableRows}
        loading={loading}
        emptyMessage="No tax configurations found."
      />

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingConfig ? "Edit Tax Configuration" : "Add Tax Configuration"}
        subtitle={
          editingConfig
            ? `Update tax rates and effective range for ${editingConfig.taxRegionLabel}`
            : "Define tax rates for a specific tax region and effective period"
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForm}
              disabled={submitting}
              className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90"
            >
              {submitting
                ? "Saving..."
                : editingConfig
                ? "Update Configuration"
                : "Create Configuration"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tax Region Selection */}
            <div>
              <FormSelect
                label="Tax Region"
                name="taxRegionId"
                value={formData.taxRegionId}
                onChange={(e) => setFormData({ ...formData, taxRegionId: e.target.value })}
                options={taxRegionSelectOptions}
                requiredMark
                disabled={Boolean(editingConfig) || loadingTaxRegions}
                error={formErrors.taxRegionId}
              />
              {loadingTaxRegions && (
                <p className="mt-1 text-xs text-slate-500">Loading active tax regions from backend...</p>
              )}
              {taxRegionsError && (
                <div className="mt-1 flex items-center justify-between text-xs text-rose-600">
                  <span>{taxRegionsError}</span>
                  <button
                    type="button"
                    onClick={loadTaxRegionsData}
                    className="ml-2 font-medium underline hover:text-rose-800"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingTaxRegions && !taxRegionsError && taxRegions.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No active tax regions are available in Tax Region Master.
                </p>
              )}
            </div>

            {/* Tax Regime / Type */}
            <div>
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
          </div>

          {/* Rates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
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
            </div>

            <div>
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
            </div>

            <div>
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
          </div>

          {/* Effective Period Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FormInput
                label="Effective From"
                name="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                requiredMark
                error={formErrors.effectiveFrom}
              />
            </div>

            <div>
              <FormInput
                label="Effective To"
                name="effectiveTo"
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                error={formErrors.effectiveTo}
              />
            </div>
          </div>

          {/* Active Checkbox Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]"
            />
            <label htmlFor="activeCheckbox" className="text-sm font-medium text-slate-700">
              Active Configuration
            </label>
          </div>
        </form>
      </Modal>

      {/* Deactivation Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Tax Configuration"
        message={`Are you sure you want to deactivate the tax configuration for ${
          deactivateTarget?.taxRegionLabel || deactivateTarget?.taxRegionName
        }? Inactive configurations will not be applied to new transactions.`}
        confirmText="Deactivate"
        confirmVariant="danger"
        isLoading={deactivating}
      />
    </div>
  );
}
