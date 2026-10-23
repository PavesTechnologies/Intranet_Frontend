import { useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Landmark } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { ELIGIBILITY, GSTR2B_MATCH, IRN_STATUS, ITC_STATUS, RISK } from "../../constants/gstItc";
import { SegmentedTabs, formatMoney } from "../../dashboard/components/insights";
import Gstr2bPanel from "../components/Gstr2bPanel";
import { formatDate, formatMonth } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useClaimItc, useGstRegister, useReclaimItc, useReverseItc, useSetEligibility, useSetIrn } from "../hooks/useGstItc";

const inr = (v) => formatMoney(v ?? 0, "INR");
const monthLabel = (iso) => formatMonth(iso);
const thisMonth = () => new Date().toISOString().slice(0, 7);

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

function Badge({ spec }) {
  return <span className={clsx("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", spec.tone)}>{spec.label}</span>;
}

function AttentionRow({ row, canManage, claimPeriod }) {
  const setIrn = useSetIrn();
  const setEligibility = useSetEligibility();
  const reverse = useReverseItc();
  const reclaim = useReclaimItc();
  const [mode, setMode] = useState(null); // irn | eligibility
  const [irn, setIrnValue] = useState("");
  const [eligibility, setEligibilityValue] = useState("ELIGIBLE");
  const [reason, setReason] = useState("");
  const busy = setIrn.isPending || setEligibility.isPending || reverse.isPending || reclaim.isPending;

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
      {canManage && !mode && (
        <span className="flex flex-wrap gap-2">
          {row.irn_status === "MISSING" && <Button size="small" variant="outline" onClick={() => setMode("irn")}>Record IRN</Button>}
          {row.itc_eligibility === "REVIEW" && <Button size="small" variant="outline" onClick={() => setMode("eligibility")}>Decide eligibility</Button>}
          {row.risk === "REVERSAL_DUE" && (
            <Button size="small" variant="outline" loading={busy}
              onClick={() => run(() => reverse.mutateAsync({ invoiceIds: [row.invoice_id], period: `${thisMonth()}-01` }), "ITC marked reversed in this month's return.")}>
              Reverse ITC
            </Button>
          )}
          {row.risk === "RECLAIM" && (
            <Button size="small" variant="outline" loading={busy}
              onClick={() => run(() => reclaim.mutateAsync({ invoiceIds: [row.invoice_id], period: `${thisMonth()}-01` }), "ITC re-claimed in this month's return.")}>
              Re-claim ITC
            </Button>
          )}
        </span>
      )}
      {mode === "irn" && (
        <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input aria-label="IRN" className="h-8 w-[22rem] max-w-full rounded-md border border-slate-300 px-2 font-mono text-xs"
            placeholder="64-character IRN from the e-invoice / QR code" value={irn} onChange={(e) => setIrnValue(e.target.value.trim())} />
          <Button size="small" variant="primary" disabled={!/^[0-9a-fA-F]{64}$/.test(irn)} loading={busy}
            onClick={() => run(() => setIrn.mutateAsync({ invoiceId: row.invoice_id, irn }), "IRN recorded.")}>Save</Button>
          <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
        </span>
      )}
      {mode === "eligibility" && (
        <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select aria-label="Eligibility" className="h-8 rounded-md border border-slate-300 px-2 text-xs" value={eligibility} onChange={(e) => setEligibilityValue(e.target.value)}>
            <option value="ELIGIBLE">Eligible - claim it</option>
            <option value="BLOCKED">Blocked under s.17(5)</option>
          </select>
          <input aria-label="Reason" className="h-8 w-64 rounded-md border border-slate-300 px-2 text-xs" placeholder="Why (min 5 chars)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="small" variant="primary" disabled={reason.trim().length < 5} loading={busy}
            onClick={() => run(() => setEligibility.mutateAsync({ invoiceId: row.invoice_id, eligibility, reason }), "Eligibility saved.")}>Save</Button>
          <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
        </span>
      )}
    </li>
  );
}

/**
 * GST input credit (ITC) register - what GST paid to vendors can be recovered in GSTR-3B, what has
 * been claimed, and what is at risk (IRN missing, possible blocked credit, the 180-day payment rule).
 */
export default function GstItcPage() {
  const [month, setMonth] = useState(thisMonth());
  const { data, isLoading, isError, error } = useGstRegister(`${month}-01`);
  const claim = useClaimItc();
  const { canManageGstItc } = useApPermissions();
  const [confirming, setConfirming] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "gstr2b" ? "gstr2b" : "register";

  const doClaim = async () => {
    setConfirming(false);
    try {
      const result = await claim.mutateAsync(data.summary.claim_period);
      toast.success(`${inr(result.itc)} input credit from ${result.invoices} invoice(s) marked as claimed for ${monthLabel(result.period)}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not claim the input credit."));
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "GST input credit" }]} />
      <PageHeader title="GST Input Credit" subtitle="GST paid to vendors that the company recovers in GSTR-3B - claim it on time, and keep it" />
      <PageGuide page="gst" />
      <SegmentedTabs value={tab} onChange={(v) => setParams(v === "gstr2b" ? { tab: v } : {}, { replace: true })}
        tabs={[{ value: "register", label: "ITC register" }, { value: "gstr2b", label: "GSTR-2B match" }]} />
      {tab === "gstr2b" ? (
        <Gstr2bPanel canManage={canManageGstItc} />
      ) : isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-20"><LoadingSpinner text="Loading the ITC register..." /></div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the ITC register.")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label={`Ready to claim for ${monthLabel(data.summary.claim_period)}`} value={inr(data.summary.claimable_now)}
              hint={`${data.summary.claimable_count} invoice(s) · GSTR-3B due ${formatDate(data.summary.claim_due)}`
                + (data.summary.gstr2b_held ? ` · ${data.summary.gstr2b_held} held (not in GSTR-2B)` : "")}
              tone={data.summary.claimable_count ? "text-indigo-700" : "text-slate-800"}>
              {canManageGstItc && data.summary.claimable_count > 0 && (confirming ? (
                <span className="flex items-center gap-2">
                  <Button size="small" variant="primary" onClick={doClaim} loading={claim.isPending}>Confirm claimed</Button>
                  <Button size="small" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
                </span>
              ) : (
                <Button size="small" variant="primary" onClick={() => setConfirming(true)}>Mark claimed in GSTR-3B</Button>
              ))}
            </Tile>
            <Tile label="IRN missing" value={data.summary.irn_missing} tone={data.summary.irn_missing ? "text-rose-600" : "text-slate-800"}
              hint="E-invoice suppliers - no IRN, no credit" />
            <Tile label="180-day rule" value={data.summary.at_risk + data.summary.reversal_due}
              tone={data.summary.reversal_due ? "text-rose-600" : data.summary.at_risk ? "text-amber-600" : "text-slate-800"}
              hint={`${data.summary.at_risk} at risk · ${data.summary.reversal_due} to reverse · ${data.summary.reclaim} to re-claim`} />
            <Tile label="Eligibility to review" value={data.summary.review} hint={`Blocked credit ${inr(data.summary.blocked_itc)}`} />
          </div>

          {data.attention.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Needs attention</h2>
              <ul className="divide-y divide-slate-100">
                {data.attention.map((row) => (
                  <AttentionRow key={row.invoice_id} row={row} canManage={canManageGstItc} claimPeriod={data.summary.claim_period} />
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Purchase invoices · {monthLabel(`${month}-01`)}</h2>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Month
                <input type="month" aria-label="Month" className="h-8 rounded-md border border-slate-300 px-2 text-xs" value={month} max={thisMonth()}
                  onChange={(e) => e.target.value && setMonth(e.target.value)} />
              </label>
            </div>
            {data.invoices.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-slate-500">No purchase invoices dated in this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      {["Invoice", "Supplier GSTIN", "Taxable", "CGST", "SGST", "IGST", "ITC", "Eligibility", "IRN", "GSTR-2B", "Status"].map((h) => (
                        <th key={h} className={clsx("px-3 py-2", ["Taxable", "CGST", "SGST", "IGST", "ITC"].includes(h) && "text-right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((r) => (
                      <tr key={r.invoice_id}>
                        <td className="px-3 py-2">
                          <Link to={AP_ROUTES.INVOICE_DETAIL(r.invoice_id)} className="font-medium text-indigo-600 hover:text-indigo-700">{r.invoice_number}</Link>
                          <div className="text-xs text-slate-500">{r.vendor_name} · {formatDate(r.invoice_date)}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.supplier_gstin || "—"}<div className="font-sans text-slate-400">{r.supply_type === "INTER" ? "Inter-state" : "Intra-state"}</div></td>
                        {["taxable_value", "cgst", "sgst", "igst", "itc"].map((k) => (
                          <td key={k} className={clsx("px-3 py-2 text-right tabular-nums", k === "itc" && "font-semibold text-slate-800")}>{Number(r[k]) ? inr(r[k]) : "—"}</td>
                        ))}
                        <td className="px-3 py-2"><Badge spec={ELIGIBILITY[r.itc_eligibility] || ELIGIBILITY.ELIGIBLE} /></td>
                        <td className={clsx("px-3 py-2 text-xs", IRN_STATUS[r.irn_status]?.tone)}>{IRN_STATUS[r.irn_status]?.label}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{r.gstr2b ? GSTR2B_MATCH[r.gstr2b]?.label : "Not checked"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {ITC_STATUS[r.itc_status]}{r.claim_period ? ` · ${monthLabel(r.claim_period)}` : ""}
                          {r.risk && <div className="font-medium text-amber-700">{RISK[r.risk]}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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
              {data.summary.gstr2b === "CHECKED"
                ? `Checked against GSTR-2B up to ${monthLabel(data.summary.gstr2b_period)} - only invoices the supplier filed are claimable.`
                : "GSTR-2B not imported yet - credit is claimed on the invoices recorded here. Import it on the GSTR-2B match tab."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
