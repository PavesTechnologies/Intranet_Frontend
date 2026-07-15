import { useState } from "react";
import { toast } from "react-toastify";
import { validateImportFile, importSkills, getImportErrorReport } from "../services/skillOntologyService";

const errorMessage = (err, fallback) => err?.response?.data?.message || err?.response?.data?.detail || fallback;

// S07 — Bulk Import: selecting a file always validates first (dry run); the
// Import button only unlocks once that validation reports isValid:true.
// Import itself is a separate, explicit submission of the same file.
export default function useBulkImport() {
  const [file, setFile] = useState(null);

  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState(null); // { totalRows, validRows, invalidRows, isValid, errors }
  const [validationError, setValidationError] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { inserted, updated, skipped, failed, importId }

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const validate = async (targetFile) => {
    setIsValidating(true);
    setValidationError(null);
    setValidation(null);
    setResult(null);
    try {
      const res = await validateImportFile(targetFile);
      setValidation(res?.data || res);
    } catch (err) {
      setValidationError(err);
      toast.error(errorMessage(err, "Failed to validate the import file."));
    } finally {
      setIsValidating(false);
    }
  };

  // Selecting a new file always re-validates before Import can be enabled —
  // never imports immediately (S07/T01).
  const selectFile = (nextFile) => {
    setFile(nextFile);
    if (nextFile) validate(nextFile);
  };

  const retryValidation = () => {
    if (file) validate(file);
  };

  const canImport = Boolean(file) && Boolean(validation?.isValid) && !isValidating && !isUploading;

  const runImport = async () => {
    if (!canImport) return;
    setIsUploading(true);
    setProgress(0);
    try {
      const res = await importSkills(file, setProgress);
      const data = res?.data || res;
      setResult(data);
      toast.success(
        `Import complete: ${data.inserted ?? 0} inserted, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped, ${data.failed ?? 0} failed.`
      );
      return data;
    } catch (err) {
      toast.error(errorMessage(err, "Bulk import failed."));
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorReport = async () => {
    if (!result?.importId) return;
    setIsDownloadingReport(true);
    try {
      const response = await getImportErrorReport(result.importId);
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `skill_import_errors_${result.importId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to download the error report."));
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const reset = () => {
    setFile(null);
    setIsValidating(false);
    setValidation(null);
    setValidationError(null);
    setIsUploading(false);
    setProgress(0);
    setResult(null);
    setIsDownloadingReport(false);
  };

  return {
    file,
    selectFile,
    isValidating,
    validation,
    validationError,
    retryValidation,
    canImport,
    isUploading,
    progress,
    runImport,
    result,
    isDownloadingReport,
    downloadErrorReport,
    reset,
  };
}
