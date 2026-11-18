import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Landmark } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { RISK } from "../../constants/gstItc";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstr3bFilings, useGstRegister, useReclaimItc, useReverseItc, useSetIrn } from "../hooks/useGstItc";
import { currentPeriod, inr, monthDate, periodLabel, toPeriod } from "../utils/gstFormat";
import { ConfirmDialog, ErrorBlock, LoadingBlock, SectionCard, TextArea } from "./GstUi";

function Tile({ label, value, hint, tone = "text-slate-800", children }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function AttentionRow({ row, canManage, filings, onOpenItc }) {
  const setIrn = useSetIrn();
  const reverse = useReverseItc();
  const reclaim = useReclaimItc();
  const [mode, setMode] = useState(null); // irn | reverse | reclaim
  const [irn, setIrnValue] = useState("");
  const [reason, setReason] = useState("");
  const [reclaimPeriod, setReclaimPeriod] = useState("");

  const run = async (fn, okText) => {
    try {
      await fn();
      toast.success(okText);
      setMode(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the invoice."));
    }
  };

  const issues = [
    row.irn_status === "MISSING" && "IRN missing - supplier must e-invoice",
    row.itc_eligibility === "REVIEW" && (row.eligibility_reason || "Check eligibility"),
    row.risk && RISK[row.risk],
  ].filter(Boolean);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <Link to={AP_ROUTES.INVOICE_DETAIL(row.invoice_id)} className="font-medium text-indigo-600 hover:text-indigo-700">{row.invoice_number}</Link>
        <span className="text-slate-500"> · {row.vendor_name} · {formatDate(row.invoice_date)} · ITC {inr(row.itc)}</span>
        <p className="text-xs text-amber-700">{issues.join(" · ")}</p>
      </div>
      {!mode && (
        <span className="flex flex-wrap gap-2">
          {canManage && row.irn_status === "MISSING" && <Button size="small" variant="outline" onClick={() => setMode("irn")}>Record IRN</Button>}
          <Button size="small" variant="outline" onClick={() => onOpenItc(row.invoice_id)}>{row.itc_eligibility === "REVIEW" ? "Review eligibility" : "Review ITC"}</Button>
          {canManage && row.risk === "REVERSAL_DUE" && <Button size="small" variant="outline" onClick={() => setMode("reverse")}>Reverse ITC</Button>}
          {canManage && row.risk === "RECLAIM" && <Button size="small" variant="outline" onClick={() => setMode("reclaim")}>Re-claim ITC</Button>}
        </span>
      )}
      {mode === "irn" && (
        <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input aria-label="IRN" className="h-8 w-[22rem] max-w-full rounded-md border border-slate-300 px-2 font-mono text-xs"
            placeholder="64-character IRN from the e-invoice / QR code" value={irn} onChange={(e) => setIrnValue(e.target.value.trim())} />
          <Button size="small" variant="primary" disabled={!/^[0-9a-fA-F]{64}$/.test(irn)} loading={setIrn.isPending}
            onClick={() => run(() => setIrn.mutateAsync({ invoiceId: row.invoice_id, irn }), "IRN recorded.")}>Save</Button>
          <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
        </span>
      )}
      {mode === "reclaim" && (
        <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select aria-label="Re-claim in GSTR-3B" className="h-8 rounded-md border border-slate-300 px-2 text-xs" value={reclaimPeriod}
            onChange={(e) => setReclaimPeriod(e.target.value)}>
            <option value="">Recorded GSTR-3B...</option>
            {filings.map((f) => <option key={f.filing_id} value={f.return_period}>{periodLabel(f.return_period)} · {f.filing_status === "VERIFIED" ? "verified" : "awaiting verification"}</option>)}
          </select>
          <Button size="small" variant="primary" disabled={!reclaimPeriod} loading={reclaim.isPending}
            onClick={() => run(() => reclaim.mutateAsync({ invoiceIds: [row.invoice_id], period: monthDate(reclaimPeriod) }),
              `Re-claim recorded in the GSTR-3B of ${periodLabel(reclaimPeriod)} - it counts once that filing is verified.`)}>
            Record re-claim
          </Button>
          <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
        </span>
      )}
      <ConfirmDialog
        open={mode === "reverse"}
        title="Reverse the claimed ITC?"
        message={`The claimed credit of ${row.invoice_number} is reversed in the GSTR-3B of ${periodLabel(currentPeriod())} (unpaid more than 180 days).`}
        confirmText="Reverse ITC"
        variant="danger"
        loading={reverse.isPending}
        onCancel={() => setMode(null)}
        onConfirm={() => run(() => reverse.mutateAsync({ invoiceIds: [row.invoice_id], period: monthDate(currentPeriod()), reason: reason.trim() || null }),
          `ITC reversed in the return of ${periodLabel(currentPeriod())}.`)}
      >
        <TextArea label="Reason (optional)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)}
          hint="Defaults to the 180-day rule" />
      </ConfirmDialog>
    </li>
  );
}

/**
 * The ITC register (GET /itc): credit claimable in the open return, what needs attention (IRN,
 * eligibility, the 180-day rule) and recent returns. Credit is no longer marked claimed here -
 * it is approved per invoice and claimed through a recorded, verified GSTR-3B filing.
 */
export default function ItcRegisterPanel({ period, canManage, onOpenItc, onRecordFiling }) {
  const { data, isLoading, isError, error } = useGstRegister(monthDate(period));
  const filings = useGstr3bFilings();

  if (isLoading) return <LoadingBlock text="Loading the ITC register..." />;
  if (isError) return <ErrorBlock error={error} fallback="Could not load the ITC register." />;

  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={`Claimable for ${periodLabel(s.claim_period)}`} value={inr(s.claimable_now)}
          hint={`${s.claimable_count} invoice(s) · GSTR-3B due ${formatDate(s.claim_due)}`
            + (s.gstr2b_held ? ` · ${s.gstr2b_held} held (GSTR-2B)` : "")}
          tone={s.claimable_count ? "text-indigo-700" : "text-slate-800"}>
          <p className="text-xs text-slate-500">Approve the credit per invoice, file GSTR-3B on the portal, then record the filing for a second user to verify.</p>
          {canManage && (
            <Button size="small" variant="primary" className="mt-2" onClick={() => onRecordFiling(toPeriod(s.claim_period))}>
              Record GSTR-3B filing
            </Button>
          )}
        </Tile>
        <Tile label="IRN missing" value={s.irn_missing} tone={s.irn_missing ? "text-rose-600" : "text-slate-800"}
          hint="E-invoice suppliers - no IRN, no credit" />
        <Tile label="180-day rule" value={s.at_risk + s.reversal_due}
          tone={s.reversal_due ? "text-rose-600" : s.at_risk ? "text-amber-600" : "text-slate-800"}
          hint={`${s.at_risk} at risk · ${s.reversal_due} to reverse · ${s.reclaim} to re-claim`} />
        <Tile label="Eligibility to review" value={s.review} hint={`Blocked credit ${inr(s.blocked_itc)}`} />
      </div>

      {data.attention.length > 0 && (
        <SectionCard title="Needs attention">
          <ul className="divide-y divide-slate-100">
            {data.attention.map((row) => (
              <AttentionRow key={row.invoice_id} row={row} canManage={canManage} filings={filings.data?.items || []} onOpenItc={onOpenItc} />
            ))}
          </ul>
        </SectionCard>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Landmark className="h-4 w-4" aria-hidden /> Recent returns</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {data.periods.map((p) => (
            <li key={p.period} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-medium text-slate-700">{p.label}</p>
              <p className="tabular-nums text-slate-800">{inr(p.claimed)}</p>
              <p className="text-slate-400">{p.invoices} inv · due {formatDate(p.due_date)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          {s.gstr2b === "CHECKED"
            ? `Checked against GSTR-2B up to ${periodLabel(s.gstr2b_period)} - only invoices the supplier filed can be approved.`
            : "GSTR-2B not imported yet - invoices are not checked against the suppliers' filings. Import it on the GSTR-2B reconciliation tab."}
        </p>
      </section>
    </div>
  );
}
