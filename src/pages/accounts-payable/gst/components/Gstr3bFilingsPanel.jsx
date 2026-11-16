import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { useAuth } from "../../../../contexts/AuthContext";
import { AP_ROUTES } from "../../constants/routes";
import { ALLOCATION_TYPE, TAX_COMPONENTS, TAX_COMPONENT_LABELS, filingSpec } from "../../constants/gstItc";
import { Empty } from "../../dashboard/components/insights";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstr3bFiling, useGstr3bFilings, useVerifyFiling } from "../hooks/useGstItc";
import { currentUserId, financialYearOf, inr, periodLabel } from "../utils/gstFormat";
import { ComponentTable, ConfirmDialog, Drawer, ErrorBlock, Field, LoadingBlock, SectionCard, StatusPill } from "./GstUi";

function FilingDrawer({ filingId, canManage, onClose }) {
  const { user } = useAuth();
  const { data: f, isLoading, isError, error } = useGstr3bFiling(filingId);
  const verify = useVerifyFiling();
  const [confirming, setConfirming] = useState(false);
  const recordedByMe = f && currentUserId(user) && currentUserId(user) === String(f.recorded_by);

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
          {recordedByMe && <span className="text-xs text-amber-700">You recorded this filing - a different Finance user must verify it.</span>}
          <Button size="small" variant="primary" disabled={recordedByMe} onClick={() => setConfirming(true)}>
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
              {f.verified_by ? <>{f.verified_by}<span className="block text-xs text-slate-400">{formatDateTime(f.verified_at)}</span></> : "Not verified yet"}
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
 * GSTR-3B filings recorded for a financial year: the ones awaiting second-user verification
 * first, then the history. Recording a filing never claims credit by itself.
 */
export default function Gstr3bFilingsPanel({ period, canManage, onRecordFiling }) {
  const financialYear = financialYearOf(period);
  const { data, isLoading, isError, error } = useGstr3bFilings(financialYear);
  const [openId, setOpenId] = useState(null);
  const items = data?.items || [];
  const pending = items.filter((f) => f.filing_status === "FILED");

  return (
    <div className="space-y-4">
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
          A filing&apos;s credit counts as claimed only after a Finance user other than the one who recorded it verifies it.
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
