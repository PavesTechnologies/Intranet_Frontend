import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import { TAX_COMPONENTS, TAX_COMPONENT_LABELS } from "../../constants/gstItc";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstRegister, useGstr2bMatches, useItcDetails, useRecordFiling } from "../hooks/useGstItc";
import { amountError, currentPeriod, financialYearOf, inr, monthDate, periodLabel, previousPeriod, toPeriod } from "../utils/gstFormat";
import { ConfirmDialog, TextArea, TextInput } from "./GstUi";

const ARN_RE = /^[A-Z0-9]{10,20}$/;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** First day after the return month - a GSTR-3B is filed once its month is over. */
function firstFilingDay(period) {
  const [y, m] = period.split("-").map(Number);
  return iso(new Date(y, m, 1));
}

/**
 * Invoices approved for the GSTR-3B of `period`: from the period's ITC register and its GSTR-2B
 * reconciliation (an invoice of an earlier month can be approved for this return), with each
 * one's approved amounts from GET /itc/{id}.
 */
function useApprovedForPeriod(period) {
  const register = useGstRegister(period ? monthDate(period) : undefined);
  const matches = useGstr2bMatches({ returnPeriod: period, pageSize: 200, enabled: Boolean(period) });
  const ids = useMemo(() => {
    const set = new Set();
    for (const r of register.data?.invoices || []) {
      if (r.approval_status === "APPROVED_FOR_GSTR3B" && toPeriod(r.approval_period) === period) set.add(r.invoice_id);
    }
    for (const m of matches.data?.items || []) {
      const inv = m.purchase_invoice_details;
      if (inv && m.itc_approval_status === "APPROVED_FOR_GSTR3B" && toPeriod(m.itc_approval_period) === period) set.add(inv.invoice_id);
    }
    return [...set];
  }, [register.data, matches.data, period]);
  const details = useItcDetails(ids);
  const rows = details
    .map((q) => q.data)
    .filter((d) => d && d.itc_approval_status === "APPROVED_FOR_GSTR3B" && toPeriod(d.itc_approval_period) === period);
  return { rows, loading: register.isLoading || matches.isLoading || details.some((q) => q.isLoading) };
}

/**
 * Records a GSTR-3B that was already filed on the GST portal (ARN, filing date, evidence) with
 * the ITC each approved invoice took in it. Nothing is filed from here, and the credit is not
 * claimed yet: a second Finance user must verify the filing first.
 */
export default function RecordFilingModal({ defaultPeriod, onClose }) {
  const record = useRecordFiling();
  const [period, setPeriod] = useState(defaultPeriod && defaultPeriod < currentPeriod() ? defaultPeriod : previousPeriod());
  const [filingDate, setFilingDate] = useState("");
  const [arn, setArn] = useState("");
  const [evidence, setEvidence] = useState("");
  const [remarks, setRemarks] = useState("");
  const [mode, setMode] = useState("approved"); // approved | custom
  const [nilReturn, setNilReturn] = useState(false);
  const [custom, setCustom] = useState({}); // invoiceId -> {include, igst, cgst, sgst, cess}
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const approved = useApprovedForPeriod(period);

  const today = iso(new Date());
  const minDate = period ? firstFilingDay(period) : undefined;
  const cleanArn = arn.replace(/\s+/g, "").toUpperCase();
  const rowState = (d) => custom[d.invoice_id] || { include: true, ...Object.fromEntries(TAX_COMPONENTS.map((c) => [c, d.itc_approved?.[c] ?? 0])) };
  const rowErrors = (d) => {
    const s = rowState(d);
    if (!s.include) return {};
    const out = {};
    for (const c of TAX_COMPONENTS) {
      const e = amountError(s[c], d.itc_approved?.[c], TAX_COMPONENT_LABELS[c]);
      if (e) out[c] = e;
    }
    return out;
  };
  const customRows = approved.rows.filter((d) => rowState(d).include);

  const errors = {
    period: !period ? "Choose the return period" : period >= currentPeriod() ? "A month's GSTR-3B is filed after the month is over" : "",
    filingDate: !filingDate ? "" : filingDate > today ? "Cannot be in the future" : minDate && filingDate < minDate ? `On or after ${minDate}` : "",
    arn: cleanArn && !ARN_RE.test(cleanArn) ? "10-20 letters / digits from the filed GSTR-3B acknowledgement" : "",
  };
  const amountsInvalid = mode === "custom" && approved.rows.some((d) => Object.keys(rowErrors(d)).length);
  const nothingToAllocate = !nilReturn && (mode === "custom" ? customRows.length === 0 : approved.rows.length === 0 && !approved.loading);
  const valid = period && filingDate && cleanArn && !Object.values(errors).some(Boolean) && !amountsInvalid;

  const submit = async () => {
    if (record.isPending) return;
    setError("");
    try {
      const filing = await record.mutateAsync({
        period: monthDate(period),
        filingDate,
        arn: cleanArn,
        evidenceReference: evidence.trim(),
        remarks: remarks.trim(),
        nilReturn,
        allocations: mode === "custom" && !nilReturn
          ? customRows.map((d) => ({ invoiceId: d.invoice_id, amounts: rowState(d) }))
          : null,
      });
      toast.success(`GSTR-3B ${periodLabel(filing.return_period)} recorded (ARN ${filing.arn}). It counts as claimed once another Finance user verifies it.`);
      onClose();
    } catch (err) {
      setConfirming(false);
      setError(getApiErrorMessage(err, "Could not record the GSTR-3B filing."));
    }
  };

  const setRow = (d, patch) => setCustom((c) => ({ ...c, [d.invoice_id]: { ...rowState(d), ...patch } }));

  return (
    <>
      <Modal
        isOpen
        onClose={() => !record.isPending && onClose()}
        title="Record GSTR-3B filing"
        subtitle="Enter the return exactly as filed on the GST portal - nothing is submitted to the portal from here."
        size="4xl"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={onClose} disabled={record.isPending}>Cancel</Button>
            <Button variant="primary" size="small" disabled={!valid} loading={record.isPending} onClick={() => setConfirming(true)}>
              Record filing
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-slate-600">
              Return period
              <input type="month" aria-label="Filing return period" className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2.5 text-sm"
                value={period} max={previousPeriod()} onChange={(e) => { setPeriod(e.target.value); setCustom({}); }} />
              <span className="mt-0.5 block font-normal text-slate-400">{errors.period || (period ? `Financial year ${financialYearOf(period)}` : "")}</span>
            </label>
            <TextInput label="Filing date" type="date" value={filingDate} min={minDate} max={today}
              onChange={(e) => setFilingDate(e.target.value)} error={errors.filingDate} />
            <TextInput label="ARN" value={arn} maxLength={24} placeholder="From the GSTR-3B acknowledgement"
              onChange={(e) => setArn(e.target.value)} error={errors.arn} />
            <TextInput label="Filing evidence reference" className="sm:col-span-2" value={evidence} maxLength={500}
              placeholder="e.g. acknowledgement PDF location / DMS reference" onChange={(e) => setEvidence(e.target.value)} />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input type="checkbox" checked={nilReturn} onChange={(e) => setNilReturn(e.target.checked)} />
              Nil-ITC filing
            </label>
          </div>

          {!nilReturn && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">ITC taken in this return · {periodLabel(period)}</p>
                <div className="flex gap-3 text-xs text-slate-600" role="radiogroup" aria-label="Allocation">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={mode === "approved"} onChange={() => setMode("approved")} /> All approved credit
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} /> Enter amounts per invoice
                  </label>
                </div>
              </div>
              {approved.loading ? (
                <p className="py-4 text-center text-xs text-slate-500">Loading approved credit...</p>
              ) : approved.rows.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  No invoice is approved for the GSTR-3B of {periodLabel(period)}. Approve eligible credit first, or record a nil-ITC filing.
                </p>
              ) : (
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-500">
                      <tr>
                        {mode === "custom" && <th className="px-2 py-2" scope="col"><span className="sr-only">Include</span></th>}
                        <th className="px-3 py-2" scope="col">Invoice</th>
                        {TAX_COMPONENTS.map((c) => <th key={c} className="px-2 py-2 text-right" scope="col">{TAX_COMPONENT_LABELS[c]}</th>)}
                        {mode === "approved" && <th className="px-3 py-2 text-right" scope="col">Total</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approved.rows.map((d) => {
                        const s = rowState(d);
                        const errs = rowErrors(d);
                        return (
                          <tr key={d.invoice_id} className={mode === "custom" && !s.include ? "text-slate-400" : ""}>
                            {mode === "custom" && (
                              <td className="px-2 py-2">
                                <input type="checkbox" aria-label={`Include ${d.invoice_number}`} checked={s.include}
                                  onChange={(e) => setRow(d, { include: e.target.checked })} />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <span className="font-medium">{d.invoice_number}</span>
                              <div className="text-xs text-slate-500">{d.vendor_name}</div>
                            </td>
                            {TAX_COMPONENTS.map((c) => (
                              <td key={c} className="px-2 py-2 text-right tabular-nums">
                                {mode === "custom" ? (
                                  <>
                                    <input type="number" min="0" step="0.01" aria-label={`${d.invoice_number} ${TAX_COMPONENT_LABELS[c]}`}
                                      disabled={!s.include} value={s[c]} onChange={(e) => setRow(d, { [c]: e.target.value })}
                                      className={`h-8 w-24 rounded-md border px-1.5 text-right text-xs ${errs[c] ? "border-rose-400" : "border-slate-300"}`} />
                                    <div className="text-[10px] text-slate-400">of {inr(d.itc_approved?.[c])}</div>
                                  </>
                                ) : inr(d.itc_approved?.[c])}
                              </td>
                            ))}
                            {mode === "approved" && <td className="px-3 py-2 text-right tabular-nums">{inr(d.itc_approved?.total)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Amounts are capped at what was approved; the backend also refuses credit already claimed or in another filing.
                {mode === "approved" && " The backend allocates every approved invoice's approved amounts for this period."}
              </p>
            </div>
          )}

          <TextArea label="Remarks" value={remarks} maxLength={1000} onChange={(e) => setRemarks(e.target.value)} />
          {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Record this GSTR-3B filing?"
        message={(
          <>
            <p>GSTR-3B {periodLabel(period)} · ARN {cleanArn} · filed {filingDate}.</p>
            <p className="mt-2">
              {nilReturn ? "Recorded as a nil-ITC filing." : mode === "custom"
                ? `${customRows.length} invoice allocation(s) as entered.`
                : `All approved credit for ${periodLabel(period)}.`}
              {" "}The credit is not claimed yet - a different Finance user must verify the filing.
            </p>
            {nothingToAllocate && <p className="mt-2 text-amber-700">No allocations - the backend will refuse it unless it is a nil-ITC filing.</p>}
          </>
        )}
        confirmText="Record filing"
        loading={record.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      />
    </>
  );
}
