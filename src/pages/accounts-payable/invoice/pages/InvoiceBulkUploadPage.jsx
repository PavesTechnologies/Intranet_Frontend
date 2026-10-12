// src/pages/accounts-payable/invoice/pages/InvoiceBulkUploadPage.jsx
// Route: /accounts-payable/invoices/bulk-upload  (INVOICE_BULK_UPLOAD)
// Upload one ZIP or up to 25 invoices. The backend reads each one with the same extract ->
// validate -> save steps as the single upload and saves it to the OCR review queue.
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, FileArchive, FileText, Mail, ScanText, UploadCloud, X, ClipboardCheck } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import { SegmentedTabs, Empty } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { useBulkBatches, useBulkUploadLimits, useUploadBatchMutation } from "../hooks/useBulkUpload";
import EmailIntakeCard from "../components/bulk/EmailIntakeCard";
import {
  BATCH_STATUS,
  BatchProgressBar,
  StatusPill,
  attentionCount,
  doneCount,
  formatBytes,
  formatDateTime,
} from "../components/bulk/BulkUploadParts";

const DEFAULT_LIMITS = { max_files: 25, max_file_mb: 10, max_zip_mb: 250 };
const INVOICE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff"];
const ACCEPT = [...INVOICE_EXTENSIONS, ".zip"].join(",");
const HISTORY_PAGE_SIZE = 10;

function extensionOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

const isZip = (file) => extensionOf(file.name) === ".zip";

/** Mirrors the server's request-level rules so the user finds out before uploading. */
export function checkSelection(files, limits = DEFAULT_LIMITS) {
  if (files.length === 0) return { error: "", warnings: [] };
  const zips = files.filter(isZip);
  if (zips.length && files.length > 1) return { error: "Upload either one ZIP file or several invoice files, not both.", warnings: [] };
  if (zips.length) {
    return zips[0].size > limits.max_zip_mb * 1024 * 1024
      ? { error: `The ZIP file exceeds the ${limits.max_zip_mb} MB limit.`, warnings: [] }
      : { error: "", warnings: [] };
  }
  if (files.length > limits.max_files) {
    return { error: `A batch can contain at most ${limits.max_files} invoices; ${files.length} are selected.`, warnings: [] };
  }
  const warnings = [];
  files.forEach((f) => {
    if (!INVOICE_EXTENSIONS.includes(extensionOf(f.name))) warnings.push(`${f.name}: unsupported type - it will be marked failed.`);
    else if (f.size > limits.max_file_mb * 1024 * 1024) warnings.push(`${f.name}: larger than ${limits.max_file_mb} MB - it will be marked failed.`);
  });
  return { error: "", warnings };
}

function HowItWorks() {
  const steps = [
    { icon: UploadCloud, title: "Upload", text: "A ZIP or up to 25 PDF / image invoices." },
    { icon: ScanText, title: "Read & check", text: "Each file is read and validated exactly like a single upload." },
    { icon: ClipboardCheck, title: "Review", text: "Invoices wait in the OCR review queue; issues are listed per file." },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A0082]/10 text-[#0A0082]">
            <s.icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {i + 1}. {s.title}
            </p>
            <p className="text-xs text-slate-500">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function BatchHistory() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("mine");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useBulkBatches({
    mine: scope === "mine",
    sourceType: scope === "email" ? "EMAIL" : undefined,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  });
  const batches = data?.items || [];
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / HISTORY_PAGE_SIZE));

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recent batches</h2>
          <p className="text-xs text-slate-500">Open a batch to retry, skip or jump to the created invoices.</p>
        </div>
        <SegmentedTabs
          tabs={[
            { value: "mine", label: "My uploads" },
            { value: "all", label: "All uploads" },
            { value: "email", label: "From email" },
          ]}
          value={scope}
          onChange={(v) => {
            setScope(v);
            setPage(1);
          }}
        />
      </div>

      {isError ? (
        <p className="px-5 py-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load upload batches.")}</p>
      ) : isLoading ? (
        <p className="px-5 py-6 text-sm text-slate-500">Loading batches…</p>
      ) : batches.length === 0 ? (
        <Empty text="No bulk uploads yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-semibold text-left">Batch</th>
                <th className="px-3 py-2 font-semibold text-left">Uploaded</th>
                <th className="px-3 py-2 font-semibold text-left">Progress</th>
                <th className="px-3 py-2 font-semibold text-left">Status</th>
                <th className="px-5 py-2 text-left" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => {
                const attention = attentionCount(b.counts);
                return (
                  <tr
                    key={b.batch_id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(AP_ROUTES.INVOICE_BULK_BATCH(b.batch_id))}
                  >
                    <td className="px-5 py-3 text-left">
                      <p className="font-semibold text-slate-900">#{b.batch_id}</p>
                      <p className="max-w-[240px] truncate text-xs text-slate-500" title={b.source_name}>
                        {b.source_type === "EMAIL" && <Mail className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-label="From email" />}
                        {b.source_name}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-left">
                      <p>{formatDateTime(b.created_at)}</p>
                      {b.source_type === "EMAIL" ? (
                        <p className="max-w-[220px] truncate text-xs text-slate-400" title={b.email_from || ""}>
                          {b.email_from || "Email"}
                          {b.sender_known === false && <span className="ml-1 font-semibold text-amber-700">· unknown sender</span>}
                        </p>
                      ) : (
                        scope !== "mine" && b.uploaded_by_name && <p className="text-xs text-slate-400">{b.uploaded_by_name}</p>
                      )}
                    </td>
                    <td className="w-[32%] px-3 py-3">
                      <BatchProgressBar batch={b} />
                      <p className="mt-1 text-xs text-slate-500">
                        {b.counts.created} of {b.total_files} created
                        {attention ? <span className="font-semibold text-amber-700"> · {attention} need attention</span> : null}
                        {doneCount(b) < b.total_files ? ` · ${b.total_files - doneCount(b)} in progress` : null}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-left">
                      <StatusPill meta={BATCH_STATUS[b.status]} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-label="Open batch" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </section>
  );
}

/** Route: needs INVOICE_BULK_UPLOAD (upload + history) or EMAIL_INTAKE_MANAGE (mailbox switch only). */
export default function InvoiceBulkUploadPage() {
  const { canBulkUploadInvoices, canManageEmailIntake } = useApPermissions();
  if (!canBulkUploadInvoices) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="Mailbox Intake" subtitle="Invoices emailed to the AP mailbox are read automatically while intake is on." />
        {canManageEmailIntake && <EmailIntakeCard />}
      </div>
    );
  }
  return <BulkUploadWorkspace />;
}

function BulkUploadWorkspace() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { canUploadInvoice } = useApPermissions();
  const { data: limitsData } = useBulkUploadLimits();
  const limits = limitsData || DEFAULT_LIMITS;
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = useUploadBatchMutation();

  const { error: selectionError, warnings } = useMemo(() => checkSelection(files, limits), [files, limits]);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setFiles((current) => {
      // A ZIP replaces the selection; loose files are appended (same name + size = same file).
      if (incoming.some(isZip)) return incoming.filter(isZip).slice(0, 1);
      const base = current.filter((f) => !isZip(f));
      const key = (f) => `${f.name}:${f.size}`;
      const seen = new Set(base.map(key));
      return [...base, ...incoming.filter((f) => !seen.has(key(f)) && seen.add(key(f)))];
    });
  };

  const removeFile = (index) => setFiles((current) => current.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (!files.length || selectionError) return;
    setProgress(0);
    try {
      const batch = await upload.mutateAsync({ files, onProgress: setProgress });
      toast.success(`Batch #${batch.batch_id} uploaded - ${batch.total_files} file${batch.total_files === 1 ? "" : "s"} are being processed.`);
      navigate(AP_ROUTES.INVOICE_BULK_BATCH(batch.batch_id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "The upload failed. Please try again."));
    }
  };

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Bulk Invoice Upload"
        subtitle={`Upload a ZIP or up to ${limits.max_files} invoices at once. Each one is read, validated and saved for OCR review.`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_LIST)}>
              <ArrowLeft className="h-4 w-4" /> Back to Invoices
            </Button>
            {canUploadInvoice && (
              <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_UPLOAD)}>
                Single upload
              </Button>
            )}
          </>
        }
      />

      <HowItWorks />

      <EmailIntakeCard />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose invoice files or a ZIP"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
            isDragging ? "border-[#0A0082] bg-[#0A0082]/5" : "border-slate-300 hover:border-[#0A0082]/60 hover:bg-slate-50",
          )}
        >
          <UploadCloud className="h-10 w-10 text-[#0A0082]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-800">Drop invoices or a ZIP here, or click to browse</p>
          <p className="mt-1 text-xs text-slate-500">
            PDF, JPG, PNG or TIFF · up to {limits.max_files} files · {limits.max_file_mb} MB each · ZIP up to {limits.max_zip_mb} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            data-testid="bulk-file-input"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {files.length} file{files.length === 1 ? "" : "s"} selected · {formatBytes(totalBytes)}
              </span>
              <button type="button" className="font-semibold text-[#0A0082] hover:underline" onClick={() => setFiles([])} disabled={upload.isPending}>
                Clear all
              </button>
            </div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {files.map((file, index) => {
                const Icon = isZip(file) ? FileArchive : FileText;
                return (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-slate-800" title={file.name}>
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={upload.isPending}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {selectionError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {selectionError}
          </p>
        )}
        {!selectionError && warnings.length > 0 && (
          <ul className="mt-3 space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {warnings.slice(0, 5).map((w) => (
              <li key={w}>{w}</li>
            ))}
            {warnings.length > 5 && <li>+{warnings.length - 5} more</li>}
          </ul>
        )}

        {upload.isPending && (
          <div className="mt-4" aria-live="polite">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-[#0A0082] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{progress < 100 ? `Uploading… ${progress}%` : "Storing files…"}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!files.length || Boolean(selectionError)}
            loading={upload.isPending}
            loadingText="Uploading..."
          >
            Upload {files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </section>

      <BatchHistory />
    </div>
  );
}
