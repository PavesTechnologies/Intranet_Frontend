import { useRef, useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { UploadCloud, FileSpreadsheet, X, Download, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import Modal from "../../../../../components/Modal/modal";
import Button from "../../../../../components/Button/Button";
import { useValidateTdsImport, useImportTdsConfiguration } from "../../hooks/useTdsConfig";
import { useApPermissions } from "../../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../../utils/apiError";

const MAX_EXCEL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_EXTENSIONS = [".xlsx", ".csv"];

// Template columns — unchanged; the backend contract (spec section 2) requires exactly this
// 11-column set, same order, no renaming.
const TEMPLATE_COLUMNS = [
  { header: "Code", key: "code", width: 20 },
  { header: "Old Section", key: "oldSection", width: 14 },
  { header: "New Section", key: "newSection", width: 14 },
  { header: "Nature of Payment", key: "natureOfPayment", width: 22 },
  { header: "Deductor", key: "deductor", width: 18 },
  { header: "Rate", key: "rate", width: 10 },
  { header: "Threshold Amount", key: "thresholdAmount", width: 18 },
  { header: "Threshold Period", key: "thresholdPeriod", width: 20 },
  { header: "Rate Condition", key: "rateCondition", width: 26 },
  { header: "Effective From", key: "effectiveFrom", width: 16 },
  { header: "Effective To", key: "effectiveTo", width: 16 },
];

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

/** {name, code, row_numbers} (or camelCase variants) -> {name, code, rowNumbers}. */
function normalizeNewMasterList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => ({
    name: m.name ?? m.code ?? "",
    code: m.code ?? m.name ?? "",
    rowNumbers: m.row_numbers ?? m.rowNumbers ?? [],
  }));
}

/**
 * Normalizes the backend's import/validate report — exact field names beyond the spec's own
 * example aren't confirmed against a live response, so every field is read through a few
 * plausible key-name variants rather than assuming one. new_payment_natures/new_deductors
 * (spec section 9) are only ever populated by the backend during /validate — this never
 * computes them itself.
 */
function normalizeImportReport(raw = {}) {
  const pick = (...keys) => keys.map((k) => raw[k]).find((v) => v !== undefined);
  return {
    valid: pick("valid", "is_valid") ?? (pick("error_rows", "errorRows") ?? 0) === 0,
    imported: pick("imported") ?? false,
    totalRows: pick("total_rows", "totalRows") ?? 0,
    validRows: pick("valid_rows", "validRows") ?? null,
    errorRows: pick("error_rows", "errorRows") ?? 0,
    newRows: pick("new_rows", "newRows") ?? null,
    updatedRows: pick("updated_rows", "updatedRows") ?? null,
    unchangedRows: pick("unchanged_rows", "unchangedRows") ?? null,
    importBatchId: pick("import_batch_id", "importBatchId") ?? null,
    newPaymentNatures: normalizeNewMasterList(pick("new_payment_natures", "newPaymentNatures")),
    newDeductors: normalizeNewMasterList(pick("new_deductors", "newDeductors")),
    errors: (pick("errors") || []).map((e) => ({
      row: e.row ?? e.row_number ?? e.rowNumber ?? null,
      field: e.field ?? e.column ?? null,
      message: e.message ?? e.msg ?? e.detail ?? String(e),
    })),
  };
}

/**
 * A 422 `detail` can be a string, a FastAPI validation-error array, or a full import-report
 * object (spec section 18) — only the third case is "this IS a validate/import report, render it
 * as the preview instead of a toast". Returns the raw report object for that case, null otherwise
 * (caller falls back to getApiErrorMessage for the string/array cases).
 */
function extractImportReportFromError(err) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    // A real report has at least one of these — distinguishes it from some other object-shaped
    // detail the backend might send for an unrelated 422.
    if ("total_rows" in detail || "errors" in detail || "error_rows" in detail) return detail;
  }
  return null;
}

/**
 * Upload -> validate -> preview -> confirm -> import, backed by the real
 * POST /apm/tds/config/import/validate and POST /apm/tds/config/import (multipart field "file",
 * both paths unchanged). Preview additionally surfaces which Payment Natures/Deductors would be
 * created (spec sections 3/20) and gates Confirm Import on TDS_CONFIG_CREATE when any exist
 * (spec section 21) — the backend enforces this independently regardless of what this component
 * shows. "Download Template" stays client-side (ExcelJS) — no backend endpoint for it.
 */
export default function TdsExcelImportModal({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const { canImportTdsConfig, canCreateTdsConfig } = useApPermissions();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [validation, setValidation] = useState(null);
  // Set only when a failed *import* (not validate) returned a report — the preview is shown the
  // same way, but the messaging above it differs ("Import failed" vs. the normal pre-import view).
  const [importFailed, setImportFailed] = useState(false);

  const validateImport = useValidateTdsImport();
  const runImport = useImportTdsConfiguration();

  const reset = () => {
    setSelectedFile(null);
    setFileError("");
    setIsDragging(false);
    setValidation(null);
    setImportFailed(false);
  };

  const handleClose = () => {
    if (validateImport.isPending || runImport.isPending) return;
    reset();
    onClose();
  };

  const validateFileShape = (file) => {
    if (!file) return "Please select a file to upload.";
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return "Unsupported file type. Please upload a .xlsx or .csv file.";
    }
    if (file.size > MAX_EXCEL_SIZE_BYTES) {
      return "File is too large. Maximum size is 5MB.";
    }
    return "";
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    const error = validateFileShape(file);
    setFileError(error);
    setSelectedFile(error ? null : file);
    setValidation(null);
    setImportFailed(false);
  };

  const handleInputChange = (e) => {
    handleFileSelected(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    try {
      const raw = await validateImport.mutateAsync(selectedFile);
      setImportFailed(false);
      setValidation(normalizeImportReport(raw));
    } catch (err) {
      setFileError(getApiErrorMessage(err, "Could not validate this file — check its format and try again."));
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    try {
      const raw = await runImport.mutateAsync(selectedFile);
      const report = normalizeImportReport(raw);
      const parts = [`${report.totalRows} row${report.totalRows === 1 ? "" : "s"} imported`];
      if (report.newPaymentNatures.length > 0) {
        parts.push(`${report.newPaymentNatures.length} Payment Nature${report.newPaymentNatures.length === 1 ? "" : "s"} created`);
      }
      if (report.newDeductors.length > 0) {
        parts.push(`${report.newDeductors.length} Deductor${report.newDeductors.length === 1 ? "" : "s"} created`);
      }
      const batchSuffix = report.importBatchId ? ` (batch ${report.importBatchId})` : "";
      toast.success(`TDS configuration imported. ${parts.join(", ")}.${batchSuffix}`);
      reset();
      onClose();
    } catch (err) {
      // A 422 with a real import report (spec section 23): keep the modal open, re-show the
      // preview with the backend's row-level errors instead of a generic toast + closed modal.
      const report = extractImportReportFromError(err);
      if (report) {
        setImportFailed(true);
        setValidation(normalizeImportReport(report));
        toast.error("Import failed — see the errors below.");
      } else {
        toast.error(getApiErrorMessage(err, "Could not import this file."));
      }
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("TDS Rules");
      sheet.columns = TEMPLATE_COLUMNS;
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      sheet.addRows([
        {
          code: "TDS_194C_IND",
          oldSection: "194C",
          newSection: "194C",
          natureOfPayment: "Contractor",
          deductor: "Any person",
          rate: 1,
          thresholdAmount: 30000,
          thresholdPeriod: "Single Transaction",
          rateCondition: "ENTITY_TYPE IN INDIVIDUAL,HUF",
          effectiveFrom: "2026-04-01",
          effectiveTo: "",
        },
      ]);
      sheet.getRow(2).font = { italic: true, color: { argb: "FF6B7280" } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, "tds_rules_import_template.xlsx");
    } catch {
      toast.error("Failed to generate the Excel template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const hasErrors = (validation?.errorRows ?? 0) > 0;
  const showDiffTiles = validation?.newRows != null || validation?.updatedRows != null || validation?.unchangedRows != null;
  const hasNewMasters = (validation?.newPaymentNatures?.length ?? 0) > 0 || (validation?.newDeductors?.length ?? 0) > 0;
  // Case A/B/C from spec section 21 — Confirm needs TDS_CONFIG_IMPORT always, plus
  // TDS_CONFIG_CREATE only when this specific file would create new masters. The backend
  // enforces this independently on the real /import call regardless of what's shown here.
  const missingCreatePermission = hasNewMasters && !canCreateTdsConfig;
  const canConfirmImport = Boolean(validation) && !hasErrors && canImportTdsConfig && !missingCreatePermission;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload TDS Excel"
      subtitle="Bulk-update TDS Rules from a structured Excel or CSV file."
      size="xl"
      closeOnBackdrop={!validateImport.isPending && !runImport.isPending}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" size="small" onClick={handleDownloadTemplate} loading={isDownloadingTemplate}>
            <Download size={14} />
            Download Template
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleClose} disabled={validateImport.isPending || runImport.isPending}>
              Cancel
            </Button>
            {validation ? (
              <Button variant="primary" onClick={handleConfirmImport} loading={runImport.isPending} disabled={!canConfirmImport}>
                Confirm Import
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleValidate}
                loading={validateImport.isPending}
                disabled={!selectedFile || Boolean(fileError)}
              >
                Validate
              </Button>
            )}
          </div>
        </div>
      }
    >
      {!validation ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-[#0A0082] bg-[#0A0082]/5" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Drag &amp; drop the file here, or click to browse</p>
            <p className="text-xs text-gray-500">Supported: .xlsx, .csv · Max 5MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}

          {selectedFile && !fileError && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#0A0082]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="shrink-0 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Remove selected file"
                disabled={validateImport.isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {importFailed && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle size={16} />
              Import failed — nothing was written. Fix the errors below and try again.
            </div>
          )}

          <div className={`grid grid-cols-2 gap-3 ${showDiffTiles ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>
            <div className="rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.totalRows}</p>
              <p className="text-xs text-gray-500">Total Rows</p>
            </div>
            {validation.validRows != null && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{validation.validRows}</p>
                <p className="text-xs text-emerald-700">Valid</p>
              </div>
            )}
            {showDiffTiles && validation.newRows != null && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{validation.newRows}</p>
                <p className="text-xs text-emerald-700">New Rules</p>
              </div>
            )}
            {showDiffTiles && validation.updatedRows != null && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{validation.updatedRows}</p>
                <p className="text-xs text-blue-700">Updated Rules</p>
              </div>
            )}
            {showDiffTiles && validation.unchangedRows != null && (
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <p className="text-lg font-bold text-gray-600">{validation.unchangedRows}</p>
                <p className="text-xs text-gray-500">Unchanged Rules</p>
              </div>
            )}
            <div className={`rounded-lg border p-3 text-center ${hasErrors ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
              <p className={`text-lg font-bold ${hasErrors ? "text-red-700" : "text-gray-400"}`}>{validation.errorRows}</p>
              <p className={`text-xs ${hasErrors ? "text-red-700" : "text-gray-500"}`}>Errors</p>
            </div>
          </div>

          {validation.newPaymentNatures.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1.5 text-sm font-semibold text-amber-800">
                Payment Natures to be created ({validation.newPaymentNatures.length})
              </p>
              <ul className="space-y-1 text-sm text-amber-800">
                {validation.newPaymentNatures.map((m) => (
                  <li key={m.code}>
                    <span className="font-mono">{m.name}</span>
                    {m.rowNumbers.length > 0 && (
                      <span className="text-amber-700"> — used by row{m.rowNumbers.length === 1 ? "" : "s"} {m.rowNumbers.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.newDeductors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1.5 text-sm font-semibold text-amber-800">
                Deductors to be created ({validation.newDeductors.length})
              </p>
              <ul className="space-y-1 text-sm text-amber-800">
                {validation.newDeductors.map((m) => (
                  <li key={m.code}>
                    <span className="font-mono">{m.name}</span>
                    {m.rowNumbers.length > 0 && (
                      <span className="text-amber-700"> — used by row{m.rowNumbers.length === 1 ? "" : "s"} {m.rowNumbers.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingCreatePermission && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Info size={16} className="mt-0.5 shrink-0" />
              This import will create new Payment Natures or Deductors. You need TDS Configuration
              Create permission to continue.
            </div>
          )}

          {hasErrors ? (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertTriangle size={16} />
                Fix these before importing
              </p>
              <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm text-red-700">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>
                    {err.row != null && (
                      <span className="mr-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                        Row {err.row}
                      </span>
                    )}
                    {err.field ? `${err.field}: ` : ""}
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            !missingCreatePermission && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 size={16} />
                No validation errors — ready to import.
              </div>
            )
          )}

          <button
            type="button"
            onClick={() => {
              setValidation(null);
              setImportFailed(false);
            }}
            className="text-xs font-medium text-[#0A0082] hover:underline"
          >
            ← Choose a different file
          </button>
        </div>
      )}
    </Modal>
  );
}
