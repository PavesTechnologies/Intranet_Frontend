import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;

  return `${currencyCode} ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getDateValue = (value) => {
  if (!value) return "";

  if (Array.isArray(value)) {
    const [year, month, day] = value;

    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  if (typeof value === "object" && value !== null) {
    const year = value.year;
    const month = value.monthValue || value.month;
    const day = value.dayOfMonth || value.day;

    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  return String(value).slice(0, 10);
};

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
};

const isOverdueAdvance = (advance) => {
  if (!advance) return false;

  const status = String(advance.status || "").toUpperCase();

  if (
    ["SETTLED", "CLOSED", "CANCELLED", "REJECTED"].includes(status)
  ) {
    return false;
  }

  const balance =
    Number(
      advance.outstandingBalance ??
        advance.outstanding_balance ??
        advance.balance ??
        0
    ) || 0;

  if (balance <= 0) return false;

  const dueDate =
    advance.settlementDueDate ||
    advance.settlement_due_date ||
    advance.expectedSettlementDate;

  if (!dueDate) return false;

  const due = new Date(`${String(dueDate).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
};

const getOutstandingBalance = (advance) => {
  if (!advance) return 0;

  const value =
    advance.outstandingBalance ??
    advance.outstanding_balance ??
    advance.balance;

  return Math.max(0, Number(value) || 0);
};

const getActiveAdvances = (list) => {
  return list.filter((advance) => {
    const status = String(advance.status || "").toUpperCase();

    const balance = getOutstandingBalance(advance);

    if (balance <= 0) return false;

    return !["SETTLED", "CLOSED", "CANCELLED", "REJECTED"].includes(
      status
    );
  });
};

export default function RequestAdvancePage() {
  const [formData, setFormData] = useState({
    title: "",
    costCenterId: "",
    amount: "",
    currencyCode: "INR",
    purpose: "",
    neededByDate: "",
    settlementDueDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [advances, setAdvances] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const breadcrumbs = [
    {
      label: "Expense Management",
      to: "/expense-management/dashboard",
    },
    {
      label: "Cash Advance",
      to: "/expense-management/cash-advance/my",
    },
    {
      label: "Request Advance",
    },
  ];

  useEffect(() => {
    const loadOutstandingAdvances = async () => {
      setBalanceLoading(true);

      try {
        const response = await cashAdvanceApi.getMyAdvances();

        const rawData = response?.data?.data ?? response?.data ?? [];

        const list = Array.isArray(rawData)
          ? rawData
          : rawData.content ||
            rawData.items ||
            rawData.advances ||
            [];

        setAdvances(list);
      } catch (error) {
        console.error(
          "Failed to load outstanding cash advances:",
          error
        );

        setAdvances([]);
      } finally {
        setBalanceLoading(false);
      }
    };

    loadOutstandingAdvances();
  }, []);

  const activeAdvances = useMemo(
    () => getActiveAdvances(advances),
    [advances]
  );

  const outstandingBalance = useMemo(() => {
    return activeAdvances.reduce(
      (total, advance) => total + getOutstandingBalance(advance),
      0
    );
  }, [activeAdvances]);

  const overdueAdvances = useMemo(
    () => activeAdvances.filter(isOverdueAdvance),
    [activeAdvances]
  );

  const hasOverdueAdvance = overdueAdvances.length > 0;

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      if (!previous[name] && !previous.general && !previous.overdue) {
        return previous;
      }

      const next = { ...previous };

      delete next[name];

      return next;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required.";
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "Enter a valid advance amount.";
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose =
        "Purpose / business justification is required.";
    }

    if (!formData.neededByDate) {
      newErrors.neededByDate = "Needed By Date is required.";
    }

    if (!formData.settlementDueDate) {
      newErrors.settlementDueDate =
        "Settlement Expected Date is required.";
    }

    if (
      formData.neededByDate &&
      formData.settlementDueDate &&
      isValidDate(formData.neededByDate) &&
      isValidDate(formData.settlementDueDate)
    ) {
      const neededDate = new Date(
        `${formData.neededByDate}T00:00:00`
      );

      const settlementDate = new Date(
        `${formData.settlementDueDate}T00:00:00`
      );

      if (settlementDate < neededDate) {
        newErrors.settlementDueDate =
          "Settlement Expected Date cannot be before Needed By Date.";
      }
    }

    if (hasOverdueAdvance) {
      newErrors.overdue =
        "You have an overdue cash advance. Resolve the outstanding advance before requesting another advance.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => ({
    ...formData,
    amount: Number(formData.amount),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await cashAdvanceApi.create(buildPayload());

      showStatusToast(
        "Cash advance request submitted successfully.",
        "success"
      );

      window.location.href =
        "/expense-management/cash-advance/my";
    } catch (error) {
      console.error("Failed to submit cash advance:", error);

      showStatusToast(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to submit cash advance request.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const draftErrors = {};

    if (!formData.title.trim()) {
      draftErrors.title = "Title is required.";
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      draftErrors.amount = "Enter a valid advance amount.";
    }

    if (Object.keys(draftErrors).length > 0) {
      setErrors(draftErrors);
      return;
    }

    setSavingDraft(true);

    try {
      await cashAdvanceApi.create(buildPayload());

      showStatusToast(
        "Cash advance draft saved successfully.",
        "success"
      );

      window.location.href =
        "/expense-management/cash-advance/my";
    } catch (error) {
      console.error("Failed to save cash advance draft:", error);

      showStatusToast(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to save cash advance draft.",
        "error"
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-[#0a174e]">
          Request Cash Advance
        </h1>

        <p className="mt-0.5 text-xs text-gray-500">
          Submit a cash advance request for upcoming business
          expenses.
        </p>
      </div>

      {/* Outstanding Balance */}
      <div
        className={`rounded-xl border p-4 shadow-sm ${
          hasOverdueAdvance
            ? "border-rose-200 bg-rose-50"
            : outstandingBalance > 0
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-start gap-3">
          {balanceLoading ? (
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-600" />
          ) : hasOverdueAdvance ? (
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
          ) : outstandingBalance > 0 ? (
            <Info className="mt-0.5 h-5 w-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Current Outstanding Cash Advance
                </p>

                {balanceLoading ? (
                  <p className="mt-1 text-sm font-medium text-gray-600">
                    Checking outstanding balance...
                  </p>
                ) : (
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      hasOverdueAdvance
                        ? "text-rose-700"
                        : outstandingBalance > 0
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(
                      outstandingBalance,
                      formData.currencyCode || "INR"
                    )}
                  </p>
                )}
              </div>

              {!balanceLoading && activeAdvances.length > 0 && (
                <span className="text-xs font-medium text-gray-600">
                  {activeAdvances.length} active advance
                  {activeAdvances.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {!balanceLoading && hasOverdueAdvance && (
              <div className="mt-2 rounded-lg border border-rose-200 bg-white/70 p-3">
                <p className="text-xs font-semibold text-rose-800">
                  Overdue outstanding advance
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-rose-700">
                  You have an overdue cash advance with an outstanding
                  balance. Please resolve it before submitting a new
                  cash advance request.
                </p>
              </div>
            )}

            {!balanceLoading &&
              !hasOverdueAdvance &&
              outstandingBalance > 0 && (
                <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
                  You currently have an outstanding cash advance.
                  You may submit another request because the existing
                  advance is not overdue, but the balance will remain
                  visible during approval and settlement.
                </p>
              )}

            {!balanceLoading && outstandingBalance <= 0 && (
              <p className="mt-2 text-[11px] text-emerald-800">
                You currently have no outstanding cash advance
                balance.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            General Information
          </h2>

          <p className="mt-0.5 text-[11px] text-gray-500">
            Provide the details required for your cash advance
            request.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Title / Subject"
            name="title"
            value={formData.title}
            onChange={(event) =>
              updateField("title", event.target.value)
            }
            placeholder="e.g. Client Visit Expenses"
            error={errors.title}
            required
          />

          <FormInput
            label="Cost Center"
            name="costCenterId"
            value={formData.costCenterId}
            onChange={(event) =>
              updateField("costCenterId", event.target.value)
            }
            placeholder="Enter cost center"
          />

          <FormInput
            label="Amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(event) =>
              updateField("amount", event.target.value)
            }
            placeholder="Enter amount"
            error={errors.amount}
            required
          />

          <FormSelect
            label="Currency"
            name="currencyCode"
            value={formData.currencyCode}
            onChange={(event) =>
              updateField("currencyCode", event.target.value)
            }
            options={[
              { label: "INR", value: "INR" },
              { label: "USD", value: "USD" },
              { label: "EUR", value: "EUR" },
              { label: "GBP", value: "GBP" },
            ]}
          />
        </div>

        <FormTextArea
          label="Purpose / Business Justification"
          name="purpose"
          value={formData.purpose}
          onChange={(event) =>
            updateField("purpose", event.target.value)
          }
          placeholder="Explain why the cash advance is required."
          rows={4}
          error={errors.purpose}
          required
        />

        <div>
          <h2 className="text-sm font-bold text-gray-900">
            Dates & Settlement Timeline
          </h2>

          <p className="mt-0.5 text-[11px] text-gray-500">
            Enter when the funds are required and when settlement is
            expected.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Needed By Date"
            name="neededByDate"
            type="date"
            value={getDateValue(formData.neededByDate)}
            onChange={(event) =>
              updateField("neededByDate", event.target.value)
            }
            error={errors.neededByDate}
            required
          />

          <FormInput
            label="Settlement Expected Date"
            name="settlementDueDate"
            type="date"
            value={getDateValue(formData.settlementDueDate)}
            onChange={(event) =>
              updateField("settlementDueDate", event.target.value)
            }
            error={errors.settlementDueDate}
            required
          />
        </div>

        <FormTextArea
          label="Additional Notes"
          name="notes"
          value={formData.notes}
          onChange={(event) =>
            updateField("notes", event.target.value)
          }
          placeholder="Add any additional information."
          rows={3}
        />

        {errors.overdue && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

            <p className="text-xs font-medium text-rose-700">
              {errors.overdue}
            </p>
          </div>
        )}

        {errors.general && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {errors.general}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="text-xs"
          >
            {savingDraft ? (
              <LoadingSpinner size="sm" className="mr-1.5" />
            ) : null}
            Save Draft
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={
              submitting ||
              savingDraft ||
              balanceLoading ||
              hasOverdueAdvance
            }
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          >
            {submitting ? (
              <LoadingSpinner size="sm" className="mr-1.5" />
            ) : null}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}