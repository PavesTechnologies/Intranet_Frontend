import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Banknote, Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { formatMoney } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useCreateRun, usePaymentRuns, useRunCandidates } from "../hooks/usePaymentRuns";

export const RUN_STATUS = {
  DRAFT: { label: "Draft", tone: "bg-slate-100 text-slate-600" },
  SUBMITTED: { label: "Awaiting approval", tone: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved - send to bank", tone: "bg-indigo-50 text-indigo-700" },
  SENT: { label: "With the bank", tone: "bg-sky-50 text-sky-700" },
  COMPLETED: { label: "Completed", tone: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", tone: "bg-rose-50 text-rose-700" },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
};

export function RunStatusBadge({ status }) {
  const s = RUN_STATUS[status] || RUN_STATUS.DRAFT;
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", s.tone)}>{s.label}</span>;
}

const nextFriday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
};

function NewRun({ onClose }) {
  const navigate = useNavigate();
  const [valueDate, setValueDate] = useState(nextFriday());
  const [name, setName] = useState(`Vendor payments ${formatDate(nextFriday())}`);
  const [selected, setSelected] = useState(() => new Set());
  const { data: candidates = [], isLoading } = useRunCandidates(valueDate);
  const create = useCreateRun();
  const payable = candidates.filter((c) => !c.blocked);
  const total = useMemo(() => candidates.filter((c) => selected.has(c.invoice_id)).reduce((s, c) => s + Number(c.outstanding), 0),
    [candidates, selected]);
  const toggle = (id) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async () => {
    try {
      const run = await create.mutateAsync({ name, value_date: valueDate, invoice_ids: [...selected] });
      toast.success("Payment run created - check it and submit for approval.");
      navigate(AP_ROUTES.PAYMENT_RUN_DETAIL(run.run_id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not create the payment run."));
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4" aria-label="New payment run">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-slate-600">Run name
          <input aria-label="Run name" className="mt-1 block h-9 w-72 rounded-md border border-slate-300 px-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-600">Value date (pay on)
          <input aria-label="Value date" type="date" className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" value={valueDate}
            min={new Date().toISOString().slice(0, 10)} onChange={(e) => setValueDate(e.target.value)} />
        </label>
        <span className="text-xs text-slate-500">Showing invoices due by the value date (and overdue).</span>
        <span className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!selected.size || name.trim().length < 3} loading={create.isPending} onClick={submit}>
            Create run · {selected.size} invoice(s) · {formatMoney(total, "INR")}
          </Button>
        </span>
      </div>
      {isLoading ? <LoadingSpinner text="Finding invoices to pay..." /> : candidates.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">Nothing is ready for payment by this date.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" aria-label="Select all payable" checked={payable.length > 0 && payable.every((c) => selected.has(c.invoice_id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(payable.map((c) => c.invoice_id)) : new Set())} />
                </th>
                <th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-left">Due</th>
                <th className="px-3 py-2 text-right">To pay</th><th className="px-3 py-2 text-left">Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((c) => (
                <tr key={c.invoice_id} className={clsx(c.blocked && "opacity-60")}>
                  <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${c.invoice_number}`} disabled={Boolean(c.blocked)}
                    checked={selected.has(c.invoice_id)} onChange={() => toggle(c.invoice_id)} /></td>
                  <td className="px-3 py-2"><p className="font-medium text-slate-800">{c.invoice_number}</p><p className="text-xs text-slate-500">{c.vendor_name}</p></td>
                  <td className={clsx("px-3 py-2 text-xs", c.overdue_days ? "font-medium text-rose-600" : "text-slate-600")}>
                    {formatDate(c.due_date)}{c.overdue_days ? ` · ${c.overdue_days} d overdue` : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(c.outstanding, "INR")}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.blocked ? <span className="text-amber-700">{c.blocked}</span> : `${c.bank.bank_name} ****${c.bank.account_last4}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Payment runs: batches of approved invoices paid through one bank upload (maker-checker). */
export default function PaymentRunsPage() {
  const { data: runs = [], isLoading, isError, error } = usePaymentRuns();
  const { canPreparePaymentRuns } = useApPermissions();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Payments", to: AP_ROUTES.PAYMENT_READY }, { label: "Payment runs" }]} />
      <PageHeader title="Payment runs" subtitle="Pay many invoices in one approved bank upload - prepare, approve, send, confirm"
        actions={canPreparePaymentRuns && !creating && (
          <Button variant="primary" size="small" onClick={() => setCreating(true)}><Plus size={14} /> New payment run</Button>
        )} />
      {creating && <NewRun onClose={() => setCreating(false)} />}
      {isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16"><LoadingSpinner text="Loading runs..." /></div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load payment runs.")}</p>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <Banknote className="h-6 w-6 text-slate-300" aria-hidden />
          <p className="text-sm font-medium text-slate-700">No payment runs yet</p>
          <p className="max-w-md text-xs text-slate-500">Group this week's due invoices into a run; the Finance Manager approves it and you upload one file to the bank.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {runs.map((r) => (
            <li key={r.run_id}>
              <Link to={AP_ROUTES.PAYMENT_RUN_DETAIL(r.run_id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
                <span className="font-medium text-slate-800">#{r.run_id} · {r.name}</span>
                <RunStatusBadge status={r.status} />
                <span className="text-xs text-slate-500">value date {formatDate(r.value_date)} · {r.invoice_count} invoice(s) · {r.transfer_count} transfer(s)</span>
                <span className="ml-auto font-semibold tabular-nums text-slate-800">{formatMoney(r.total, "INR")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
