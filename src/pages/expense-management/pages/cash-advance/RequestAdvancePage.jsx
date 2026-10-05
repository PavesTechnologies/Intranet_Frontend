import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, DollarSign, Calendar, Save, Send, X, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import { showStatusToast } from "@/components/toastfy/toast";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function RequestAdvancePage() {
  const navigate = useNavigate();

  const [currencies, setCurrencies] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [loadingCostCenters, setLoadingCostCenters] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    currencyId: "",
    costCenterId: "",
    purpose: "",
    neededByDate: "",
    settlementDueDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      lookupService.getActiveCurrencies().catch(() => []),
      lookupService.getActiveCostCenters().catch(() => []),
    ])
      .then(([currData, ccData]) => {
        if (isMounted) {
          setCurrencies(currData || []);
          setCostCenters(ccData || []);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCurrencies(false);
          setLoadingCostCenters(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "Enter a valid amount greater than 0";
    }
    if (!formData.currencyId) {
      newErrors.currencyId = "Please select a currency";
    }
    if (!formData.purpose?.trim()) {
      newErrors.purpose = "Purpose is required";
    }
    if (!formData.neededByDate) {
      newErrors.neededByDate = "Needed by date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitRequest = async (isDraft = false) => {
    if (!isDraft && !validate()) return;
    if (isDraft && (!formData.amount || Number(formData.amount) <= 0) && !formData.title?.trim()) {
      showStatusToast("Please provide at least a title or amount to save draft.", "error");
      return;
    }

    if (isDraft) {
      setSavingDraft(true);
    } else {
      setSubmitting(true);
    }

    try {
      const payload = {
        title: formData.title || "Cash Advance Request",
        amount: Number(formData.amount) || 0,
        currencyId: formData.currencyId || null,
        costCenterId: formData.costCenterId || null,
        purpose: formData.purpose || "",
        neededByDate: formData.neededByDate || null,
        settlementDueDate: formData.settlementDueDate || null,
        notes: formData.notes || "",
        status: isDraft ? "DRAFT" : "SUBMITTED",
      };

      const res = await cashAdvanceApi.create(payload);
      const advanceData = res.data?.data || res.data;
      const createdId = advanceData?.advanceId || advanceData?.id;

      if (!isDraft && createdId) {
        // Explicitly hit submit endpoint as well to ensure backend workflow triggers
        try {
          await cashAdvanceApi.submit(createdId);
        } catch {
          // If state was already updated on create, ignore
        }
      }

      showStatusToast(
        isDraft ? "Cash advance draft saved successfully!" : "Cash advance request submitted for approval!",
        "success"
      );
      navigate("/expense-management/cash-advance/my");
    } catch (err) {
      console.error("Error creating cash advance:", err);
      const msg = err.response?.data?.message || err.message || "Failed to process cash advance request.";
      showStatusToast(msg, "error");
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
    { label: "Request Advance" },
  ];

  const currencyOptions = currencies.map((c) => ({
    label: `${c.currencyCode || c.code || c.name || "USD"} - ${c.currencyName || c.name || ""}`.trim(),
    value: c.currencyId || c.uuid || c.id,
  }));

  const costCenterOptions = costCenters.map((cc) => ({
    label: `${cc.costCenterCode || cc.code || ""} - ${cc.costCenterName || cc.name || ""}`.trim(),
    value: cc.costCenterId || cc.uuid || cc.id,
  }));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Header Card */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">Request Cash Advance</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit a cash advance request for upcoming business expenses.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/expense-management/cash-advance/my")}
          className="self-start sm:self-auto text-xs"
        >
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>

      {/* Main Form Container */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitRequest(false);
          }}
          className="space-y-6"
        >
          {/* Section 1: Basic Request Details */}
          <div>
            <h2 className="text-sm font-semibold text-[#0a174e] border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> General Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <FormInput
                  label="Title / Subject"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Client Onsite Visit - Mumbai"
                  required
                  error={errors.title}
                />
              </div>

              <div>
                {loadingCostCenters ? (
                  <div className="flex flex-col justify-end">
                    <label className="text-xs font-medium text-gray-700 mb-1">Cost Center (Optional)</label>
                    <div className="h-10 flex items-center px-3 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-500">
                      <LoadingSpinner size="sm" className="mr-2" /> Loading...
                    </div>
                  </div>
                ) : (
                  <FormSelect
                    label="Cost Center (Optional)"
                    name="costCenterId"
                    value={formData.costCenterId}
                    onChange={handleChange}
                    options={costCenterOptions}
                    placeholder="-- Default Cost Center --"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInput
                  label="Amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  error={errors.amount}
                />

                {loadingCurrencies ? (
                  <div className="flex flex-col justify-end">
                    <label className="text-xs font-medium text-gray-700 mb-1">Currency</label>
                    <div className="h-10 flex items-center px-3 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-500">
                      <LoadingSpinner size="sm" className="mr-2" /> Loading...
                    </div>
                  </div>
                ) : (
                  <FormSelect
                    label="Currency"
                    name="currencyId"
                    value={formData.currencyId}
                    onChange={handleChange}
                    options={currencyOptions}
                    placeholder="-- Select Currency --"
                    required
                    error={errors.currencyId}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Purpose & Explanation */}
          <div>
            <h2 className="text-sm font-semibold text-[#0a174e] border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" /> Purpose & Justification
            </h2>
            <FormTextArea
              label="Purpose / Business Justification"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              placeholder="Provide a detailed explanation for requesting this cash advance..."
              rows={3}
              required
              error={errors.purpose}
            />
          </div>

          {/* Section 3: Dates & Schedule */}
          <div>
            <h2 className="text-sm font-semibold text-[#0a174e] border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> Dates & Settlement Timeline
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Needed By Date"
                name="neededByDate"
                type="date"
                value={formData.neededByDate}
                onChange={handleChange}
                required
                error={errors.neededByDate}
              />
              <FormInput
                label="Settlement Expected Date"
                name="settlementDueDate"
                type="date"
                value={formData.settlementDueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Section 4: Additional Notes */}
          <div>
            <FormTextArea
              label="Additional Notes / Remarks (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional details or special requests..."
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmitRequest(true)}
              disabled={submitting || savingDraft}
              className="text-xs"
            >
              {savingDraft ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save as Draft
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || savingDraft}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
