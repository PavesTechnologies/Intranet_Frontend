import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { ALLOCATION_TYPE, TAX_COMPONENTS, TAX_COMPONENT_LABELS, filingSpec } from "../../constants/gstItc";
import { Empty } from "../../dashboard/components/insights";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstr3bFiling, useGstr3bFilings, useGstWorkflow, useVerifyFiling } from "../hooks/useGstItc";
import { financialYearOf, inr, inrOrDash, periodLabel } from "../utils/gstFormat";
import { ComponentTable, ConfirmDialog, Drawer, ErrorBlock, Field, LoadingBlock, SectionCard, StatusPill } from "./GstUi";

function FilingDrawer({ filingId, canManage, onClose }) {
  const { data: f, isLoading, isError, error } = useGstr3bFiling(filingId);
  const verify = useVerifyFiling();
  const [confirming, setConfirming] = useState(false);

  const doVerify = async () => {
    if (verify.isPending) return;
    try {
      await verify.mutateAsync(filingId);
      toast.success("Filing verified - its credit now counts as claimed.");
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      toast.error(getApiErrorMessage(err, "Could not verify the filing."));
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={f ? `GSTR-3B ${periodLabel(f.return_period)}` : "GSTR-3B filing"}
      subtitle={f ? `ARN ${f.arn} · FY ${f.financial_year}` : undefined}
      footer={f && canManage && f.filing_status === "FILED" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button size="small" variant="primary" onClick={() => setConfirming(true)}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden /> Verify filing
          </Button>
        </div>
      )}
    >
      {isLoading ? (
        <LoadingBlock text="Loading the filing..." />
      ) : isError ? (
        <ErrorBlock error={error} fallback="Could not load the filing." />
      ) : f && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill spec={filingSpec(f.filing_status)} />
            <span className="text-xs text-slate-500">
              {f.claims_effective ? "Its credit counts as claimed." : "Its credit is not counted as claimed until it is verified."}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Return period">{periodLabel(f.return_period)}</Field>
            <Field label="Filing date">{formatDate(f.filing_date)}</Field>
            <Field label="ARN"><span className="font-mono">{f.arn}</span></Field>
            <Field label="Evidence reference">{f.evidence_reference}</Field>
            <Field label="Recorded by">{f.recorded_by}<span className="block text-xs text-slate-400">{formatDateTime(f.recorded_at)}</span></Field>
            <Field label="Verified by">
              {f.verified_by ? <>{f.verified_by}<span className="block text-xs text-slate-400">{formatDateTime(f.verified_at)}{f.self_verified && " · same user who recorded it"}</span></> : "Not verified yet"}
            </Field>
            {f.remarks && <Field label="Remarks" className="col-span-2 sm:col-span-3">{f.remarks}</Field>}
          </dl>
          {f.totals && (
            <ComponentTable caption="Filing totals" rows={[
              { label: "Claimed", values: f.totals.claim, emphasis: true },
              { label: "Reversed", values: f.totals.reversal },
              { label: "Re-claimed", values: f.totals.reclaim },
            ]} />
          )}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Invoice allocations</h3>
            {f.allocations?.length ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-3 py-2" scope="col">Invoice</th>
                      <th className="px-3 py-2" scope="col">Entry</th>
                      {TAX_COMPONENTS.map((c) => <th key={c} className="px-3 py-2 text-right" scope="col">{TAX_COMPONENT_LABELS[c]}</th>)}
                      <th className="px-3 py-2 text-right" scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {f.allocations.map((a) => (
                      <tr key={a.allocation_id}>
                        <td className="px-3 py-2">
                          <Link to={AP_ROUTES.INVOICE_DETAIL(a.invoice_id)} className="font-medium text-indigo-600 hover:underline">{a.invoice_number || a.invoice_id}</Link>
                        </td>
                        <td className="px-3 py-2">{ALLOCATION_TYPE[a.entry_type] || a.entry_type}</td>
                        {TAX_COMPONENTS.map((c) => <td key={c} className="px-3 py-2 text-right tabular-nums">{inr(a[c])}</td>)}
                        <td className="px-3 py-2 text-right tabular-nums">{inr(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-500">Nil-ITC filing - no invoice allocations.</p>}
          </section>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title="Verify this GSTR-3B filing?"
        message={f ? `Confirm the ARN ${f.arn}, filing date ${formatDate(f.filing_date)} and allocations against the return on the GST portal. Once verified, the allocated credit counts as claimed.` : ""}
        confirmText="Verify filing"
        loading={verify.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={doVerify}
      />
    </Drawer>
  );
}

/**
 * The period's GSTR-3B claim (GET /itc/workflow gstr3b_claim): filing status, the credit ready / awaiting
 * verification / claimed, reversals, re-claims, and Table 4 as the backend built it. Credit shows as claimed only
 * when the filing is VERIFIED; before a filing is recorded Table 4 is a projection of the approved credit.
 */
function PeriodClaim({ period, onOpenFiling }) {
  const { data: w, isLoading, isError, error } = useGstWorkflow(period);
  if (isLoading) return <LoadingBlock text="Loading the period's GSTR-3B..." />;
  if (isError) return <ErrorBlock error={error} fallback="Could not load the period's GSTR-3B claim." />;
  const c = w?.gstr3b_claim;
  if (!c) return null;
  const t4 = c.table_4 || {};
  const recorded = c.filing_status !== "NOT_RECORDED";
  const blocked = Number(t4.blocked_in_gstr2b?.total) > 0;
  return (
    <SectionCard
      title={`GSTR-3B · ${periodLabel(c.return_period || period)}`}
      actions={(
        <>
          <StatusPill spec={filingSpec(c.filing_status)} />
          {c.due_date && <span className="text-xs text-slate-500">Due {formatDate(c.due_date)}</span>}
          {c.filing?.filing_id && (
            <Button size="small" variant={c.filing_status === "FILED" ? "primary" : "outline"} onClick={() => onOpenFiling(c.filing.filing_id)}>
              {c.filing_status === "FILED" ? "Open filing to verify" : "View filing"}
            </Button>
          )}
        </>
      )}
      bodyClassName="space-y-4 p-4"
    >
      {!c.return_open && !recorded && (
        <p className="text-xs text-slate-500">The month is not over yet - its GSTR-3B cannot be filed.</p>
      )}
      {c.filing && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="ARN"><span className="font-mono">{c.filing.arn}</span></Field>
          <Field label="Filing date">{formatDate(c.filing.filing_date)}</Field>
          <Field label="Recorded by">{c.filing.recorded_by}</Field>
          <Field label="Verified by">
            {c.filing.verified_by ? <>{c.filing.verified_by}<span className="block text-xs text-slate-400">{formatDateTime(c.filing.verified_at)}</span></> : "Not verified yet"}
          </Field>
        </dl>
      )}
      <ComponentTable caption="GSTR-3B credit of the period" showCount rows={[
        { label: "Ready to claim", hint: "Approved for this return, not in its filing", count: c.ready_for_claim_count, values: c.ready_for_claim_itc },
        { label: "In the filing - awaiting verification", hint: "Not claimed until the filing is verified", values: c.in_filing_awaiting_verification_itc },
        { label: "Claimed", hint: "Verified filing", values: c.claimed_itc, emphasis: true },
        { label: "Re-claimed", values: c.reclaimed_itc },
        { label: "Reversed", values: c.reversed_itc },
        { label: "Vendor credit notes", hint: "Reduce the return's credit (s.34)", values: c.credit_note_itc },
      ]} />
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Table 4 - Eligible ITC</h3>
        <p className="mb-2 text-xs text-slate-500">
          {t4.basis === "RECORDED_FILING"
            ? "From the recorded filing's allocations."
            : "Projected from the credit approved for this return - nothing is claimed until a filing is recorded and verified."}
        </p>
        <ComponentTable caption="GSTR-3B Table 4" rows={(t4.rows || []).map((r) => ({
          label: r.label || r.row, values: r, emphasis: r.row === "4C",
        }))} />
        {blocked && (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Blocked / ineligible credit in this GSTR-2B: {inrOrDash(t4.blocked_in_gstr2b.total)}. The portal auto-populates it into 4(A)(5) -
            reverse it in 4(B)(1) when filing.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Net GST payable: {c.net_tax_payable === null || c.net_tax_payable === undefined ? (c.net_tax_payable_note || "not computed by Accounts Payable") : inr(c.net_tax_payable)}
      </p>
    </SectionCard>
  );
}

function FilingRow({ f, onOpen }) {
  return (
    <tr className="cursor-pointer hover:bg-slate-50" onClick={() => onOpen(f.filing_id)}>
      <td className="px-3 py-2">
        <button type="button" className="font-medium text-indigo-600 hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(f.filing_id); }}>
          {periodLabel(f.return_period)}
        </button>
        <div className="text-xs text-slate-400">FY {f.financial_year}</div>
      </td>
      <td className="px-3 py-2 font-mono text-xs">{f.arn}</td>
      <td className="px-3 py-2">{formatDate(f.filing_date)}</td>
      <td className="px-3 py-2"><StatusPill spec={filingSpec(f.filing_status)} /></td>
      <td className="px-3 py-2 text-right tabular-nums">{f.totals ? inr(f.totals.claim?.total) : "—"}</td>
      <td className="px-3 py-2 text-xs">{f.recorded_by}<div className="text-slate-400">{formatDateTime(f.recorded_at)}</div></td>
      <td className="px-3 py-2 text-xs">{f.verified_by ? <>{f.verified_by}<div className="text-slate-400">{formatDateTime(f.verified_at)}</div></> : "—"}</td>
    </tr>
  );
}

function FilingTable({ filings, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
          <tr>
            {["Return period", "ARN", "Filing date", "Status", "ITC claimed", "Recorded by", "Verified by"].map((h) => (
              <th key={h} scope="col" className={`px-3 py-2 ${h === "ITC claimed" ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filings.map((f) => <FilingRow key={f.filing_id} f={f} onOpen={onOpen} />)}
        </tbody>
      </table>
    </div>
  );
}

/**
 * GSTR-3B filings recorded for a financial year: the ones awaiting verification
 * first, then the history. Recording a filing never claims credit by itself.
 */
export default function Gstr3bFilingsPanel({ period, canManage, onRecordFiling, openFilingId, onOpenFiling }) {
  const financialYear = financialYearOf(period);
  const { data, isLoading, isError, error } = useGstr3bFilings(financialYear);
  const [localId, setLocalId] = useState(null);
  // controlled through the URL by GstItcPage (so the workflow's "Verify GSTR-3B filing" opens the filing)
  const openId = onOpenFiling ? openFilingId : localId;
  const setOpenId = onOpenFiling || setLocalId;
  const items = data?.items || [];
  const pending = items.filter((f) => f.filing_status === "FILED");

  return (
    <div className="space-y-4">
      <PeriodClaim period={period} onOpenFiling={setOpenId} />

      <SectionCard
        title={`Filing verification${pending.length ? ` · ${pending.length} pending` : ""}`}
        actions={canManage && <Button size="small" variant="primary" onClick={() => onRecordFiling()}>Record GSTR-3B filing</Button>}
      >
        {isLoading ? <LoadingBlock text="Loading filings..." /> : isError ? (
          <div className="p-4"><ErrorBlock error={error} fallback="Could not load the GSTR-3B filings." /></div>
        ) : pending.length ? (
          <FilingTable filings={pending} onOpen={setOpenId} />
        ) : (
          <Empty text="No filing is waiting for verification." />
        )}
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Recording a filing claims nothing - its credit counts as claimed only after the filing is verified (the Finance user who recorded it may verify it).
        </p>
      </SectionCard>

      <SectionCard title={`GSTR-3B filing history · FY ${financialYear}`}>
        {isLoading ? null : isError ? null : items.length ? <FilingTable filings={items} onOpen={setOpenId} /> : (
          <Empty text="No GSTR-3B filing recorded for this financial year." />
        )}
      </SectionCard>

      {openId && <FilingDrawer filingId={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
    </div>
  );
}
