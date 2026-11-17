import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { ArrowDown, ArrowUp, FileDown, RefreshCw, Search, Upload } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import { AP_ROUTES } from "../../constants/routes";
import { RECON_FILTERS, RECON_REVIEW, reconSpec } from "../../constants/gstItc";
import { Empty } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/documentUpload";
import { useGstr2bMatches, useGstr2bSummary, useRematchGstr2b } from "../hooks/useGstItc";
import gstr2bService from "../services/gstr2bService";
import { financialYearOf, inr, periodLabel } from "../utils/gstFormat";
import { ErrorBlock, LoadingBlock, SectionCard, StatusPill } from "./GstUi";
import Gstr2bImportModal from "./Gstr2bImportModal";
import Gstr2bImportHistory from "./Gstr2bImportHistory";
import MatchDetailDrawer, { docTypeLabel } from "./MatchDetailDrawer";

const PAGE_SIZE = 25;
/** Everything that is not reconciled - the backend accepts comma-separated statuses. */
export const NEEDS_ACTION = "PARTIALLY_MATCHED,MISMATCHED,CREDIT_NOTE_MISMATCH,MISSING_IN_GSTR2B,MISSING_IN_AP,DUPLICATE,REQUIRES_REVIEW";

const SORTS = {
  supplier: (r) => (r.supplier_gstr2b_details?.supplier_name || r.purchase_invoice_details?.vendor_name || "").toLowerCase(),
  date: (r) => r.supplier_gstr2b_details?.document_date || r.purchase_invoice_details?.invoice_date || "",
  difference: (r) => Math.abs(Number(r.tax_difference || 0)),
};

function SortHeader({ label, sortKey, sort, onSort, align }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" className={clsx("px-3 py-2", align === "right" && "text-right")}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-slate-800" onClick={() => onSort(sortKey)}>
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
      </button>
    </th>
  );
}

/**
 * GSTR-2B reconciliation for one return period: import, the backend's matching results with
 * status filters and search, exception resolution (detail drawer: review / manual mapping) and
 * export. Matching is never done here - rows show exactly what GET /gstr2b/matches returned.
 */
export default function Gstr2bPanel({ period, periods, canManage, status, onStatusChange, onOpenItc }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [detailId, setDetailId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const summary = useGstr2bSummary(period);
  const matches = useGstr2bMatches({ returnPeriod: period, status, search, page, pageSize: PAGE_SIZE });
  const rematch = useRematchGstr2b();

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => setPage(1), [period, status, search]);

  const rows = useMemo(() => {
    const items = matches.data?.items || [];
    if (!sort.key) return items;
    const key = SORTS[sort.key];
    return [...items].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      const cmp = typeof x === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [matches.data, sort]);

  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const s = summary.data || {};
  const imported = s.import_status && s.import_status !== "NOT_IMPORTED";
  const total = matches.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doExport = async (format) => {
    setExporting(format);
    try {
      const { blob, fileName } = await gstr2bService.exportMatches({ returnPeriod: period, status, search, format });
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not export the reconciliation."));
    } finally {
      setExporting(null);
    }
  };

  const doRematch = async () => {
    if (rematch.isPending) return;
    try {
      const r = await rematch.mutateAsync(period);
      toast.success(`Matching re-run for ${periodLabel(period)}: ${r.changed ?? 0} record(s) changed. Manual mappings were kept.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not re-run matching."));
    }
  };

  const template = async () => {
    try {
      downloadBlob(await gstr2bService.template(), "gstr2b_template.csv");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not download the template."));
    }
  };

  const chips = [
    { value: "", label: "All" },
    { value: NEEDS_ACTION, label: "Needs action" },
    ...RECON_FILTERS.filter((f) => !f.optional || Number(s[f.countKey]) > 0)
      .map((f) => ({ value: f.value, label: reconSpec(f.value).label, count: s[f.countKey] })),
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title={`GSTR-2B Reconciliation · ${periodLabel(period)}`}
        actions={(
          <>
            {canManage && (
              <Button size="small" variant="primary" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1 h-3.5 w-3.5" aria-hidden /> Import GSTR-2B
              </Button>
            )}
            {canManage && imported && (
              <Button size="small" variant="outline" onClick={doRematch} loading={rematch.isPending}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden /> Re-run matching
              </Button>
            )}
            {imported && (
              <>
                <Button size="small" variant="outline" onClick={() => doExport("xlsx")} loading={exporting === "xlsx"} disabled={Boolean(exporting)}>
                  <FileDown className="mr-1 h-3.5 w-3.5" aria-hidden /> Excel
                </Button>
                <Button size="small" variant="ghost" onClick={() => doExport("csv")} loading={exporting === "csv"} disabled={Boolean(exporting)}>CSV</Button>
              </>
            )}
            <Button size="small" variant="ghost" onClick={template}>CSV template</Button>
          </>
        )}
      >
        {summary.isLoading ? (
          <LoadingBlock text="Loading the reconciliation..." />
        ) : summary.isError ? (
          <div className="p-4"><ErrorBlock error={summary.error} fallback="Could not load the reconciliation." /></div>
        ) : !imported ? (
          <div className="px-4 py-10 text-center text-sm text-slate-600">
            <p className="font-medium text-slate-800">No GSTR-2B imported for {periodLabel(period)} yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              This period&apos;s invoices are not checked against the suppliers&apos; filings until its GSTR-2B is imported.
              {!canManage && " Ask a Finance user with GST input credit access to import it."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                {chips.map((c) => (
                  <button key={c.label} type="button" onClick={() => onStatusChange(c.value)} aria-pressed={status === c.value}
                    className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition",
                      status === c.value ? "bg-[#0A0082] text-white ring-[#0A0082]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
                    {c.label}{c.count !== undefined && c.count !== null ? ` · ${c.count}` : ""}
                  </button>
                ))}
              </div>
              <label className="relative">
                <span className="sr-only">Search vendor, GSTIN or invoice number</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} maxLength={100}
                  placeholder="Vendor, GSTIN or invoice no." className="h-8 w-64 rounded-md border border-slate-300 pl-8 pr-2 text-xs" />
              </label>
            </div>

            {matches.isLoading ? (
              <LoadingBlock text="Loading records..." />
            ) : matches.isError ? (
              <div className="p-4"><ErrorBlock error={matches.error} fallback="Could not load the records." /></div>
            ) : rows.length === 0 ? (
              <Empty text={search || status ? "No records match the filter." : "No records for this period."} />
            ) : (
              <>
                <div className={clsx("overflow-x-auto", matches.isFetching && "opacity-70")}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">Status</th>
                        <SortHeader label="GSTR-2B document" sortKey="date" sort={sort} onSort={onSort} />
                        <SortHeader label="Supplier" sortKey="supplier" sort={sort} onSort={onSort} />
                        <th scope="col" className="px-3 py-2">AP invoice</th>
                        <th scope="col" className="px-3 py-2 text-right">Taxable 2B / AP</th>
                        <SortHeader label="GST 2B / AP" sortKey="difference" sort={sort} onSort={onSort} align="right" />
                        <th scope="col" className="px-3 py-2">Reason</th>
                        <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => {
                        const doc = r.supplier_gstr2b_details;
                        const inv = r.purchase_invoice_details;
                        const diff = Number(r.tax_difference || 0);
                        return (
                          <tr key={r.match_id ?? `missing-${inv?.invoice_id ?? i}`}>
                            <td className="px-3 py-2">
                              <div className="flex flex-col items-start gap-1">
                                <StatusPill spec={reconSpec(r.reconciliation_status)} />
                                {r.review_status && <StatusPill spec={RECON_REVIEW[r.review_status] || { label: r.review_status }} />}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {doc ? (
                                <>
                                  <span className="font-medium text-slate-800">{doc.document_number}</span>
                                  <div className="text-xs text-slate-500">{docTypeLabel(doc.document_type)} · {formatDate(doc.document_date)}{doc.section ? ` · ${doc.section}` : ""}</div>
                                </>
                              ) : <span className="text-xs text-slate-400">Not in GSTR-2B</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {doc?.supplier_name || inv?.vendor_name || "—"}
                              <div className="font-mono text-slate-400">{doc?.supplier_gstin || inv?.supplier_gstin}</div>
                            </td>
                            <td className="px-3 py-2">
                              {inv ? (
                                <>
                                  <Link to={AP_ROUTES.INVOICE_DETAIL(inv.invoice_id)} className="font-medium text-indigo-600 hover:underline">{inv.invoice_number}</Link>
                                  <div className="text-xs text-slate-500">{formatDate(inv.invoice_date)}</div>
                                </>
                              ) : <span className="text-xs text-slate-400">Not in AP</span>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-xs">
                              {doc ? inr(doc.taxable_value) : "—"}<div className="text-slate-400">{inv ? inr(inv.taxable_value) : "—"}</div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-xs">
                              {doc ? inr(doc.gst_total) : "—"}<div className="text-slate-400">{inv ? inr(inv.gst_total) : "—"}</div>
                              {diff !== 0 && <div className="font-medium text-amber-700">{diff > 0 ? "+" : ""}{inr(diff)}</div>}
                            </td>
                            <td className="max-w-xs px-3 py-2 text-xs text-slate-600">
                              {r.mismatch_reasons?.[0] || (r.reconciliation_status === "MATCHED" ? "Agrees with the books" : "—")}
                              {r.mismatch_reasons?.length > 1 && <span className="text-slate-400"> +{r.mismatch_reasons.length - 1} more</span>}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right">
                              {r.match_id ? (
                                <Button size="small" variant="outline" onClick={() => setDetailId(r.match_id)}>Details</Button>
                              ) : inv && (
                                <Button size="small" variant="ghost" onClick={() => onOpenItc(inv.invoice_id)}>ITC</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
                  <span>{total} record(s){sort.key ? " · sorting applies to this page" : ""}</span>
                  {totalPages > 1 && (
                    <Pagination currentPage={page} totalPages={totalPages}
                      onPrevious={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </SectionCard>

      <Gstr2bImportHistory financialYear={financialYearOf(period)} />

      <p className="text-xs text-slate-400">
        Download GSTR-2B from the GST portal: Returns Dashboard → GSTR-2B → Download (Excel or JSON). Once a month is imported,
        only invoices the supplier filed can be approved for GSTR-3B (s.16(2)(aa)). Reconciliation never claims credit.
      </p>

      {importOpen && <Gstr2bImportModal isOpen onClose={() => setImportOpen(false)} defaultPeriod={period} periods={periods} />}
      {detailId && (
        <MatchDetailDrawer matchId={detailId} period={period} canManage={canManage} onClose={() => setDetailId(null)}
          onOpenItc={(invoiceId) => { setDetailId(null); onOpenItc(invoiceId); }} />
      )}
    </div>
  );
}
