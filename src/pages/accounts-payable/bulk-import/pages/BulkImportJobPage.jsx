// Route: /accounts-payable/bulk-import/:jobId
// One import: each sheet row next to what its document says, the checks, and the actions -
// "Record N verified rows", accept a reviewed row, skip a row, download the results sheet.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowLeft, Download, Info, Loader2, XCircle } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { SegmentedTabs, Empty } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/documentUpload";
import { IMPORT_TYPES, TYPE_BY_KIND, bulkImportService } from "../services/bulkImportService";
import { isJobRunning, useImportJob, useRecordImport, useSkipImportRow } from "../hooks/useBulkImport";
import { JobStatusPill, RowCounts, RowStatusPill, fmtDateTime, money } from "../components/BulkImportParts";

const FILTERS = {
  all: () => true,
  ready: (r) => r.status === "READY",
  review: (r) => r.status === "NEEDS_REVIEW",
  error: (r) => r.status === "ERROR",
  done: (r) => r.status === "RECORDED" || r.status === "SKIPPED",
};
const SEVERITY = {
  error: { icon: XCircle, cls: "text-rose-700" },
  review: { icon: AlertTriangle, cls: "text-amber-700" },
  info: { icon: Info, cls: "text-slate-500" },
};

/** The sheet values vs what the document says, per import type. */
function compareRows(kind, row, groupTotal) {
  const d = row.data || {};
  const x = row.extracted_fields || {};
  if (kind === "PAYMENTS") {
    // One transfer that paid several invoices: the receipt shows the transfer total.
    const shared = groupTotal != null && Number(groupTotal) !== Number(d.amount);
    return [
      ["Amount", shared ? `${money(d.amount)} (of ${money(groupTotal)})` : money(d.amount), x.amount != null ? money(x.amount) : null, shared ? money(groupTotal) : undefined],
      ["UTR", d.reference_number, x.reference_number],
      ["Date", d.payment_date, x.payment_date],
    ];
  }
  if (kind === "TDS_CHALLANS") {
    return [
      ["Challan", `${d.challan_serial_no || ""} / ${d.bsr_code || ""}`, x.challan_serial_no ? `${x.challan_serial_no} / ${x.bsr_code || ""}` : null],
      ["Deposited", d.deposit_date, x.deposit_date],
      ["Tax", money(d.tax_amount), x.tax_amount != null ? money(x.tax_amount) : null],
    ];
  }
  return [
    ["Ack no.", d.acknowledgement_no, x.acknowledgement_no],
    ["Filed", d.filing_date, x.filing_date],
    ["Period", `${d.form_type || ""} ${d.financial_year || ""} Q${d.quarter ?? ""}`, null],
  ];
}

function rowTitle(kind, row) {
  const d = row.data || {};
  if (kind === "PAYMENTS") return d.invoice_number;
  return `${d.invoice_number}${d.allocated_tds_amount ? ` · ${money(d.allocated_tds_amount)}` : ""}`;
}

export default function BulkImportJobPage() {
  const { jobId } = useParams();
  const { data: job, isLoading, isError, error } = useImportJob(jobId);
  const record = useRecordImport();
  const skip = useSkipImportRow();
  const [filter, setFilter] = useState("all");
  const busy = record.isPending || skip.isPending;

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading import…</div>;
  if (isError || !job) {
    return <div className="p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load this import.")}</div>;
  }
  const type = TYPE_BY_KIND[job.kind];
  const rows = job.rows || [];
  const ready = rows.filter(FILTERS.ready).length;
  const grouped = job.kind !== "PAYMENTS";
  const running = isJobRunning(job);
  // Payments sharing a UTR and receipt: total per transfer, compared with the receipt amount.
  const transferTotals = {};
  if (job.kind === "PAYMENTS") {
    rows.forEach((r) => {
      const key = `${r.group_key}|${r.document_name}`;
      transferTotals[key] = (transferTotals[key] || 0) + Number(r.data?.amount || 0);
    });
  }
  const groupTotal = (r) => {
    if (job.kind !== "PAYMENTS") return undefined;
    const peers = rows.filter((p) => p.group_key === r.group_key && p.document_name === r.document_name);
    return peers.length > 1 ? transferTotals[`${r.group_key}|${r.document_name}`] : undefined;
  };

  const run = async (promise, message) => {
    try {
      const result = await promise;
      if (result?.summary) {
        const { recorded, failed } = result.summary;
        toast[failed ? "warning" : "success"](`${recorded} row${recorded === 1 ? "" : "s"} recorded${failed ? `, ${failed} failed - see the messages` : ""}.`);
      } else if (message) toast.success(message);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The action failed."));
    }
  };

  const downloadResults = async () => {
    try {
      downloadBlob(await bulkImportService.results(job.job_id), `${job.file_name.replace(/\.xlsx$/i, "")} - results.xlsx`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the results."));
    }
  };

  const accept = (row) => {
    const scope = grouped ? rows.filter((r) => r.group_key === row.group_key).map((r) => r.row_id) : [row.row_id];
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Record ${grouped ? "this challan / filing" : "this payment"} as entered in the sheet? The differences shown were checked by you.`)) return;
    run(record.mutateAsync({ jobId: job.job_id, rowIds: scope, acceptReview: true }));
  };

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title={`${IMPORT_TYPES[type]?.label || "Import"} import #${job.job_id}`}
        subtitle={`${job.file_name} · ${job.source === "SHAREPOINT" ? `picked up automatically - ${job.created_by_name || "SharePoint"}` : `uploaded by ${job.created_by_name || "—"}`} · ${fmtDateTime(job.created_at)}`}
        actions={
          <>
            <Link to={`${AP_ROUTES.BULK_IMPORT}?type=${type}`}>
              <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Bulk import</Button>
            </Link>
            <Button variant="outline" onClick={downloadResults} disabled={running}><Download className="h-4 w-4" /> Results sheet</Button>
            {ready > 0 && (
              <Button variant="primary" onClick={() => run(record.mutateAsync({ jobId: job.job_id }))} loading={record.isPending} loadingText="Recording..." disabled={busy || running}>
                Record {ready} verified row{ready === 1 ? "" : "s"}
              </Button>
            )}
          </>
        }
      />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <JobStatusPill status={job.status} />
          <RowCounts counts={job.counts} total={job.total_rows} />
        </div>
        {running && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Reading the documents - you can leave this page.
          </span>
        )}
        {job.error_message && <p className="w-full text-sm text-rose-700">{job.error_message}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Rows</h2>
          <SegmentedTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "all", label: "All", count: rows.length },
              { value: "ready", label: "Ready", count: ready },
              { value: "review", label: "Needs review", count: rows.filter(FILTERS.review).length },
              { value: "error", label: "Errors", count: rows.filter(FILTERS.error).length },
              { value: "done", label: "Recorded / skipped", count: rows.filter(FILTERS.done).length },
            ]}
          />
        </div>
        {rows.filter(FILTERS[filter]).length === 0 ? (
          <Empty text="No rows in this view." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 text-left font-semibold">Row</th>
                  <th className="px-3 py-2 text-left font-semibold">{grouped ? "Invoice (group)" : "Invoice"}</th>
                  <th className="px-3 py-2 text-left font-semibold">Sheet vs document</th>
                  <th className="px-3 py-2 text-left font-semibold">Result</th>
                  <th className="px-5 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.filter(FILTERS[filter]).map((row) => (
                  <tr key={row.row_id} className="align-top">
                    <td className="px-5 py-3 text-left text-xs text-slate-500">{row.row_number}</td>
                    <td className="px-3 py-3 text-left">
                      <p className="font-medium text-slate-900">{rowTitle(job.kind, row)}</p>
                      <p className="text-xs text-slate-500">{row.document_name || "no document"}</p>
                      {grouped && row.group_key && <p className="text-[11px] text-slate-400">{row.group_key.split(":").slice(1).join(" · ")}</p>}
                    </td>
                    <td className="px-3 py-3 text-left">
                      <dl className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5 text-xs">
                        {compareRows(job.kind, row, groupTotal(row)).map(([label, sheet, doc, compareTo]) => (
                          <div key={label} className="contents">
                            <dt className="text-slate-500">{label}</dt>
                            <dd className="text-slate-800">{sheet || "—"}</dd>
                            <dd className={doc && String(doc) !== String(compareTo ?? sheet) ? "font-semibold text-amber-700" : "text-slate-500"}>{doc ?? (row.status === "PENDING" ? "…" : "")}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                    <td className="px-3 py-3 text-left">
                      <RowStatusPill status={row.status} />
                      {row.result_reference && <p className="mt-1 text-xs text-emerald-700">{row.result_reference}</p>}
                      <ul className="mt-1 space-y-0.5">
                        {(row.messages || []).map((m, i) => {
                          const s = SEVERITY[m.severity] || SEVERITY.info;
                          return (
                            <li key={i} className={`flex max-w-[360px] items-start gap-1 text-xs ${s.cls}`}>
                              <s.icon className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden /> {m.message}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-5 py-3 text-left">
                      <div className="flex flex-wrap gap-1.5">
                        {row.status === "NEEDS_REVIEW" && (
                          <Button size="small" variant="primary" onClick={() => accept(row)} disabled={busy || running}>Accept &amp; record</Button>
                        )}
                        {["NEEDS_REVIEW", "ERROR", "READY"].includes(row.status) && (
                          <Button size="small" variant="ghost" onClick={() => run(skip.mutateAsync(row.row_id), "Row skipped.")} disabled={busy || running}>Skip</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
