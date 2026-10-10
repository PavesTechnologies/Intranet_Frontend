// Route: /accounts-payable/tds/challans/new  (TDS_TRACKING_UPDATE)
// Record one challan that pays the TDS of several invoices: upload -> check the challan -> pick the
// invoices (live total vs challan tax) -> check -> confirm. Confirming records the deposit on every
// selected invoice through the existing per-invoice service, all at once or not at all.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { useChallanCandidates, useCreateChallan, useExtractChallan, useValidateChallan } from "../hooks/useTdsChallans";
import { ExtractUploadBox, Field, IssuesList, fmtDate, inputClass, money, valuesFrom } from "../components/TdsDocumentParts";

const EMPTY = {
  challan_serial_no: "", bsr_code: "", deposit_date: "", tan: "", assessment_year: "", minor_head: "200", section_code: "",
  tax_amount: "", surcharge: "0", cess: "0", interest: "0", fee: "0", total_amount: "", remarks: "",
};
const AMOUNTS = ["tax_amount", "surcharge", "cess", "interest", "fee"];

function previousMonth(isoDate) {
  const d = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TdsChallanNewPage() {
  const navigate = useNavigate();
  const [header, setHeader] = useState(EMPTY);
  const [autoFilled, setAutoFilled] = useState({});
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState(previousMonth());
  const [sectionFilter, setSectionFilter] = useState("");
  const [selected, setSelected] = useState({}); // invoice_id -> allocated amount (string)
  const [check, setCheck] = useState(null);
  const [checkedKey, setCheckedKey] = useState(null);

  const extract = useExtractChallan();
  const validate = useValidateChallan();
  const create = useCreateChallan();
  const { data: candidates, isLoading } = useChallanCandidates({ period, section: sectionFilter });
  const rows = candidates?.items || [];

  const computedTotal = AMOUNTS.reduce((sum, k) => sum + Number(header[k] || 0), 0);
  const allocations = Object.entries(selected).map(([id, amount]) => ({ invoice_id: Number(id), allocated_tds_amount: amount }));
  const allocatedTotal = allocations.reduce((sum, a) => sum + Number(a.allocated_tds_amount || 0), 0);
  const difference = allocatedTotal - Number(header.tax_amount || 0);
  const payload = useMemo(() => ({ header: { ...header, total_amount: header.total_amount || computedTotal.toFixed(2) }, allocations }), [header, allocations, computedTotal]);
  const key = JSON.stringify({ payload, file: file?.name || null });
  const checked = check && checkedKey === key;

  useEffect(() => {
    if (header.section_code && !sectionFilter) setSectionFilter(header.section_code);
  }, [header.section_code, sectionFilter]);

  const set = (field) => (e) => {
    setHeader((h) => ({ ...h, [field]: e.target.value }));
    setAutoFilled((a) => ({ ...a, [field]: false }));
  };

  const onExtracted = (result) => {
    const values = valuesFrom(result);
    setHeader((h) => ({ ...h, ...values }));
    setAutoFilled(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (values.deposit_date) setPeriod(previousMonth(values.deposit_date));
    if (values.section_code) setSectionFilter(values.section_code);
    if (result.cin_mismatch) toast.warning("The CIN on the challan does not match the serial / BSR / date read - check them.");
  };

  const toggle = (row) =>
    setSelected((cur) => {
      const next = { ...cur };
      if (next[row.invoice_id] !== undefined) delete next[row.invoice_id];
      else next[row.invoice_id] = String(row.tds_amount);
      return next;
    });

  const runCheck = async () => {
    try {
      const result = await validate.mutateAsync({ ...payload, hasDocument: Boolean(file) });
      setCheck(result);
      setCheckedKey(key);
      return result;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not check the challan."));
      return null;
    }
  };

  const confirm = async () => {
    const result = checked ? check : await runCheck();
    if (!result?.valid) return;
    try {
      const challan = await create.mutateAsync({ ...payload, file });
      toast.success(`Challan ${challan.cin} recorded - deposit marked on ${challan.invoice_count} invoice${challan.invoice_count === 1 ? "" : "s"}.`);
      navigate(AP_ROUTES.TDS_CHALLANS);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The challan could not be recorded."));
    }
  };

  const input = (field, props = {}) => (
    <input id={`c-${field}`} className={inputClass} value={header[field]} onChange={set(field)} {...props} />
  );

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Record TDS challan"
        subtitle="One challan can pay the TDS of several invoices. Confirming records the deposit on every selected invoice."
        actions={
          <Button variant="outline" onClick={() => navigate(AP_ROUTES.TDS_CHALLANS)}>
            <ArrowLeft className="h-4 w-4" /> Challans &amp; filings
          </Button>
        }
      />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">1. Challan</h2>
        <ExtractUploadBox title="Have the challan counterfoil?" hint="Upload it to fill these details - it is also kept as evidence." file={file} onFile={setFile} onExtracted={onExtracted} extract={extract} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="c-challan_serial_no" label="Challan serial no. *" autoFilled={autoFilled.challan_serial_no}>{input("challan_serial_no", { inputMode: "numeric", maxLength: 5 })}</Field>
          <Field id="c-bsr_code" label="BSR code *" autoFilled={autoFilled.bsr_code}>{input("bsr_code", { inputMode: "numeric", maxLength: 7 })}</Field>
          <Field id="c-deposit_date" label="Date of deposit *" autoFilled={autoFilled.deposit_date}>{input("deposit_date", { type: "date" })}</Field>
          <Field id="c-tan" label="TAN" autoFilled={autoFilled.tan}>{input("tan", { maxLength: 10, placeholder: "ABCD12345E" })}</Field>
          <Field id="c-section_code" label="Section / nature of payment" autoFilled={autoFilled.section_code} hint="e.g. 194C or 94C">{input("section_code", { maxLength: 20 })}</Field>
          <Field id="c-assessment_year" label="Assessment year" autoFilled={autoFilled.assessment_year}>{input("assessment_year", { placeholder: "2027-28", maxLength: 9 })}</Field>
          <Field id="c-minor_head" label="Minor head">
            <select id="c-minor_head" className={inputClass} value={header.minor_head} onChange={set("minor_head")}>
              <option value="200">200 - TDS payable by taxpayer</option>
              <option value="400">400 - TDS regular assessment</option>
            </select>
          </Field>
          <div />
          <Field id="c-tax_amount" label="Tax *" autoFilled={autoFilled.tax_amount}>{input("tax_amount", { type: "number", min: "0", step: "0.01" })}</Field>
          <Field id="c-surcharge" label="Surcharge">{input("surcharge", { type: "number", min: "0", step: "0.01" })}</Field>
          <Field id="c-cess" label="Cess">{input("cess", { type: "number", min: "0", step: "0.01" })}</Field>
          <Field id="c-interest" label="Interest" autoFilled={autoFilled.interest}>{input("interest", { type: "number", min: "0", step: "0.01" })}</Field>
          <Field id="c-fee" label="Fee (234E) / penalty">{input("fee", { type: "number", min: "0", step: "0.01" })}</Field>
          <Field id="c-total" label="Total" hint="Tax + surcharge + cess + interest + fee">
            <p className="py-2 text-sm font-semibold tabular-nums text-slate-900" data-testid="challan-total">{money(computedTotal)}</p>
          </Field>
          <div className="sm:col-span-2">
            <Field id="c-remarks" label="Remarks" hint="Required (at least 10 characters) when no challan file is attached">
              <input id="c-remarks" className={inputClass} value={header.remarks} onChange={set("remarks")} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">2. Invoices paid by this challan</h2>
            <p className="text-xs text-slate-500">TDS verified and recorded as deducted, not yet on a challan.</p>
          </div>
          <div className="flex gap-3">
            <Field id="f-period" label="Deducted in">
              <input id="f-period" type="month" className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Field>
            <Field id="f-section" label="Section">
              <input id="f-section" className={inputClass} value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} placeholder="All" />
            </Field>
          </div>
        </div>
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading invoices…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No invoices waiting for deposit in this month / section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-5 py-2 text-left" />
                  <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                  <th className="px-3 py-2 text-left font-semibold">Section</th>
                  <th className="px-3 py-2 text-left font-semibold">Deducted</th>
                  <th className="px-3 py-2 text-left font-semibold">Deposit due</th>
                  <th className="px-3 py-2 text-left font-semibold">TDS</th>
                  <th className="px-5 py-2 text-left font-semibold">Paid by this challan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const on = selected[row.invoice_id] !== undefined;
                  return (
                    <tr key={row.invoice_id} className={clsx(on && "bg-[#0A0082]/[0.03]")}>
                      <td className="px-5 py-2.5 text-left">
                        <input type="checkbox" aria-label={`Select ${row.invoice_number}`} checked={on} onChange={() => toggle(row)} />
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        <p className="font-medium text-slate-900">{row.invoice_number}</p>
                        <p className="text-xs text-slate-500">{row.vendor_name}</p>
                      </td>
                      <td className="px-3 py-2.5 text-left text-slate-700">{row.section || "—"}</td>
                      <td className="px-3 py-2.5 text-left text-slate-700">{fmtDate(row.deduction_date)}</td>
                      <td className={clsx("px-3 py-2.5 text-left", row.overdue ? "font-semibold text-rose-700" : "text-slate-700")}>
                        {fmtDate(row.deposit_due_date)}
                        {row.overdue && <span className="ml-1 text-xs">(overdue)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-left tabular-nums text-slate-800">{money(row.tds_amount)}</td>
                      <td className="px-5 py-2.5 text-left">
                        <input
                          aria-label={`Amount for ${row.invoice_number}`}
                          type="number"
                          min="0"
                          step="0.01"
                          className={clsx(inputClass, "w-36")}
                          disabled={!on}
                          value={on ? selected[row.invoice_id] : ""}
                          onChange={(e) => setSelected((cur) => ({ ...cur, [row.invoice_id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="text-slate-600">
            {allocations.length} selected · TDS <span className="font-semibold tabular-nums text-slate-900">{money(allocatedTotal)}</span> vs challan tax{" "}
            <span className="font-semibold tabular-nums text-slate-900">{money(header.tax_amount)}</span>
          </span>
          <span
            className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", Math.abs(difference) <= 1 && allocations.length ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200")}
            data-testid="challan-difference"
          >
            {allocations.length ? (Math.abs(difference) <= 1 ? "Totals match" : `Difference ${money(difference)}`) : "Select invoices"}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        {checked && <IssuesList result={check} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={runCheck} loading={validate.isPending} loadingText="Checking...">
            Check
          </Button>
          <Button variant="primary" onClick={confirm} loading={create.isPending} loadingText="Recording..." disabled={!allocations.length || (checked && !check.valid)}>
            Confirm challan{allocations.length ? ` for ${allocations.length} invoice${allocations.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </section>
    </div>
  );
}
