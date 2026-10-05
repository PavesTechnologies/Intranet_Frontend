import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Sparkles,
  Briefcase,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  Receipt,
  Layers,
  Calendar,
  DollarSign,
} from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";

import {
  expenseReportService,
  lookupService,
  lineItemService,
  receiptService,
} from "@/pages/expense-management/api/expenseReportsApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";

import GenericTable from "@/components/Table/table";
import SearchInput from "@/components/filter/Searchbar";

import PolicyStatusBadge from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";
import {
  validateBusinessPurpose,
} from "@/pages/expense-management/components/expense-reports/ReportFormFields";

import SummaryPanel from "@/pages/expense-management/components/expense-reports/SummaryPanel";

import { useSubmitReport } from "@/pages/expense-management/approval-engine/hooks/useApprovalWorkflow";

import api from "@/api/axiosInstance";

import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";

const breadcrumbs = [
  {
    label: "Expense Management",
    to: "/expense-management/dashboard",
  },
  {
    label: "Expenses",
    to: "/expense-management/expenses/my",
  },
  {
    label: "Create Expense",
  },
];


const formatDate = (value) => {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};


const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });


const DetailField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
    <div className="mt-0.5 shrink-0 text-blue-700">
      {icon}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-gray-800 break-words">
        {value ?? "—"}
      </p>
    </div>
  </div>
);


const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused
      ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
      : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    },
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};


const compactSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.375rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused
      ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
      : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0px 4px",
    minHeight: "36px",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    },
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};


const ELIGIBLE_ADVANCE_STATUSES = [
  "DISBURSED",
  "PARTIALLY_SETTLED",
  "PARTIALLY_ADJUSTED",
  "EXPENSE_SUBMITTED",
  "EXPENSE_VERIFIED",
  "IN_PROGRESS",
  "ACTIVE",
  "SETTLEMENT_PENDING",
  "RECONCILIATION_PENDING",
  "UNDER_REVIEW",
  "SUBMITTED_FOR_REVIEW",
  "APPROVED",
];


const INELIGIBLE_ADVANCE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING",
  "REJECTED",
  "CANCELLED",
  "CLOSED",
  "SETTLED",
];


const extractAdvList = (res) => {
  if (!res) return [];

  const raw = res.data?.data ?? res.data ?? res;

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.content)) {
    return raw.content;
  }

  if (Array.isArray(raw?.items)) {
    return raw.items;
  }

  if (Array.isArray(res.data?.content)) {
    return res.data.content;
  }

  if (Array.isArray(res.data?.items)) {
    return res.data.items;
  }

  return [];
};


export default function CreateExpensePage() {
  const navigate = useNavigate();

  const submitMutation = useSubmitReport();


  // ============================================================
  // WIZARD STATE
  // ============================================================

  const [currentStep, setCurrentStep] = useState(1);

  const [reportId, setReportId] = useState(null);

  const [createdReport, setCreatedReport] = useState(null);

  const [lineItems, setLineItems] = useState([]);


  const steps = [
    {
      id: 1,
      label: "Report Details",
    },
    {
      id: 2,
      label: "Line Items",
    },
    {
      id: 3,
      label: "Review & Submit",
    },
  ];


  // ============================================================
  // LOOKUPS
  // ============================================================

  const [costCenters, setCostCenters] = useState([]);

  const [currencies, setCurrencies] = useState([]);

  const [categories, setCategories] = useState([]);

  const [projects, setProjects] = useState([]);

  const [cashAdvances, setCashAdvances] = useState([]);

  const [lookupsLoading, setLookupsLoading] = useState(true);


  // ============================================================
  // REPORT FORM
  // ============================================================

  const [formData, setFormData] = useState({
    title: "",
    businessPurpose: "",
    costCenterId: "",
    currencyId: "",
    cashAdvanceId: "",
  });


  const [formErrors, setFormErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);


  // ============================================================
  // READ CASH ADVANCE ID FROM URL
  // ============================================================

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const prefilledAdvId = searchParams.get("cashAdvanceId");

    if (!prefilledAdvId) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      cashAdvanceId: prefilledAdvId,
    }));
  }, []);


  // ============================================================
  // LINE ITEM STATE
  // ============================================================

  const [isLineItemDrawerOpen, setIsLineItemDrawerOpen] =
    useState(false);

  const [editingLineItem, setEditingLineItem] = useState(null);

  const [lineItemFormData, setLineItemFormData] = useState({
    categoryId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    merchantName: "",
    description: "",
    amount: "",
    currencyId: "",
    tax: emptyTaxValue,
    clientBillable: false,
    projectId: "",
  });

  const [lineItemErrors, setLineItemErrors] = useState({});
  const [receiptFile, setReceiptFile] = useState(null);

  const [savingLineItem, setSavingLineItem] = useState(false);


  // ============================================================
  // VIEW / DELETE LINE ITEM
  // ============================================================

  const [lineItemToView, setLineItemToView] = useState(null);

  const [lineItemToDelete, setLineItemToDelete] = useState(null);

  const [deletingLineItem, setDeletingLineItem] = useState(false);


  // ============================================================
  // STEP 2 FILTERS
  // ============================================================

  const [searchTerm, setSearchTerm] = useState("");

  const [sortBy, setSortBy] = useState("date_desc");


  // ============================================================
  // LOAD LOOKUPS
  // ============================================================

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLookupsLoading(true);


        const fetchAdvances = async () => {
          let res;

          try {
            res = await cashAdvanceApi.getMyAdvances();
          } catch {
            try {
              res = await cashAdvanceApi.getAll();
            } catch {
              return [];
            }
          }

          let list = extractAdvList(res);


          if (list.length === 0) {
            try {
              const allRes = await cashAdvanceApi.getAll();

              const allList = extractAdvList(allRes);

              if (allList.length > 0) {
                list = allList;
              }
            } catch {
              // Ignore fallback error.
            }
          }

          return list;
        };


        const [
          costCenterList,
          currencyList,
          advList,
        ] = await Promise.all([
          lookupService.getActiveCostCenters(),
          lookupService.getActiveCurrencies(),
          fetchAdvances(),
        ]);


        setCostCenters(
          Array.isArray(costCenterList)
            ? costCenterList
            : []
        );


        setCurrencies(
          Array.isArray(currencyList)
            ? currencyList
            : []
        );


        const searchParams = new URLSearchParams(
          window.location.search
        );

        const prefilledAdvId =
          searchParams.get("cashAdvanceId") ||
          formData.cashAdvanceId;


        const activeAdv = advList.filter((a) => {
          const advId = String(
            a.advanceId ||
              a.id ||
              a.cashAdvanceId ||
              ""
          );


          /*
           * If the page was opened directly from a cash advance,
           * ALWAYS keep that advance available in the dropdown.
           */
          if (
            prefilledAdvId &&
            String(prefilledAdvId) === advId
          ) {
            return true;
          }


          const statusUpper = String(
            a.status || ""
          )
            .toUpperCase()
            .trim()
            .replace(/\s+/g, "_");


          const isEligibleStatus =
            ELIGIBLE_ADVANCE_STATUSES.includes(
              statusUpper
            ) ||
            (
              !INELIGIBLE_ADVANCE_STATUSES.includes(
                statusUpper
              ) &&
              (
                statusUpper.includes("DISBURSE") ||
                statusUpper.includes("SETTLE") ||
                statusUpper.includes("EXPENSE") ||
                statusUpper.includes("PROGRESS")
              )
            );


          const amountVal = Number(
            a.amount ??
              a.advanceAmount ??
              a.disbursedAmount ??
              0
          );


          const outstandingVal = Number(
            a.outstandingBalance ??
              a.remainingBalance ??
              a.balance ??
              amountVal
          );


          const hasBalance =
            outstandingVal > 0 ||
            (
              a.outstandingBalance == null &&
              amountVal >= 0
            );


          return (
            isEligibleStatus &&
            hasBalance
          );
        });


        setCashAdvances(activeAdv);


      } catch (err) {
        console.error(
          "Failed to load lookups:",
          err
        );

        showStatusToast(
          "Failed to load cost centers / currencies.",
          "error"
        );
      } finally {
        setLookupsLoading(false);
      }
    };


    loadLookups();
  }, []);


  // ============================================================
  // PREFILL FROM CASH ADVANCE
  // ============================================================

  useEffect(() => {
    if (
      !formData.cashAdvanceId ||
      cashAdvances.length === 0
    ) {
      return;
    }


    const selectedAdvance =
      cashAdvances.find(
        (a) =>
          String(
            a.advanceId ||
              a.id ||
              a.cashAdvanceId ||
              ""
          ) ===
          String(formData.cashAdvanceId)
      );


    if (!selectedAdvance) {
      return;
    }


    const advancePurpose =
      selectedAdvance.purpose ||
      selectedAdvance.businessPurpose ||
      selectedAdvance.title ||
      "";


    const title =
      (formData.title || "").trim();


    let fallbackPurpose = "";


    if (advancePurpose.trim().length >= 10) {
      fallbackPurpose =
        advancePurpose.trim();
    } else if (title.length >= 3) {
      fallbackPurpose =
        `Actual expenses for ${title}`;
    } else {
      fallbackPurpose =
        "Actual expenses against approved cash advance";
    }


    if (
      !(formData.businessPurpose || "").trim()
    ) {
      setFormData((prev) => ({
        ...prev,
        businessPurpose: fallbackPurpose,
      }));
    }
  }, [
    formData.cashAdvanceId,
    cashAdvances,
  ]);


  // ============================================================
  // LOAD STEP 2 LOOKUPS
  // ============================================================

  useEffect(() => {
    if (
      currentStep > 1 &&
      categories.length === 0
    ) {
      const loadStep2Lookups = async () => {
        try {
          const [catList, projListResponse] = await Promise.all([
            lookupService.getActiveCategories(),
            api.get("/xms/admin/projects", {
              baseURL: window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }).catch(() => ({ data: { data: [] } })),
          ]);
          setCategories(catList);
          const pList = projListResponse?.data?.data || projListResponse?.data || [];
          setProjects(Array.isArray(pList) ? pList : []);
        } catch (err) {
          console.error(
            "Failed to load categories/projects:",
            err
          );
        }
      };


      loadStep2Lookups();
    }
  }, [
    currentStep,
    categories.length,
  ]);


  // ============================================================
  // SELECT OPTIONS
  // ============================================================

  const costCenterOptions = useMemo(
    () =>
      costCenters.map((c) => ({
        value: c.costCenterId,
        label: `${c.costCenterCode} - ${c.costCenterName}`,
      })),
    [costCenters]
  );


  const currencyOptions = useMemo(
    () =>
      currencies.map((c) => ({
        value: c.currencyId,
        label: `${c.currencyCode} - ${c.currencyName}`,
      })),
    [currencies]
  );


  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.categoryId,
        label: `${c.categoryCode} - ${c.categoryName}`,
      })),
    [categories]
  );


  const cashAdvanceOptions = useMemo(() => {
    return cashAdvances.map((a) => {
      const rawId = String(
        a.advanceId ||
          a.id ||
          a.cashAdvanceId ||
          ""
      );


      const formattedId =
        rawId.startsWith("ADV-")
          ? rawId
          : `ADV-${rawId.slice(0, 8)}`;


      const title =
        a.title ||
        a.purpose ||
        a.businessPurpose ||
        "Cash Advance";


      const amount = Number(
        a.amount ??
          a.advanceAmount ??
          a.disbursedAmount ??
          0
      );


      const currency =
        a.currencyCode ||
        a.currency ||
        "INR";


      const outstanding = Number(
        a.outstandingBalance ??
          a.remainingBalance ??
          a.balance ??
          amount
      );


      return {
        value: rawId,

        label:
          `${formattedId} (${title}) - ` +
          `Amount: ${amount} ${currency} ` +
          `(Outstanding: ${outstanding} ${currency})`,

        advance: a,
      };
    });
  }, [cashAdvances]);


  // ============================================================
  // REPORT FORM HANDLERS
  // ============================================================

  const handleInputChange = (e) => {
    const {
      name,
      value,
    } = e.target;


    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));


    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };


  const handleSelectChange = (
    name,
    value
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));


    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };


  // ============================================================
  // REPORT VALIDATION
  // ============================================================

  const validateForm = () => {
    const errors = {};


    const title =
      (formData.title || "").trim();


    const businessPurpose =
      (formData.businessPurpose || "").trim();


    if (!title) {
      errors.title =
        "Report title is required.";
    } else if (title.length < 3) {
      errors.title =
        "Title must be at least 3 characters.";
    }


    if (!formData.costCenterId) {
      errors.costCenterId =
        "Cost center is required.";
    }


    if (!formData.currencyId) {
      errors.currencyId =
        "Report currency is required.";
    }


    const businessPurposeError =
      validateBusinessPurpose(
        businessPurpose
      );


    if (businessPurposeError) {
      errors.businessPurpose =
        businessPurposeError;
    }


    setFormErrors(errors);


    if (Object.keys(errors).length > 0) {
      showStatusToast(
        Object.values(errors).join(" "),
        "error",
        5000
      );
    }


    return (
      Object.keys(errors).length === 0
    );
  };


  // ============================================================
  // CREATE / UPDATE EXPENSE REPORT
  // ============================================================

  const handleNextFromStep1 = async (e) => {
    if (e) {
      e.preventDefault();
    }


    if (submitting) {
      return;
    }


    /*
     * IMPORTANT:
     * If the page was opened from:
     *
     * /expense-management/expenses/create?cashAdvanceId=XXXX
     *
     * make sure the cash advance remains selected.
     */

    const searchParams =
      new URLSearchParams(
        window.location.search
      );


    const urlCashAdvanceId =
      searchParams.get(
        "cashAdvanceId"
      );


    const selectedCashAdvanceId =
      formData.cashAdvanceId ||
      urlCashAdvanceId ||
      "";


    // ----------------------------------------------------------
    // TITLE
    // ----------------------------------------------------------

    const title =
      (formData.title || "").trim();


    // ----------------------------------------------------------
    // BUSINESS PURPOSE
    // ----------------------------------------------------------

    let businessPurpose =
      (formData.businessPurpose || "").trim();


    /*
     * If Business Purpose is empty and a cash advance
     * is selected, automatically generate a valid purpose.
     */

    if (
      !businessPurpose &&
      selectedCashAdvanceId
    ) {
      const selectedAdvance =
        cashAdvances.find(
          (a) =>
            String(
              a.advanceId ||
                a.id ||
                a.cashAdvanceId ||
                ""
            ) ===
            String(
              selectedCashAdvanceId
            )
        );


      const advancePurpose =
        selectedAdvance?.purpose ||
        selectedAdvance?.businessPurpose ||
        selectedAdvance?.title ||
        "";


      if (
        advancePurpose.trim().length >=
        10
      ) {
        businessPurpose =
          advancePurpose.trim();
      } else if (
        title.length >= 3
      ) {
        businessPurpose =
          `Actual expenses for ${title}`;
      } else {
        businessPurpose =
          "Actual expenses against approved cash advance";
      }


      setFormData((prev) => ({
        ...prev,
        cashAdvanceId:
          selectedCashAdvanceId,
        businessPurpose,
      }));
    }


    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    const errors = {};


    if (!title) {
      errors.title =
        "Report title is required.";
    } else if (title.length < 3) {
      errors.title =
        "Title must be at least 3 characters.";
    }


    if (!formData.costCenterId) {
      errors.costCenterId =
        "Cost center is required.";
    }


    if (!formData.currencyId) {
      errors.currencyId =
        "Report currency is required.";
    }


    const businessPurposeError =
      validateBusinessPurpose(
        businessPurpose
      );


    if (businessPurposeError) {
      errors.businessPurpose =
        businessPurposeError;
    }


    setFormErrors(errors);


    if (Object.keys(errors).length > 0) {
      showStatusToast(
        Object.values(errors).join(" "),
        "error",
        6000
      );

      return;
    }


    // ----------------------------------------------------------
    // CREATE PAYLOAD
    // ----------------------------------------------------------

    /*
     * IMPORTANT:
     *
     * Do NOT send cashAdvanceId here.
     *
     * The current ExpenseReport create request is:
     *
     * title
     * businessPurpose
     * costCenterId
     * currencyId
     *
     * The selected cash advance is retained in the UI
     * for the subsequent settlement/adjustment workflow.
     */

    const payload = {
      title,
      businessPurpose,
      costCenterId:
        formData.costCenterId,
      currencyId:
        formData.currencyId,
    };


    console.log(
      "Creating expense report:",
      payload
    );


    try {
      setSubmitting(true);


      let res;


      // --------------------------------------------------------
      // UPDATE EXISTING REPORT
      // --------------------------------------------------------

      if (reportId) {
        res =
          await expenseReportService.update(
            reportId,
            payload
          );


        showStatusToast(
          "Expense report details updated successfully!",
          "success"
        );
      }


      // --------------------------------------------------------
      // CREATE NEW REPORT
      // --------------------------------------------------------

      else {
        res =
          await expenseReportService.create(
            payload
          );


        showStatusToast(
          "Expense report created successfully!",
          "success"
        );
      }


      console.log(
        "Expense report response:",
        res
      );


      // --------------------------------------------------------
      // EXTRACT REPORT ID
      // --------------------------------------------------------

      const newReportId =
        res?.data?.data?.reportId ||
        res?.data?.reportId ||
        res?.data?.data?.id ||
        res?.data?.id ||
        res?.data?.data?.expenseReportId ||
        res?.data?.expenseReportId;


      if (!newReportId) {
        console.error(
          "No report ID returned:",
          res
        );


        showStatusToast(
          "Expense report was saved, but the server did not return a report ID.",
          "error",
          6000
        );


        return;
      }


      // --------------------------------------------------------
      // SAVE REPORT ID
      // --------------------------------------------------------

      setReportId(newReportId);


      // --------------------------------------------------------
      // SAVE REPORT OBJECT
      // --------------------------------------------------------

      const returnedReport =
        res?.data?.data ||
        res?.data ||
        {};


      setCreatedReport({
        ...returnedReport,

        reportId:
          returnedReport.reportId ||
          newReportId,

        title:
          returnedReport.title ||
          title,

        businessPurpose:
          returnedReport.businessPurpose ||
          businessPurpose,

        costCenterId:
          returnedReport.costCenterId ||
          formData.costCenterId,

        currencyId:
          returnedReport.currencyId ||
          formData.currencyId,
      });


      // --------------------------------------------------------
      // KEEP CASH ADVANCE ID IN STATE
      // --------------------------------------------------------

      setFormData((prev) => ({
        ...prev,
        cashAdvanceId:
          selectedCashAdvanceId,
        businessPurpose,
      }));


      // --------------------------------------------------------
      // MOVE TO LINE ITEMS
      // --------------------------------------------------------

      setCurrentStep(2);


      // --------------------------------------------------------
      // LOAD EXISTING LINE ITEMS
      // --------------------------------------------------------

      try {
        const itemsRes =
          await lineItemService.getAll(
            newReportId
          );


        const payloadItems =
          itemsRes?.data?.data;


        const list =
          Array.isArray(payloadItems)
            ? payloadItems
            : payloadItems?.lineItems ||
              payloadItems?.content ||
              payloadItems?.data ||
              [];


        setLineItems(
          Array.isArray(list)
            ? list
            : []
        );
      } catch (lineItemErr) {
        console.warn(
          "Could not load existing line items:",
          lineItemErr
        );


        setLineItems([]);
      }


    } catch (err) {
      console.error(
        "Error creating/updating expense report:",
        err
      );


      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save expense report.";


      showStatusToast(
        errMsg,
        "error",
        6000
      );
    } finally {
      setSubmitting(false);
    }
  };


  // ============================================================
  // STEP CLICK
  // ============================================================

  const handleStepClick = (
    stepId
  ) => {
    if (
      stepId < currentStep
    ) {
      setFormErrors({});
      setCurrentStep(stepId);
    }
  };


  // ============================================================
  // FILTER LINE ITEMS
  // ============================================================

  const filteredLineItems =
    useMemo(() => {
      const q =
        searchTerm
          .trim()
          .toLowerCase();


      let list =
        !q
          ? lineItems
          : lineItems.filter(
              (li) => {
                const merchant =
                  (
                    li.merchantName ||
                    ""
                  ).toLowerCase();


                const category =
                  (
                    li.categoryName ||
                    ""
                  ).toLowerCase();


                const desc =
                  (
                    li.description ||
                    ""
                  ).toLowerCase();


                return (
                  merchant.includes(q) ||
                  category.includes(q) ||
                  desc.includes(q)
                );
              }
            );


      list = [...list].sort(
        (a, b) => {
          switch (sortBy) {
            case "date_asc":
              return (
                new Date(
                  a.expenseDate || 0
                ) -
                new Date(
                  b.expenseDate || 0
                )
              );


            case "amount_desc":
              return (
                (Number(b.amount) || 0) -
                (Number(a.amount) || 0)
              );


            case "amount_asc":
              return (
                (Number(a.amount) || 0) -
                (Number(b.amount) || 0)
              );


            case "merchant_asc":
              return (
                (
                  a.merchantName ||
                  ""
                ).localeCompare(
                  b.merchantName || ""
                )
              );


            case "date_desc":
            default:
              return (
                new Date(
                  b.expenseDate || 0
                ) -
                new Date(
                  a.expenseDate || 0
                )
              );
          }
        }
      );


      return list;
    }, [
      lineItems,
      searchTerm,
      sortBy,
    ]);


  // ============================================================
  // LINE ITEM INPUT
  // ============================================================

  const handleLineItemInputChange = (
    e
  ) => {
    const {
      name,
      value,
    } = e.target;


    setLineItemFormData(
      (prev) => ({
        ...prev,
        [name]: value,
      })
    );


    if (
      lineItemErrors[name]
    ) {
      setLineItemErrors(
        (prev) => ({
          ...prev,
          [name]: "",
        })
      );
    }
  };


  const handleLineItemSelectChange = (name, value) => {
    setLineItemFormData((prev) => ({ ...prev, [name]: value }));
    if (lineItemErrors[name]) setLineItemErrors((prev) => ({ ...prev, [name]: "" }));
  };


  // ============================================================
  // LINE ITEM VALIDATION
  // ============================================================

  const validateLineItemForm = () => {
    const errors = {};


    if (
      !lineItemFormData.categoryId
    ) {
      errors.categoryId =
        "Category is required.";
    }


    if (
      !lineItemFormData.expenseDate
    ) {
      errors.expenseDate =
        "Date is required.";
    }


    if (
      !lineItemFormData.merchantName.trim()
    ) {
      errors.merchantName =
        "Merchant is required.";
    }


    if (
      !lineItemFormData.amount ||
      Number(lineItemFormData.amount) <= 0
    ) {
      errors.amount =
        "Amount must be greater than 0.";
    }
    if (!lineItemFormData.currencyId) errors.currencyId = "Currency is required.";
    if (Number(lineItemFormData.taxAmount) < 0) {
      errors.taxAmount = "GST cannot be negative.";
    } else if (Number(lineItemFormData.taxAmount) > (Number(lineItemFormData.amount) || 0)) {
      errors.taxAmount = "GST cannot exceed total amount.";
    }
    if (lineItemFormData.clientBillable && !lineItemFormData.projectId) {
      errors.projectId = "Project is required for billable expenses.";
    }


    setLineItemErrors(errors);


    return (
      Object.keys(errors).length === 0
    );
  };


  // ============================================================
  // SAVE LINE ITEM
  // ============================================================

  const handleSaveLineItem = async (
    e
  ) => {
    e.preventDefault();


    if (!reportId) {
      showStatusToast(
        "Please create the expense report first.",
        "error"
      );

      return;
    }


    if (
      !validateLineItemForm()
    ) {
      return;
    }


    try {
      setSavingLineItem(true);


      const payload = {
        categoryId: lineItemFormData.categoryId,
        expenseDate: lineItemFormData.expenseDate,
        merchantName: lineItemFormData.merchantName.trim(),
        description: lineItemFormData.description.trim(),
        amount: Number(lineItemFormData.amount),
        currencyId: lineItemFormData.currencyId,
        taxAmount: Number(lineItemFormData.taxAmount) || 0,
        costCenterId: createdReport?.costCenterId || formData.costCenterId,
        clientBillable: !!lineItemFormData.clientBillable,
        projectId: lineItemFormData.clientBillable ? lineItemFormData.projectId : "",
      };


      let res;


      if (editingLineItem) {
        res =
          await lineItemService.update(
            reportId,
            editingLineItem.lineItemId,
            payload
          );


        showStatusToast(
          "Line item updated successfully!",
          "success"
        );
      } else {
        res =
          await lineItemService.create(
            reportId,
            payload
          );


        showStatusToast(
          "Line item added successfully!",
          "success"
        );
      }


      const savedItem =
        res?.data?.data ||
        res?.data ||
        {};


      const savedId =
        savedItem?.lineItemId ||
        editingLineItem?.lineItemId;


      // ========================================================
      // RECEIPT UPLOAD
      // ========================================================

      if (
        savedId &&
        receiptFile
      ) {
        const uploadData =
          new FormData();


        const safeName =
          receiptFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


        uploadData.append(
          "file",
          receiptFile,
          safeName
        );


        await receiptService.upload(
          savedId,
          uploadData
        );


        showStatusToast(
          "Receipt file uploaded successfully!",
          "success"
        );
      }


      setIsLineItemDrawerOpen(
        false
      );


      setEditingLineItem(
        null
      );


      setReceiptFile(null);


      // ========================================================
      // REFRESH LINE ITEMS
      // ========================================================

      const itemsRes =
        await lineItemService.getAll(
          reportId
        );


      const payloadItems =
        itemsRes?.data?.data;


      const list =
        Array.isArray(payloadItems)
          ? payloadItems
          : payloadItems?.lineItems ||
            payloadItems?.content ||
            payloadItems?.data ||
            [];


      setLineItems(
        Array.isArray(list)
          ? list
          : []
      );


    } catch (err) {
      console.error(
        "Error saving line item:",
        err
      );


      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to save line item.";


      showStatusToast(
        errMsg,
        "error"
      );
    } finally {
      setSavingLineItem(false);
    }
  };

  const handleDeleteLineItemConfirm = async () => {
    if (!lineItemToDelete || !reportId) return;
    try {
      setDeletingLineItem(true);
      await lineItemService.delete(reportId, lineItemToDelete.lineItemId);
      showStatusToast("Line item deleted successfully!", "success");
      setLineItemToDelete(null);
      
      // Refresh list
      const itemsRes = await lineItemService.getAll(reportId);
      const payloadItems = itemsRes.data?.data;
      const list = Array.isArray(payloadItems) ? payloadItems : payloadItems?.lineItems || payloadItems?.content || payloadItems?.data || [];
      setLineItems(list);
    } catch (err) {
      console.error("Error deleting line item:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingLineItem(false);
    }
  };

  // Step 3: Handle Final Submission for Approval
  const handleSubmitReport = async () => {
    if (!reportId) return;
    try {
      submitMutation.mutate(reportId, {
        onSuccess: () => {
          showStatusToast("Expense report submitted for approval successfully!", "success");
          navigate(`/expense-management/expenses/reports/${reportId}`);
        },
        onError: (err) => {
          const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to submit expense report.";
          showStatusToast(errMsg, "error", 4000);
        },
      });
    } catch (err) {
      console.error("Error final submitting report:", err);
    }
  };

  // Setup GenericTable configurations for Step 2
  const headers = ["Category", "Merchant", "Date", "Amount", "Policy", "GST", "Net Amount", "Base Amount", "Billable", "Actions"];
  const columns = ["category", "merchant", "date", "amount", "policy", "gst", "net", "base", "billable", "actions"];
  const tableRows = filteredLineItems.map((li) => {
    const showCurrency = li.currencyCode && (li.currencyCode === "EUR" || li.currencyCode !== li.baseCurrencyCode);
    return {
      category: <span className="font-medium text-gray-800 text-xs">{li.categoryName || "—"}</span>,
      merchant: (
        <div className="text-left text-xs">
          <p className="font-medium text-gray-900">{li.merchantName || "—"}</p>
          {li.description && <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{li.description}</p>}
        </div>
      ),
      date: <span className="text-xs">{formatDate(li.expenseDate)}</span>,
      amount: (
        <span className="font-mono font-semibold text-xs text-gray-900">
          {formatAmount(li.amount)} <span className="text-[10px] text-gray-400">{li.currencyCode}</span>
        </span>
      ),
      policy: <PolicyStatusBadge lineStatus={li.lineStatus} policyWarnings={li.policyWarnings} />,
      gst: (
        <span className="font-mono text-xs text-amber-600">
          {formatAmount(li.taxAmount)} {showCurrency && <span className="text-[10px] text-gray-400">{li.currencyCode}</span>}
        </span>
      ),
      net: (
        <span className="font-mono font-semibold text-xs text-emerald-700">
          {formatAmount(li.netAmount)} {showCurrency && <span className="text-[10px] text-gray-400">{li.currencyCode}</span>}
        </span>
      ),
      base: (
        <span className="font-mono text-[#0A0082] font-semibold text-xs">
          {formatAmount(li.baseAmount)} <span className="text-[10px] text-gray-400">{li.baseCurrencyCode}</span>
        </span>
      ),
      billable: li.clientBillable ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Yes</span>
      ) : (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">No</span>
      ),
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition rounded-md"
            onClick={() => setLineItemToView(li)}
          >
            <Eye size={13} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => {
              setEditingLineItem(li);
              setLineItemFormData({
                categoryId: li.categoryId || "",
                expenseDate: li.expenseDate || new Date().toISOString().split("T")[0],
                merchantName: li.merchantName || "",
                description: li.description || "",
                amount: li.amount || "",
                currencyId: li.currencyId || "",
                taxAmount: li.taxAmount || "0",
                clientBillable: !!li.clientBillable,
                projectId: li.projectId || "",
              });
              setReceiptFile(null);
              setLineItemErrors({});
              setIsLineItemDrawerOpen(true);
            }}
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => setLineItemToDelete(li)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    };
  });

  const sortOptions = [
    {
      label: "Date (Newest first)",
      value: "date_desc",
    },
    {
      label: "Date (Oldest first)",
      value: "date_asc",
    },
    {
      label: "Amount (High to Low)",
      value: "amount_desc",
    },
    {
      label: "Amount (Low to High)",
      value: "amount_asc",
    },
    {
      label: "Merchant (A-Z)",
      value: "merchant_asc",
    },
  ];


  // ============================================================
  // ACTIVE PROJECT OPTIONS
  // ============================================================

  const projectOptions = useMemo(() => {
    return projects
      .filter(
        (p) =>
          String(
            p.status || ""
          ).toUpperCase() ===
          "ACTIVE"
      )
      .map((p) => ({
        value: p.projectId,
        label:
          `${p.projectCode} - ${p.projectName}`,
      }));
  }, [projects]);


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-4">

      <Breadcrumb
        items={breadcrumbs}
      />


      {/* PAGE HEADER */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">

          <div className="p-2.5 rounded-lg bg-indigo-50 text-[#0A0082]">
            <Sparkles size={20} />
          </div>


          <div>
            <h1 className="text-xl font-bold text-[#0a174e]">
              Create Expense Report
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Start a new expense report, then add individual line items with receipts.
            </p>
          </div>

        </div>
      </div>


      {/* MAIN WIZARD */}

      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 space-y-6">


        {/* =====================================================
            STEP 1
        ====================================================== */}

        {currentStep === 1 && (
          <form
            onSubmit={handleNextFromStep1}
            className="space-y-5 max-w-2xl mx-auto"
          >

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
              requiredMark
              error={formErrors.businessPurpose}
            />


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* COST CENTER */}

              <div className="space-y-1">

                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">

                  <Briefcase
                    size={14}
                    className="text-gray-400"
                  />

                  Cost Center

                  <span className="text-red-500">
                    *
                  </span>

                </label>


                <Select
                  options={
                    costCenterOptions
                  }

                  value={
                    costCenterOptions.find(
                      (o) =>
                        o.value ===
                        formData.costCenterId
                    ) || null
                  }

                  onChange={(opt) =>
                    handleSelectChange(
                      "costCenterId",
                      opt
                        ? opt.value
                        : ""
                    )
                  }

                  placeholder="Search and select cost center..."

                  isSearchable

                  isLoading={
                    lookupsLoading
                  }

                  menuPortalTarget={
                    document.body
                  }

                  menuPosition="fixed"

                  styles={{
                    ...customSelectStyles,

                    menuPortal: (
                      base
                    ) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}

                  isDisabled={
                    submitting
                  }
                />


                {formErrors.costCenterId && (
                  <span className="text-xs text-red-600 block mt-1">
                    {
                      formErrors.costCenterId
                    }
                  </span>
                )}

              </div>


              {/* CURRENCY */}

              <div className="space-y-1">

                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">

                  <Landmark
                    size={14}
                    className="text-gray-400"
                  />

                  Report Currency

                  <span className="text-red-500">
                    *
                  </span>

                </label>


                <Select
                  options={
                    currencyOptions
                  }

                  value={
                    currencyOptions.find(
                      (o) =>
                        o.value ===
                        formData.currencyId
                    ) || null
                  }

                  onChange={(opt) =>
                    handleSelectChange(
                      "currencyId",
                      opt
                        ? opt.value
                        : ""
                    )
                  }

                  placeholder="Select report currency..."

                  isSearchable

                  isLoading={
                    lookupsLoading
                  }

                  menuPortalTarget={
                    document.body
                  }

                  menuPosition="fixed"

                  styles={{
                    ...customSelectStyles,

                    menuPortal: (
                      base
                    ) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}

                  isDisabled={
                    submitting
                  }
                />


                {formErrors.currencyId && (
                  <span className="text-xs text-red-600 block mt-1">
                    {
                      formErrors.currencyId
                    }
                  </span>
                )}

              </div>

            </div>


            {/* =================================================
                CASH ADVANCE
            ================================================== */}

            <div className="space-y-1 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">

              <label className="flex items-center gap-1.5 text-sm font-medium text-indigo-900">

                <DollarSign
                  size={14}
                  className="text-indigo-600"
                />

                Link Disbursed Cash Advance (Optional)

              </label>


              <p className="text-[11px] text-gray-500 mb-1">
                Link this expense report to an active disbursed cash advance to adjust outstanding balances.
              </p>


              <Select
                options={
                  cashAdvanceOptions
                }

                value={
                  cashAdvanceOptions.find(
                    (o) =>
                      String(
                        o.value
                      ) ===
                      String(
                        formData.cashAdvanceId
                      )
                  ) || null
                }

                onChange={(opt) =>
                  handleSelectChange(
                    "cashAdvanceId",
                    opt
                      ? opt.value
                      : ""
                  )
                }

                placeholder="Search and select active cash advance..."

                isClearable

                isSearchable

                isLoading={
                  lookupsLoading
                }

                menuPortalTarget={
                  document.body
                }

                menuPosition="fixed"

                styles={{
                  ...customSelectStyles,

                  menuPortal: (
                    base
                  ) => ({
                    ...base,
                    zIndex: 9999,
                  }),
                }}

                isDisabled={
                  submitting
                }
              />

            </div>


            {/* CASH ADVANCE INFORMATION */}

            {formData.cashAdvanceId && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">

                <div className="flex items-start gap-2">

                  <DollarSign
                    size={16}
                    className="text-green-600 mt-0.5"
                  />

                  <div>

                    <p className="text-xs font-semibold text-green-800">
                      Cash Advance Linked
                    </p>

                    <p className="text-[11px] text-green-700 mt-0.5">
                      Your actual expenses will be reconciled against this cash advance during the settlement process.
                    </p>

                  </div>

                </div>

              </div>
            )}


            {/* INFO */}

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">

              <FileText
                size={16}
                className="text-blue-500 shrink-0 mt-0.5"
              />

              <p className="text-xs text-blue-700">
                After creating the report, you'll be able to add individual line items — each with its own currency, GST, and receipts.
              </p>

            </div>


            {/* BUTTONS */}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-5">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    "/expense-management/expenses/my"
                  )
                }
                disabled={
                  submitting
                }
              >
                Cancel
              </Button>


              <Button
                type="button"
                variant="primary"
                loading={
                  submitting
                }
                loadingText="Creating..."
                disabled={
                  submitting
                }
                onClick={() => handleNextFromStep1()}
              >
                Create Expense Report
              </Button>

            </div>

          </form>
        )}


        {/* =====================================================
            STEP 2
        ====================================================== */}

        {currentStep === 2 && (
          <div className="space-y-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">

              <div className="flex items-center gap-2">

                <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
                  <Receipt size={16} />
                </div>

                <h2 className="text-base font-bold text-gray-900">
                  Actual Expenses / Line Items
                </h2>

              </div>


              <Button
                type="button"
                variant="primary"
                onClick={() => {

                  setEditingLineItem(
                    null
                  );


                  setLineItemFormData({
                    categoryId: "",
                    expenseDate:
                      new Date()
                        .toISOString()
                        .split(
                          "T"
                        )[0],
                    merchantName:
                      "",
                    description:
                      "",
                    amount: "",
                    currencyId: createdReport?.currencyId || formData.currencyId || "",
                    taxAmount: "0",
                    clientBillable: false,
                    projectId: "",
                  });
                  setReceiptFile(null);
                  setLineItemErrors({});
                  setIsLineItemDrawerOpen(true);
                }}
                className="shadow-sm"
              >

                <Plus size={14} />

                Add Line Item

              </Button>

            </div>


            {/* FILTERS */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-2">

              <div className="sm:col-span-2">

                <SearchInput
                  value={
                    searchTerm
                  }
                  onSearch={
                    setSearchTerm
                  }
                  placeholder="Search by merchant, category, description..."
                />

              </div>


              <div>

                <select
                  name="sortBy"
                  value={
                    sortBy
                  }
                  onChange={(e) =>
                    setSortBy(
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >

                  {sortOptions.map(
                    (o) => (
                      <option
                        key={
                          o.value
                        }
                        value={
                          o.value
                        }
                      >
                        {
                          o.label
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>


            {/* LINE ITEMS */}

            {filteredLineItems.length ===
            0 ? (
              <div className="py-12 border border-gray-200 border-dashed rounded-xl flex flex-col items-center justify-center text-center">

                <Layers
                  className="h-10 w-10 text-gray-300 mb-3"
                />

                <h3 className="text-sm font-semibold text-gray-700">
                  No Actual Expenses Added
                </h3>

                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Add the actual expenses paid using the cash advance, then upload the corresponding receipts.
                </p>

              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={headers} rows={tableRows} columns={columns} />
              </div>
            )}


            {/* STEP 2 BUTTONS */}

            <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-5">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentStep(
                    1
                  )
                }
              >
                Back
              </Button>


              <div className="flex gap-2">

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      "/expense-management/expenses/my"
                    )
                  }
                >
                  Cancel
                </Button>


                <Button
                  type="button"
                  variant="primary"
                  onClick={() =>
                    setCurrentStep(
                      3
                    )
                  }
                >
                  Next
                </Button>

              </div>

            </div>

          </div>
        )}


        {/* =====================================================
            STEP 3
        ====================================================== */}

        {currentStep === 3 && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">

              {/* LEFT */}

              <div className="lg:col-span-2 space-y-5">

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">

                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                    Report Information
                  </h3>


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <DetailField
                      icon={
                        <FileText size={16} />
                      }
                      label="Report Title"
                      value={
                        createdReport?.title ||
                        formData.title
                      }
                    />


                    <DetailField
                      icon={
                        <FileText size={16} />
                      }
                      label="Business Purpose"
                      value={
                        createdReport?.businessPurpose ||
                        formData.businessPurpose ||
                        "—"
                      }
                    />


                    <DetailField
                      icon={
                        <Briefcase size={16} />
                      }
                      label="Cost Center"
                      value={
                        createdReport?.costCenterName ||
                        costCenters.find(
                          (c) =>
                            c.costCenterId ===
                            formData.costCenterId
                        )?.costCenterName ||
                        "—"
                      }
                    />


                    <DetailField
                      icon={
                        <Landmark size={16} />
                      }
                      label="Report Currency"
                      value={
                        createdReport?.currencyCode ||
                        currencies.find(
                          (c) =>
                            c.currencyId ===
                            formData.currencyId
                        )?.currencyCode ||
                        "—"
                      }
                    />


                    <DetailField
                      icon={
                        <Calendar size={16} />
                      }
                      label="Created Date"
                      value={formatDate(
                        createdReport?.createdAt
                      )}
                    />


                    <DetailField
                      icon={
                        <FileText size={16} />
                      }
                      label="Status"
                      value="DRAFT"
                    />


                    <DetailField
                      icon={
                        <FileText size={16} />
                      }
                      label="Report ID"
                      value={
                        createdReport?.reportNumber ||
                        reportId
                      }
                    />

                  </div>

                </div>


                {/* LINE ITEMS */}

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">

                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                    Actual Expenses ({lineItems.length})
                  </h3>


                  {lineItems.length ===
                  0 ? (
                    <p className="text-xs text-gray-400 italic">
                      No actual expenses added to this report.
                    </p>
                  ) : (
                    <div className="w-full overflow-x-auto">

                      <table className="w-full text-left border-collapse text-xs">

                        <thead>

                          <tr className="border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider">

                            <th className="py-2.5 px-3">
                              Category
                            </th>

                            <th className="py-2.5 px-3">
                              Merchant
                            </th>

                            <th className="py-2.5 px-3">
                              Date
                            </th>

                            <th className="py-2.5 px-3 text-right">
                              Amount
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {lineItems.map(
                            (li) => (
                              <tr
                                key={
                                  li.lineItemId
                                }
                                className="border-b border-gray-100 last:border-b-0"
                              >

                                <td className="py-2.5 px-3 font-medium text-gray-800">
                                  {
                                    li.categoryName
                                  }
                                </td>

                                <td className="py-2.5 px-3 text-gray-600">
                                  {
                                    li.merchantName
                                  }
                                </td>

                                <td className="py-2.5 px-3 text-gray-500">
                                  {formatDate(
                                    li.expenseDate
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right font-semibold font-mono text-gray-900">
                                  {formatAmount(
                                    li.amount
                                  )}{" "}
                                  {
                                    li.currencyCode
                                  }
                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  )}

                </div>

              </div>


              {/* SUMMARY */}

              <div className="lg:col-span-1">

                <SummaryPanel
                  report={{
                    ...createdReport,
                    status: "DRAFT",
                  }}
                  lineItems={
                    lineItems
                  }
                />

              </div>

            </div>


            {/* STEP 3 BUTTONS */}

            <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-5">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentStep(
                    2
                  )
                }
              >
                Back
              </Button>


              <div className="flex gap-2">

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      "/expense-management/expenses/my"
                    )
                  }
                >
                  Cancel
                </Button>


                <Button
                  type="button"
                  variant="primary"
                  loading={
                    submitMutation.isPending
                  }
                  loadingText="Submitting..."
                  onClick={
                    handleSubmitReport
                  }
                  className="bg-[#0A0082] hover:bg-[#080066] border-none"
                >
                  Submit for Approval
                </Button>

              </div>

            </div>

          </div>
        )}

      </div>


      {/* =======================================================
          ADD / EDIT LINE ITEM MODAL
      ======================================================== */}

      {isLineItemDrawerOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* HEADER */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">

              <h2 className="text-base font-bold text-gray-900">
                {
                  editingLineItem
                    ? "Edit Line Item"
                    : "Add Actual Expense"
                }
              </h2>


              <button
                type="button"
                onClick={() =>
                  setIsLineItemDrawerOpen(
                    false
                  )
                }
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>

            </div>


            {/* FORM */}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              <form
                id="line-item-drawer-form"
                onSubmit={
                  handleSaveLineItem
                }
                className="space-y-4"
              >

                {/* CATEGORY */}

                <div className="space-y-1">

                  <label className="block text-xs font-semibold text-gray-700">

                    Category{" "}

                    <span className="text-red-500">
                      *
                    </span>

                  </label>


                  <Select
                    options={
                      categoryOptions
                    }

                    value={
                      categoryOptions.find(
                        (o) =>
                          o.value ===
                          lineItemFormData.categoryId
                      ) || null
                    }

                    onChange={(opt) =>
                      handleLineItemSelectChange(
                        "categoryId",
                        opt
                          ? opt.value
                          : ""
                      )
                    }

                    placeholder="Select category..."

                    isSearchable

                    styles={
                      compactSelectStyles
                    }

                    isDisabled={
                      savingLineItem
                    }
                  />


                  {lineItemErrors.categoryId && (
                    <span className="text-[11px] text-red-600 block mt-0.5">
                      {
                        lineItemErrors.categoryId
                      }
                    </span>
                  )}

                </div>


                {/* DATE + MERCHANT */}

                <div className="grid grid-cols-2 gap-4">

                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">

                      Expense Date{" "}

                      <span className="text-red-500">
                        *
                      </span>

                    </label>


                    <input
                      type="date"
                      name="expenseDate"
                      value={
                        lineItemFormData.expenseDate
                      }
                      onChange={
                        handleLineItemInputChange
                      }
                      disabled={
                        savingLineItem
                      }
                      className={`w-full px-2.5 py-1.5 h-[38px] rounded-md border text-xs focus:outline-none focus:ring-2 ${
                        lineItemErrors.expenseDate
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />


                    {lineItemErrors.expenseDate && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        {
                          lineItemErrors.expenseDate
                        }
                      </span>
                    )}

                  </div>


                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">

                      Merchant Name{" "}

                      <span className="text-red-500">
                        *
                      </span>

                    </label>


                    <input
                      type="text"
                      name="merchantName"
                      placeholder="e.g. Uber, Restaurant Name"
                      value={
                        lineItemFormData.merchantName
                      }
                      onChange={
                        handleLineItemInputChange
                      }
                      disabled={
                        savingLineItem
                      }
                      className={`w-full px-2.5 py-1.5 h-[38px] rounded-md border text-xs focus:outline-none focus:ring-2 ${
                        lineItemErrors.merchantName
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />


                    {lineItemErrors.merchantName && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        {
                          lineItemErrors.merchantName
                        }
                      </span>
                    )}

                  </div>

                </div>

                {/* Amount, Currency & GST */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">

                      Amount{" "}

                      <span className="text-red-500">
                        *
                      </span>

                    </label>


                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={
                        lineItemFormData.amount
                      }
                      onChange={
                        handleLineItemInputChange
                      }
                      disabled={
                        savingLineItem
                      }
                      className={`w-full px-2.5 py-1.5 h-[38px] rounded-md border text-xs focus:outline-none focus:ring-2 ${
                        lineItemErrors.amount
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />


                    {lineItemErrors.amount && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        {
                          lineItemErrors.amount
                        }
                      </span>
                    )}

                  </div>


                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">

                      Currency{" "}

                      <span className="text-red-500">
                        *
                      </span>

                    </label>


                    <Select
                      options={
                        currencyOptions
                      }

                      value={
                        currencyOptions.find(
                          (o) =>
                            o.value ===
                            lineItemFormData.currencyId
                        ) || null
                      }

                      onChange={(opt) =>
                        handleLineItemSelectChange(
                          "currencyId",
                          opt
                            ? opt.value
                            : ""
                        )
                      }

                      placeholder="Currency"

                      isSearchable

                      styles={
                        compactSelectStyles
                      }

                      isDisabled={
                        savingLineItem
                      }
                    />


                    {lineItemErrors.currencyId && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        {
                          lineItemErrors.currencyId
                        }
                      </span>
                    )}

                  </div>


                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      GST (Tax) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="taxAmount"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={lineItemFormData.taxAmount}
                      onChange={handleLineItemInputChange}
                      disabled={savingLineItem}
                      className={`w-full px-2.5 py-1.5 h-[38px] rounded-md border text-xs focus:outline-none focus:ring-2 ${
                        lineItemErrors.taxAmount
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />
                    {lineItemErrors.taxAmount && (
                      <span className="text-[11px] text-red-600 block mt-0.5">{lineItemErrors.taxAmount}</span>
                    )}
                  </div>
                </div>


                {/* BILLABLE / PROJECT */}

                <div className="grid grid-cols-2 gap-4">

                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">
                      Client Billable?
                    </label>


                    <select
                      name="clientBillable"
                      value={
                        lineItemFormData.clientBillable
                          .toString()
                      }
                      onChange={(e) =>
                        handleLineItemSelectChange(
                          "clientBillable",
                          e.target.value ===
                            "true"
                        )
                      }
                      disabled={
                        savingLineItem
                      }
                      className="w-full px-2.5 py-1.5 h-[38px] rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >

                      <option value="false">
                        No
                      </option>

                      <option value="true">
                        Yes
                      </option>

                    </select>

                  </div>


                  <div className="space-y-1">

                    <label className="block text-xs font-semibold text-gray-700">

                      Project{" "}

                      {lineItemFormData.clientBillable && (
                        <span className="text-red-500">
                          *
                        </span>
                      )}

                    </label>


                    <Select
                      options={projects
                        .filter((p) => (p.status || "").toString().toUpperCase() === "ACTIVE")
                        .map((p) => ({ value: p.projectId, label: `${p.projectCode} - ${p.projectName}` }))}
                      value={projects
                        .filter((p) => (p.status || "").toString().toUpperCase() === "ACTIVE")
                        .map((p) => ({ value: p.projectId, label: `${p.projectCode} - ${p.projectName}` }))
                        .find((o) => o.value === lineItemFormData.projectId) || null}
                      onChange={(opt) => handleLineItemSelectChange("projectId", opt ? opt.value : "")}
                      placeholder="Select project..."

                      isSearchable

                      styles={
                        compactSelectStyles
                      }

                      isDisabled={
                        savingLineItem ||
                        !lineItemFormData.clientBillable
                      }
                    />


                    {lineItemErrors.projectId && (
                      <span className="text-[11px] text-red-600 block mt-0.5">
                        {
                          lineItemErrors.projectId
                        }
                      </span>
                    )}

                  </div>

                </div>


                {/* DESCRIPTION */}

                <div className="space-y-1">

                  <label className="block text-xs font-semibold text-gray-700">
                    Description
                  </label>


                  <input
                    type="text"
                    name="description"
                    placeholder="Optional notes about this expense..."
                    value={
                      lineItemFormData.description
                    }
                    onChange={
                      handleLineItemInputChange
                    }
                    disabled={
                      savingLineItem
                    }
                    className="w-full px-2.5 py-1.5 h-[38px] rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />

                </div>


                {/* RECEIPT */}

                <div className="space-y-1">

                  <label className="block text-xs font-semibold text-gray-700">
                    Receipt Attachment (Optional)
                  </label>


                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={
                      savingLineItem
                    }
                    onChange={(e) => {

                      if (
                        e.target.files
                          ?.length
                      ) {
                        setReceiptFile(
                          e.target.files[0]
                        );
                      }

                    }}
                    className="w-full border border-gray-300 rounded-md p-1 bg-white text-xs"
                  />


                  {receiptFile && (
                    <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                      File chosen:{" "}
                      {
                        receiptFile.name
                      }
                    </p>
                  )}

                </div>

              </form>

            </div>


            {/* FOOTER */}

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setIsLineItemDrawerOpen(
                    false
                  )
                }
                disabled={
                  savingLineItem
                }
              >
                Cancel
              </Button>


              <Button
                type="submit"
                form="line-item-drawer-form"
                variant="primary"
                loading={
                  savingLineItem
                }
                loadingText="Saving..."
                disabled={
                  savingLineItem
                }
              >
                Save
              </Button>

            </div>

          </div>

        </div>
      )}


      {/* =======================================================
          VIEW LINE ITEM
      ======================================================== */}

      {lineItemToView && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">

              <h2 className="text-base font-bold text-gray-900">
                Line Item Details
              </h2>


              <button
                type="button"
                onClick={() =>
                  setLineItemToView(
                    null
                  )
                }
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>

            </div>


            <div className="p-6 space-y-4 overflow-y-auto">

              <div className="grid grid-cols-2 gap-4">

                <DetailField
                  icon={
                    <Layers size={15} />
                  }
                  label="Category"
                  value={
                    lineItemToView.categoryName
                  }
                />


                <DetailField
                  icon={
                    <Calendar size={15} />
                  }
                  label="Expense Date"
                  value={formatDate(
                    lineItemToView.expenseDate
                  )}
                />


                <DetailField
                  icon={
                    <Briefcase size={15} />
                  }
                  label="Merchant"
                  value={
                    lineItemToView.merchantName
                  }
                />


                <DetailField
                  icon={
                    <Briefcase size={15} />
                  }
                  label="Cost Center"
                  value={
                    lineItemToView.costCenterName
                  }
                />


                <div className="col-span-2 grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">

                  <div>

                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Amount
                    </span>

                    <span className="text-sm font-semibold font-mono text-gray-800">
                      {formatAmount(
                        lineItemToView.amount
                      )}{" "}
                      {
                        lineItemToView.currencyCode
                      }
                    </span>

                  </div>


                  <div>

                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      GST (Tax)
                    </span>

                    <span className="text-sm font-semibold font-mono text-amber-600">
                      {formatAmount(
                        lineItemToView.taxAmount
                      )}{" "}
                      {
                        lineItemToView.currencyCode
                      }
                    </span>

                  </div>


                  <div>

                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Net Amount
                    </span>

                    <span className="text-sm font-semibold font-mono text-emerald-700">
                      {formatAmount(
                        lineItemToView.netAmount
                      )}{" "}
                      {
                        lineItemToView.currencyCode
                      }
                    </span>

                  </div>

                </div>


                <DetailField
                  icon={
                    <Landmark size={15} />
                  }
                  label="Base Amount"
                  value={`${formatAmount(
                    lineItemToView.baseAmount
                  )} ${
                    lineItemToView.baseCurrencyCode ||
                    ""
                  }`}
                />


                <DetailField
                  icon={
                    <Briefcase size={15} />
                  }
                  label="Client Billable?"
                  value={
                    lineItemToView.clientBillable
                      ? "Yes"
                      : "No"
                  }
                />


                {lineItemToView.clientBillable && (
                  <div className="col-span-2">

                    <DetailField
                      icon={
                        <Briefcase size={15} />
                      }
                      label="Project"
                      value={
                        lineItemToView.projectName
                      }
                    />

                  </div>
                )}


                <div className="col-span-2">

                  <DetailField
                    icon={
                      <FileText size={15} />
                    }
                    label="Description"
                    value={
                      lineItemToView.description
                    }
                  />

                </div>

              </div>

            </div>


            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end shrink-0">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLineItemToView(
                    null
                  )
                }
              >
                Close
              </Button>

            </div>

          </div>

        </div>
      )}


      {/* =======================================================
          DELETE MODAL
      ======================================================== */}

      <ConfirmationModal
        isOpen={
          !!lineItemToDelete
        }
        title="Delete Line Item"
        message={`Are you sure you want to delete the line item from "${lineItemToDelete?.merchantName || "this merchant"}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={
          handleDeleteLineItemConfirm
        }
        onCancel={() =>
          setLineItemToDelete(
            null
          )
        }
        isLoading={
          deletingLineItem
        }
        variant="danger"
      />

    </div>
  );
}