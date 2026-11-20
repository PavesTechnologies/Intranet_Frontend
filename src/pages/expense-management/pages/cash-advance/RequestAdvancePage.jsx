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

// The same rules the server applies when a cash advance is created, drafts included. Checked here so a draft or a
// document upload is refused with a clear message before the request is sent, not with a bare "422" error.
export const draftProblem = (form, today = todayIso()) => {
  if (!form.neededByDate) return "Needed by date is required and must be in the future.";
  if (form.neededByDate <= today) return "Needed by date must be a future date.";
  if (!form.settlementDueDate) return "Settlement expected date is required.";
  if (form.settlementDueDate <= today) return "Settlement due date must be a future date.";
  if (form.settlementDueDate < form.neededByDate) return "Settlement expected date cannot be before the needed by date.";
  const amount = Number(form.amount);
  if (!(amount > 0) || amount % ADVANCE_ROUND_BLOCK !== 0) {
    return `The advance amount must be a positive multiple of ${ADVANCE_ROUND_BLOCK}.`;
  }
  return "";
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

    // Only advances that were paid out can still be owed. Drafts and requests still awaiting approval are not owed money,
    // and the server does not count them either.
    return [
      "DISBURSED",
      "IN_PROGRESS",
      "EXPENSE_SUBMITTED",
      "EXPENSE_VERIFIED",
      "SETTLEMENT_PENDING",
      "PARTIALLY_SETTLED",
      "PARTIALLY_ADJUSTED",
      "ADJUSTED",
      "AWAITING_REIMBURSEMENT",
      "OVERDUE",
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  // True once the draft must survive leaving the page: the employee pressed Save Draft, or the request was submitted.
  // Otherwise a draft that this page created by itself (to hold an uploaded document, or by a submit attempt that
  // failed) is removed when the employee cancels or leaves, so no request appears that they never chose to save.
  const keepDraftRef = useRef(false);
  // What the form started with, to tell whether Cancel would throw anything away.
  const initialFormRef = useRef(null);
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

  if (initialFormRef.current === null) initialFormRef.current = formData;

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
   * Balances Finance carried forward. That money has already left its advance and sits in the employee's outstanding,
   * waiting for the next request, so the form opens as "Cash Advance + Outstanding" and says where it comes from. It
   * can be taken in whatever the status of the advance it came from.
   */
  const waitingCarryForwards = useMemo(
    () => advances.filter((a) => Number(a.carryForwardReadyAmount) > 0),
    [advances]
  );
  // What was asked to carry forward. The server caps it at each advance's real balance when Finance approves.
  const waitingCarryForwardTotal = waitingCarryForwards.reduce(
    (sum, a) => sum + (Number(a.carryForwardReadyAmount) || 0),
    0
  );
  const typeChosenRef = useRef(false);
  useEffect(() => {
    if (!typeChosenRef.current && waitingCarryForwards.length > 0) {
      setRequestType(ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING);
    }
  }, [waitingCarryForwards.length]);
  const chooseRequestType = (type) => {
    typeChosenRef.current = true;
    setRequestType(type);
  };

  /*
   * Calculate outstanding balance
   */
  // What is owed on open advances, plus every balance Finance carried forward (held in the employee's outstanding).
  const outstandingBalance = useMemo(() => {
    return activeAdvances.reduce(
      (total, advance) =>
        total + getOutstandingBalance(advance),
      0
    ) + waitingCarryForwardTotal;
  }, [activeAdvances, waitingCarryForwardTotal]);

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

  // Bring the first problem into view. Fields such as "Reason for Separate Advance" sit far above the buttons, so
  // without this a failed check looked like a Submit button that did nothing.
  const FIELD_ORDER = ["title", "costCenterId", "amount", "employeeJustification", "currencyId", "purpose",
    "neededByDate", "expectedTripStartDate", "expectedTripEndDate", "settlementDueDate"];
  const focusFirstError = (errs) => {
    const key = FIELD_ORDER.find((k) => errs[k]) || Object.keys(errs)[0];
    if (!key) return;
    const el = key === "employeeJustification"
      ? document.getElementById("employee-justification")
      : document.querySelector(`[name="${key}"]`);
    if (el) {
      el.scrollIntoView?.({ behavior: "smooth", block: "center" });
      el.focus?.({ preventScroll: true });
    }
    showStatusToast(errs[key], "error", 6000);
  };

  // A reason is needed only for a Complete New request while money is still owed. The server decides this from the
  // advance ledger, and the balance stored on the list can be stale (it can read 0 while money is owed, or the other way
  // round). So once the server has answered, through a preview or by refusing a save, its answer is used; until then
  // the list balance is only a guess.
  const [serverNeedsReason, setServerNeedsReason] = useState(false);
  useEffect(() => {
    setServerNeedsReason(false);
  }, [requestType]);
  const justificationRequired = preview
    ? !!preview.justificationRequired
    : requestType === ADVANCE_TYPE.COMPLETE_NEW && (serverNeedsReason || outstandingBalance > 0);

  const REASON_MIN_LENGTH = 20;
  const reasonProblem = () => {
    const reason = employeeJustification.trim();
    if (!reason) return "Explain why a separate new advance is needed while your outstanding balance remains.";
    if (reason.length < REASON_MIN_LENGTH) return `The reason must be at least ${REASON_MIN_LENGTH} characters.`;
    return "";
  };
  // Shows the reason box with its message and brings it into view. Deferred so the box is on the page before scrolling.
  const askForReason = (message) => {
    setErrors((previous) => ({ ...previous, employeeJustification: message }));
    setTimeout(() => focusFirstError({ employeeJustification: message }), 0);
  };
  // The server refuses a save without a reason when it finds money owed. Show the box instead of a bare error.
  const isMissingReasonError = (error) =>
    /separate (new )?advance/i.test(error?.response?.data?.message || error?.message || "");

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
    // An overdue advance does not stop the request. It is routed to Finance, who must authorise it before approval.

    // A separate advance needs a reason only when the server has said money is owed. With nothing owed, none is asked.
    // Before the first preview this is not checked here; Submit checks it once the server has answered.
    if (preview && justificationRequired && reasonProblem()) {
      newErrors.employeeJustification = reasonProblem();
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return false;
    }
    return true;
  };

  /*
   * Build request payload
   */
  const buildPayload = () => ({
    ...formData,
    amount: Number(formData.amount),
    requestType,
    // For Cash Advance + Outstanding the amount is the additional amount; the server checks they match.
    additionalAmount: null,
    // Sent only when asked for: the server also checks the length of a reason it did not need.
    employeeJustification:
      justificationRequired && employeeJustification.trim() ? employeeJustification.trim() : null,
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

  // Removes the draft this page created by itself, with its documents (the server deletes only the request row).
  // Returns false when it could not be removed, so the employee can be told where to find it.
  const discardAutoDraft = async () => {
    const id = draftIdRef.current;
    if (!id || keepDraftRef.current) return true;
    try {
      const docs = await cashAdvanceApi.listDocuments(id).catch(() => []);
      for (const doc of Array.isArray(docs) ? docs : []) {
        await cashAdvanceApi.deleteDocument(id, doc.documentId);
      }
      await cashAdvanceApi.delete(id);
      draftIdRef.current = null;
      setDraftId(null);
      return true;
    } catch {
      return false;
    }
  };

  // Leaving by the browser's Back button or the menu also removes that draft. Fire and forget: the page is gone.
  useEffect(() => () => {
    const id = draftIdRef.current;
    if (!id || keepDraftRef.current) return;
    draftIdRef.current = null;
    Promise.resolve()
      .then(() => cashAdvanceApi.listDocuments(id))
      .catch(() => [])
      .then((docs) => Promise.all((Array.isArray(docs) ? docs : []).map((d) => cashAdvanceApi.deleteDocument(id, d.documentId))))
      .then(() => cashAdvanceApi.delete(id))
      .catch(() => {});
  }, []);

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
    const problem = draftProblem(formData);
    if (problem) {
      throw new Error(problem);
    }
    // The server refuses to save the request without this reason, which made the upload fail with no pointer to
    // the field. Check it here and show the field instead.
    const reasonMessage = "Fill in \"Reason for Separate Advance\" above (at least 20 characters) before adding documents.";
    if (justificationRequired && reasonProblem()) {
      askForReason(reasonMessage);
      throw new Error(reasonMessage);
    }
    let created;
    try {
      created = await cashAdvanceApi.create(buildPayload());
    } catch (error) {
      if (isMissingReasonError(error)) {
        setServerNeedsReason(true);
        askForReason(reasonMessage);
        throw new Error(reasonMessage);
      }
      throw error;
    }
    const id = idOfCreated(created);
    if (!id) {
      throw new Error("The request was saved, but its ID was not returned.");
    }
    rememberDraft(id);
    return id;
  };

  // Returns the preview, or null when the form is invalid or the server could not calculate it.
  const handlePreview = async () => {
    // Preview checks the whole form first, so the calculation is only ever made of valid input.
    if (!validateForm()) {
      return null;
    }
    const amountNumber = Number(formData.amount);
    if (!(amountNumber > 0)) {
      setErrors((previous) => ({ ...previous, amount: "Enter a valid advance amount." }));
      return null;
    }
    setPreviewing(true);
    try {
      const data = await cashAdvanceApi.preview({
        requestType,
        amount: amountNumber,
        currencyId: formData.currencyId || null,
      });
      setPreview(data ?? null);
      return data ?? null;
    } catch (error) {
      showStatusToast(
        error?.response?.data?.message || error?.message || "Could not calculate the preview",
        "error",
        6000
      );
      return null;
    } finally {
      setPreviewing(false);
    }
  };

  /*
   * Submit cash advance request
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    // The employee must see the calculation before the request is sent. If it has not been run yet, Submit runs it
    // now; the confirmation dialog then shows its figures. (Submit used to stay disabled until Preview was pressed.)
    const calculated = preview ?? (await handlePreview());
    if (!calculated) {
      return;
    }

    // The server's answer decides whether a reason is needed: none when nothing is owed.
    if (calculated.justificationRequired && reasonProblem()) {
      askForReason(reasonProblem());
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
      keepDraftRef.current = true;
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
          ? `${message} Fix it and press Submit again. Nothing has been sent.`
          : message,
        "error",
        8000
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Cancel: leave without submitting. Ask first only when something would be lost.
   */
  const leavePage = async () => {
    setDiscarding(true);
    const removed = await discardAutoDraft();
    setDiscarding(false);
    setCancelOpen(false);
    if (!removed) {
      showStatusToast("The request was cancelled, but its unsaved draft could not be removed. Delete it from My Advances.", "error", 8000);
    }
    keepDraftRef.current = true; // handled here; the unmount cleanup must not try again
    navigate("/expense-management/cash-advance/my");
  };
  const handleCancel = () => {
    const changed =
      JSON.stringify(formData) !== JSON.stringify(initialFormRef.current) ||
      employeeJustification.trim() !== "" ||
      !!draftIdRef.current;
    if (changed) {
      setCancelOpen(true);
    } else {
      leavePage();
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

    const problem = draftProblem(formData);
    if (problem && !draftErrors.amount) {
      draftErrors.general = problem;
    }

    if (Object.keys(draftErrors).length > 0) {
      setErrors(draftErrors);
      focusFirstError(draftErrors);
      return;
    }

    setSavingDraft(true);

    try {
      const payload = buildPayload();

      if (draftIdRef.current) {
        await cashAdvanceApi.update(draftIdRef.current, payload);
      } else {
        const created = await cashAdvanceApi.create(payload);
        rememberDraft(idOfCreated(created));
      }

      // The employee chose to keep it: leaving the page must not remove this draft.
      keepDraftRef.current = true;
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

      if (isMissingReasonError(error)) {
        setServerNeedsReason(true);
        askForReason(reasonProblem() || "Explain why a separate new advance is needed while your outstanding balance remains.");
        return;
      }

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
        <AdvanceTypeSelector value={requestType} onChange={chooseRequestType} />

        {waitingCarryForwards.length > 0 && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                {formatMoney(waitingCarryForwardTotal, "INR")} is carried forward into this request
              </p>
              <ul className="space-y-0.5">
                {waitingCarryForwards.map((a) => (
                  <li key={a.advanceId}>
                    {formatMoney(a.carryForwardReadyAmount, a.currencyCode || "INR")} from{" "}
                    <span className="font-medium">{a.title || "an earlier advance"}</span>{" "}
                    <span className="font-mono text-[10px] text-violet-700">{a.advanceNumber || ""}</span>
                  </li>
                ))}
              </ul>
              {requestType === ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING ? (
                <p className="text-violet-800">
                  Enter only the new cash you need. Finance moves the carried-forward balance into this advance when it approves.
                </p>
              ) : (
                <p className="text-amber-800">
                  "Complete New" keeps that balance on its own advance. Choose "Cash Advance + Outstanding" to carry it into this one.
                </p>
              )}
            </div>
          </div>
        )}

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
                Amount Required
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

          {justificationRequired && (
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
              Submit calculates the amounts first and asks you to confirm them.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={savingDraft || submitting || discarding}
            className="text-xs"
          >
            Cancel
          </Button>

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
              loadingCurrencies ||
              previewing
            }
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          >
            {submitting || previewing ? (
              <LoadingSpinner
                size="sm"
                className="mr-1.5"
              />
            ) : null}

            {previewing ? "Calculating..." : "Submit Request"}
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

      <ConfirmationModal
        isOpen={cancelOpen}
        title="Discard this request?"
        message={
          draftId
            ? "Everything you entered, including the documents you added, will be discarded. Nothing is sent or kept."
            : "Nothing you entered has been saved. Leave without submitting?"
        }
        confirmText="Discard and leave"
        cancelText="Keep editing"
        onConfirm={leavePage}
        onCancel={() => setCancelOpen(false)}
        isLoading={discarding}
      />
    </div>
  );
}