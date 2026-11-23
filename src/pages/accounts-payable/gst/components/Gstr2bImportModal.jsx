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

const ACCEPTED = [".xlsx", ".json", ".csv"];

/**
 * The formats one upload accepts. The backend identifies which one a file is from its worksheets and header rows
 * (import_mode=AUTO) - never from the file name - and refuses anything else.
 */
const FORMATS = [
  {
    title: "GST portal GSTR-2B",
    icon: Landmark,
    lines: [
      "Excel or JSON downloaded from the GST portal (Returns Dashboard → GSTR-2B → Download); the CSV template is accepted too.",
      "Excel sheets reconciled: B2B, B2BA, B2B-CDNR and B2B-CDNRA, with the portal header “GSTIN of supplier”. Other sheets (ISD, IMPG, …) are reported, not imported.",
      "A month's GSTR-2B is generated on the 14th of the following month - it cannot be imported earlier.",
    ],
  },
  {
    title: "AP demo Excel template",
    icon: FlaskConical,
    lines: [
      `One worksheet named B2B with ${GSTR2B_DEMO_COLUMNS.map((c) => c.header).join(", ")} (required: ${GSTR2B_DEMO_COLUMNS.filter((c) => c.required).map((c) => c.header).join(", ")}).`,
      "Imported as DEMO data - kept apart from the official GSTR-2B and never used for ITC eligibility, GSTR-3B approval or claims.",
    ],
  },
];

function validateFile(file) {
  if (!file) return "Choose the GSTR-2B file.";
  const name = file.name.toLowerCase();
  if (!ACCEPTED.some((ext) => name.endsWith(ext))) return "Upload the GSTR-2B Excel (.xlsx) - or the portal JSON / CSV template.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB.";
  return "";
}

/** "Detected format" line of a preview / result: what the backend identified the file as. */
function DetectedFormat({ data }) {
  if (!data?.import_mode) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600" aria-label="Detected format">
      <span className="font-medium text-slate-700">{data.mode_detected === false ? "Format:" : "Detected format:"}</span>
      {GSTR2B_SOURCE_TYPES[data.source_type] || data.source_type || data.source_format}
      <StatusPill spec={importModeSpec(data.import_mode)} />
    </p>
  );
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
        Preview{preview.return_period && <span className="font-normal text-slate-500">· {periodLabel(preview.return_period)}</span>}
      </p>
      <DetectedFormat data={preview} />
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
      <DetectedFormat data={result} />
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
 * Imports a GSTR-2B for a return period: the user picks only the period and the file. The preview is
 * requested with import_mode=AUTO - the backend identifies the official GST portal Excel (B2B, B2BA,
 * B2B-CDNR, B2B-CDNRA sheets) / JSON / CSV template or the AP demo Excel template from the file's
 * structure, and refuses anything else. The import then sends the mode the preview reported, so what is
 * imported is exactly what was previewed. When the period already has an import of that mode the user
 * must confirm replacing it; only then is replace=true sent. A demo import never replaces or mixes with
 * the official one.
 */
export default function Gstr2bImportModal({ isOpen, onClose, defaultPeriod, periods = [], onImported }) {
  const inputRef = useRef(null);
  const importFile = useImportGstr2b();
  const previewFile = usePreviewGstr2b();
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
  const demo = Boolean(preview?.is_demo);

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
    setReturnPeriod(defaultPeriod || "");
    onClose();
  };

  const pick = (picked) => {
    setResult(null);
    setPreview(null);
    setError("");
    const message = validateFile(picked);
    setFileError(message);
    setFile(message ? null : picked);
  };

  const runPreview = async () => {
    const message = validateFile(file);
    if (message) return setFileError(message);
    if (!/^\d{4}-\d{2}$/.test(returnPeriod)) return setError("Choose the return period (YYYY-MM).");
    setError("");
    try {
      setPreview(await previewFile.mutateAsync({ file, returnPeriod, importMode: IMPORT_MODE.AUTO }));
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
      // the mode the backend identified in the preview - the import is validated against it again
      const r = await importFile.mutateAsync({ file, returnPeriod, replace, importMode: preview.import_mode, onUploadProgress: setProgress });
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
    // The period already has an import of the detected mode: ask before anything is sent.
    const existing = preview.replace_required || periods.some((p) => p.period === returnPeriod
      && (demo ? p.demo_imported : p.gstr2b_imported));
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
        subtitle="Choose the return period and the GSTR-2B file - its format is identified automatically. Check the preview before importing."
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
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600" aria-label="Supported file format">
            <p className="font-medium text-slate-700">Supported formats - identified automatically from the file&apos;s sheets and headers</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {FORMATS.map(({ title, icon: Icon, lines }) => (
                <div key={title}>
                  <p className="flex items-center gap-1.5 font-medium text-slate-700"><Icon className="h-3.5 w-3.5" aria-hidden /> {title}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
              ))}
            </div>
            <button type="button" onClick={downloadDemoTemplate} className="mt-2 inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
              <Download className="h-3.5 w-3.5" aria-hidden /> Download the demo template
            </button>
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
                  <p className="mt-1 text-xs text-slate-400">GSTR-2B Excel (.xlsx) · portal JSON or CSV template also accepted · up to 10 MB</p>
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
          {preview && !result && <ImportPreview preview={preview} />}
          {result && <ImportResult result={result} />}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReplace !== null}
        title={demo ? "Replace Existing Demo Import?" : "Replace Existing GSTR-2B Import?"}
        message={(
          <>
            <p>
              {demo ? "A demo import" : "An import"} already exists for {periodLabel(returnPeriod)}. Replacing it will create a new import version.
              Previous import history will be retained. Existing manual mappings will carry over where supported.
              {demo && " The official GSTR-2B import of the period is not affected."}
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
