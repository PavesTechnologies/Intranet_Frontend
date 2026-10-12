// Route: /accounts-payable/tds/filings/new  (TDS_TRACKING_UPDATE)
// Record a quarterly TDS statement (26Q / 27Q / 24Q / 27EQ) acknowledgement for all the quarter's
// deposited invoices at once: upload the acknowledgement -> check -> confirm. Confirming records the
// filing on every selected invoice through the existing per-invoice service, all or nothing.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { useCreateFiling, useExtractFiling, useFilingCandidates, useValidateFiling } from "../hooks/useTdsChallans";
import { ExtractUploadBox, Field, IssuesList, fmtDate, inputClass, money, valuesFrom } from "../components/TdsDocumentParts";

/** Quarter that most recently ended (the one normally being filed now). */
export function lastQuarter(today = new Date()) {
  const month = today.getMonth() + 1;
  const fyStart = month >= 4 ? today.getFullYear() : today.getFullYear() - 1;
  const current = Math.floor(((month - 4 + 12) % 12) / 3) + 1;
  const quarter = current === 1 ? 4 : current - 1;
  const year = current === 1 ? fyStart - 1 : fyStart;
  return { financialYear: `${year}-${String((year + 1) % 100).padStart(2, "0")}`, quarter };
}

export default function TdsFilingNewPage() {
  const navigate = useNavigate();
  const initial = lastQuarter();
  const [header, setHeader] = useState({
    form_type: "26Q", financial_year: initial.financialYear, quarter: initial.quarter, acknowledgement_no: "",
    filing_date: "", tan: "", is_revision: false, remarks: "",
  });
  const [autoFilled, setAutoFilled] = useState({});
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [check, setCheck] = useState(null);
  const [checkedKey, setCheckedKey] = useState(null);

  const extract = useExtractFiling();
  const validate = useValidateFiling();
  const create = useCreateFiling();
  const { data: candidates, isLoading } = useFilingCandidates({
    financialYear: header.financial_year, quarter: Number(header.quarter), revision: header.is_revision,
  }, /^20\d{2}-\d{2}$/.test(header.financial_year));
  const rows = candidates?.items || [];

  // Everything of the quarter is selected by default - a statement normally covers all of it.
  useEffect(() => {
    setSelected(new Set(rows.map((r) => r.invoice_id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  const invoiceIds = [...selected];
  const key = JSON.stringify({ header, invoiceIds, file: file?.name || null });
  const checked = check && checkedKey === key;
  const total = rows.filter((r) => selected.has(r.invoice_id)).reduce((s, r) => s + Number(r.tds_amount || 0), 0);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setHeader((h) => ({ ...h, [field]: value }));
    setAutoFilled((a) => ({ ...a, [field]: false }));
  };

  const onExtracted = (result) => {
    const values = valuesFrom(result);
    setHeader((h) => ({ ...h, ...values, is_revision: Boolean(result.is_revision) }));
    setAutoFilled(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
  };

  const runCheck = async () => {
    try {
      const result = await validate.mutateAsync({ header, invoiceIds, hasDocument: Boolean(file) });
      setCheck(result);
      setCheckedKey(key);
      return result;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not check the filing."));
      return null;
    }
  };

  const confirm = async () => {
    const result = checked ? check : await runCheck();
    if (!result?.valid) return;
    try {
      const filing = await create.mutateAsync({ header, invoiceIds, file });
      toast.success(`${filing.form_type} ${filing.financial_year} Q${filing.quarter} recorded for ${filing.invoice_count} invoice${filing.invoice_count === 1 ? "" : "s"}.`);
      navigate(`${AP_ROUTES.TDS_CHALLANS}?tab=filings`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The filing could not be recorded."));
    }
  };

  const toggle = (id) =>
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Record quarterly TDS filing"
        subtitle="Record the statement acknowledgement once for every deposited invoice of the quarter."
        actions={
          <Button variant="outline" onClick={() => navigate(`${AP_ROUTES.TDS_CHALLANS}?tab=filings`)}>
            <ArrowLeft className="h-4 w-4" /> Challans &amp; filings
          </Button>
        }
      />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">1. Statement</h2>
        <ExtractUploadBox title="Have the acknowledgement (provisional receipt)?" hint="Upload it to fill these details - it is also kept as evidence." file={file} onFile={setFile} onExtracted={onExtracted} extract={extract} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="f-form" label="Form *" autoFilled={autoFilled.form_type} hint={candidates?.suggested_form && candidates.suggested_form !== header.form_type ? `Suggested: ${candidates.suggested_form}` : undefined}>
            <select id="f-form" className={inputClass} value={header.form_type} onChange={set("form_type")}>
              {["26Q", "27Q", "24Q", "27EQ"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field id="f-fy" label="Financial year *" autoFilled={autoFilled.financial_year}>
            <input id="f-fy" className={inputClass} value={header.financial_year} onChange={set("financial_year")} placeholder="2026-27" />
          </Field>
          <Field id="f-quarter" label="Quarter *" autoFilled={autoFilled.quarter}>
            <select id="f-quarter" className={inputClass} value={header.quarter} onChange={set("quarter")}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>Q{q}</option>
              ))}
            </select>
          </Field>
          <Field id="f-date" label="Filing date *" autoFilled={autoFilled.filing_date} hint={candidates?.statement_due_date ? `Due by ${fmtDate(candidates.statement_due_date)}` : undefined}>
            <input id="f-date" type="date" className={inputClass} value={header.filing_date} onChange={set("filing_date")} />
          </Field>
          <Field id="f-ack" label="Token / acknowledgement no. *" autoFilled={autoFilled.acknowledgement_no}>
            <input id="f-ack" className={inputClass} value={header.acknowledgement_no} onChange={set("acknowledgement_no")} maxLength={30} />
          </Field>
          <Field id="f-tan" label="TAN" autoFilled={autoFilled.tan}>
            <input id="f-tan" className={inputClass} value={header.tan} onChange={set("tan")} maxLength={10} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={header.is_revision} onChange={set("is_revision")} /> Correction (revised) statement
            </label>
          </div>
          <Field id="f-remarks" label="Remarks" hint="Required when no acknowledgement is attached">
            <input id="f-remarks" className={inputClass} value={header.remarks} onChange={set("remarks")} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">2. Invoices in this statement</h2>
          <p className="text-xs text-slate-500">
            TDS deposited for deductions in {header.financial_year} Q{header.quarter}
            {candidates?.period_start ? ` (${fmtDate(candidates.period_start)} – ${fmtDate(candidates.period_end)})` : ""}.
          </p>
        </div>
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading invoices…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No deposited invoices waiting to be filed for this quarter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-5 py-2 text-left" />
                  <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                  <th className="px-3 py-2 text-left font-semibold">Section</th>
                  <th className="px-3 py-2 text-left font-semibold">Deducted</th>
                  <th className="px-3 py-2 text-left font-semibold">Deposited</th>
                  <th className="px-3 py-2 text-left font-semibold">Challan</th>
                  <th className="px-5 py-2 text-left font-semibold">TDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.invoice_id} className={clsx(selected.has(row.invoice_id) && "bg-[#0A0082]/[0.03]")}>
                    <td className="px-5 py-2.5 text-left">
                      <input type="checkbox" aria-label={`Select ${row.invoice_number}`} checked={selected.has(row.invoice_id)} onChange={() => toggle(row.invoice_id)} />
                    </td>
                    <td className="px-3 py-2.5 text-left">
                      <p className="font-medium text-slate-900">{row.invoice_number}</p>
                      <p className="text-xs text-slate-500">{row.vendor_name}</p>
                    </td>
                    <td className="px-3 py-2.5 text-left text-slate-700">{row.section || "—"}</td>
                    <td className="px-3 py-2.5 text-left text-slate-700">{fmtDate(row.deduction_date)}</td>
                    <td className="px-3 py-2.5 text-left text-slate-700">{fmtDate(row.deposit_date)}</td>
                    <td className="px-3 py-2.5 text-left text-slate-700">{row.challan_number || "—"}</td>
                    <td className="px-5 py-2.5 text-left tabular-nums text-slate-800">{money(row.tds_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          {invoiceIds.length} of {rows.length} selected · TDS <span className="font-semibold tabular-nums text-slate-900">{money(total)}</span>
        </div>
      </section>

      <section className="space-y-3">
        {checked && <IssuesList result={check} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={runCheck} loading={validate.isPending} loadingText="Checking...">
            Check
          </Button>
          <Button variant="primary" onClick={confirm} loading={create.isPending} loadingText="Recording..." disabled={!invoiceIds.length || (checked && !check.valid)}>
            Confirm filing{invoiceIds.length ? ` for ${invoiceIds.length} invoice${invoiceIds.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </section>
    </div>
  );
}
