import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Download } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { formatMoney } from "../../dashboard/components/insights";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob, extractFileNameFromContentDisposition } from "../../utils/documentUpload";
import { useApPermissions } from "../../hooks/useApPermissions";
import paymentRunService from "../services/paymentRunService";
import { useConfirmRun, useConfirmRunFile, usePaymentRun, useRunStep } from "../hooks/usePaymentRuns";
import { RunStatusBadge } from "./PaymentRunsPage";

const STEPS = [["DRAFT", "Prepared"], ["SUBMITTED", "Submitted"], ["APPROVED", "Approved"], ["SENT", "Sent to bank"], ["COMPLETED", "Confirmed"]];

function Steps({ status }) {
  const at = STEPS.findIndex(([s]) => s === status);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Run progress">
      {STEPS.map(([s, label], i) => (
        <li key={s} className={clsx("rounded-full px-3 py-1 text-xs font-medium",
          at >= i ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>{i + 1}. {label}</li>
      ))}
    </ol>
  );
}

export default function PaymentRunDetailPage() {
  const { runId } = useParams();
  const { data: run, isLoading, isError, error } = usePaymentRun(runId);
  const { canPreparePaymentRuns, canApprovePaymentRuns } = useApPermissions();
  const step = useRunStep();
  const confirm = useConfirmRun();
  const confirmFile = useConfirmRunFile();
  const [remarks, setRemarks] = useState("");
  const [format, setFormat] = useState("GENERIC_CSV");
  const [results, setResults] = useState({}); // reference -> {status, utr, reason}

  const doStep = async (name, okText) => {
    try {
      await step.mutateAsync({ runId, step: name, remarks });
      toast.success(okText);
      setRemarks("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the run."));
    }
  };

  const download = async () => {
    try {
      const response = await paymentRunService.bankFile(runId, format);
      const name = extractFileNameFromContentDisposition(response.headers?.["content-disposition"], `payment-run-${runId}.csv`);
      downloadBlob(response.data, name);
      toast.success("Bank file downloaded - upload it to the bank portal, then mark the run as sent.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not create the bank file."));
    }
  };

  const submitResults = async () => {
    const rows = Object.entries(results).filter(([, r]) => r.status).map(([reference, r]) => ({ reference, ...r }));
    try {
      const done = await confirm.mutateAsync({ runId, results: rows });
      toast.success(`${done.paid} transfer(s) paid, ${done.failed} failed.`);
      setResults({});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not record the bank's result."));
    }
  };

  const uploadResponse = async (file) => {
    if (!file) return;
    try {
      const done = await confirmFile.mutateAsync({ runId, file });
      toast.success(`${done.paid} transfer(s) paid, ${done.failed} failed from the bank file.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not read the bank response file."));
    }
  };

  if (isLoading) return <div className="p-6"><LoadingSpinner text="Loading payment run..." /></div>;
  if (isError) return <p className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the run.")}</p>;

  const pending = run.transfers.filter((t) => t.status === "PENDING");
  const setResult = (ref, patch) => setResults((cur) => ({ ...cur, [ref]: { ...(cur[ref] || {}), ...patch } }));
  const readyToConfirm = Object.values(results).some((r) => r.status === "FAILED" || (r.status === "PAID" && r.utr?.trim()));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Payment runs", to: AP_ROUTES.PAYMENT_RUNS }, { label: `#${run.run_id}` }]} />
      <PageHeader title={`#${run.run_id} · ${run.name}`}
        subtitle={`Value date ${formatDate(run.value_date)} · ${run.invoice_count} invoice(s) in ${run.transfer_count} transfer(s) · ${formatMoney(run.total, "INR")}`}
        actions={<RunStatusBadge status={run.status} />} />
      <Steps status={run.status} />
      {run.decision_remarks && <p className="text-xs text-slate-600">Approver's note: “{run.decision_remarks}”</p>}

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4" aria-label="Next step">
        {run.status === "DRAFT" && canPreparePaymentRuns && (
          <>
            <Button variant="primary" loading={step.isPending} onClick={() => doStep("submit", "Submitted - the Finance Manager will approve it.")}>Submit for approval</Button>
            <Button variant="ghost" onClick={() => doStep("cancel", "Run cancelled.")}>Cancel run</Button>
          </>
        )}
        {run.status === "SUBMITTED" && canApprovePaymentRuns && (
          <>
            <input aria-label="Approver remarks" className="h-9 w-72 rounded-md border border-slate-300 px-2 text-sm" placeholder="Remarks (needed to reject)"
              value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <Button variant="primary" loading={step.isPending} onClick={() => doStep("approve", "Approved - payments scheduled.")}>Approve run</Button>
            <Button variant="outline" disabled={remarks.trim().length < 5} onClick={() => doStep("reject", "Run rejected.")}>Reject</Button>
          </>
        )}
        {run.status === "SUBMITTED" && !canApprovePaymentRuns && <p className="text-sm text-slate-600">Waiting for the Finance Manager's approval.</p>}
        {run.status === "APPROVED" && canPreparePaymentRuns && (
          <>
            <select aria-label="Bank file format" className="h-9 rounded-md border border-slate-300 px-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="GENERIC_CSV">Bulk NEFT/RTGS - generic CSV</option>
              <option value="HDFC_ENET">HDFC ENET layout</option>
            </select>
            <Button variant="outline" onClick={download}><Download size={14} /> Download bank file</Button>
            <Button variant="primary" disabled={!run.file_generated_at} loading={step.isPending}
              onClick={() => doStep("mark-sent", "Marked as sent - record the bank's result when it comes back.")}>Mark sent to bank</Button>
            {run.file_generated_at && <span className="text-xs text-slate-500">File created {formatDateTime(run.file_generated_at)}</span>}
          </>
        )}
        {run.status === "SENT" && canPreparePaymentRuns && (
          <>
            <span className="text-sm text-slate-700">Record the bank's result below, or</span>
            <label className="text-xs font-medium text-indigo-700">
              upload the bank's response file (Customer Reference, UTR, Status)
              <input type="file" accept=".csv" aria-label="Bank response file" className="ml-2 text-xs" onChange={(e) => uploadResponse(e.target.files?.[0])} />
            </label>
          </>
        )}
        {run.status === "COMPLETED" && <p className="text-sm text-emerald-700">All transfers confirmed {formatDateTime(run.completed_at)}.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Vendor / bank</th><th className="px-3 py-2 text-left">Invoices</th>
              <th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-left">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {run.transfers.map((t) => (
              <tr key={t.reference} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{t.vendor_name}</p>
                  <p className="text-xs text-slate-500">{t.bank_name} ****{(t.account_number || "").slice(-4)} · {t.ifsc} · {t.mode}</p>
                </td>
                <td className="px-3 py-3 text-xs">
                  {t.invoices.map((i) => (
                    <Link key={i.invoice_id} to={AP_ROUTES.INVOICE_DETAIL(i.invoice_id)} className="block text-indigo-600 hover:text-indigo-700">
                      {i.invoice_number} · {formatMoney(i.amount, "INR")}
                    </Link>
                  ))}
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(t.amount, "INR")}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-600">{t.reference}</td>
                <td className="px-4 py-3 text-xs">
                  {t.status === "PAID" && <span className="text-emerald-700">Paid · UTR {t.utr}</span>}
                  {t.status === "FAILED" && <span className="text-rose-600">Failed - back in the ready list</span>}
                  {t.status === "PENDING" && run.status === "SENT" && canPreparePaymentRuns ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <select aria-label={`Result for ${t.reference}`} className="h-8 rounded-md border border-slate-300 px-1 text-xs"
                        value={results[t.reference]?.status || ""} onChange={(e) => setResult(t.reference, { status: e.target.value })}>
                        <option value="">Result…</option><option value="PAID">Paid</option><option value="FAILED">Failed</option>
                      </select>
                      {results[t.reference]?.status === "PAID" && (
                        <input aria-label={`UTR for ${t.reference}`} className="h-8 w-44 rounded-md border border-slate-300 px-2 text-xs" placeholder="Bank UTR"
                          value={results[t.reference]?.utr || ""} onChange={(e) => setResult(t.reference, { utr: e.target.value })} />
                      )}
                      {results[t.reference]?.status === "FAILED" && (
                        <input aria-label={`Reason for ${t.reference}`} className="h-8 w-44 rounded-md border border-slate-300 px-2 text-xs" placeholder="Reason"
                          value={results[t.reference]?.reason || ""} onChange={(e) => setResult(t.reference, { reason: e.target.value })} />
                      )}
                    </span>
                  ) : t.status === "PENDING" ? <span className="text-slate-500">Pending</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {run.status === "SENT" && pending.length > 0 && canPreparePaymentRuns && (
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <Button variant="primary" disabled={!readyToConfirm} loading={confirm.isPending} onClick={submitResults}>Save bank result</Button>
          </div>
        )}
      </section>
    </div>
  );
}
