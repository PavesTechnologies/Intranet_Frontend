import { useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { CheckCircle2, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import { importSpec, reconSpec } from "../../constants/gstItc";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/documentUpload";
import { useImportGstr2b } from "../hooks/useGstItc";
import { currentPeriod, periodLabel } from "../utils/gstFormat";
import { ConfirmDialog, StatusPill } from "./GstUi";

const ACCEPTED = [".xlsx", ".json", ".csv"];
const MAX_BYTES = 10 * 1024 * 1024;

function validateFile(file) {
  if (!file) return "Choose the GSTR-2B file.";
  const name = file.name.toLowerCase();
  if (!ACCEPTED.some((ext) => name.endsWith(ext))) return "Upload the GSTR-2B as .xlsx or .json from the GST portal, or the .csv template.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB.";
  return "";
}

/** The backend answers 409 for both a replace that was not confirmed and the identical file again. */
const needsReplace = (err) => err?.response?.status === 409 && /replace=true/i.test(String(err?.response?.data?.detail || ""));

function ImportResult({ result }) {
  const counts = Object.entries(result.status_counts || {}).filter(([, n]) => n > 0);
  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> GSTR-2B for {periodLabel(result.return_period)} imported
        <StatusPill spec={importSpec(result.import_status)} />
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Records in file", result.total_records],
          ["Imported", result.success_records],
          ["Skipped", result.skipped_records],
          ["Failed", result.failed_records],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-white px-3 py-2">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className={clsx("text-lg font-semibold tabular-nums", label === "Failed" && value ? "text-rose-600" : "text-slate-800")}>{value ?? 0}</dd>
          </div>
        ))}
      </dl>
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {counts.map(([code, n]) => <StatusPill key={code} spec={{ ...reconSpec(code), label: `${reconSpec(code).label}: ${n}` }} />)}
        </div>
      )}
      {result.replaced_import_id && (
        <p className="text-xs text-slate-600">
          Replaced import {result.replaced_import_id} (kept in the history).
          {result.manual_mappings_carried ? ` ${result.manual_mappings_carried} manual mapping(s) carried over.` : ""}
        </p>
      )}
      {result.errors?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-700">Rows not imported</p>
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-rose-700">
            {result.errors.slice(0, 50).map((e, i) => (
              <li key={i}>
                {[e.section, e.row && `row ${e.row}`, e.document].filter(Boolean).join(" · ") || "File"}: {(e.errors || []).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Imports a GSTR-2B (portal Excel - B2B, B2BA, B2B-CDNR, B2B-CDNRA sheets - or JSON, or the CSV
 * template) for a return period. When the period already has an import the user must confirm
 * replacing it; only then is replace=true sent. The backend keeps the previous import as history.
 */
export default function Gstr2bImportModal({ isOpen, onClose, defaultPeriod, periods = [] }) {
  const inputRef = useRef(null);
  const importFile = useImportGstr2b();
  const [returnPeriod, setReturnPeriod] = useState(defaultPeriod || "");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(null); // null | backend message | ""
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setFileError("");
    setProgress(0);
    setError("");
    setConfirmReplace(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => {
    if (importFile.isPending) return;
    reset();
    setReturnPeriod(defaultPeriod || "");
    onClose();
  };

  const pick = (picked) => {
    setResult(null);
    setError("");
    const message = validateFile(picked);
    setFileError(message);
    setFile(message ? null : picked);
  };

  const upload = async (replace) => {
    if (importFile.isPending) return;
    setError("");
    setProgress(0);
    try {
      const r = await importFile.mutateAsync({ file, returnPeriod, replace, onUploadProgress: setProgress });
      setConfirmReplace(null);
      setResult(r);
      toast.success(`GSTR-2B for ${periodLabel(r.return_period)} imported: ${r.success_records} record(s).`);
    } catch (err) {
      if (!replace && needsReplace(err)) {
        setConfirmReplace(String(err.response.data.detail));
        return;
      }
      setConfirmReplace(null);
      setError(getApiErrorMessage(err, "Could not import the GSTR-2B."));
    }
  };

  const start = () => {
    const message = validateFile(file);
    if (message) return setFileError(message);
    if (!/^\d{4}-\d{2}$/.test(returnPeriod)) return setError("Choose the return period (YYYY-MM).");
    // The period already has an import: ask before anything is sent.
    if (periods.some((p) => p.period === returnPeriod && p.gstr2b_imported)) return setConfirmReplace("");
    return upload(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Import GSTR-2B"
        subtitle="The Excel (or JSON) downloaded from the GST portal: Returns Dashboard → GSTR-2B → Download"
        size="2xl"
        closeOnBackdrop={!importFile.isPending}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={close} disabled={importFile.isPending}>{result ? "Close" : "Cancel"}</Button>
            {!result && (
              <Button variant="primary" size="small" onClick={start} loading={importFile.isPending} disabled={!file || !returnPeriod}>
                Import
              </Button>
            )}
            {result && <Button variant="primary" size="small" onClick={reset}>Import another file</Button>}
          </div>
        )}
      >
        <div className="space-y-4">
          <label className="block text-xs font-medium text-slate-600">
            Return period <span className="text-rose-600">*</span>
            <input
              type="month"
              aria-label="Import return period"
              required
              className="mt-1 block h-9 w-48 rounded-md border border-slate-300 px-2.5 text-sm"
              value={returnPeriod}
              max={currentPeriod()}
              disabled={importFile.isPending}
              onChange={(e) => { setReturnPeriod(e.target.value); setResult(null); setError(""); }}
            />
            <span className="mt-0.5 block font-normal text-slate-400">YYYY-MM, e.g. 2026-10. The portal generates a month&apos;s GSTR-2B on the 14th of the next month.</span>
          </label>

          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              className={clsx("rounded-lg border-2 border-dashed px-4 py-6 text-center transition",
                dragging ? "border-[#0A0082] bg-indigo-50/60" : fileError ? "border-rose-300" : "border-slate-300")}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden />
                  <span className="font-medium text-slate-800">{file.name}</span>
                  <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                  {!importFile.isPending && (
                    <button type="button" aria-label="Remove file" onClick={reset} className="rounded p-1 text-slate-400 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-7 w-7 text-slate-400" aria-hidden />
                  <p className="mt-2 text-sm text-slate-600">
                    Drag the file here, or{" "}
                    <button type="button" className="font-medium text-indigo-600 hover:underline" onClick={() => inputRef.current?.click()}>browse</button>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">.xlsx, .json or .csv · up to 10 MB · sheets B2B, B2BA, B2B-CDNR and B2B-CDNRA are reconciled</p>
                </>
              )}
              <input ref={inputRef} type="file" className="hidden" aria-label="GSTR-2B file" accept={ACCEPTED.join(",")}
                onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          )}
          {fileError && <p role="alert" className="text-xs text-rose-600">{fileError}</p>}

          {importFile.isPending && (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[#0A0082] transition-all" style={{ width: `${progress || 5}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{progress < 100 ? `Uploading... ${progress}%` : "Reading and matching the documents..."}</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {result && <ImportResult result={result} />}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReplace !== null}
        title="Replace Existing GSTR-2B Import?"
        message={(
          <>
            <p>
              An import already exists for {periodLabel(returnPeriod)}. Replacing it will create a new import version.
              Previous import history will be retained. Existing manual mappings will carry over where supported.
            </p>
            {confirmReplace && <p className="mt-2 text-xs text-slate-500">{confirmReplace}</p>}
          </>
        )}
        confirmText="Replace Import"
        loading={importFile.isPending}
        onCancel={() => setConfirmReplace(null)}
        onConfirm={() => upload(true)}
      />
    </>
  );
}
