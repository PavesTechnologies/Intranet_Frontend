// Routes: /accounts-payable/bulk-import (payments - receipts only by default; PAYMENT_PROCESS) and
// /accounts-payable/tds/history-import (scope="tds-history": past TDS challans / filings from a sheet, for
// setting up or catching up - TDS_TRACKING_UPDATE). Routine TDS work uses Record challan / Record filing.
// Download the pre-filled template, fill it, upload it with its documents. Each document is read and
// checked against its row; verified rows are recorded with one click, the rest are listed for review.
import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowRight, Download, FileSpreadsheet, FileText, UploadCloud, X } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import { SegmentedTabs, Empty } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/documentUpload";
import { IMPORT_TYPES, bulkImportService } from "../services/bulkImportService";
import { useImportJobs, useUploadImport } from "../hooks/useBulkImport";
import { JobStatusPill, RowCounts, fmtDateTime } from "../components/BulkImportParts";

const PAGE_SIZE = 10;
const DOC_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".zip"];
const RECEIPT_STEPS = [
  "Pay the invoices in the bank portal as usual.",
  "Drop the receipts here - one, many or a ZIP. Each is read and matched to the invoice it pays: by the invoice number in the remarks, else by the beneficiary and the amount (one transfer can pay several invoices of a vendor).",
  "Check the list and record the matched payments with one click. TDS is marked deducted on each paid invoice.",
];
const STEPS = {
  payments: ["Download the template - it lists every invoice ready for payment.", "For each invoice you paid, choose the Payment Mode and enter the receipt file name - date, amount and UTR are read from the receipt (fill them only to have them checked). Delete rows you are not paying.", "Upload the sheet with the receipts (files or a ZIP)."],
  "tds-challans": ["Download the template - it lists every invoice whose TDS is deducted but not deposited.", "Fill the challan columns on each invoice it pays (same serial / BSR / date = one challan) and the challan file name.", "Upload the sheet with the challans."],
  "tds-filings": ["Download the template - it lists every invoice whose TDS is deposited but not filed.", "Fill form, quarter, token / ack number, filing date and the acknowledgement file name.", "Upload the sheet with the acknowledgements."],
};

const ext = (name) => {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
};

export function splitFiles(files) {
  const sheets = files.filter((f) => ext(f.name) === ".xlsx");
  const documents = files.filter((f) => DOC_EXTENSIONS.includes(ext(f.name)));
  const ignored = files.filter((f) => !sheets.includes(f) && !documents.includes(f));
  return { sheet: sheets[0] || null, extraSheets: sheets.slice(1), documents, ignored };
}

const SCOPES = {
  payments: {
    types: ["payments"],
    title: "Upload payment receipts",
    subtitle: "Paid in the bank portal? Drop the receipts - each is matched to the invoice it pays and checked before it is recorded.",
    denied: "You do not have permission to record payments.",
  },
  "tds-history": {
    types: ["tds-challans", "tds-filings"],
    title: "Import past TDS records",
    subtitle: "For setting up or catching up: record many past challans or quarterly filings from one sheet. Each month's challan and each quarter's filing is otherwise recorded on TDS challans & filings.",
    denied: "You do not have permission to record TDS challans or filings.",
  },
};

export default function BulkImportPage({ scope = "payments" }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { canRecordPayment, canUpdateTdsTracking } = useApPermissions();
  const scopeSpec = SCOPES[scope] || SCOPES.payments;
  const allowed = useMemo(
    () => scopeSpec.types.filter((t) => (t === "payments" ? canRecordPayment : canUpdateTdsTracking)),
    [scopeSpec, canRecordPayment, canUpdateTdsTracking],
  );
  const type = allowed.includes(params.get("type")) ? params.get("type") : allowed[0];
  // Payments: receipts only (no sheet) by default; ?mode=sheet keeps the template route
  const receiptsOnly = type === "payments" && params.get("mode") !== "sheet";
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef(null);
  const upload = useUploadImport();
  const jobs = useImportJobs(type, page);
  const { sheet, extraSheets, documents, ignored } = splitFiles(files);
  const totalPages = Math.max(1, Math.ceil((jobs.data?.total || 0) / PAGE_SIZE));

  if (!type) return <div className="p-6 text-sm text-slate-500">{scopeSpec.denied}</div>;

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    setFiles((cur) => {
      const key = (f) => `${f.name}:${f.size}`;
      const seen = new Set(cur.map(key));
      return [...cur, ...incoming.filter((f) => !seen.has(key(f)) && seen.add(key(f)))];
    });
  };

  const switchMode = (next) => {
    setParams(next === "sheet" ? { type, mode: "sheet" } : { type });
    setFiles([]);
  };

  const switchType = (next) => {
    setParams({ type: next });
    setFiles([]);
    setPage(1);
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      downloadBlob(await bulkImportService.template(type), `${type}-import-template.xlsx`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the template."));
    } finally {
      setDownloading(false);
    }
  };

  const submit = async () => {
    setProgress(0);
    try {
      const job = await upload.mutateAsync({ type, workbook: sheet, documents, onProgress: setProgress, receiptsOnly });
      toast.success(receiptsOnly
        ? `${documents.length} receipt(s) uploaded - matching them to invoices.`
        : `Import #${job.job_id} uploaded - documents are being checked.`);
      navigate(AP_ROUTES.BULK_IMPORT_JOB(job.job_id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The upload failed."));
    }
  };

  return (
    <div className="space-y-5 p-6">
      <PageHeader title={scopeSpec.title} subtitle={scopeSpec.subtitle} />

      {allowed.length > 1 && (
        <SegmentedTabs value={type} onChange={switchType} tabs={allowed.map((t) => ({ value: t, label: IMPORT_TYPES[t].label }))} />
      )}
      {type === "payments" && (
        <SegmentedTabs
          value={receiptsOnly ? "receipts" : "sheet"}
          onChange={switchMode}
          tabs={[{ value: "receipts", label: "Receipts only" }, { value: "sheet", label: "Sheet + receipts" }]}
        />
      )}

      <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">How it works</h2>
          <ol className="mt-3 space-y-3">
            {(receiptsOnly ? RECEIPT_STEPS : STEPS[type]).map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A0082]/10 text-xs font-semibold text-[#0A0082]">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {receiptsOnly
              ? <>Receipts matched by the invoice number or the beneficiary and amount are marked <strong>Ready</strong>; a match on the amount alone, or anything that differs, waits for your review.</>
              : <>Rows whose {IMPORT_TYPES[type].document} confirms the sheet are marked <strong>Ready</strong>; anything that differs waits for your review.</>}
            {" "}Nothing is recorded until you confirm.
          </p>
          {!receiptsOnly && (
            <Button className="mt-4" variant="outline" onClick={downloadTemplate} loading={downloading} loadingText="Preparing...">
              <Download className="h-4 w-4" /> Download template
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            role="button"
            tabIndex={0}
            aria-label={receiptsOnly ? "Choose the receipts" : "Choose the sheet and documents"}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={clsx(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
              dragging ? "border-[#0A0082] bg-[#0A0082]/5" : "border-slate-300 hover:border-[#0A0082]/60 hover:bg-slate-50",
            )}
          >
            <UploadCloud className="h-9 w-9 text-[#0A0082]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {receiptsOnly ? "Drop the payment receipts here" : `Drop the filled sheet (.xlsx) and its ${IMPORT_TYPES[type].document}s here`}
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF / image files or a ZIP · up to 300 documents</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept={(receiptsOnly ? DOC_EXTENSIONS : [".xlsx", ...DOC_EXTENSIONS]).join(",")}
              data-testid="import-file-input"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2 text-sm">
              {!receiptsOnly && (
                <p className={clsx("flex items-center gap-2", sheet ? "text-slate-800" : "text-rose-700")}>
                  <FileSpreadsheet className="h-4 w-4" aria-hidden /> {sheet ? sheet.name : "Add the filled .xlsx sheet"}
                </p>
              )}
              <p className="flex items-center gap-2 text-slate-700">
                <FileText className="h-4 w-4" aria-hidden /> {documents.length} document{documents.length === 1 ? "" : "s"}
              </p>
              {(extraSheets.length > 0 || ignored.length > 0) && (
                <p className="text-xs text-amber-700">
                  {extraSheets.length > 0 && `Only one sheet per import - ${extraSheets.map((f) => f.name).join(", ")} will be ignored. `}
                  {ignored.length > 0 && `Not supported: ${ignored.map((f) => f.name).join(", ")}.`}
                </p>
              )}
              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A0082] hover:underline" onClick={() => setFiles([])}>
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          )}

          {upload.isPending && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-label="Upload progress">
              <div className="h-full bg-[#0A0082] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={submit} disabled={receiptsOnly ? documents.length === 0 : !sheet} loading={upload.isPending} loadingText="Uploading...">
              {receiptsOnly ? `Match ${documents.length || ""} receipt${documents.length === 1 ? "" : "s"}`.replace("  ", " ") : "Upload and check"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Recent {IMPORT_TYPES[type].label.toLowerCase()} imports</h2>
          <p className="text-xs text-slate-500">Including sheets picked up automatically (SharePoint or the local test folder).</p>
        </div>
        {jobs.isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
        ) : !jobs.data?.items?.length ? (
          <Empty text="No imports yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 text-left font-semibold">Import</th>
                  <th className="px-3 py-2 text-left font-semibold">Uploaded</th>
                  <th className="px-3 py-2 text-left font-semibold">Rows</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.data.items.map((job) => (
                  <tr key={job.job_id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(AP_ROUTES.BULK_IMPORT_JOB(job.job_id))}>
                    <td className="px-5 py-3 text-left">
                      <p className="font-semibold text-slate-900">#{job.job_id}</p>
                      <p className="max-w-[260px] truncate text-xs text-slate-500" title={job.file_name}>{job.file_name}</p>
                    </td>
                    <td className="px-3 py-3 text-left text-slate-600">
                      <p>{fmtDateTime(job.created_at)}</p>
                      <p className="text-xs text-slate-400">{job.source === "SHAREPOINT" ? `Picked up · ${job.created_by_name || "SharePoint"}` : job.created_by_name}</p>
                    </td>
                    <td className="px-3 py-3 text-left"><RowCounts counts={job.counts} total={job.total_rows} /></td>
                    <td className="px-3 py-3 text-left"><JobStatusPill status={job.status} /></td>
                    <td className="px-5 py-3 text-right"><ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-label="Open import" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <Pagination currentPage={page} totalPages={totalPages} onPrevious={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </div>
        )}
      </section>
    </div>
  );
}
