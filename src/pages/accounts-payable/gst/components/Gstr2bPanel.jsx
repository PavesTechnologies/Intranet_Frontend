import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { FileDown, Upload } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { GSTR2B_MATCH } from "../../constants/gstItc";
import { Empty, SegmentedTabs, formatMoney } from "../../dashboard/components/insights";
import { formatDate, formatMonth } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/documentUpload";
import { useGstr2b, useImportGstr2b } from "../hooks/useGstItc";
import gstr2bService from "../services/gstr2bService";

const inr = (v) => formatMoney(v ?? 0, "INR");
const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

function Badge({ status }) {
  const spec = GSTR2B_MATCH[status] || GSTR2B_MATCH.MISSING;
  return <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", spec.tone)}>{spec.label}</span>;
}

function ImportBar({ canManage }) {
  const fileRef = useRef(null);
  const [period, setPeriod] = useState(lastMonth());
  const importFile = useImportGstr2b();

  const upload = async (file) => {
    if (!file) return;
    try {
      const r = await importFile.mutateAsync({ file, period: `${period}-01` });
      toast.success(`GSTR-2B ${formatMonth(r.period)}: ${r.counts.MATCHED} matched, ${r.counts.MISMATCH} mismatched, `
        + `${r.counts.NOT_IN_BOOKS} not in the books.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not import the GSTR-2B."));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const template = async () => {
    try {
      downloadBlob(await gstr2bService.template(), "gstr2b_template.csv");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the template."));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManage && (
        <>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Return period
            <input type="month" aria-label="Return period" className="h-8 rounded-md border border-slate-300 px-2 text-xs" value={period}
              max={new Date().toISOString().slice(0, 7)} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
          </label>
          <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" aria-label="GSTR-2B file"
            onChange={(e) => upload(e.target.files?.[0])} />
          <Button size="small" variant="primary" onClick={() => fileRef.current?.click()} loading={importFile.isPending}>
            <Upload className="mr-1 h-3.5 w-3.5" aria-hidden /> Import GSTR-2B
          </Button>
        </>
      )}
      <Button size="small" variant="ghost" onClick={template}><FileDown className="mr-1 h-3.5 w-3.5" aria-hidden /> CSV template</Button>
    </div>
  );
}

export default function Gstr2bPanel({ canManage }) {
  const [period, setPeriod] = useState(null);
  const [view, setView] = useState("attention");
  const { data, isLoading, isError, error } = useGstr2b(period);

  if (isLoading) {
    return <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-20"><LoadingSpinner text="Loading GSTR-2B..." /></div>;
  }
  if (isError) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the GSTR-2B match.")}</p>;
  }

  const counts = data.counts || {};
  const rows = [
    ...data.entries.map((e) => ({ ...e, key: `e${e.entry_id}` })),
    ...data.missing_in_2b.map((m) => ({ ...m, key: `m${m.invoice_id}`, match_status: "MISSING", matched_invoice_id: m.invoice_id,
      matched_invoice_number: m.invoice_number, doc_number: m.invoice_number, doc_date: m.invoice_date, tax: m.itc, doc_type: "INV",
      note: "In the books but not filed by the supplier - the credit is held until they file it in GSTR-1." })),
  ];
  const shown = rows.filter((r) => (view === "all" ? true : view === "attention" ? r.match_status !== "MATCHED" : r.match_status === view));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-sm text-slate-600">
          {data.period ? (
            <>
              <span className="font-medium text-slate-800">GSTR-2B {formatMonth(data.period)}</span>
              {data.generated_on && ` · generated ${formatDate(data.generated_on)}`} · {data.file_name}
              {data.imports.length > 1 && (
                <select aria-label="Imported period" className="ml-2 h-8 rounded-md border border-slate-300 px-2 text-xs" value={data.period}
                  onChange={(e) => setPeriod(e.target.value)}>
                  {data.imports.map((i) => <option key={i.import_id} value={i.period}>{formatMonth(i.period)}</option>)}
                </select>
              )}
            </>
          ) : (
            "No GSTR-2B imported yet - credit is claimed on the invoices in the books (not checked against suppliers' filings)."
          )}
        </div>
        <ImportBar canManage={canManage} />
      </section>

      {data.period && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["MATCHED", "MISMATCH", "MISSING_IN_2B", "NOT_IN_BOOKS"].map((k) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{GSTR2B_MATCH[k === "MISSING_IN_2B" ? "MISSING" : k].label}</p>
                <p className={clsx("mt-1 text-2xl font-semibold tabular-nums", counts[k] && k !== "MATCHED" ? "text-amber-600" : "text-slate-800")}>{counts[k] ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{GSTR2B_MATCH[k === "MISSING_IN_2B" ? "MISSING" : k].hint}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Documents</h2>
              <SegmentedTabs value={view} onChange={setView} tabs={[
                { value: "attention", label: "Needs action", count: rows.filter((r) => r.match_status !== "MATCHED").length },
                { value: "MATCHED", label: "Matched", count: counts.MATCHED ?? 0 },
                { value: "all", label: "All", count: rows.length },
              ]} />
            </div>
            {shown.length === 0 ? (
              <Empty text="Everything the suppliers filed matches the books." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      {["Document", "Supplier", "Tax filed / in books", "Match", "What to do"].map((h) => (
                        <th key={h} className={clsx("px-3 py-2", h.startsWith("Tax") && "text-right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((r) => (
                      <tr key={r.key}>
                        <td className="px-3 py-2">
                          {r.matched_invoice_id ? (
                            <Link to={AP_ROUTES.INVOICE_DETAIL(r.matched_invoice_id)} className="font-medium text-indigo-600 hover:text-indigo-700">{r.doc_number}</Link>
                          ) : <span className="font-medium text-slate-800">{r.doc_number}</span>}
                          <div className="text-xs text-slate-500">{r.doc_type === "INV" ? "Invoice" : r.doc_type === "CN" ? "Credit note" : "Debit note"} · {formatDate(r.doc_date)}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {r.supplier_name || r.vendor_name || "—"}<div className="font-mono text-slate-400">{r.supplier_gstin}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {inr(r.tax)}
                          {r.tax_difference != null && Number(r.tax_difference) !== 0 && (
                            <div className={clsx("text-xs", r.match_status === "MISMATCH" ? "font-medium text-amber-700" : "text-slate-400")}>
                              {Number(r.tax_difference) > 0 ? "+" : ""}{inr(r.tax_difference)} vs books
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2"><Badge status={r.match_status} /></td>
                        <td className="max-w-md px-3 py-2 text-xs text-slate-600">
                          {r.note || (r.matched_invoice_number ? `Matched to ${r.matched_invoice_number}` : "—")}
                          {r.match_status !== "MATCHED" && r.match_status !== "NOT_IN_BOOKS" && r.itc_status === "CLAIMED" && (
                            <div className="font-medium text-rose-600">Credit already claimed - reverse it in GSTR-3B if the supplier doesn't file / amend</div>
                          )}
                          {r.itc_available === false && <div className="text-rose-600">Supplier marked ITC not available{r.itc_unavailable_reason ? ` (${r.itc_unavailable_reason})` : ""}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <p className="text-xs text-slate-400">
        Download GSTR-2B (JSON) from the GST portal: Returns Dashboard → GSTR-2B → Download. Once a month is imported, an invoice's
        input credit can be claimed only when it is matched there (s.16(2)(aa)); months before the first import are not checked.
      </p>
    </div>
  );
}
