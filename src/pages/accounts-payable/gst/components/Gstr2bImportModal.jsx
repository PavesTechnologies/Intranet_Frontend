import { useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FlaskConical, Landmark, UploadCloud, X } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import {
  GSTR2B_DEMO_COLUMNS, GSTR2B_FIELD_LABELS, GSTR2B_SOURCE_TYPES, MATCH_GROUPS, importModeSpec, importSpec, reconSpec,
} from "../../constants/gstItc";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob, formatFileSize } from "../../utils/documentUpload";
import { formatDate } from "../../utils/formatters";
import { useImportGstr2b, usePreviewGstr2b } from "../hooks/useGstItc";
import gstr2bService, { IMPORT_MODE } from "../services/gstr2bService";
import { currentPeriod, inr, periodLabel } from "../utils/gstFormat";
import { ConfirmDialog, DocumentTotals, StatusPill } from "./GstUi";

const MAX_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROWS = 10;

/** What each mode accepts - shown before upload, and enforced again by the backend. */
const MODES = {
  [IMPORT_MODE.OFFICIAL]: {
    title: "Official GST Portal Excel",
    icon: Landmark,
    summary: "Production GSTR-2B reconciliation",
    accepted: [".xlsx", ".json", ".csv"],
    fileError: "Upload the GSTR-2B as .xlsx or .json from the GST portal, or the .csv template.",
    requirements: [
      "The GSTR-2B downloaded from the GST portal (Returns Dashboard → GSTR-2B → Download) as Excel or JSON; the CSV template is accepted too.",
      "Excel sheets reconciled: B2B, B2BA, B2B-CDNR and B2B-CDNRA, each with the portal header row “GSTIN of supplier”. Other sheets (ISD, IMPG, …) are reported, not imported.",
      "A month's GSTR-2B is generated on the 14th of the following month - it cannot be imported earlier.",
    ],
  },
  [IMPORT_MODE.DEMO]: {
    title: "Demo Excel Template",
    icon: FlaskConical,
    summary: "Demonstrations and testing only",
    accepted: [".xlsx"],
    fileError: "The demo template is an Excel workbook (.xlsx).",
    requirements: [
      "The AP demo Excel template (.xlsx) with one worksheet named B2B and the header on its first row.",
      `Columns: ${GSTR2B_DEMO_COLUMNS.map((c) => c.header).join(", ")}. Required: ${GSTR2B_DEMO_COLUMNS.filter((c) => c.required).map((c) => c.header).join(", ")}.`,
      "Every record is marked DEMO, kept apart from the official GSTR-2B, and never used for ITC eligibility, GSTR-3B approval or claims.",
    ],
  },
};

function validateFile(file, mode) {
  if (!file) return "Choose the GSTR-2B file.";
  const name = file.name.toLowerCase();
  if (!MODES[mode].accepted.some((ext) => name.endsWith(ext))) return MODES[mode].fileError;
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB.";
  return "";
}

/** The backend answers 409 for both a replace that was not confirmed and the identical file again. */
const needsReplace = (err) => err?.response?.status === 409 && /replace=true/i.test(String(err?.response?.data?.detail || ""));

const fieldLabel = (field) => GSTR2B_FIELD_LABELS[field] || field;

/** Rejected records / sheet problems, one line each: "B2B · row 4 · INV-1 · Document date: ...". */
function ValidationErrors({ errors, title = "Rejected records" }) {
  if (!errors?.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-700">{title} ({errors.length})</p>
      <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-rose-700" aria-label={title}>
        {errors.slice(0, 50).map((e, i) => (
          <li key={i}>
            {[e.sheet || e.section, e.row && `row ${e.row}`, e.document_number || e.document].filter(Boolean).join(" · ") || "File"}
            {": "}
            {e.field && <span className="font-medium">{fieldLabel(e.field)} - </span>}
            {e.message || (e.errors || []).join(", ")}
          </li>
        ))}
        {errors.length > 50 && <li className="text-slate-500">and {errors.length - 50} more</li>}
      </ul>
    </div>
  );
}

function DemoNotice({ text }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{text || "DEMO data - not a supplier filing and not an official GSTR-2B. Never used for ITC eligibility, GSTR-3B approval or claims."}</span>
    </p>
  );
}

function Counts({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value, danger]) => (
        <div key={label} className="rounded-md bg-white px-3 py-2">
          <dt className="text-[11px] text-slate-500">{label}</dt>
          <dd className={clsx("text-lg font-semibold tabular-nums", danger && value ? "text-rose-600" : "text-slate-800")}>{value ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
}

function ImportPreview({ preview }) {
  const rows = preview.records || [];
  return (
    <section aria-label="Import preview" className={clsx("space-y-3 rounded-lg border p-4 text-sm",
      preview.is_demo ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-slate-50/60")}>
      <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
        Preview · {GSTR2B_SOURCE_TYPES[preview.source_type] || preview.source_type}
        {preview.return_period && <span className="font-normal text-slate-500">· {periodLabel(preview.return_period)}</span>}
        <StatusPill spec={importModeSpec(preview.import_mode)} />
      </p>
      {preview.is_demo && <DemoNotice text={preview.demo_notice} />}
      <Counts items={[["Records in file", preview.total_records], ["Will be imported", preview.accepted_records],
        ["Skipped (blank / total rows)", preview.skipped_records], ["Rejected", preview.rejected_records, true]]} />
      {preview.totals && <DocumentTotals totals={preview.totals} />}
      {preview.blocking_errors?.length > 0 && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <p className="font-medium">This file cannot be imported:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">{preview.blocking_errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {preview.warnings?.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-800">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
      {preview.replace_required && preview.existing_import && (
        <p className="text-xs text-slate-600">
          {periodLabel(preview.return_period)} already has a{preview.is_demo ? " demo" : "n official"} import ({preview.existing_import.file_name},
          import {preview.existing_import.import_id}). Importing replaces it; the previous import stays in the history.
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-xs" aria-label="Records to import">
            <thead className="bg-slate-50 text-left text-[11px] font-medium text-slate-500">
              <tr>
                {["Row", "Supplier GSTIN", "Document", "Date", "Taxable", "IGST", "CGST", "SGST", "Cess", "ITC"].map((h) => (
                  <th key={h} scope="col" className={clsx("px-2 py-1.5", ["Taxable", "IGST", "CGST", "SGST", "Cess"].includes(h) && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, PREVIEW_ROWS).map((r) => (
                <tr key={`${r.sheet}-${r.row}-${r.document_number}`}>
                  <td className="px-2 py-1.5 text-slate-500">{[r.sheet, r.row].filter(Boolean).join(" · ")}</td>
                  <td className="px-2 py-1.5 font-mono">{r.supplier_gstin}</td>
                  <td className="px-2 py-1.5">{r.document_number}<span className="text-slate-400"> · {r.document_type}</span></td>
                  <td className="whitespace-nowrap px-2 py-1.5">{formatDate(r.document_date)}</td>
                  {["taxable_value", "igst_amount", "cgst_amount", "sgst_amount", "cess_amount"].map((k) => (
                    <td key={k} className="px-2 py-1.5 text-right tabular-nums">{inr(r[k])}</td>
                  ))}
                  <td className="px-2 py-1.5">{r.itc_available === true ? "Yes" : r.itc_available === false ? "No" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_ROWS && (
            <p className="px-2 py-1.5 text-[11px] text-slate-500">
              and {rows.length - PREVIEW_ROWS}{preview.records_truncated ? "+" : ""} more record(s)
            </p>
          )}
        </div>
      )}
      <ValidationErrors errors={preview.validation_errors} />
    </section>
  );
}

function ImportResult({ result }) {
  const counts = Object.entries(result.status_counts || {}).filter(([, n]) => n > 0);
  const demo = Boolean(result.is_demo);
  const errors = result.validation_errors || result.errors;
  return (
    <div className={clsx("space-y-3 rounded-lg border p-4 text-sm", demo ? "border-amber-300 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60")}>
      <p className={clsx("flex flex-wrap items-center gap-2 font-medium", demo ? "text-amber-900" : "text-emerald-800")}>
        <CheckCircle2 className="h-4 w-4" aria-hidden /> {demo ? "Demo GSTR-2B" : "GSTR-2B"} for {periodLabel(result.return_period)} imported
        <StatusPill spec={importSpec(result.import_status)} />
        {result.import_mode && <StatusPill spec={importModeSpec(result.import_mode)} />}
      </p>
      {demo && <DemoNotice text={result.demo_notice} />}
      <Counts items={[["Records in file", result.total_records], ["Imported", result.accepted_records ?? result.success_records],
        ["Skipped", result.skipped_records], ["Rejected", result.rejected_records ?? result.failed_records, true]]} />
      {result.totals && <DocumentTotals totals={result.totals} />}
      {result.match_groups && (
        <div className="flex flex-wrap gap-1.5" aria-label="Match groups">
          {MATCH_GROUPS.map((g) => (
            <StatusPill key={g.value} spec={{ ...g, label: `${g.label}: ${result.match_groups[g.countKey] ?? 0}` }} />
          ))}
        </div>
      )}
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
      {result.warnings?.length > 0 && <ul className="space-y-0.5 text-xs text-amber-800">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      <ValidationErrors errors={errors} title="Rows not imported" />
    </div>
  );
}

/**
 * Imports a GSTR-2B for a return period in one of two modes - the official GST portal Excel (B2B,
 * B2BA, B2B-CDNR, B2B-CDNRA sheets) / JSON / CSV template, or the AP demo Excel template - after a
 * preview of what the backend would import. When the period already has an import of the same mode
 * the user must confirm replacing it; only then is replace=true sent. The backend keeps the previous
 * import as history, and a demo import never replaces or mixes with the official one.
 */
export default function Gstr2bImportModal({ isOpen, onClose, defaultPeriod, periods = [], onImported }) {
  const inputRef = useRef(null);
  const importFile = useImportGstr2b();
  const previewFile = usePreviewGstr2b();
  const [mode, setMode] = useState(IMPORT_MODE.OFFICIAL);
  const [returnPeriod, setReturnPeriod] = useState(defaultPeriod || "");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(null); // null | backend message | ""
  const [result, setResult] = useState(null);
  const busy = importFile.isPending || previewFile.isPending;
  const spec = MODES[mode];

  const reset = () => {
    setFile(null);
    setFileError("");
    setProgress(0);
    setError("");
    setPreview(null);
    setConfirmReplace(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => {
    if (busy) return;
    reset();
    setMode(IMPORT_MODE.OFFICIAL);
    setReturnPeriod(defaultPeriod || "");
    onClose();
  };

  const chooseMode = (next) => {
    if (busy || next === mode) return;
    reset();
    setMode(next);
  };

  const pick = (picked) => {
    setResult(null);
    setPreview(null);
    setError("");
    const message = validateFile(picked, mode);
    setFileError(message);
    setFile(message ? null : picked);
  };

  const runPreview = async () => {
    const message = validateFile(file, mode);
    if (message) return setFileError(message);
    if (!/^\d{4}-\d{2}$/.test(returnPeriod)) return setError("Choose the return period (YYYY-MM).");
    setError("");
    try {
      setPreview(await previewFile.mutateAsync({ file, returnPeriod, importMode: mode }));
    } catch (err) {
      setPreview(null);
      setError(getApiErrorMessage(err, "Could not read the file."));
    }
    return undefined;
  };

  const upload = async (replace) => {
    if (importFile.isPending) return;
    setError("");
    setProgress(0);
    try {
      const r = await importFile.mutateAsync({ file, returnPeriod, replace, importMode: mode, onUploadProgress: setProgress });
      setConfirmReplace(null);
      setResult(r);
      setPreview(null);
      toast.success(`${r.is_demo ? "Demo GSTR-2B" : "GSTR-2B"} for ${periodLabel(r.return_period)} imported: ${r.accepted_records ?? r.success_records} record(s).`);
      onImported?.(r);
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
    if (!preview) return undefined;
    // The period already has an import of this mode: ask before anything is sent.
    const existing = preview.replace_required || periods.some((p) => p.period === returnPeriod
      && (mode === IMPORT_MODE.DEMO ? p.demo_imported : p.gstr2b_imported));
    if (existing) return setConfirmReplace("");
    return upload(false);
  };

  const downloadDemoTemplate = async () => {
    try {
      downloadBlob(await gstr2bService.demoTemplate(), "gstr2b_demo_template.xlsx");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the demo template."));
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Import GSTR-2B"
        subtitle="Choose the import mode, the return period and the file - then check the preview before importing"
        size="2xl"
        closeOnBackdrop={!busy}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={close} disabled={busy}>{result ? "Close" : "Cancel"}</Button>
            {!result && !preview && (
              <Button variant="primary" size="small" onClick={runPreview} loading={previewFile.isPending} disabled={!file || !returnPeriod}>
                Preview
              </Button>
            )}
            {!result && preview && (
              <Button variant="primary" size="small" onClick={start} loading={importFile.isPending} disabled={!preview.can_import}>
                Import
              </Button>
            )}
            {result && <Button variant="primary" size="small" onClick={reset}>Import another file</Button>}
          </div>
        )}
      >
        <div className="space-y-4">
          <fieldset disabled={busy || Boolean(result)}>
            <legend className="text-xs font-medium text-slate-600">Import mode <span className="text-rose-600">*</span></legend>
            <div role="radiogroup" aria-label="Import mode" className="mt-1 grid gap-2 sm:grid-cols-2">
              {Object.entries(MODES).map(([key, m]) => {
                const Icon = m.icon;
                const selected = mode === key;
                return (
                  <label key={key} className={clsx("flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition",
                    selected ? (key === IMPORT_MODE.DEMO ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300" : "border-[#0A0082] bg-indigo-50/60 ring-1 ring-[#0A0082]/30")
                      : "border-slate-200 hover:bg-slate-50")}>
                    <input type="radio" name="gstr2b-import-mode" value={key} checked={selected} onChange={() => chooseMode(key)}
                      className="mt-1" aria-label={m.title} />
                    <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", key === IMPORT_MODE.DEMO ? "text-amber-600" : "text-indigo-600")} aria-hidden />
                    <span>
                      <span className="block font-medium text-slate-800">{m.title}</span>
                      <span className="block text-xs text-slate-500">{m.summary}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600" aria-label="Supported file format">
            <p className="font-medium text-slate-700">{spec.title} - supported format</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">{spec.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
            {mode === IMPORT_MODE.DEMO && (
              <button type="button" onClick={downloadDemoTemplate} className="mt-2 inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                <Download className="h-3.5 w-3.5" aria-hidden /> Download the demo template
              </button>
            )}
          </div>

          <label className="block text-xs font-medium text-slate-600">
            Return period <span className="text-rose-600">*</span>
            <input
              type="month"
              aria-label="Import return period"
              required
              className="mt-1 block h-9 w-48 rounded-md border border-slate-300 px-2.5 text-sm"
              value={returnPeriod}
              max={currentPeriod()}
              disabled={busy}
              onChange={(e) => { setReturnPeriod(e.target.value); setResult(null); setPreview(null); setError(""); }}
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
                  {!busy && (
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
                  <p className="mt-1 text-xs text-slate-400">{spec.accepted.join(", ")} · up to 10 MB</p>
                </>
              )}
              <input ref={inputRef} type="file" className="hidden" aria-label="GSTR-2B file" accept={spec.accepted.join(",")}
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
          {preview && !result && <ImportPreview preview={preview} />}
          {result && <ImportResult result={result} />}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReplace !== null}
        title={mode === IMPORT_MODE.DEMO ? "Replace Existing Demo Import?" : "Replace Existing GSTR-2B Import?"}
        message={(
          <>
            <p>
              {mode === IMPORT_MODE.DEMO ? "A demo import" : "An import"} already exists for {periodLabel(returnPeriod)}. Replacing it will create a new import version.
              Previous import history will be retained. Existing manual mappings will carry over where supported.
              {mode === IMPORT_MODE.DEMO && " The official GSTR-2B import of the period is not affected."}
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
