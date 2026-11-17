import React from "react";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import { Fonts } from "@/components/Fonts/Fonts";

// Matches FormInput (rounded-lg, gray-300 border, text-sm, px-4, brand focus ring) so the selects sit
// flush with the text and date fields beside them.
const selectStyles = (hasError) => ({
  control: (base, state) => ({
    ...base,
    minHeight: "38px",
    borderRadius: "0.5rem",
    borderColor: hasError ? "#fca5a5" : state.isFocused ? "#0A0082" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(10, 0, 130, 0.2)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    backgroundColor: state.isDisabled ? "#f3f4f6" : "#ffffff",
    fontSize: "0.875rem",
    "&:hover": { borderColor: hasError ? "#fca5a5" : state.isFocused ? "#0A0082" : "#d1d5db" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.25rem 0 1rem" }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
  singleValue: (base) => ({ ...base, color: "#111827" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 0.5rem", color: "#6b7280" }),
  // The form lives in a scrolling drawer (z-[10000]); the menu is portalled to <body> above it so it is never clipped.
  menuPortal: (base) => ({ ...base, zIndex: 10001 }),
  menu: (base) => ({ ...base, borderRadius: "0.5rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)" }),
  menuList: (base) => ({ ...base, maxHeight: "15rem", padding: "0.25rem 0" }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    backgroundColor: state.isSelected ? "#0A0082" : state.isFocused ? "#eef2ff" : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#111827",
    "&:active": { backgroundColor: state.isSelected ? "#0A0082" : "#e0e7ff" },
  }),
});

const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

// Mirrors the backend's expense-report.business-purpose.min-length config
// (application.properties, default 10 — see ExpenseReportServiceImpl.assertBusinessPurposeLongEnough).
export const BUSINESS_PURPOSE_MIN_LENGTH = 10;

/** Shared validation rule so Create/Edit Report forms agree with the backend before submitting. */
export function validateBusinessPurpose(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "Business purpose is required.";
  if (trimmed.length < BUSINESS_PURPOSE_MIN_LENGTH) {
    return `Business purpose must be at least ${BUSINESS_PURPOSE_MIN_LENGTH} characters long.`;
  }
  return "";
}

/**
 * Shared Title / Business Purpose / Cost Center / Report Currency fields —
 * used by CreateExpensePage, MyExpensesPage's edit modal, and
 * ExpenseReportDetailPage's edit modal so this form isn't triplicated.
 */
export default function ReportFormFields({
  formData,
  formErrors,
  onInputChange,
  onSelectChange,
  costCenterOptions = [],
  currencyOptions = [],
  disabled = false,
  lookupsLoading = false,
  projectOptions = [],
  clientOptions = [],
  showClient = false,
  onShowClientChange,
}) {
  const selectedCostCenter = costCenterOptions.find((o) => o.value === formData.costCenterId) || null;
  const selectedCurrency = currencyOptions.find((o) => o.value === formData.currencyId) || null;
  const selectedProject = projectOptions.find((o) => o.value === formData.projectId) || null;
  const selectedClient = clientOptions.find((o) => o.value === formData.clientId) || null;

  return (
    <div className="space-y-4">
      <FormInput
        label="Report Title"
        name="title"
        placeholder="e.g. US Business Event"
        value={formData.title}
        onChange={onInputChange}
        requiredMark
        disabled={disabled}
        error={formErrors.title}
      />

      <FormTextArea
        label="Business Purpose"
        name="businessPurpose"
        placeholder="e.g. Client meeting with acquisition prospects"
        value={formData.businessPurpose}
        onChange={onInputChange}
        disabled={disabled}
        requiredMark
        error={formErrors.businessPurpose}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Project</label>
          <Select
            options={projectOptions}
            value={selectedProject}
            onChange={(opt) => onSelectChange("projectId", opt ? opt.value : "")}
            placeholder="Search and select project..."
            noOptionsMessage={() => "No projects assigned to you"}
            isClearable
            isDisabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Is this client billable?</label>
          <div className="flex gap-2">
            <button type="button" disabled={disabled} onClick={() => onShowClientChange && onShowClientChange(true)} className={`rounded-md border px-4 py-2 text-sm font-medium ${showClient ? "border-[#0A0082] bg-[#0A0082] text-white" : "border-gray-300 bg-white text-gray-700"}`}>Yes</button>
            <button type="button" disabled={disabled} onClick={() => { if (onShowClientChange) onShowClientChange(false); onSelectChange("clientId", ""); }} className={`rounded-md border px-4 py-2 text-sm font-medium ${showClient ? "border-gray-300 bg-white text-gray-700" : "border-[#0A0082] bg-[#0A0082] text-white"}`}>No</button>
          </div>
        </div>
        {showClient && (
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Client</label>
            <Select
              options={clientOptions}
              value={selectedClient}
              onChange={(opt) => onSelectChange("clientId", opt ? opt.value : "")}
              placeholder="Search and select client..."
              isClearable
              isDisabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          label="Event start date"
          name="tripStartDate"
          type="date"
          value={formData.tripStartDate || ""}
          onChange={onInputChange}
          requiredMark
          disabled={disabled}
          error={formErrors.tripStartDate}
        />
        <FormInput
          label="Event end date"
          name="tripEndDate"
          type="date"
          value={formData.tripEndDate || ""}
          onChange={onInputChange}
          min={formData.tripStartDate || undefined}
          requiredMark
          disabled={disabled}
          error={formErrors.tripEndDate}
        />
      </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="costCenterId" className={Fonts.label}>
            Cost Center<span className="ml-1 text-red-500">*</span>
          </label>
          <Select
            inputId="costCenterId"
            options={costCenterOptions}
            value={selectedCostCenter}
            onChange={(opt) => onSelectChange("costCenterId", opt ? opt.value : "")}
            placeholder="Select cost center"
            isSearchable
            isLoading={lookupsLoading}
            styles={selectStyles(Boolean(formErrors.costCenterId))}
            menuPortalTarget={menuPortalTarget}
            menuPosition="fixed"
            menuPlacement="auto"
            isDisabled={disabled}
          />
          {formErrors.costCenterId && <p className="text-xs text-red-500">{formErrors.costCenterId}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="currencyId" className={Fonts.label}>
            Report Currency<span className="ml-1 text-red-500">*</span>
          </label>
          <Select
            inputId="currencyId"
            options={currencyOptions}
            value={selectedCurrency}
            onChange={(opt) => onSelectChange("currencyId", opt ? opt.value : "")}
            placeholder="Select currency"
            isSearchable
            isLoading={lookupsLoading}
            styles={selectStyles(Boolean(formErrors.currencyId))}
            menuPortalTarget={menuPortalTarget}
            menuPosition="fixed"
            menuPlacement="auto"
            isDisabled={disabled}
          />
          {formErrors.currencyId && <p className="text-xs text-red-500">{formErrors.currencyId}</p>}
        </div>
      </div>
    </div>
  );
}
