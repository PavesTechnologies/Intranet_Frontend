// Shared pieces for the challan / quarterly filing pages: "upload to auto-fill" box, a labelled
// input, and the validation issues list (errors block, warnings inform).
import { useRef } from "react";
import { toast } from "react-toastify";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, ScanText, XCircle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { ACCEPTED_DOCUMENT_EXTENSIONS, validateDocumentFile } from "../../utils/documentUpload";
import { getApiErrorMessage } from "../../utils/apiError";

export function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** extracted.fields -> {key: value} for the keys that were found. */
export function valuesFrom(extracted) {
  return Object.fromEntries(Object.entries(extracted?.fields || {}).filter(([, f]) => f?.value !== null && f?.value !== undefined && f?.value !== "").map(([k, f]) => [k, f.value]));
}

export function Field({ id, label, hint, children, autoFilled }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {autoFilled && <span className="ml-1 text-xs font-normal text-[#0A0082]">· auto-filled</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 disabled:bg-slate-50";

export function ExtractUploadBox({ title, hint, file, onExtracted, onFile, extract, disabled }) {
  const inputRef = useRef(null);
  const handle = async (picked) => {
    if (!picked) return;
    const error = validateDocumentFile(picked);
    if (error) {
      toast.error(error);
      return;
    }
    onFile(picked);
    try {
      const result = await extract.mutateAsync(picked);
      onExtracted(result);
      toast.success("Details read from the document - please check them.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The document could not be read. Enter the details manually."));
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-sm text-slate-600">
        <ScanText className="mr-1 inline h-4 w-4 align-[-3px] text-[#0A0082]" aria-hidden />
        {file ? (
          <>
            <span className="font-medium text-slate-800">{file.name}</span> will be attached as evidence.
          </>
        ) : (
          <>
            <span className="font-medium text-slate-800">{title}</span> {hint}
          </>
        )}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_DOCUMENT_EXTENSIONS.join(",")}
        data-testid="document-input"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button size="small" variant="outline" onClick={() => inputRef.current?.click()} loading={extract.isPending} loadingText="Reading..." disabled={disabled}>
        {file ? "Replace document" : "Upload to auto-fill"}
      </Button>
    </div>
  );
}

export function IssuesList({ result }) {
  if (!result) return null;
  const { errors = [], warnings = [] } = result;
  if (!errors.length && !warnings.length) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> All checks passed.
      </p>
    );
  }
  return (
    <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm" aria-label="Checks">
      {errors.map((e, i) => (
        <li key={`e${i}`} className="flex items-start gap-1.5 text-rose-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {e.message}
        </li>
      ))}
      {warnings.map((w, i) => (
        <li key={`w${i}`} className={clsx("flex items-start gap-1.5", "text-amber-700")}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w.message}
        </li>
      ))}
    </ul>
  );
}
