import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowDown, ArrowUp, FileDown, RefreshCw, Search, Upload } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import { AP_ROUTES } from "../../constants/routes";
import { MATCH_GROUPS, RECON_FILTERS, RECON_REVIEW, importModeSpec, matchGroupSpec, reconSpec } from "../../constants/gstItc";
import { Empty } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/documentUpload";
import { useGstr2bMatches, useGstr2bSummary, useRematchGstr2b } from "../hooks/useGstItc";
import gstr2bService, { IMPORT_MODE } from "../services/gstr2bService";
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

const DEMO_BANNER = "DEMO data from the AP demo Excel template - not a supplier filing and not an official GSTR-2B. "
  + "It is kept apart from official reconciliation and never used for ITC eligibility, GSTR-3B approval or claims.";

/**
 * GSTR-2B reconciliation for one return period: import, the backend's matching results with
 * status filters and search, exception resolution (detail drawer: review / manual mapping) and
 * export. Matching is never done here - rows show exactly what GET /gstr2b/matches returned.
 * The official import is shown by default; a period's demo import (AP demo Excel template) is only
 * shown when "Demo data" is chosen, always under a DEMO banner.
 */
export default function Gstr2bPanel({
  period, periods, canManage, status, onStatusChange, group = "", onGroupChange = () => {}, importRequested, onImportHandled, onOpenItc,
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [detailId, setDetailId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [view, setView] = useState(IMPORT_MODE.OFFICIAL);
  const demoView = view === IMPORT_MODE.DEMO;
  const summary = useGstr2bSummary(period, view);
  const matches = useGstr2bMatches({
    returnPeriod: period, status, matchGroup: group || undefined, search, page, pageSize: PAGE_SIZE, importMode: view,
  });
  const rematch = useRematchGstr2b();
  const hasDemo = Boolean(periods?.find((p) => p.period === period)?.demo_imported);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => setPage(1), [period, status, group, search, view]);
  useEffect(() => setView(IMPORT_MODE.OFFICIAL), [period]); // a new period always opens on its official data
  useEffect(() => { // the workflow's "Upload GSTR-2B" step
    if (!importRequested) return;
    if (canManage) setImportOpen(true);
    onImportHandled?.();
  }, [importRequested, canManage, onImportHandled]);

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
      const { blob, fileName } = await gstr2bService.exportMatches({ returnPeriod: period, status, search, format, importMode: view });
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

  // The four outcomes (match_group) are the primary filter; the detailed backend status stays available.
  const groups = s.match_groups || {};
  const chips = [
    { value: "", label: "All" },
    ...MATCH_GROUPS.map((g) => ({ value: g.value, label: g.label, count: groups[g.countKey], hint: g.hint })),
  ];
  const statusOptions = [
    { value: NEEDS_ACTION, label: "Needs action (not reconciled)" },
    ...RECON_FILTERS.filter((f) => !f.optional || Number(s[f.countKey]) > 0)
      .map((f) => ({ value: f.value, label: reconSpec(f.value).label, count: s[f.countKey] })),
  ];
  const filtered = Boolean(search || status || group);

  return (
    <div className="space-y-4">
      {(hasDemo || demoView) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Showing</span>
          <div role="group" aria-label="GSTR-2B data source" className="inline-flex overflow-hidden rounded-md ring-1 ring-slate-200">
            {[[IMPORT_MODE.OFFICIAL, "Official GSTR-2B"], [IMPORT_MODE.DEMO, "Demo data"]].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
                className={clsx("px-3 py-1 font-medium transition", view === key
                  ? (key === IMPORT_MODE.DEMO ? "bg-amber-500 text-white" : "bg-[#0A0082] text-white")
                  : "bg-white text-slate-600 hover:bg-slate-50")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {demoView && (
        <p role="note" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><StatusPill spec={importModeSpec(IMPORT_MODE.DEMO)} className="mr-1.5" />{s.demo_notice || DEMO_BANNER}</span>
        </p>
      )}
      <SectionCard
        title={`${demoView ? "DEMO · " : ""}GSTR-2B Reconciliation · ${periodLabel(period)}`}
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
                <Button size="small" variant="outline" onClick={() => doExport("xlsx")}
                  title={group ? "The export applies the status and search filters - not the match group" : undefined} loading={exporting === "xlsx"} disabled={Boolean(exporting)}>
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
          demoView ? (
            <div className="px-4 py-10 text-center text-sm text-slate-600">
              <p className="font-medium text-slate-800">No demo import for {periodLabel(period)}.</p>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-600">
              <p className="font-medium text-slate-800">No GSTR-2B imported for {periodLabel(period)} yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                This period&apos;s invoices are not checked against the suppliers&apos; filings until its GSTR-2B is imported.
                {!canManage && " Ask a Finance user with GST input credit access to import it."}
                {hasDemo && " A demo import exists for this period - it is not an official GSTR-2B and does not count."}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by match group">
                {chips.map((c) => {
                  const active = c.value ? group === c.value : !group && !status;
                  return (
                    <button key={c.label} type="button" title={c.hint} aria-pressed={active}
                      onClick={() => (c.value ? onGroupChange(c.value) : (onGroupChange(""), onStatusChange("")))}
                      className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition",
                        active ? "bg-[#0A0082] text-white ring-[#0A0082]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
                      {c.label}{c.count !== undefined && c.count !== null ? ` · ${c.count}` : ""}
                    </button>
                  );
                })}
                <select aria-label="Detailed status" value={status} onChange={(e) => onStatusChange(e.target.value)}
                  className="h-7 rounded-full border border-slate-200 bg-white px-2 text-xs text-slate-600">
                  <option value="">Any detailed status</option>
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}{o.count !== undefined && o.count !== null ? ` · ${o.count}` : ""}</option>
                  ))}
                </select>
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
              <Empty text={filtered ? "No records match the filter." : "No records for this period."} />
            ) : (
              <>
                <div className={clsx("overflow-x-auto", matches.isFetching && "opacity-70")}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">Match</th>
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
                                {r.match_group ? (
                                  <>
                                    <StatusPill spec={matchGroupSpec(r.match_group)} />
                                    <span className="text-[11px] text-slate-500" title={reconSpec(r.reconciliation_status).hint}>
                                      {reconSpec(r.reconciliation_status).label}
                                    </span>
                                  </>
                                ) : <StatusPill spec={reconSpec(r.reconciliation_status)} />}
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
                              {r.review_remarks && <div className="mt-0.5 text-slate-500">Review: {r.review_remarks}</div>}
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

      <Gstr2bImportHistory financialYear={financialYearOf(period)} importMode={IMPORT_MODE.ALL} />

      <p className="text-xs text-slate-400">
        Download GSTR-2B from the GST portal: Returns Dashboard → GSTR-2B → Download (Excel or JSON). Once a month is imported,
        only invoices the supplier filed can be approved for GSTR-3B (s.16(2)(aa)). Reconciliation never claims credit.
        Demo imports (AP demo Excel template) are for demonstrations only and never count as the period&apos;s GSTR-2B.
      </p>

      {importOpen && (
        <Gstr2bImportModal isOpen onClose={() => setImportOpen(false)} defaultPeriod={period} periods={periods}
          onImported={(r) => setView(r?.is_demo ? IMPORT_MODE.DEMO : IMPORT_MODE.OFFICIAL)} />
      )}
      {detailId && (
        <MatchDetailDrawer matchId={detailId} period={period} canManage={canManage} onClose={() => setDetailId(null)}
          onOpenItc={(invoiceId) => { setDetailId(null); onOpenItc(invoiceId); }} />
      )}
    </div>
  );
}
