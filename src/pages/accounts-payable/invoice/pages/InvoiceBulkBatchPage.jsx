// src/pages/accounts-payable/invoice/pages/InvoiceBulkBatchPage.jsx
// Route: /accounts-payable/invoices/bulk-upload/:batchId  (INVOICE_BULK_UPLOAD)
// Live progress of one bulk upload, file by file. Polls while files are still being read.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Loader2, Mail, RotateCcw } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { KpiTile, SegmentedTabs, Empty } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { AUTOMATION_OUTCOME } from "../../constants/apAutomation";
import {
  isBatchRunning,
  useBulkBatch,
  useRetryBatchMutation,
  useRetryItemMutation,
  useSkipItemMutation,
} from "../hooks/useBulkUpload";
import {
  BATCH_STATUS,
  ITEM_STATUS,
  BatchProgressBar,
  StatusPill,
  attentionCount,
  doneCount,
  formatBytes,
  formatDateTime,
} from "../components/bulk/BulkUploadParts";

const FILTERS = {
  all: () => true,
  attention: (i) => i.status === "VENDOR_NOT_FOUND" || i.status === "FAILED" || i.stalled,
  created: (i) => i.status === "CREATED",
  duplicate: (i) => i.status === "DUPLICATE" || i.status === "SKIPPED",
  progress: (i) => (i.status === "QUEUED" || i.status === "PROCESSING") && !i.stalled,
};

function ItemRow({ item, busy, onRetry, onSkip, canOnboardVendor }) {
  const navigate = useNavigate();
  return (
    <tr className="align-top">
      <td className="px-5 py-3 text-xs text-slate-400 text-left">{item.sequence_no}</td>
      <td className="px-3 py-3 text-left">
        <p className="max-w-[260px] truncate font-medium text-slate-900" title={item.file_name}>
          {item.file_name}
        </p>
        <p className="text-xs text-slate-400">
          {formatBytes(item.file_size)}
          {item.attempt_count > 1 ? ` · attempt ${item.attempt_count}` : ""}
        </p>
      </td>
      <td className="px-3 py-3 text-left">
        {item.invoice_number || item.vendor_name ? (
          <>
            <p className="text-slate-800">{item.invoice_number || "—"}</p>
            <p className="max-w-[220px] truncate text-xs text-slate-500" title={item.vendor_name || ""}>
              {item.vendor_name || ""}
              {item.vendor_gstin ? ` · ${item.vendor_gstin}` : ""}
            </p>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-left">
        <StatusPill meta={ITEM_STATUS[item.status]} stalled={item.stalled} />
        {item.stalled && <p className="mt-1 max-w-[320px] text-xs text-amber-700">Processing stopped (server restart). Retry to resume.</p>}
        {item.error_message && <p className="mt-1 max-w-[320px] text-xs text-slate-600">{item.error_message}</p>}
        {item.automation && (
          <p className={`mt-1 max-w-[320px] text-xs ${item.automation.outcome === "EXCEPTION" || item.automation.outcome === "REVIEWED_NOT_SENT" ? "text-amber-700" : "text-emerald-700"}`}>
            AP automation: {AUTOMATION_OUTCOME[item.automation.outcome]?.label || item.automation.outcome}
            {item.automation.reasons?.[0] ? ` - ${item.automation.reasons[0]}` : ""}
          </p>
        )}
        {item.status === "CREATED" && item.is_valid === false && item.validation_issues?.length > 0 && (
          <p className="mt-1 max-w-[320px] text-xs text-amber-700" title={item.validation_issues.join("\n")}>
            {item.validation_issues.length} validation issue{item.validation_issues.length === 1 ? "" : "s"} to fix in review:{" "}
            {item.validation_issues[0]}
          </p>
        )}
      </td>
      <td className="px-5 py-3 text-left">
        <div className="flex flex-wrap justify-end gap-1.5">
          {item.invoice_id && (
            <Button size="small" variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_DETAIL(item.invoice_id))}>
              {item.status === "DUPLICATE" ? "Open existing" : "Open invoice"}
            </Button>
          )}
          {item.status === "VENDOR_NOT_FOUND" && canOnboardVendor && (
            <Button size="small" variant="outline" onClick={() => navigate(AP_ROUTES.VENDOR_ONBOARD)}>
              Onboard vendor
            </Button>
          )}
          {item.can_retry && (
            <Button size="small" variant="primary" onClick={() => onRetry(item)} disabled={busy}>
              Retry
            </Button>
          )}
          {item.can_skip && (
            <Button size="small" variant="ghost" onClick={() => onSkip(item)} disabled={busy}>
              Skip
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function InvoiceBulkBatchPage() {
  const { batchId } = useParams();
  const { canOnboardVendor } = useApPermissions();
  const { data: batch, isLoading, isError, error } = useBulkBatch(batchId);
  const retryBatch = useRetryBatchMutation();
  const retryItem = useRetryItemMutation();
  const skipItem = useSkipItemMutation();
  const [filter, setFilter] = useState("all");
  const busy = retryBatch.isPending || retryItem.isPending || skipItem.isPending;

  const items = useMemo(() => batch?.items || [], [batch]);
  const visible = items.filter(FILTERS[filter]);
  const retryable = items.filter((i) => i.can_retry).length;

  const run = async (mutation, arg, success) => {
    try {
      await mutation.mutateAsync(arg);
      toast.success(success);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The action failed. Refresh and try again."));
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading batch…</div>;
  if (isError || !batch) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-700">{getApiErrorMessage(error, "Could not load this batch.")}</p>
        <Link to={AP_ROUTES.INVOICE_BULK_UPLOAD} className="mt-2 inline-block text-sm font-semibold text-[#0A0082] hover:underline">
          Back to bulk upload
        </Link>
      </div>
    );
  }

  const c = batch.counts;
  const attention = attentionCount(c);
  const running = isBatchRunning(batch);
  const kpis = [
    { key: "created", label: "Sent to OCR review", value: c.created, tone: "emerald", subtitle: "Invoices created", link: c.created ? AP_ROUTES.INVOICE_OCR_REVIEW : null, icon: CheckCircle2 },
    { key: "attention", label: "Needs attention", value: attention, tone: attention ? "amber" : "gray", subtitle: `${c.vendor_not_found} vendor not found · ${c.failed} failed`, icon: AlertTriangle },
    { key: "duplicate", label: "Duplicates / skipped", value: c.duplicate + c.skipped, tone: "gray", subtitle: "Not created again", icon: Copy },
    { key: "progress", label: "In progress", value: c.queued, tone: c.queued ? "blue" : "gray", subtitle: running ? "Reading files…" : "Nothing pending", icon: Loader2 },
  ];

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title={`Batch #${batch.batch_id}`}
        subtitle={
          batch.source_type === "EMAIL"
            ? `Email "${batch.email_subject || batch.source_name || ""}" from ${batch.email_from || "unknown sender"} · received ${formatDateTime(batch.email_received_at || batch.created_at)}`
            : `${batch.source_name || ""} · uploaded ${formatDateTime(batch.created_at)}${batch.uploaded_by_name ? ` by ${batch.uploaded_by_name}` : ""}`
        }
        actions={
          <>
            {retryable > 0 && (
              <Button
                variant="primary"
                onClick={() => run(retryBatch, batch.batch_id, `Retrying ${retryable} file${retryable === 1 ? "" : "s"}.`)}
                loading={retryBatch.isPending}
                disabled={busy}
              >
                <RotateCcw className="h-4 w-4" /> Retry {retryable} file{retryable === 1 ? "" : "s"}
              </Button>
            )}
            {c.created > 0 && (
              <Link to={AP_ROUTES.INVOICE_REVIEW_WORKBENCH}>
                <Button variant="outline">Review &amp; send created invoices</Button>
              </Link>
            )}
            <Link to={AP_ROUTES.INVOICE_BULK_UPLOAD}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> Back to bulk upload
              </Button>
            </Link>
            <Link to={AP_ROUTES.INVOICE_LIST}>
              <Button variant="outline">Invoices</Button>
            </Link>
          </>
        }
      />

      {batch.source_type === "EMAIL" && batch.sender_known === false && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">{batch.email_from || "This sender"}</span> is not the email address of any vendor on record.
            Check that the invoices are genuine before approving them.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusPill meta={BATCH_STATUS[batch.status]} />
            <span className="text-sm text-slate-600">
              {doneCount(batch)} of {batch.total_files} files processed
            </span>
          </div>
          {running && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Processing continues on the server - you can leave this page.
            </span>
          )}
        </div>
        <BatchProgressBar batch={batch} showLegend />
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon, ...kpi }) => (
          <KpiTile key={kpi.key} kpi={{ ...kpi, format: "count" }} icon={icon} />
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Files</h2>
          <SegmentedTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "all", label: "All", count: items.length },
              { value: "attention", label: "Needs attention", count: items.filter(FILTERS.attention).length },
              { value: "created", label: "Created", count: c.created },
              { value: "duplicate", label: "Duplicate / skipped", count: c.duplicate + c.skipped },
              { value: "progress", label: "In progress", count: items.filter(FILTERS.progress).length },
            ]}
          />
        </div>
        {visible.length === 0 ? (
          <Empty text="No files in this view." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-semibold text-left">#</th>
                  <th className="px-3 py-2 font-semibold text-left">File</th>
                  <th className="px-3 py-2 font-semibold text-left">Invoice / vendor</th>
                  <th className="px-3 py-2 font-semibold text-left">Result</th>
                  <th className="px-5 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <ItemRow
                    key={item.item_id}
                    item={item}
                    busy={busy}
                    canOnboardVendor={canOnboardVendor}
                    onRetry={(i) => run(retryItem, i.item_id, `Retrying ${i.file_name}.`)}
                    onSkip={(i) => run(skipItem, i.item_id, `${i.file_name} skipped.`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
