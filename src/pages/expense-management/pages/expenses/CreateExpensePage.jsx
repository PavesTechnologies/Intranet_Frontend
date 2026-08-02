import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Sparkles, Briefcase, Landmark } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { expenseReportService, lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "Create Expense" },
];

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

export default function CreateExpensePage() {
  const navigate = useNavigate();

  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    businessPurpose: "",
    costCenterId: "",
    currencyId: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLookupsLoading(true);
        const [costCenterList, currencyList] = await Promise.all([
          lookupService.getActiveCostCenters(),
          lookupService.getActiveCurrencies(),
        ]);
        setCostCenters(costCenterList);
        setCurrencies(currencyList);
      } catch (err) {
        console.error("Failed to load lookups:", err);
        showStatusToast("Failed to load cost centers / currencies.", "error");
      } finally {
        setLookupsLoading(false);
      }
    };
    loadLookups();
  }, []);

  const costCenterOptions = costCenters.map((c) => ({
    value: c.costCenterId,
    label: `${c.costCenterCode} - ${c.costCenterName}`,
  }));
  const currencyOptions = currencies.map((c) => ({
    value: c.currencyId,
    label: `${c.currencyCode} - ${c.currencyName}`,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Report title is required.";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters.";
    }
    if (!formData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!formData.currencyId) errors.currencyId = "Report currency is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      businessPurpose: formData.businessPurpose.trim(),
      costCenterId: formData.costCenterId,
      currencyId: formData.currencyId,
    };

    try {
      setSubmitting(true);
      const res = await expenseReportService.create(payload);
      showStatusToast("Expense report created successfully!", "success");
      const reportId = res.data?.reportId;
      if (reportId) {
        navigate(`/expense-management/expenses/reports/${reportId}`);
      } else {
        navigate("/expense-management/expenses/my");
      }
    } catch (err) {
      console.error("Error creating expense report:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to create expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-[#0A0082]">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a174e]">Create Expense Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Start a new expense report, then add individual line items with receipts.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput
            label="Report Title"
            name="title"
            placeholder="e.g. US Business Trip"
            value={formData.title}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.title}
          />

          <FormTextArea
            label="Business Purpose"
            name="businessPurpose"
            placeholder="e.g. Client meeting with acquisition prospects"
            value={formData.businessPurpose}
            onChange={handleInputChange}
            disabled={submitting}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Briefcase size={14} className="text-gray-400" />
                Cost Center <span className="text-red-500">*</span>
              </label>
              <Select
                options={costCenterOptions}
                value={costCenterOptions.find((o) => o.value === formData.costCenterId) || null}
                onChange={(opt) => handleSelectChange("costCenterId", opt ? opt.value : "")}
                placeholder="Search and select cost center..."
                isSearchable
                isLoading={lookupsLoading}
                styles={customSelectStyles}
                isDisabled={submitting}
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
                value={currencyOptions.find((o) => o.value === formData.currencyId) || null}
                onChange={(opt) => handleSelectChange("currencyId", opt ? opt.value : "")}
                placeholder="Select report currency..."
                isSearchable
                isLoading={lookupsLoading}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  ...customSelectStyles,
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                isDisabled={submitting}
              />
              {formErrors.currencyId && <span className="text-xs text-red-600 block mt-1">{formErrors.currencyId}</span>}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
            <FileText size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              After creating the report, you'll be able to add individual line items — each with its own
              currency, GST, and receipts.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/expense-management/expenses/my")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting} loadingText="Creating...">
              Create Expense Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
