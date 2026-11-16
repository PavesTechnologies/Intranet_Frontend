import React, { useEffect, useMemo, useRef, useState } from "react";

import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import FormTextArea from "@/components/forms/FormTextArea";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import AdvanceTypeSelector, { ADVANCE_TYPE } from "@/pages/expense-management/pages/cash-advance/components/request/AdvanceTypeSelector";
import EmployeeProfileCard from "@/pages/expense-management/pages/cash-advance/components/request/EmployeeProfileCard";
import OutstandingBalanceSummary from "@/pages/expense-management/pages/cash-advance/components/request/OutstandingBalanceSummary";
import SupportingDocumentsUpload from "@/pages/expense-management/pages/cash-advance/components/request/SupportingDocumentsUpload";
import AdvanceCalculationPreview from "@/pages/expense-management/pages/cash-advance/components/request/AdvanceCalculationPreview";
import { useLocation, useNavigate } from "react-router-dom";

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";

/* Required label */
const RequiredLabel = ({ children }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

/* Optional label */
const OptionalLabel = ({ children }) => (
  <span>
    {children}{" "}
    <span className="text-xs font-normal text-gray-400">
      (Optional)
    </span>
  </span>
);

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
    ["SETTLED", "CLOSED", "CANCELLED", "REJECTED"].includes(
      status
    )
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

  const due = new Date(
    `${String(dueDate).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
};

// Settlement must fall within this many days after the needed-by date.
const SETTLEMENT_WINDOW_DAYS = 30;

// Advances are requested in whole blocks of this amount. Keep in step with the server's ADVANCE_ROUND_BLOCK.
const ADVANCE_ROUND_BLOCK = 500;

/** Today on the employee's calendar, as yyyy-mm-dd. Dates on or before this are refused. */
const todayIso = () => toIsoDate(new Date());

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Earliest and latest settlement dates allowed for a needed-by date (YYYY-MM-DD), or null when unset. */
/**
 * The expected trip dates are optional, so the report can be prefilled. When both are given, the end cannot be before the
 * start. Returns the message to show, or null. These dates are separate from the needed-by and settlement dates.
 */
export const expectedTripDateError = (start, end) => {
  if (!start || !end || !isValidDate(start) || !isValidDate(end)) return null;
  return new Date(`${end}T00:00:00`) < new Date(`${start}T00:00:00`)
    ? "Expected event end date cannot be before the expected event start date."
    : null;
};

export const getSettlementDateRange = (neededByDate) => {
  if (!neededByDate || !isValidDate(neededByDate)) return null;
  const start = new Date(`${neededByDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + SETTLEMENT_WINDOW_DAYS);
  return { min: toIsoDate(start), max: toIsoDate(end) };
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

    return ![
      "SETTLED",
      "CLOSED",
      "CANCELLED",
      "REJECTED",
    ].includes(status);
  });
};

export default function RequestAdvancePage() {
  // In-app navigation after save, so only this page changes (a full reload restarts the whole app).
  const navigate = useNavigate();
  // "Request again" from a rejected or deferred advance passes the earlier details here. Dates are never copied: they must be new.
  const location = useLocation();
  const prefill = location.state?.prefill ?? {};
  // The draft created by a submit attempt. A retry updates this draft instead of creating a second one.
  const draftIdRef = useRef(null);
  const [formData, setFormData] = useState({
    title: prefill.title ?? "",
    costCenterId: prefill.costCenterId ?? "",
    amount: prefill.amount ?? "",
    currencyId: prefill.currencyId ?? "",
    purpose: prefill.purpose ?? "",
    neededByDate: "",
    expectedTripStartDate: "",
    expectedTripEndDate: "",
    settlementDueDate: "",
    notes: prefill.notes ?? "",
  });

  const [errors, setErrors] = useState({});
  // Request type and the justification for a separate advance. The total and the cash are calculated by the server.
  const [requestType, setRequestType] = useState(ADVANCE_TYPE.COMPLETE_NEW);
  const [employeeJustification, setEmployeeJustification] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  // The saved draft this form edits. Set by the first save or the first document; cleared after a submit.
  const [draftId, setDraftId] = useState(null);

  // Read-only identity from the employee record. Missing details are simply not shown.
  useEffect(() => {
    let cancelled = false;
    // Wrapped so a profile that cannot be loaded leaves the form usable.
    Promise.resolve()
      .then(() => cashAdvanceApi.myProfile())
      .then((data) => {
        if (!cancelled) setProfile(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A preview describes the values it was made from, so it is dropped when they change.
  useEffect(() => {
    setPreview(null);
  }, [requestType, formData.amount, formData.currencyId]);

  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [advances, setAdvances] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

  /* Cost Centers */
  const [costCenters, setCostCenters] = useState([]);
  const [loadingCostCenters, setLoadingCostCenters] =
    useState(true);

  /* Currencies */
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] =
    useState(true);

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

  /*
   * Load outstanding cash advances
   */
  useEffect(() => {
    const loadOutstandingAdvances = async () => {
      setBalanceLoading(true);

      try {
        const response =
          await cashAdvanceApi.getMyAdvances();

        const rawData =
          response?.data?.data ?? response?.data ?? [];

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

  /*
   * Load active Cost Centers
   */
  useEffect(() => {
    let isMounted = true;

    setLoadingCostCenters(true);

    lookupService
      .getActiveCostCenters()
      .then((data) => {
        if (isMounted) {
          setCostCenters(
            Array.isArray(data) ? data : []
          );
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load cost centers:",
          error
        );

        if (isMounted) {
          setCostCenters([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCostCenters(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Load active Currencies
   */
  useEffect(() => {
    let isMounted = true;

    setLoadingCurrencies(true);

    lookupService
      .getActiveCurrencies()
      .then((data) => {
        if (isMounted) {
          setCurrencies(
            Array.isArray(data) ? data : []
          );
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load currencies:",
          error
        );

        if (isMounted) {
          setCurrencies([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCurrencies(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Get active advances
   */
  const activeAdvances = useMemo(
    () => getActiveAdvances(advances),
    [advances]
  );

  /*
   * Calculate outstanding balance
   */
  const outstandingBalance = useMemo(() => {
    return activeAdvances.reduce(
      (total, advance) =>
        total + getOutstandingBalance(advance),
      0
    );
  }, [activeAdvances]);

  /*
   * Find overdue advances
   */
  const overdueAdvances = useMemo(
    () => activeAdvances.filter(isOverdueAdvance),
    [activeAdvances]
  );

  const hasOverdueAdvance =
    overdueAdvances.length > 0;

  /*
   * Cost Center dropdown options
   */
  const costCenterOptions = useMemo(() => {
    return costCenters
      .map((costCenter) => {
        const id =
          costCenter.costCenterId ??
          costCenter.id ??
          costCenter.uuid;

        const code =
          costCenter.costCenterCode ??
          costCenter.code ??
          "";

        const name =
          costCenter.costCenterName ??
          costCenter.name ??
          "";

        if (!id) {
          return null;
        }

        return {
          value: String(id),
          label:
            code && name
              ? `${code} - ${name}`
              : code ||
                name ||
                String(id),
        };
      })
      .filter(Boolean);
  }, [costCenters]);

  /*
   * Currency dropdown options
   */
  const currencyOptions = useMemo(() => {
    return currencies
      .map((currency) => {
        const id =
          currency.currencyId ??
          currency.id ??
          currency.uuid;

        const code =
          currency.currencyCode ??
          currency.code ??
          "";

        const name =
          currency.currencyName ??
          currency.name ??
          "";

        if (!id) {
          return null;
        }

        return {
          value: String(id),
          label:
            code && name
              ? `${code} - ${name}`
              : code ||
                name ||
                String(id),
        };
      })
      .filter(Boolean);
  }, [currencies]);

  /*
   * Update form fields
   */
  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      if (
        !previous[name] &&
        !previous.general &&
        !previous.overdue
      ) {
        return previous;
      }

      const next = { ...previous };

      delete next[name];

      return next;
    });
  };

  /*
   * Validate form
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required.";
    }

    if (
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      newErrors.amount =
        "Enter a valid advance amount.";
    } else if (Number(formData.amount) % ADVANCE_ROUND_BLOCK !== 0) {
      newErrors.amount =
        `The advance amount must be a multiple of ${ADVANCE_ROUND_BLOCK} (for example 2,000 or 2,500).`;
    }

    if (!formData.currencyId) {
      newErrors.currencyId =
        "Currency is required.";
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose =
        "Purpose / business justification is required.";
    }

    if (!formData.neededByDate) {
      newErrors.neededByDate =
        "Needed By Date is required.";
    } else if (isValidDate(formData.neededByDate) && formData.neededByDate <= todayIso()) {
      newErrors.neededByDate =
        "Needed By Date must be after today.";
    }

    if (!formData.settlementDueDate) {
      newErrors.settlementDueDate =
        "Settlement Expected Date is required.";
    } else if (isValidDate(formData.settlementDueDate) && formData.settlementDueDate <= todayIso()) {
      newErrors.settlementDueDate =
        "Settlement Expected Date must be after today.";
    }

    const tripDateError = expectedTripDateError(
      formData.expectedTripStartDate,
      formData.expectedTripEndDate
    );
    if (tripDateError) {
      newErrors.expectedTripEndDate = tripDateError;
    }

    /*
     * Check settlement date
     */
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
      } else {
        const latest = new Date(neededDate);
        latest.setDate(latest.getDate() + SETTLEMENT_WINDOW_DAYS);
        if (settlementDate > latest) {
          newErrors.settlementDueDate =
            `Settlement Expected Date must be within ${SETTLEMENT_WINDOW_DAYS} days of Needed By Date.`;
        }
      }
    }

    /*
     * Check overdue advance
     */
    if (hasOverdueAdvance) {
      newErrors.overdue =
        "You have an overdue cash advance. Resolve the outstanding advance before requesting another advance.";
    }

    // A separate advance needs a reason when an outstanding balance exists (complete new only).
    if (requestType === ADVANCE_TYPE.COMPLETE_NEW && outstandingBalance > 0) {
      const reason = employeeJustification.trim();
      if (!reason) {
        newErrors.employeeJustification =
          "Explain why a separate new advance is needed while your outstanding balance remains.";
      } else if (reason.length < 20) {
        newErrors.employeeJustification = "The reason must be at least 20 characters.";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
   * Build request payload
   */
  const buildPayload = () => ({
    ...formData,
    amount: Number(formData.amount),
    requestType,
    // For Cash Advance + Outstanding the amount is the additional amount; the server checks they match.
    additionalAmount: requestType === ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING ? Number(formData.amount) : null,
    employeeJustification:
      requestType === ADVANCE_TYPE.COMPLETE_NEW && employeeJustification.trim() ? employeeJustification.trim() : null,
  });

  /*
   * Ask the server for the calculation before submitting.
   */
  // The figures the employee is confirming, taken from the server's preview.
  const confirmMessage = preview
    ? `Cash requested now: ${formatMoney(preview.cashRequested, preview.currencyCode || "INR")}. ` +
      `Total advance amount: ${formatMoney(preview.totalAdvanceAllocation, preview.currencyCode || "INR")}. ` +
      "This sends the request to your approver. You cannot change the amount or details after it is submitted."
    : "This sends the request to your approver. You cannot change the amount or details after it is submitted.";

  const rememberDraft = (id) => {
    draftIdRef.current = id;
    setDraftId(id);
  };

  const idOfCreated = (created) =>
    created?.data?.data?.advanceId || created?.data?.advanceId || created?.data?.data?.id;

  // Saves the draft if it does not exist yet, so a document has a request to belong to. Reuses it otherwise.
  const ensureDraftId = async () => {
    if (draftIdRef.current) {
      return draftIdRef.current;
    }
    if (!formData.title.trim() || !(Number(formData.amount) > 0)) {
      throw new Error("Enter a title and an amount before adding documents.");
    }
    const created = await cashAdvanceApi.create(buildPayload());
    const id = idOfCreated(created);
    if (!id) {
      throw new Error("The request was saved, but its ID was not returned.");
    }
    rememberDraft(id);
    return id;
  };

  const handlePreview = async () => {
    // Preview checks the whole form first, so the calculation is only ever made of valid input.
    if (!validateForm()) {
      return;
    }
    const amountNumber = Number(formData.amount);
    if (!(amountNumber > 0)) {
      setErrors((previous) => ({ ...previous, amount: "Enter a valid advance amount." }));
      return;
    }
    setPreviewing(true);
    try {
      const data = await cashAdvanceApi.preview({
        requestType,
        amount: amountNumber,
        currencyId: formData.currencyId || null,
      });
      setPreview(data ?? null);
    } catch (error) {
      showStatusToast(
        error?.response?.data?.message || error?.message || "Could not calculate the preview",
        "error",
        6000
      );
    } finally {
      setPreviewing(false);
    }
  };

  /*
   * Submit cash advance request
   */
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    // The employee must see the calculation before the request can be sent.
    if (!preview) {
      showStatusToast("Preview the calculation before you submit.", "error");
      return;
    }

    // Ask first. The request is created and sent for approval only after the user confirms.
    setConfirmSubmitOpen(true);
  };

  /*
   * Create the request, then send it for approval. Confirmed by the user in the dialog.
   */
  const confirmSubmit = async () => {
    setSubmitting(true);

    try {
      const payload = buildPayload();

      // A retry saves the current form into the draft from the first attempt, so nothing is duplicated and no stale values are sent.
      let advanceId = draftIdRef.current;
      if (advanceId) {
        await cashAdvanceApi.update(advanceId, payload);
      } else {
        const created = await cashAdvanceApi.create(payload);
        advanceId =
          created?.data?.data?.advanceId ||
          created?.data?.advanceId ||
          created?.data?.data?.id;

        if (!advanceId) {
          throw new Error("The request was created but its ID was not returned.");
        }
        draftIdRef.current = advanceId;
      }

      await cashAdvanceApi.submit(advanceId);
      draftIdRef.current = null;

      showStatusToast(
        "Cash advance request submitted for approval.",
        "success"
      );

      setConfirmSubmitOpen(false);
      navigate("/expense-management/cash-advance/my");
    } catch (error) {
      console.error(
        "Failed to submit cash advance:",
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit cash advance request.";
      showStatusToast(
        draftIdRef.current
          ? `${message} Your request is saved as a draft. Press Submit again to send it.`
          : message,
        "error",
        8000
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Save draft
   */
  const handleSaveDraft = async () => {
    const draftErrors = {};

    if (!formData.title.trim()) {
      draftErrors.title = "Title is required.";
    }

    if (
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      draftErrors.amount =
        "Enter a valid advance amount.";
    }

    if (Object.keys(draftErrors).length > 0) {
      setErrors(draftErrors);
      return;
    }

    setSavingDraft(true);

    try {
      const payload = buildPayload();

      console.log(
        "Cash Advance Draft Payload:",
        payload
      );

      if (draftIdRef.current) {
        await cashAdvanceApi.update(draftIdRef.current, payload);
      } else {
        const created = await cashAdvanceApi.create(payload);
        rememberDraft(idOfCreated(created));
      }

      showStatusToast(
        "Cash advance draft saved successfully.",
        "success"
      );

      navigate("/expense-management/cash-advance/my");
    } catch (error) {
      console.error(
        "Failed to save cash advance draft:",
        error
      );

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
          Submit a cash advance request for upcoming
          business expenses.
        </p>
      </div>

      {/* Outstanding Balance (compact) */}
      <OutstandingBalanceSummary
        loading={balanceLoading}
        totalOutstanding={outstandingBalance}
        openCount={activeAdvances.length}
        hasOverdue={hasOverdueAdvance}
        overdueMessage="You have an overdue cash advance. Resolve it before requesting another advance."
        currency="INR"
      />

      <EmployeeProfileCard profile={profile} loading={profileLoading} />

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <AdvanceTypeSelector value={requestType} onChange={setRequestType} />

        <div>
          <h2 className="text-sm font-bold text-gray-900">
            General Information
          </h2>

          <p className="mt-0.5 text-[11px] text-gray-500">
            Provide the details required for your cash
            advance request.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Title */}
          <FormInput
            labelClassName="block text-sm font-medium text-gray-700 leading-5"
            inputClassName="h-10"
            label={
              <RequiredLabel>
                Title / Subject
              </RequiredLabel>
            }
            name="title"
            value={formData.title}
            onChange={(event) =>
              updateField(
                "title",
                event.target.value
              )
            }
            placeholder="e.g. Client Visit Expenses"
            error={errors.title}
          />

          {/* Cost Center - Optional */}
          <FormSelect
            label={
              <OptionalLabel>
                Cost Center
              </OptionalLabel>
            }
            name="costCenterId"
            value={formData.costCenterId}
            onChange={(event) =>
              updateField(
                "costCenterId",
                event.target.value
              )
            }
            options={costCenterOptions}
            placeholder={
              loadingCostCenters
                ? "Loading cost centers..."
                : "-- Select Cost Center --"
            }
          />

          {/* Amount */}
          <FormInput
            labelClassName="block text-sm font-medium text-gray-700 leading-5"
            inputClassName="h-10"
            label={
              <RequiredLabel>
                {requestType === ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING ? "Additional Amount Required" : "Amount Required"}
              </RequiredLabel>
            }
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(event) =>
              updateField(
                "amount",
                event.target.value
              )
            }
            placeholder="Enter amount"
            error={errors.amount}
          />

          {requestType === ADVANCE_TYPE.COMPLETE_NEW && outstandingBalance > 0 && (
            <div>
              <label htmlFor="employee-justification" className="block text-sm font-medium leading-5 text-gray-700">
                Reason for Separate Advance <span className="text-red-500">*</span>
              </label>
              <textarea
                id="employee-justification"
                rows={3}
                value={employeeJustification}
                onChange={(event) => setEmployeeJustification(event.target.value)}
                placeholder="Why does this trip need a separate advance while your earlier balance remains?"
                className="mt-1 w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              {errors.employeeJustification && (
                <p className="mt-1 text-xs text-red-600">{errors.employeeJustification}</p>
              )}
            </div>
          )}

          {/* Currency */}
          <FormSelect
            label={
              <RequiredLabel>
                Currency
              </RequiredLabel>
            }
            name="currencyId"
            value={formData.currencyId}
            onChange={(event) =>
              updateField(
                "currencyId",
                event.target.value
              )
            }
            options={currencyOptions}
            placeholder={
              loadingCurrencies
                ? "Loading currencies..."
                : "-- Select Currency --"
            }
            error={errors.currencyId}
          />
        </div>

        {/* Purpose */}
        <FormTextArea
          label={
            <RequiredLabel>
              Purpose / Business Justification
            </RequiredLabel>
          }
          name="purpose"
          value={formData.purpose}
          onChange={(event) =>
            updateField(
              "purpose",
              event.target.value
            )
          }
          placeholder="Explain why the cash advance is required."
          rows={4}
          error={errors.purpose}
        />

        {/* Dates */}
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            Dates & Settlement Timeline
          </h2>

          <p className="mt-0.5 text-[11px] text-gray-500">
            Enter when the funds are required and when
            settlement is expected.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Needed By Date */}
          <FormInput
            label={
              <RequiredLabel>
                Needed By Date
              </RequiredLabel>
            }
            name="neededByDate"
            type="date"
            value={getDateValue(
              formData.neededByDate
            )}
            onChange={(event) =>
              updateField(
                "neededByDate",
                event.target.value
              )
            }
            error={errors.neededByDate}
          />

          <FormInput
            label="Expected event start date"
            name="expectedTripStartDate"
            type="date"
            value={getDateValue(formData.expectedTripStartDate)}
            onChange={(event) => updateField("expectedTripStartDate", event.target.value)}
            error={errors.expectedTripStartDate}
          />

          <FormInput
            label="Expected event end date"
            name="expectedTripEndDate"
            type="date"
            value={getDateValue(formData.expectedTripEndDate)}
            onChange={(event) => updateField("expectedTripEndDate", event.target.value)}
            error={errors.expectedTripEndDate}
          />

          {/* Settlement Date */}
          <FormInput
            label={
              <RequiredLabel>
                Settlement Expected Date
              </RequiredLabel>
            }
            name="settlementDueDate"
            type="date"
            min={getSettlementDateRange(formData.neededByDate)?.min}
            max={getSettlementDateRange(formData.neededByDate)?.max}
            disabled={!getSettlementDateRange(formData.neededByDate)}
            placeholder={
              getSettlementDateRange(formData.neededByDate)
                ? undefined
                : "Select needed-by date first"
            }
            value={getDateValue(
              formData.settlementDueDate
            )}
            onChange={(event) =>
              updateField(
                "settlementDueDate",
                event.target.value
              )
            }
            error={errors.settlementDueDate}
          />
        </div>

        {/* Notes - Optional */}
        <FormTextArea
          label={
            <OptionalLabel>
              Additional Notes
            </OptionalLabel>
          }
          name="notes"
          value={formData.notes}
          onChange={(event) =>
            updateField(
              "notes",
              event.target.value
            )
          }
          placeholder="Add any additional information."
          rows={3}
        />

        {/* Overdue Error */}
        {errors.overdue && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

            <p className="text-xs font-medium text-rose-700">
              {errors.overdue}
            </p>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {errors.general}
          </div>
        )}

        {/* Supporting documents (optional) */}
        <SupportingDocumentsUpload
          advanceId={draftId}
          ensureDraft={ensureDraftId}
          disabled={submitting || savingDraft}
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={previewing || submitting}
              className="whitespace-nowrap text-xs"
            >
              {previewing ? "Calculating..." : "Preview calculation"}
            </Button>
          }
        />

        {/* Preview */}
        <div className="space-y-3">
          <AdvanceCalculationPreview preview={preview} />
          {!preview && (
            <p className="text-right text-[11px] text-gray-500">
              Preview the calculation before you submit.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={
              savingDraft || submitting
            }
            className="text-xs"
          >
            {savingDraft ? (
              <LoadingSpinner
                size="sm"
                className="mr-1.5"
              />
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
              hasOverdueAdvance ||
              loadingCurrencies ||
              !preview
            }
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          >
            {submitting ? (
              <LoadingSpinner
                size="sm"
                className="mr-1.5"
              />
            ) : null}

            Submit Request
          </Button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={confirmSubmitOpen}
        title="Submit cash advance request"
        message={confirmMessage}
        confirmText="Submit for approval"
        cancelText="Cancel"
        onConfirm={confirmSubmit}
        onCancel={() => setConfirmSubmitOpen(false)}
        isLoading={submitting}
      />
    </div>
  );
}