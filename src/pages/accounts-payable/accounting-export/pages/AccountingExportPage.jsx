import { Fragment, useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import clsx from "clsx";
import { toast } from "react-toastify";
import { ChevronDown, ChevronRight, Download, History } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { EXPORT_FORMATS, VOUCHER_TYPES } from "../../constants/accountingExport";
import { Empty, formatMoney } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob, extractFileNameFromContentDisposition } from "../../utils/documentUpload";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useExportHistory, useExportPreview, useRunExport } from "../hooks/useAccountingExport";
import accountingExportService from "../services/accountingExportService";
import LedgerSettings from "../components/LedgerSettings";

const inr = (v) => formatMoney(v ?? 0, "INR");
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lastMonth = () => {
  const now = new Date();
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
};
const SHOWN = 100;

function VoucherRow({ v }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen((o) => !o)}>
        <td className="px-3 py-2">
          <span className="flex items-center gap-1 font-mono text-xs text-slate-700">
            {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}{v.number}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-600">{formatDate(v.date)}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{v.voucher_type}</td>
        <td className="px-3 py-2 text-xs text-slate-700">{v.narration}{v.exported_at && <span className="ml-2 text-slate-400">· exported {formatDate(v.exported_at)}</span>}</td>
        <td className="px-3 py-2 text-right tabular-nums">{inr(v.amount)}</td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-8 py-2">
            <table className="w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr><th className="py-1">Ledger</th><th className="py-1">Bill</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th></tr>
              </thead>
              <tbody>
                {v.lines.map((l, i) => (
                  <tr key={i}>
                    <td className={clsx("py-1", Number(l.credit) && "pl-6")}>{l.ledger}</td>
                    <td className="py-1 text-slate-500">{l.bill || ""}</td>
                    <td className="py-1 text-right tabular-nums">{Number(l.debit) ? inr(l.debit) : ""}</td>
                    <td className="py-1 text-right tabular-nums">{Number(l.credit) ? inr(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AccountingExportPage() {
  const { canEditLedgers } = useApPermissions();
  const initial = lastMonth();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [format, setFormat] = useState("TALLY_XML");
  const [types, setTypes] = useState(Object.keys(VOUCHER_TYPES));
  const [includeExported, setIncludeExported] = useState(false);
  const [includeMasters, setIncludeMasters] = useState(true);
  const filters = { dateFrom, dateTo, types, includeExported };
  const preview = useExportPreview(filters);
  const history = useExportHistory();
  const runExport = useRunExport();

  const toggleType = (t) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const doExport = async () => {
    try {
      const response = await runExport.mutateAsync({ ...filters, format, includeMasters });
      const name = extractFileNameFromContentDisposition(response.headers?.["content-disposition"], "apm-export");
      downloadBlob(response.data, name);
      toast.success(`${response.headers?.["x-voucher-count"] ?? preview.data?.selected} voucher(s) exported - import the file into your books.`);
    } catch (err) {
      let message = getApiErrorMessage(err, "Could not create the export.");
      if (err?.response?.data instanceof Blob) {
        try { message = JSON.parse(await err.response.data.text()).detail || message; } catch { /* keep the generic message */ }
      }
      toast.error(message);
    }
  };

  const redownload = async (row) => {
    try {
      const response = await accountingExportService.file(row.export_id);
      downloadBlob(response.data, row.file_name);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the file."));
    }
  };

  const data = preview.data;
  const formatSpec = EXPORT_FORMATS.find((f) => f.value === format);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Accounting export" }]} />
      <PageHeader title="Accounting export" subtitle="Post AP to Tally or Zoho Books - invoices, payments, notes and TDS deposits as balanced vouchers, without re-typing" />
      <PageGuide page="accountingExport" />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600">From
            <input type="date" aria-label="From" className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" value={dateFrom}
              max={dateTo} onChange={(e) => e.target.value && setDateFrom(e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">To
            <input type="date" aria-label="To" className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" value={dateTo}
              min={dateFrom} onChange={(e) => e.target.value && setDateTo(e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">Format
            <select aria-label="Format" className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
              {EXPORT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <Button variant="primary" onClick={doExport} loading={runExport.isPending} disabled={!data?.selected}>
            <Download className="mr-1 h-4 w-4" aria-hidden /> Export {data?.selected ? `${data.selected} voucher(s)` : ""}
          </Button>
        </div>
        <p className="text-xs text-slate-500">{formatSpec?.hint}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
          {Object.entries(VOUCHER_TYPES).map(([t, label]) => (
            <label key={t} className="flex items-center gap-1.5">
              <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} /> {label}
            </label>
          ))}
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={includeExported} onChange={(e) => setIncludeExported(e.target.checked)} /> Re-export already exported
          </label>
          {format === "TALLY_XML" && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={includeMasters} onChange={(e) => setIncludeMasters(e.target.checked)} /> Create missing ledgers
            </label>
          )}
        </div>
      </section>

      {types.length === 0 ? (
        <Empty text="Choose at least one kind of voucher." />
      ) : preview.isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16"><LoadingSpinner text="Building vouchers..." /></div>
      ) : preview.isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(preview.error, "Could not build the vouchers.")}</p>
      ) : data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {types.map((t) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{VOUCHER_TYPES[t]}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">{data.by_type[t]?.count ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{inr(data.by_type[t]?.amount ?? 0)}</p>
              </div>
            ))}
          </div>
          {data.already_exported > 0 && !includeExported && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
              {data.already_exported} voucher(s) in this period were exported before and are left out. Tick "Re-export" to include them
              (Tally updates the same voucher instead of adding a duplicate).
            </p>
          )}
          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              Vouchers <span className="font-normal text-slate-500">· click one to see its ledger lines</span>
            </h2>
            {data.vouchers.length === 0 ? (
              <Empty text="Nothing to export for this period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr><th className="px-3 py-2">Voucher</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Narration</th><th className="px-3 py-2 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.vouchers.slice(0, SHOWN).map((v) => <Fragment key={v.number}><VoucherRow v={v} /></Fragment>)}
                  </tbody>
                </table>
                {data.vouchers.length > SHOWN && (
                  <p className="px-4 py-2 text-xs text-slate-500">Showing {SHOWN} of {data.vouchers.length} - all of them are in the export.</p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <LedgerSettings canEdit={canEditLedgers} />

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800"><History className="h-4 w-4" aria-hidden /> Previous exports</h2>
        {!history.data?.length ? (
          <Empty text="No exports yet." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.data.map((h) => (
              <li key={h.export_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                <span className="text-slate-700">
                  <span className="font-medium">{EXPORT_FORMATS.find((f) => f.value === h.format)?.label || h.format}</span>
                  {" · "}{formatDate(h.date_from)} – {formatDate(h.date_to)} · {h.vouchers} voucher(s) · {inr(h.total_debit)}
                  <span className="text-slate-400"> · {formatDate(h.created_at)}</span>
                </span>
                {h.has_file && <Button size="small" variant="ghost" onClick={() => redownload(h)}>Download again</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
