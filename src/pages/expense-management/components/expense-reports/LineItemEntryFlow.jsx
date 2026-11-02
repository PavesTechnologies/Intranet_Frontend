import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";
import { AlertCircle, AlertTriangle, FileText, Keyboard, RotateCcw, RotateCw, Sparkles, UploadCloud, X, ZoomIn, ZoomOut } from "lucide-react";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/modal";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import TaxBreakdownPanel, {
  emptyTaxValue,
  taxRequestFieldsForConfirm,
  taxValueFromOcr,
  validateTaxValue,
} from "@/pages/expense-management/components/expense-reports/TaxBreakdownPanel";
import {
  receiptAmountMismatch,
  scanFoundNothing,
  scanNeedsReview,
} from "@/pages/expense-management/components/expense-reports/receiptScanChecks";
import {
  SplitAllocationSection,
  crossDepartmentCostCenterLabels,
  useSplitAllocation,
} from "@/pages/expense-management/components/expense-reports/SplitAllocation";
import {
  BillableClientFields,
  projectIdForClient,
  projectOptionsForClient,
  useActiveClients,
} from "@/pages/expense-management/components/expense-reports/BillableClientFields";
import { expenseDateError, expenseDateHint, useExpenseDateRange } from "@/pages/expense-management/components/expense-reports/expenseDateRange";
import { toIsoDate } from "@/pages/expense-management/pages/reports/reportUtils";
import CurrencyConversionCard from "@/pages/expense-management/components/expense-reports/CurrencyConversionCard";

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });


/**
 * The server's already-claimed check on a receipt (upload, receipt list or OCR result):
 * BLOCKING = submission will be refused, WARNING = must be explained before submitting.
 * Returns null when the receipt hasn't been claimed anywhere else.
 */
const duplicateNotice = (payload) => {
  const status = payload?.duplicateStatus;
  if (status !== "BLOCKING" && status !== "WARNING") return null;
  return {
    status,
    message: payload.duplicateMessage || "This receipt matches one that has already been claimed.",
  };
};

const notifyDuplicateReceipt = (payload) => {
  const notice = duplicateNotice(payload);
  if (!notice) return;
  if (notice.status === "BLOCKING") {
    showStatusToast(`Duplicate receipt — ${notice.message}`, "error");
  } else {
    showStatusToast(notice.message, "warning");
  }
};

const DuplicateReceiptBanner = ({ notice, className = "" }) => {
  if (!notice) return null;
  const blocking = notice.status === "BLOCKING";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        blocking ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
      } ${className}`}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{blocking ? "Duplicate receipt" : "Possible duplicate receipt"}</p>
        <p>{notice.message}</p>
        {blocking && <p className="mt-0.5">This report can't be submitted while it contains this receipt.</p>}
      </div>
    </div>
  );
};

const compactSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.375rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0px 4px",
    minHeight: "32px",
    height: "32px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0px 6px",
    height: "30px",
  }),
  input: (base) => ({
    ...base,
    margin: "0px",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: "30px",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "4px",
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: "0.75rem",
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: "0.75rem",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

/**
 * "Add Line Item" entry: pick Manual Entry or an AI scan of a receipt. Manual goes to the caller's line-item
 * drawer (onManual). A scan opens the review form here, and saving it calls onSaved. Used by the expense
 * report detail page and the create-report page, so both add line items the same way.
 */
export default function LineItemEntryFlow({
  isOpen,
  onClose,
  onManual,
  onSaved,
  reportId,
  report,
  categories,
  currencies,
  categoryOptions,
  costCenterOptions,
  currencyOptions,
  projects,
}) {
  const [selectionStep, setSelectionStep] = useState("options"); // 'options' | 'upload' | 'scanning' | 'success'
  const [scannedFile, setScannedFile] = useState(null);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dateRange = useExpenseDateRange(reportId, isOpen);

  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [isOcrReviewOpen, setIsOcrReviewOpen] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState({
    categoryId: "",
    expenseDate: "",
    merchantName: "",
    description: "",
    amount: "",
    currencyId: "",
    tax: emptyTaxValue,
    costCenterId: "",
    clientBillable: false,
    clientId: "",
    allocationReason: "",
    projectId: "",
    ocrReceiptId: null,
    confidenceScore: null,
  });
  const [ocrReviewErrors, setOcrReviewErrors] = useState({});
  const [ocrSubmitting, setOcrSubmitting] = useState(false);
  // Same client / project / split / cross-department rules as the Manual Entry drawer. The split's
  // reference is the entered amount: the line's base amount only exists once it is created.
  const ocrClients = useActiveClients();
  const ocrSplit = useSplitAllocation(Number(ocrReviewData.amount) || 0, formatAmount);
  const [ocrHomeDepartmentUuid, setOcrHomeDepartmentUuid] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const reloadOcrClients = ocrClients.reload;
  useEffect(() => {
    if (!isOcrReviewOpen) return;
    reloadOcrClients();
    lookupService.getAllocationContext()
      .then((ctx) => setOcrHomeDepartmentUuid(ctx?.homeDepartmentUuid || null))
      .catch(() => setOcrHomeDepartmentUuid(null)); // unknown department: the server decides at submit
  }, [isOcrReviewOpen, reloadOcrClients]);

  useEffect(() => {
    if (!isOcrReviewOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOcrReviewOpen]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleRotateLeft = () => setRotation((prev) => prev - 90);
  const handleRotateRight = () => setRotation((prev) => prev + 90);
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };


  useEffect(() => {
    if (!scannedFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(scannedFile);
    setReceiptPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [scannedFile]);


  // Fresh start each time the chooser opens.
  useEffect(() => {
    if (!isOpen) return;
    setSelectionStep("options");
    setScannedFile(null);
    setScanningProgress(0);
  }, [isOpen]);

  const handleSelectManual = () => {
    onClose();
    onManual();
  };

  const handleReceiptFileSelect = async (file) => {
    const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];
    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      showStatusToast("Only PDF, PNG, JPG, and JPEG files are allowed.", "error");
      return;
    }

    setScannedFile(file);
    setSelectionStep("scanning");
    setScanningProgress(5);

    try {
      const formData = new FormData();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      formData.append("file", file, safeName);

      // Upload file to the report's receipt store
      const uploadRes = await api.post(`/xms/employee/expense-reports/${reportId}/receipts`, formData, {
        baseURL: XMS_BASE_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const receiptId = uploadRes.data?.data?.receiptId || uploadRes.data?.receiptId;
      if (!receiptId) {
        throw new Error("Failed to retrieve receipt ID from upload response");
      }
      // Already-claimed check on the file itself; same-invoice matches come back with the OCR result.
      notifyDuplicateReceipt(uploadRes.data?.data);

      setScanningProgress(20);

      // Poll status
      let pollCount = 0;
      const maxPolls = 35; // 35 seconds max
      const interval = setInterval(async () => {
        try {
          pollCount++;
          const ocrRes = await api.get(`/xms/employee/receipts/${receiptId}/ocr`, {
            baseURL: XMS_BASE_URL,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          // Checking if response data holds OCR result or status
          const responsePayload = ocrRes.data?.data || ocrRes.data;
          const status = responsePayload?.processingStatus || responsePayload?.ocrStatus;

          setScanningProgress(Math.min(95, 20 + Math.round((pollCount / maxPolls) * 75)));

          if (status === "OCR_COMPLETED") {
            clearInterval(interval);
            setScanningProgress(100);

            const confidence = responsePayload.confidenceScore !== undefined ? responsePayload.confidenceScore : 1.0;
            // The backend's call (configured confidence threshold, missing fields, totals that don't add up):
            // the core fields are left for the employee to enter from the receipt.
            const isLowConfidence = scanNeedsReview(responsePayload);
            const foundNothing = scanFoundNothing(responsePayload);

            // Clean/validate Merchant Name
            // Low-confidence scans still fill the fields with what was read; the review notice asks for a check.
            let merchantVal = (responsePayload.merchantName || "").trim();

            // Clean/validate GST
            let taxVal = responsePayload.taxAmount;
            let amountVal = responsePayload.totalAmount;

            let taxNum = Number(taxVal);
            let amountNum = Number(amountVal);

            if (isNaN(amountNum) || amountNum <= 0) {
              amountNum = 0;
            }
            if (isNaN(taxNum) || taxNum < 0) {
              taxNum = 0;
            }

            // Keep what OCR read even when it looks wrong - zeroing it silently loses the receipt's
            // GST. Flag it instead; submit validation still blocks GST above the amount.
            let taxWarning = "";
            if (taxNum > 0 && amountNum > 0 && taxNum > amountNum) {
              taxWarning = "GST read from the receipt is more than the amount. Check both values.";
            } else if (taxNum > 0 && isLowConfidence) {
              taxWarning = "Low-confidence scan. Check the GST against the receipt.";
            }

            // Pre-select the category the server suggested from the receipt text (it is always an
            // active category); fall back to matching by name/code.
            let categoryIdVal = "";
            if (responsePayload.categoryId && categories.some((c) => c.categoryId === responsePayload.categoryId)) {
              categoryIdVal = responsePayload.categoryId;
            } else if (responsePayload.categoryName) {
              const matchedCat = categories.find(
                (c) => c.categoryName?.toLowerCase() === responsePayload.categoryName.toLowerCase() ||
                       c.categoryCode?.toLowerCase() === responsePayload.categoryName.toLowerCase()
              );
              if (matchedCat) {
                categoryIdVal = matchedCat.categoryId;
              }
            }

            // Pre-match currency code if present in active currencies list
            let currencyIdVal = "";
            if (responsePayload.currencyCode) {
              const matchedCur = currencies.find(
                (c) => c.currencyCode?.toUpperCase() === responsePayload.currencyCode.toUpperCase()
              );
              if (matchedCur) {
                currencyIdVal = matchedCur.currencyId;
              }
            }
            if (!currencyIdVal && report?.currencyId) {
              currencyIdVal = report.currencyId;
            }

            const reviewData = {
              categoryId: categoryIdVal,
              expenseDate: responsePayload.receiptDate || toIsoDate(new Date()),
              merchantName: merchantVal,
              description: "",
              amount: amountNum <= 0 ? "" : amountNum.toFixed(2),
              currencyId: currencyIdVal,
              // The receipt's GST is the entered side; the server compares it with the tax code.
              tax: taxValueFromOcr(taxNum > 0 ? taxNum.toFixed(2) : null),
              ocrTaxAmount: taxNum > 0 ? taxNum : null,
              costCenterId: report?.costCenterId || "",
              clientBillable: false,
              clientId: "",
              allocationReason: "",
              projectId: "",
              ocrReceiptId: receiptId,
              confidenceScore: confidence,
              // What the scan read, kept even when the amount field is left blank, to compare the claim against.
              ocrTotalAmount: amountNum > 0 ? amountNum : null,
              ocrCurrencyCode: responsePayload.currencyCode || null,
            };

            // Close selection dialog and open the full-screen OCR review modal
            onClose();
            setOcrScanNotice(
              foundNothing
                ? "No merchant, date or total could be read from this file. Check it's a clear photo or PDF of the receipt, or enter the details yourself."
                : isLowConfidence
                  ? "Parts of this scan couldn't be read reliably. The fields are filled from the scan: check the merchant, date, amount and GST against the receipt."
                  : ""
            );
            setOcrDuplicate(duplicateNotice(responsePayload));
            setOcrTaxWarning(taxWarning);
            setOcrTaxPreview(null);
            setOcrReviewData(reviewData);
            setOcrReviewErrors({});
            ocrSplit.reset();
            setIsOcrReviewOpen(true);

            setTimeout(() => {
              setSelectionStep("options");
              setScanningProgress(0);
            }, 300);
          } else if (status === "FAILED") {
            clearInterval(interval);
            showStatusToast(`OCR failed: ${responsePayload?.failureReason || "Could not parse receipt"}`, "error");
            setSelectionStep("upload");
          } else if (pollCount >= maxPolls) {
            clearInterval(interval);
            showStatusToast("OCR processing timed out. Proceeding to manual entry.", "warning");
            handleSelectManual();
          }
        } catch (err) {
          console.error("Polling error:", err);
          if (pollCount >= maxPolls) {
            clearInterval(interval);
            showStatusToast("OCR service unavailable. Proceeding to manual entry.", "error");
            handleSelectManual();
          }
        }
      }, 1200);

    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      const errMsg = uploadErr.response?.data?.message || uploadErr.response?.data?.detail || "Failed to upload receipt for OCR.";
      showStatusToast(errMsg, "error");
      setSelectionStep("upload");
    }
  };

  // Latest server tax preview of the OCR review form (the receipt's GST vs the tax code).
  const [ocrTaxPreview, setOcrTaxPreview] = useState(null);
  // Shown until the user edits the amount or tax: OCR's GST looked implausible or the scan was low-confidence.
  const [ocrTaxWarning, setOcrTaxWarning] = useState("");
  // Already-claimed check for the scanned receipt (file, invoice or merchant/amount/date match).
  const [ocrDuplicate, setOcrDuplicate] = useState(null);
  // The scan read nothing usable, or needs checking by hand.
  const [ocrScanNotice, setOcrScanNotice] = useState("");
  // The claimed amount against the receipt total the scan read.
  const ocrAmountMismatch = receiptAmountMismatch({
    enteredAmount: ocrReviewData.amount,
    receiptTotal: ocrReviewData.ocrTotalAmount,
    enteredCurrencyCode: currencyOptions.find((o) => o.value === ocrReviewData.currencyId)?.code,
    receiptCurrencyCode: ocrReviewData.ocrCurrencyCode,
  });

  const handleOcrInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") setOcrTaxWarning("");
    setOcrReviewData((prev) => ({ ...prev, [name]: value }));
    if (ocrReviewErrors[name]) setOcrReviewErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleOcrSelectChange = (name, value) => {
    // A new category brings its own default tax code, so an explicit pick is dropped.
    setOcrReviewData((prev) =>
      name === "categoryId" ? { ...prev, categoryId: value, tax: { ...prev.tax, taxCodeId: null } } : { ...prev, [name]: value }
    );
    if (ocrReviewErrors[name]) setOcrReviewErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleOcrClientChange = (clientId) => {
    setOcrReviewData((prev) => ({ ...prev, clientId, projectId: projectIdForClient(projects, prev.projectId, clientId) }));
    if (ocrReviewErrors.clientId) setOcrReviewErrors((prev) => ({ ...prev, clientId: "" }));
  };

  const ocrClientOptions = ocrClients.clients
    .filter((c) => c.clientId)
    .map((c) => ({ value: c.clientId, label: c.clientName || c.clientId }));
  const ocrProjectOptions = projectOptionsForClient(projects, ocrReviewData.clientId);
  const ocrCrossDepartmentCostCenters = crossDepartmentCostCenterLabels({
    split: ocrSplit,
    costCenterId: ocrReviewData.costCenterId,
    costCenterOptions,
    homeDepartmentUuid: ocrHomeDepartmentUuid,
  });

  const validateOcrForm = () => {
    const errors = {};
    const amountNum = Number(ocrReviewData.amount);

    if (!ocrReviewData.amount || amountNum <= 0) {
      errors.amount = "Amount is required and must be greater than 0.";
    }
    if (ocrAmountMismatch?.needsReason && !(ocrReviewData.description || "").trim()) {
      errors.description = "Explain why you're claiming more than the receipt total.";
    }
    const taxError = validateTaxValue(ocrReviewData.tax, ocrTaxPreview, ocrReviewData.amount);
    if (taxError) errors.tax = taxError;
    if (!ocrReviewData.merchantName.trim()) errors.merchantName = "Merchant is required.";
    if (!ocrReviewData.currencyId) errors.currencyId = "Currency is required.";
    if (!ocrReviewData.categoryId) errors.categoryId = "Category is required.";
    if (!ocrReviewData.costCenterId) errors.costCenterId = "Cost center is required.";
    const expenseDateProblem = expenseDateError(ocrReviewData.expenseDate, dateRange);
    if (expenseDateProblem) errors.expenseDate = expenseDateProblem;
    if (ocrReviewData.clientBillable && !ocrReviewData.clientId) {
      errors.clientId = "Client is required when billable.";
    }
    if (ocrCrossDepartmentCostCenters.length > 0 && !(ocrReviewData.allocationReason || "").trim()) {
      errors.allocationReason = "Explain why this expense is charged to another department.";
    }

    setOcrReviewErrors(errors);
    return errors;
  };

  const handleOcrSubmit = async (e) => {
    e.preventDefault();
    const problems = validateOcrForm();
    if (Object.keys(problems).length > 0) {
      // The messages sit inside the form and can be out of view. Say what is missing and bring the first one into view.
      showStatusToast(`Save blocked: ${Object.values(problems).join(" ")}`, "error", 8000);
      const firstField = Object.keys(problems)[0];
      document.querySelector(`[name="${firstField}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!ocrSplit.validate()) return;

    const payload = {
      categoryId: ocrReviewData.categoryId,
      expenseDate: ocrReviewData.expenseDate,
      merchantName: ocrReviewData.merchantName.trim(),
      description: ocrReviewData.description ? ocrReviewData.description.trim() : "",
      amount: Number(ocrReviewData.amount),
      currencyId: ocrReviewData.currencyId,
      ...taxRequestFieldsForConfirm(ocrReviewData.tax, ocrTaxPreview),
      costCenterId: ocrReviewData.costCenterId,
      // Project is optional for a billable expense; the client is what AR bills.
      clientId: ocrReviewData.clientBillable ? (ocrReviewData.clientId || null) : null,
      projectId: ocrReviewData.clientBillable ? (ocrReviewData.projectId || null) : null,
      clientBillable: !!ocrReviewData.clientBillable,
      allocationReason: ocrCrossDepartmentCostCenters.length > 0 ? (ocrReviewData.allocationReason || "").trim() || null : null,
    };

    try {
      setOcrSubmitting(true);
      const res = await api.post(`/xms/employee/receipts/${ocrReviewData.ocrReceiptId}/confirm`, {
        ...payload,
        lineItemId: null
      }, {
        baseURL: XMS_BASE_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });

      const lineItemId = res.data?.data?.lineItemId;
      const splitResult = lineItemId ? await ocrSplit.save(lineItemId) : { ok: true };
      if (splitResult.ok) {
        showStatusToast("Line item created and receipt confirmed successfully!", "success");
      } else {
        // The line item exists either way - only the split needs redoing, from the line's Edit drawer.
        showStatusToast(`Line item created, but the split allocation could not be saved: ${splitResult.message}`, "error");
      }
      onSaved?.();
      setIsOcrReviewOpen(false);
      setScannedFile(null);
    } catch (err) {
      console.error("Error confirming OCR receipt:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to confirm line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setOcrSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (selectionStep !== "scanning") {
            onClose();
          }
        }}
        title="Add Line Item"
        subtitle={
          selectionStep === "options"
            ? "Choose how you'd like to add this expense line item."
            : selectionStep === "upload"
              ? "Upload a receipt to scan and auto-fill line item details."
              : selectionStep === "scanning"
                ? "Our AI is reading your receipt metadata. Please wait..."
                : "Review the extracted information below."
        }
        size={selectionStep === "options" ? "xl" : "lg"}
        fullScreenMobile
        closeOnBackdrop={selectionStep !== "scanning"}
        showCloseButton={selectionStep !== "scanning"}
      >
        {selectionStep === "options" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
            {/* Manual Entry */}
            <button
              type="button"
              onClick={handleSelectManual}
              className="flex flex-col items-center justify-between p-6 rounded-2xl border border-gray-200 bg-white hover:border-indigo-600 hover:shadow-lg transition-all duration-300 group text-center"
            >
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100 transition-colors mb-4">
                  <Keyboard size={28} />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                  Manual Entry
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Fill out merchant, amount, category, date, and project information yourself. Best for quick entries.
                </p>
              </div>
              <div className="mt-6 text-xs font-semibold text-indigo-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Start typing &rarr;
              </div>
            </button>

            {/* Automatic Scan */}
            <button
              type="button"
              onClick={() => setSelectionStep("upload")}
              className="flex flex-col items-center justify-between p-6 rounded-2xl border border-gray-200 bg-white hover:border-indigo-600 hover:shadow-lg transition-all duration-300 group text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                AUTOMATIC
              </div>

              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100 transition-colors mb-4">
                  <Sparkles size={28} className="animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                  Automatic (AI Scan)
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Upload a receipt. Our AI automatically extracts merchant, date, amount, and GST calculations in seconds.
                </p>
              </div>
              <div className="mt-6 text-xs font-semibold text-indigo-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Scan receipt &rarr;
              </div>
            </button>
          </div>
        )}

        {selectionStep === "upload" && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSelectionStep("options")}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-gray-100"
              >
                &larr; Back
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (e.dataTransfer.files?.length) {
                  handleReceiptFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${isDraggingFile
                ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
                : "border-gray-200 hover:border-indigo-500 bg-gray-50/50"
                }`}
            >
              <input
                type="file"
                id="ocr-receipt-upload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleReceiptFileSelect(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="ocr-receipt-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-4 w-full h-full"
              >
                <div className="p-3 rounded-full bg-white shadow-md text-indigo-600">
                  <UploadCloud size={32} className="animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800">
                    Drag and drop your receipt here
                  </p>
                  <p className="text-xs text-gray-500">
                    or <span className="text-indigo-600 font-bold hover:underline">browse files</span>
                  </p>
                </div>
                <div className="text-[10px] text-gray-400 border border-gray-200/60 rounded-full px-2.5 py-0.5 bg-white font-medium">
                  Supports PDF, PNG, JPG up to 10MB
                </div>
              </label>
            </div>
          </div>
        )}

        {selectionStep === "scanning" && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-20 h-28 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <FileText size={40} className="text-gray-400" />
              <div
                className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"
                style={{
                  top: `${scanningProgress}%`,
                  transition: 'top 0.2s linear'
                }}
              />
            </div>

            <div className="space-y-2 w-full max-w-xs">
              <p className="text-sm font-semibold text-gray-800">
                {scanningProgress < 30 && "Initializing scanner..."}
                {scanningProgress >= 30 && scanningProgress < 75 && "Extracting receipt data..."}
                {scanningProgress >= 75 && scanningProgress < 100 && "Analyzing taxes & currency..."}
                {scanningProgress === 100 && "Scan complete!"}
              </p>

              <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1 rounded-full transition-all duration-200"
                  style={{ width: `${scanningProgress}%` }}
                />
              </div>

              <p className="text-[10px] text-gray-400 font-mono">
                {scanningProgress}% complete
              </p>
            </div>
          </div>
        )}

      </Modal>

      {isOcrReviewOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#f8fafc] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 shadow-sm">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Review AI Scanned Receipt</h2>
                <p className="text-xs text-gray-500 font-medium">Verify or edit the extracted details below before saving.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOcrReviewOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={20} />
            </button>
          </div>

          <DuplicateReceiptBanner notice={ocrDuplicate} className="mx-6 mt-3 shrink-0" />
          {ocrScanNotice && (
            <div className="mx-6 mt-3 shrink-0 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{ocrScanNotice}</span>
            </div>
          )}

          {/* Body - 50% / 50% split */}
          <div className="flex-1 flex min-h-0">
            {/* Left Column (50%): Receipt Preview */}
            <div className="w-1/2 bg-[#0b0f19] flex items-center justify-center border-r border-gray-100 min-w-0 h-full overflow-hidden relative group">
              {receiptPreviewUrl ? (
                scannedFile?.type === "application/pdf" ? (
                  <iframe
                    src={receiptPreviewUrl}
                    className="w-full h-full border-0"
                    title="Receipt PDF Preview"
                  />
                ) : (
                  <>
                    <img
                      src={receiptPreviewUrl}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: "transform 0.2s ease-in-out",
                      }}
                      className="w-full h-full object-contain"
                      alt="Receipt Image Preview"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-700/50 shadow-lg text-white z-10 select-none">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Zoom In (+)"
                      >
                        <ZoomIn size={15} />
                      </button>
                      <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                      <button
                        type="button"
                        onClick={handleRotateLeft}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Rotate Left (↺)"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={handleRotateRight}
                        className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                        title="Rotate Right (↻)"
                      >
                        <RotateCw size={15} />
                      </button>
                      <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="px-2 py-0.5 text-[10px] font-bold hover:bg-slate-800 rounded-md transition text-slate-300 hover:text-white"
                        title="Reset"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                )
              ) : (
                <div className="text-sm text-gray-400">No receipt preview available</div>
              )}
            </div>

            {/* Right Column (50%): Form */}
            <div className="w-1/2 bg-white flex flex-col min-h-0">
              <form onSubmit={handleOcrSubmit} noValidate className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={categoryOptions}
                        value={categoryOptions.find((o) => o.value === ocrReviewData.categoryId) || null}
                        onChange={(opt) => handleOcrSelectChange("categoryId", opt ? opt.value : "")}
                        placeholder="Select expense category..."
                        isSearchable
                        styles={compactSelectStyles}
                        isDisabled={ocrSubmitting}
                      />
                      {ocrReviewErrors.categoryId && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.categoryId}</span>
                      )}
                    </div>

                    {/* Merchant */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Merchant <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="merchantName"
                        placeholder="e.g. REDBUS"
                        value={ocrReviewData.merchantName}
                        onChange={handleOcrInputChange}
                        disabled={ocrSubmitting}
                        className={`w-full px-2.5 py-1.5 rounded-md border text-xs transition focus:outline-none focus:ring-2 ${
                          ocrReviewErrors.merchantName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                        }`}
                      />
                      {ocrReviewErrors.merchantName && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.merchantName}</span>
                      )}
                    </div>

                    {/* Expense Date */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Expense Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="expenseDate"
                        value={ocrReviewData.expenseDate}
                        onChange={handleOcrInputChange}
                        disabled={ocrSubmitting}
                        min={dateRange.minDate || undefined}
                        max={dateRange.maxDate || undefined}
                        className={`w-full px-2.5 py-1.5 rounded-md border text-xs transition focus:outline-none focus:ring-2 ${
                          ocrReviewErrors.expenseDate
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                        }`}
                      />
                      {ocrReviewErrors.expenseDate && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.expenseDate}</span>
                      )}
                      {!ocrReviewErrors.expenseDate && (
                        <span className="text-[11px] text-gray-500 block mt-0.5">{expenseDateHint(dateRange)}</span>
                      )}
                    </div>

                    {/* Cost Center */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Cost Center <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={costCenterOptions}
                        value={costCenterOptions.find((o) => o.value === ocrReviewData.costCenterId) || null}
                        onChange={(opt) => handleOcrSelectChange("costCenterId", opt ? opt.value : "")}
                        placeholder="Select cost center..."
                        isSearchable
                        styles={compactSelectStyles}
                        isDisabled={ocrSubmitting}
                      />
                      {ocrReviewErrors.costCenterId && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.costCenterId}</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <SplitAllocationSection
                        split={ocrSplit}
                        costCenterOptions={costCenterOptions}
                        selectStyles={compactSelectStyles}
                        disabled={ocrSubmitting}
                        formatAmount={formatAmount}
                        currencyLabel={currencyOptions.find((o) => o.value === ocrReviewData.currencyId)?.code || ""}
                      />
                    </div>

                    {ocrCrossDepartmentCostCenters.length > 0 && (
                      <div className="col-span-2 space-y-0.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <label htmlFor="ocrAllocationReason" className="block text-xs font-semibold text-amber-900">
                          Reason for charging another department <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] text-amber-800">
                          {ocrHomeDepartmentUuid
                            ? `${ocrCrossDepartmentCostCenters.join(", ")} ${ocrCrossDepartmentCostCenters.length === 1 ? "is" : "are"} outside your department.`
                            : `${ocrCrossDepartmentCostCenters.join(", ")} belong to different departments.`}{" "}
                          Charge the cost center of the event or purpose this expense was for, and say why.
                        </p>
                        <textarea
                          id="ocrAllocationReason"
                          name="allocationReason"
                          value={ocrReviewData.allocationReason}
                          onChange={handleOcrInputChange}
                          placeholder="e.g. Joint Engineering–HR campus hiring event"
                          rows={2}
                          maxLength={500}
                          disabled={ocrSubmitting}
                          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                        />
                        {ocrReviewErrors.allocationReason && (
                          <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.allocationReason}</span>
                        )}
                      </div>
                    )}

                    {/* Amount, Currency, and GST in a 3-column sub-grid */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      {/* Amount */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-600">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="amount"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={ocrReviewData.amount}
                          onChange={handleOcrInputChange}
                          disabled={ocrSubmitting}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs transition focus:outline-none focus:ring-2 ${
                            ocrReviewErrors.amount
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                          }`}
                        />
                        {ocrReviewErrors.amount ? (
                          <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.amount}</span>
                        ) : ocrAmountMismatch && (
                          <span className="text-[11px] text-amber-700 block mt-0.5">{ocrAmountMismatch.message}</span>
                        )}
                      </div>

                      {/* Currency */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-600">
                          Currency <span className="text-red-500">*</span>
                        </label>
                        <Select
                          options={currencyOptions}
                          value={currencyOptions.find((o) => o.value === ocrReviewData.currencyId) || null}
                          onChange={(opt) => handleOcrSelectChange("currencyId", opt ? opt.value : "")}
                          placeholder="Select currency..."
                          isSearchable
                          styles={compactSelectStyles}
                          isDisabled={ocrSubmitting}
                        />
                        {ocrReviewErrors.currencyId && (
                          <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.currencyId}</span>
                        )}
                      </div>

                    </div>

                    <div className="col-span-2 space-y-1">
                      <TaxBreakdownPanel
                        amount={ocrReviewData.amount}
                        currencyId={ocrReviewData.currencyId}
                        currencyCode={currencyOptions.find((o) => o.value === ocrReviewData.currencyId)?.code || ""}
                        expenseDate={ocrReviewData.expenseDate}
                        categoryId={ocrReviewData.categoryId}
                        value={ocrReviewData.tax}
                        onChange={(tax) => {
                          setOcrTaxWarning("");
                          setOcrReviewData((prev) => ({ ...prev, tax }));
                          if (ocrReviewErrors.tax) setOcrReviewErrors((prev) => ({ ...prev, tax: "" }));
                        }}
                        onPreview={setOcrTaxPreview}
                        error={ocrReviewErrors.tax}
                        disabled={ocrSubmitting}
                        ocrTaxAmount={ocrReviewData.ocrTaxAmount}
                      />
                      {ocrTaxWarning && !ocrReviewErrors.tax && (
                        <span className="text-[11px] text-amber-700 block">{ocrTaxWarning}</span>
                      )}
                    </div>

                    {/* Client Billable, Client & Project - same rules as Manual Entry */}
                    <BillableClientFields
                      clientBillable={ocrReviewData.clientBillable}
                      clientId={ocrReviewData.clientId}
                      projectId={ocrReviewData.projectId}
                      onBillableChange={(value) => handleOcrSelectChange("clientBillable", value)}
                      onClientChange={handleOcrClientChange}
                      onProjectChange={(value) => handleOcrSelectChange("projectId", value)}
                      clientOptions={ocrClientOptions}
                      projectOptions={ocrProjectOptions}
                      clientsLoading={ocrClients.loading}
                      clientsError={ocrClients.error}
                      onRetryClients={ocrClients.reload}
                      errors={ocrReviewErrors}
                      selectStyles={compactSelectStyles}
                      disabled={ocrSubmitting}
                    />

                    {/* Description */}
                    <div className="col-span-2 space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Description {ocrAmountMismatch?.needsReason && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        name="description"
                        placeholder={ocrAmountMismatch?.needsReason
                          ? "Why the claim is more than the receipt total, e.g. tip paid in cash"
                          : "Optional notes about this expense..."}
                        value={ocrReviewData.description}
                        onChange={handleOcrInputChange}
                        disabled={ocrSubmitting}
                        className={`w-full px-2.5 py-1.5 rounded-md border text-xs focus:outline-none focus:ring-2 ${
                          ocrReviewErrors.description
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300 focus:ring-indigo-500/20 focus:border-indigo-500"
                        }`}
                      />
                      {ocrReviewErrors.description && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Real-time Cards */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <CurrencyConversionCard
                      amount={ocrReviewData.amount}
                      currencyCode={currencyOptions.find((o) => o.value === ocrReviewData.currencyId)?.code}
                      pending={true}
                    />
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOcrReviewOpen(false)}
                    disabled={ocrSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={ocrSubmitting}
                    loadingText="Saving..."
                    disabled={ocrSubmitting}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 border-none"
                  >
                    Save & Confirm
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
