import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Keyboard, Loader2, RotateCcw, RotateCw, Sparkles, UploadCloud, X, ZoomIn, ZoomOut } from "lucide-react";
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

const MAX_RECEIPTS = 10;

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

// ---------------------------------------------------------------- batch helpers (several receipts)

const STATUS_TEXT = {
  waiting: "Waiting",
  uploading: "Uploading...",
  scanning: "Scanning...",
  ready: "Ready to review",
  reviewing: "Reviewing",
  saved: "Added",
  skipped: "Skipped",
  failed: "Couldn't scan",
};
const STATUS_CLASS = {
  waiting: "bg-gray-100 text-gray-500",
  uploading: "bg-indigo-50 text-indigo-700",
  scanning: "bg-indigo-50 text-indigo-700",
  ready: "bg-amber-50 text-amber-700",
  reviewing: "bg-[#0A0082] text-white",
  saved: "bg-emerald-50 text-emerald-700",
  skipped: "bg-gray-100 text-gray-500",
  failed: "bg-rose-50 text-rose-700",
};

function StatusIcon({ status }) {
  if (status === "uploading" || status === "scanning") return <Loader2 size={14} className="animate-spin" aria-hidden="true" />;
  if (status === "saved") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "failed") return <AlertCircle size={14} aria-hidden="true" />;
  if (status === "skipped") return <X size={14} aria-hidden="true" />;
  if (status === "ready" || status === "reviewing") return <Sparkles size={14} aria-hidden="true" />;
  return <FileText size={14} aria-hidden="true" />;
}

/** The scanning step with several receipts: each file, scanned one by one. */
function BatchProgress({ batch }) {
  const done = batch.filter((it) => !["waiting", "uploading", "scanning"].includes(it.status)).length;
  const current = batch.findIndex((it) => it.status === "uploading" || it.status === "scanning");
  return (
    <div className="space-y-4 py-4" data-batch-progress>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <p className="font-semibold text-gray-800">
            {current >= 0 ? `Scanning receipt ${current + 1} of ${batch.length}` : "Scans finished"}
          </p>
          <p className="text-xs tabular-nums text-gray-500">
            {done} / {batch.length} scanned
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${(done / batch.length) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">The first receipt opens for review as soon as it is scanned; the rest keep scanning meanwhile.</p>
      </div>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto">
        {batch.map((it, i) => (
          <li key={it.id} data-batch-item={it.status} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2">
            <span className="w-5 text-right text-[11px] font-semibold tabular-nums text-gray-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-800">{it.file.name}</p>
              {(it.status === "uploading" || it.status === "scanning") && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-indigo-500 transition-all duration-200" style={{ width: `${it.progress}%` }} />
                </div>
              )}
              {it.status === "failed" && it.error && <p className="truncate text-[11px] text-rose-600">{it.error}</p>}
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[it.status]}`}>
              <StatusIcon status={it.status} />
              {STATUS_TEXT[it.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Under the review header: which receipt this is, and where the others are. */
function BatchStrip({ batch, activeItemId, activeIndex }) {
  return (
    <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-gray-200 bg-white px-5 py-2" data-batch-strip>
      <span className="shrink-0 text-xs font-semibold text-[#0a174e]">
        Receipt {activeIndex + 1} of {batch.length}
      </span>
      <div className="flex gap-1.5">
        {batch.map((it, i) => (
          <span
            key={it.id}
            title={`${it.file.name}: ${STATUS_TEXT[it.status]}`}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[it.status]} ${
              it.id === activeItemId ? "ring-2 ring-indigo-300" : ""
            }`}
          >
            <StatusIcon status={it.status} />
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A paused batch: how many receipts are waiting, with a way back in or out. */
function ResumeBar({ batch, onResume, onDiscard }) {
  const ready = batch.filter((it) => it.status === "ready").length;
  const scanning = batch.filter((it) => ["waiting", "uploading", "scanning"].includes(it.status)).length;
  return (
    <div className="fixed bottom-5 right-5 z-[9998] flex max-w-sm items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-3 pl-4 shadow-[0_18px_40px_-16px_rgba(10,0,130,0.45)]" data-batch-resume>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        <Sparkles size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-gray-900">
          {ready > 0 ? `${ready} scanned receipt${ready === 1 ? "" : "s"} to review` : "Scanning your next receipt..."}
        </p>
        {scanning > 0 && <p className="text-gray-500">{scanning} still to scan · opens when ready</p>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={onDiscard} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100">
          Discard
        </button>
        <button type="button" onClick={onResume} className="rounded-lg bg-[#0A0082] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a174e]">
          Review
        </button>
      </div>
    </div>
  );
}

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
    employeePaymentMethod: "",
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

  // ---------------------------------------------------------------- receipts, one or many
  // Several receipts can be picked at once. They are uploaded and scanned strictly one after another; each scan
  // prepares its own review form, and the employee saves (or skips) them in order while the rest keep scanning.
  // A single receipt behaves exactly as before.

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const uploadReceipt = async (file) => {
    const formData = new FormData();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    formData.append("file", file, safeName);
    // Upload file to the report's receipt store
    const uploadRes = await api.post(`/xms/employee/expense-reports/${reportId}/receipts`, formData, {
      baseURL: XMS_BASE_URL,
      headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });
    const receiptId = uploadRes.data?.data?.receiptId || uploadRes.data?.receiptId;
    if (!receiptId) throw new Error("Failed to retrieve receipt ID from upload response");
    // Already-claimed check on the file itself; same-invoice matches come back with the OCR result.
    notifyDuplicateReceipt(uploadRes.data?.data);
    return receiptId;
  };

  /** Polls the receipt's OCR until it completes. Rejects with { kind: FAILED | TIMEOUT | UNAVAILABLE }. */
  const pollOcr = (receiptId, onProgress) =>
    new Promise((resolve, reject) => {
      let pollCount = 0;
      const maxPolls = 35; // 35 polls, about 40 seconds
      const interval = setInterval(async () => {
        pollCount++;
        try {
          const ocrRes = await api.get(`/xms/employee/receipts/${receiptId}/ocr`, { baseURL: XMS_BASE_URL, headers: authHeaders() });
          const responsePayload = ocrRes.data?.data || ocrRes.data;
          const status = responsePayload?.processingStatus || responsePayload?.ocrStatus;
          onProgress(Math.min(95, 20 + Math.round((pollCount / maxPolls) * 75)));
          if (status === "OCR_COMPLETED") {
            clearInterval(interval);
            onProgress(100);
            resolve(responsePayload);
          } else if (status === "FAILED") {
            clearInterval(interval);
            reject({ kind: "FAILED", message: responsePayload?.failureReason || "Could not parse receipt" });
          } else if (pollCount >= maxPolls) {
            clearInterval(interval);
            reject({ kind: "TIMEOUT", message: "OCR processing timed out" });
          }
        } catch (err) {
          console.error("Polling error:", err);
          if (pollCount >= maxPolls) {
            clearInterval(interval);
            reject({ kind: "UNAVAILABLE", message: "OCR service unavailable" });
          }
        }
      }, 1200);
    });

  /** Turns one OCR result into that receipt's review form (same rules the single-receipt scan always used). */
  const prepareReview = (responsePayload, receiptId) => {
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
      // Only the date printed on the receipt. If the scan did not read one, leave it blank for the employee:
      // today is usually outside the report's permitted dates, and the server rejects it.
      expenseDate: responsePayload.receiptDate || "",
      merchantName: merchantVal,
      description: "",
      amount: amountNum <= 0 ? "" : amountNum.toFixed(2),
      currencyId: currencyIdVal,
      // The receipt's GST is the entered side; the server compares it with the tax code.
      tax: taxValueFromOcr(taxNum > 0 ? taxNum.toFixed(2) : null),
      ocrTaxAmount: taxNum > 0 ? taxNum : null,
      costCenterId: report?.costCenterId || "",
      // Same defaults as the manual entry: the report's client and project fill the line.
      clientBillable: !!report?.clientId,
      clientId: report?.clientId || "",
      allocationReason: "",
      employeePaymentMethod: "",
      projectId: report?.projectId || "",
      ocrReceiptId: receiptId,
      confidenceScore: confidence,
      // What the scan read, kept even when the amount field is left blank, to compare the claim against.
      ocrTotalAmount: amountNum > 0 ? amountNum : null,
      ocrCurrencyCode: responsePayload.currencyCode || null,
    };

    return {
      reviewData,
      notice: foundNothing
        ? "No merchant, date or total could be read from this file. Check it's a clear photo or PDF of the receipt, or enter the details yourself."
        : isLowConfidence
          ? "Parts of this scan couldn't be read reliably. The fields are filled from the scan: check the merchant, date, amount and GST against the receipt."
          : "",
      duplicate: duplicateNotice(responsePayload),
      taxWarning,
    };
  };

  // Batch state: [{ id, file, status, progress, prepared, error }]
  // status: waiting -> uploading -> scanning -> ready -> reviewing -> saved | skipped, or failed.
  const [batch, setBatch] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  // Open the next scanned receipt as soon as one is ready. Off while the employee has paused the review.
  const [autoOpen, setAutoOpen] = useState(false);
  const batchTokenRef = useRef(0);
  const savedCountRef = useRef(0);
  const patchItem = (id, changes) => setBatch((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));

  const runBatch = async (items, token) => {
    const single = items.length === 1;
    for (const item of items) {
      if (batchTokenRef.current !== token) return; // discarded
      patchItem(item.id, { status: "uploading", progress: 5 });
      if (single) setScanningProgress(5);
      try {
        const receiptId = await uploadReceipt(item.file);
        if (batchTokenRef.current !== token) return;
        patchItem(item.id, { status: "scanning", progress: 20 });
        if (single) setScanningProgress(20);
        const payload = await pollOcr(receiptId, (pct) => {
          patchItem(item.id, { progress: pct });
          if (single) setScanningProgress(pct);
        });
        if (batchTokenRef.current !== token) return;
        patchItem(item.id, { status: "ready", progress: 100, prepared: prepareReview(payload, receiptId) });
      } catch (err) {
        if (batchTokenRef.current !== token) return;
        const uploadMsg = err?.response?.data?.message || err?.response?.data?.detail;
        if (single) {
          // One receipt: exactly the old behaviour.
          batchTokenRef.current++;
          setBatch([]);
          setAutoOpen(false);
          if (err?.kind === "FAILED") {
            showStatusToast(`OCR failed: ${err.message}`, "error");
            setSelectionStep("upload");
          } else if (err?.kind === "TIMEOUT") {
            showStatusToast("OCR processing timed out. Proceeding to manual entry.", "warning");
            handleSelectManual();
          } else if (err?.kind === "UNAVAILABLE") {
            showStatusToast("OCR service unavailable. Proceeding to manual entry.", "error");
            handleSelectManual();
          } else {
            console.error("Upload error:", err);
            showStatusToast(uploadMsg || "Failed to upload receipt for OCR.", "error");
            setSelectionStep("upload");
          }
          return;
        }
        const message = err?.kind ? err.message : uploadMsg || "Upload failed";
        patchItem(item.id, { status: "failed", progress: 100, error: message });
        showStatusToast(`${item.file.name}: ${message}. Add it with Manual Entry.`, "error");
      }
    }
  };

  const handleReceiptFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];
    const valid = files.filter((f) => allowedExtensions.includes(f.name.split(".").pop().toLowerCase()));
    if (valid.length < files.length) {
      showStatusToast(
        valid.length
          ? `${files.length - valid.length} file(s) skipped: only PDF, PNG, JPG, and JPEG files are allowed.`
          : "Only PDF, PNG, JPG, and JPEG files are allowed.",
        "error"
      );
    }
    if (!valid.length) return;
    let picked = valid;
    if (valid.length > MAX_RECEIPTS) {
      showStatusToast(`You can scan up to ${MAX_RECEIPTS} receipts at a time. The first ${MAX_RECEIPTS} will be scanned.`, "warning");
      picked = valid.slice(0, MAX_RECEIPTS);
    }

    const token = ++batchTokenRef.current;
    const items = picked.map((file, i) => ({ id: `${token}-${i}`, file, status: "waiting", progress: 0 }));
    // A paused batch being replaced keeps its saved count, so the caller still refreshes for those line items.
    if (!batch.length) savedCountRef.current = 0;
    setBatch(items);
    setActiveItemId(null);
    setAutoOpen(true);
    setScannedFile(items[0].file);
    setSelectionStep("scanning");
    setScanningProgress(5);
    runBatch(items, token);
  };

  // Latest server tax preview of the OCR review form (the receipt's GST vs the tax code).
  const [ocrTaxPreview, setOcrTaxPreview] = useState(null);
  // Shown until the user edits the amount or tax: OCR's GST looked implausible or the scan was low-confidence.
  const [ocrTaxWarning, setOcrTaxWarning] = useState("");
  // Already-claimed check for the scanned receipt (file, invoice or merchant/amount/date match).
  const [ocrDuplicate, setOcrDuplicate] = useState(null);
  // The scan read nothing usable, or needs checking by hand.
  const [ocrScanNotice, setOcrScanNotice] = useState("");

  const DONE = ["saved", "skipped", "failed"];
  const activeIndex = batch.findIndex((it) => it.id === activeItemId);
  const isMulti = batch.length > 1;
  const remainingAfterActive = batch.filter((it) => it.id !== activeItemId && !DONE.includes(it.status)).length;

  /** Loads one scanned receipt into the review form. */
  const openReview = (item) => {
    const { reviewData, notice, duplicate, taxWarning } = item.prepared;
    if (isOpen) onClose(); // the chooser makes way for the full-screen review
    setScannedFile(item.file);
    setOcrScanNotice(notice);
    setOcrDuplicate(duplicate);
    setOcrTaxWarning(taxWarning);
    setOcrTaxPreview(null);
    setOcrReviewData(reviewData);
    setOcrReviewErrors({});
    ocrSplit.reset();
    setActiveItemId(item.id);
    patchItem(item.id, { status: "reviewing" });
    setIsOcrReviewOpen(true);
    setTimeout(() => {
      setSelectionStep("options");
      setScanningProgress(0);
    }, 300);
  };

  /** Every receipt is saved, skipped or failed (or the rest were discarded): refresh the caller once. */
  const finishBatch = () => {
    const saved = savedCountRef.current;
    const total = batch.length;
    batchTokenRef.current++;
    savedCountRef.current = 0;
    setBatch([]);
    setActiveItemId(null);
    setAutoOpen(false);
    setScannedFile(null);
    if (saved > 0) {
      if (total > 1) showStatusToast(`${saved} of ${total} receipts added as line items.`, "success");
      onSaved?.();
    } else if (selectionStep === "scanning") {
      setSelectionStep("upload");
    }
  };

  // Next receipt: open it as soon as it is scanned; finish once nothing is left.
  useEffect(() => {
    if (!batch.length || isOcrReviewOpen) return;
    if (batch.every((it) => DONE.includes(it.status))) {
      finishBatch();
      return;
    }
    if (!autoOpen) return;
    const next = batch.find((it) => it.status === "ready");
    if (next) openReview(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, isOcrReviewOpen, autoOpen]);

  const closeActive = (status) => {
    if (activeItemId) patchItem(activeItemId, { status });
    setIsOcrReviewOpen(false);
  };

  // Cancel / close on the review. One receipt: closed as before. Several: paused, and can be resumed or discarded.
  const handleReviewCancel = () => {
    if (!isMulti) {
      closeActive("skipped");
      return;
    }
    setAutoOpen(false);
    closeActive("ready");
  };

  const handleSkipReceipt = () => {
    setAutoOpen(true);
    closeActive("skipped");
  };

  const discardRemaining = () => {
    batchTokenRef.current++; // stops the scan loop
    setBatch((prev) => prev.map((it) => (DONE.includes(it.status) ? it : { ...it, status: "skipped" })));
  };
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
    // The server refuses to submit a report with a line that has no payment method, so say so before saving.
    if (!ocrReviewData.employeePaymentMethod) errors.employeePaymentMethod = "Choose how you paid for this expense.";
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
      employeePaymentMethod: ocrReviewData.employeePaymentMethod || null,
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
      savedCountRef.current += 1;
      setAutoOpen(true);
      if (activeItemId) {
        closeActive("saved"); // the batch effect opens the next receipt, or finishes and refreshes the caller
      } else {
        onSaved?.();
        setIsOcrReviewOpen(false);
        setScannedFile(null);
      }
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
              ? "Upload one or more receipts to scan and auto-fill line item details."
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
                  handleReceiptFiles(e.dataTransfer.files);
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
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleReceiptFiles(e.target.files);
                  }
                  e.target.value = ""; // picking the same files again still triggers a scan
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
                    Drag and drop your receipts here
                  </p>
                  <p className="text-xs text-gray-500">
                    or <span className="text-indigo-600 font-bold hover:underline">browse files</span>
                  </p>
                </div>
                <div className="text-[10px] text-gray-400 border border-gray-200/60 rounded-full px-2.5 py-0.5 bg-white font-medium">
                  Supports PDF, PNG, JPG up to 10MB
                </div>
                <p className="max-w-xs text-[11px] text-gray-500">
                  Pick up to {MAX_RECEIPTS} receipts at once. Each one is scanned in turn and becomes its own line item for you to check.
                </p>
              </label>
            </div>
          </div>
        )}

        {selectionStep === "scanning" && isMulti && <BatchProgress batch={batch} />}

        {selectionStep === "scanning" && !isMulti && (
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
              onClick={handleReviewCancel}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={20} />
            </button>
          </div>

          {isMulti && <BatchStrip batch={batch} activeItemId={activeItemId} activeIndex={activeIndex} />}
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

                    {/* How the employee paid: required before submit */}
                    <div className="space-y-1">
                      <label htmlFor="ocrEmployeePaymentMethod" className="block text-xs font-semibold text-gray-600">
                        How did you pay? <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="ocrEmployeePaymentMethod"
                        name="employeePaymentMethod"
                        value={ocrReviewData.employeePaymentMethod || ""}
                        onChange={(e) => handleOcrSelectChange("employeePaymentMethod", e.target.value)}
                        disabled={ocrSubmitting}
                        className={`w-full px-2.5 py-1.5 rounded-md border text-xs transition focus:outline-none focus:ring-2 ${
                          ocrReviewErrors.employeePaymentMethod
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                        }`}
                      >
                        <option value="">Select how you paid</option>
                        <option value="PERSONAL_CARD">Personal card</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="COMPANY_CARD">Company card</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {ocrReviewErrors.employeePaymentMethod && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{ocrReviewErrors.employeePaymentMethod}</span>
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
                  {isMulti && (
                    <span className="mr-auto hidden text-xs text-gray-500 sm:block">
                      {remainingAfterActive > 0
                        ? `${remainingAfterActive} more receipt${remainingAfterActive === 1 ? "" : "s"} after this one`
                        : "Last receipt in this batch"}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReviewCancel}
                    disabled={ocrSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isMulti ? "Pause" : "Cancel"}
                  </Button>
                  {isMulti && (
                    <Button type="button" variant="outline" onClick={handleSkipReceipt} disabled={ocrSubmitting} className="w-full sm:w-auto">
                      Skip this receipt
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    loading={ocrSubmitting}
                    loadingText="Saving..."
                    disabled={ocrSubmitting}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 border-none"
                  >
                    {isMulti && remainingAfterActive > 0 ? "Save & next" : "Save & Confirm"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMulti && !isOcrReviewOpen && !isOpen && batch.some((it) => !DONE.includes(it.status)) && createPortal(
        <ResumeBar batch={batch} onResume={() => setAutoOpen(true)} onDiscard={discardRemaining} />,
        document.body
      )}
    </>
  );
}
