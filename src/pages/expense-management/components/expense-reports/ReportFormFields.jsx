import React from "react";
import Select from "react-select";
import { Briefcase, Landmark } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

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
}) {
  const selectedCostCenter = costCenterOptions.find((o) => o.value === formData.costCenterId) || null;
  const selectedCurrency = currencyOptions.find((o) => o.value === formData.currencyId) || null;

  return (
    <div className="space-y-4">
      <FormInput
        label="Report Title"
        name="title"
        placeholder="e.g. US Business Trip"
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
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Briefcase size={14} className="text-gray-400" />
            Cost Center <span className="text-red-500">*</span>
          </label>
          <Select
            options={costCenterOptions}
            value={selectedCostCenter}
            onChange={(opt) => onSelectChange("costCenterId", opt ? opt.value : "")}
            placeholder="Search and select cost center..."
            isSearchable
            isLoading={lookupsLoading}
            styles={customSelectStyles}
            isDisabled={disabled}
          />
          {formErrors.costCenterId && <span className="text-xs text-red-600 block mt-1">{formErrors.costCenterId}</span>}
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Landmark size={14} className="text-gray-400" />
            Report Currency <span className="text-red-500">*</span>
          </label>
          <Select
            options={currencyOptions}
            value={selectedCurrency}
            onChange={(opt) => onSelectChange("currencyId", opt ? opt.value : "")}
            placeholder="Select report currency..."
            isSearchable
            isLoading={lookupsLoading}
            styles={customSelectStyles}
            isDisabled={disabled}
          />
          {formErrors.currencyId && <span className="text-xs text-red-600 block mt-1">{formErrors.currencyId}</span>}
        </div>
      </div>
    </div>
  );
}
