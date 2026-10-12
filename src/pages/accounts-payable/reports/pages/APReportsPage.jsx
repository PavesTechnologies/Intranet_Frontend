import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import clsx from "clsx";

import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import reportService from "../services/reportService";
import vendorService from "../../vendor/services/vendorService";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { PAYMENT_TERM_STATUS_META } from "../../constants/paymentTerms";
import PaymentTermStatusBadge from "../../invoice/components/PaymentTermStatusBadge";
import {
  ChartCard,
  DateField,
  Empty,
  KpiTile,
  MoneyAreaChart,
  PresetPills,
  Ranking,
  SERIES,
  SegmentedTabs,
  formatMoney,
} from "../../dashboard/components/insights";

const PREVIEW_ROWS = 200;
const CURRENCY = "INR";

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presetRange(preset, today = new Date()) {
  const to = isoDate(today);
  const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const monthsBack = (n) => {
    const from = new Date(today.getFullYear(), today.getMonth() - n + 1, 1);
    return { fromDate: isoDate(from), toDate: to };
  };
  switch (preset) {
    case "month":
      return monthsBack(1);
    case "3m":
      return monthsBack(3);
    case "6m":
      return monthsBack(6);
    case "12m":
      return monthsBack(12);
    case "fy":
      return { fromDate: `${fyStart}-04-01`, toDate: to };
    case "ytd":
      return { fromDate: `${today.getFullYear()}-01-01`, toDate: to };
    default:
      return monthsBack(3);
  }
}

const PRESETS = [
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "fy", label: "This fiscal year" },
  { value: "ytd", label: "Year to date" },
];

const KPI_ICONS = {
  invoiced: FileText,
  paid: CheckCircle2,
  outstanding: Wallet,
  overdue: AlertTriangle,
  tds: Landmark,
  on_time: CalendarClock,
  days_to_pay: Clock,
  vendors: Users,
};

const NUMERIC = ["money", "int", "number"];
const TAB_LABELS = {
  outstanding_payables: "Outstanding payables",
  ageing: "Ageing by vendor",
  expected_payments: "Expected payments",
  payments_made: "Payments made",
  tds_register: "TDS register",
  payment_term_exceptions: "Term exceptions",
};

function cellValue(column, row) {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return <span className="text-slate-300">—</span>;
  if (column.type === "money") return <span className="block w-full text-right font-mono text-xs">{formatMoney(value, row.currency_code || CURRENCY)}</span>;
  if (NUMERIC.includes(column.type)) return <span className="block w-full text-right tabular-nums">{String(value)}</span>;
  if (column.key === "term_status" && PAYMENT_TERM_STATUS_META[value]) return <PaymentTermStatusBadge status={value} />;
  if (column.type === "date") return <span className="whitespace-nowrap">{formatDate(value)}</span>;
  if (column.key === "invoice_number" && row.invoice_id) {
    return (
      <Link to={AP_ROUTES.INVOICE_DETAIL(row.invoice_id)} className="text-[#0A0082] hover:underline">
        {value}
      </Link>
    );
  }
  if (["due_status", "timeliness", "deposit_timeliness"].includes(column.key)) {
    const bad = /overdue|late/i.test(String(value));
    return <span className={clsx("whitespace-nowrap", bad && "font-semibold text-rose-700")}>{String(value)}</span>;
  }
  if (column.key === "receipt" && value === "Missing") return <span className="font-semibold text-amber-700">Missing</span>;
  return <span className="whitespace-nowrap">{String(value)}</span>;
}

function DetailedReports({ reports, reportKey, onSelect, filters, isRange, months, setMonths }) {
  const [exporting, setExporting] = useState(null);
  const effective = { ...filters, fromDate: isRange ? filters.fromDate : undefined, toDate: isRange ? filters.toDate : undefined,
    months: reportKey === "expected_payments" ? Number(months) : undefined };
  const { data: report, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["accountsPayable", "report", reportKey, effective],
    queryFn: () => reportService.runReport(reportKey, effective),
    enabled: Boolean(reportKey) && !filters.invalid,
    retry: false,
  });

  const doExport = async (format) => {
    setExporting(format);
    try {
      await reportService.exportReport(reportKey, effective, format);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not export the report."));
    } finally {
      setExporting(null);
    }
  };

  const moneyCols = report?.columns.filter((c) => c.type === "money") || [];
  // Operational report permissions include export; management users need AP_MANAGEMENT_REPORTS_EXPORT.
  const canExport = reports.find((r) => r.key === reportKey)?.can_export !== false;
  const headlineCol = moneyCols[moneyCols.length - 1];

  return (
    <ChartCard
      title="Detailed reports"
      subtitle={
        report
          ? `${report.title} · ${report.period?.type === "range" ? `${formatDate(report.period.from_date)} – ${formatDate(report.period.to_date)}` : `balances as of ${formatDate(report.period?.as_of)}`} · ${report.rows.length} row${report.rows.length === 1 ? "" : "s"}`
          : "Pick a report"
      }
      action={
        canExport && (
        <div className="flex gap-2">
          <Button variant="outline" size="small" onClick={() => doExport("pdf")} loading={exporting === "pdf"} disabled={!report || filters.invalid}>
            <FileText size={14} /> PDF
          </Button>
          <Button variant="primary" size="small" onClick={() => doExport("xlsx")} loading={exporting === "xlsx"} disabled={!report || filters.invalid}>
            <FileSpreadsheet size={14} /> Export Excel
          </Button>
        </div>
        )
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs tabs={reports.map((r) => ({ value: r.key, label: TAB_LABELS[r.key] || r.title }))} value={reportKey} onChange={onSelect} />
        {reportKey === "expected_payments" && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            Months ahead
            <PresetPills
              presets={[{ value: "3", label: "3" }, { value: "6", label: "6" }, { value: "12", label: "12" }]}
              value={months}
              onChange={setMonths}
            />
          </div>
        )}
      </div>

      {isLoading || (isFetching && !report) ? (
        <LoadingSpinner text="Running report..." />
      ) : isError ? (
        <p className="flex items-center gap-1.5 text-sm text-rose-600">
          <AlertTriangle size={14} /> {getApiErrorMessage(error, "Could not run the report.")}
        </p>
      ) : report ? (
        <>
          {report.totals?.length > 0 && headlineCol && (
            <div className="mb-3 flex flex-wrap gap-2">
              {report.totals.map((t) => (
                <div key={t.currency_code} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {headlineCol.label} · {t.currency_code}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{formatMoney(t[headlineCol.key], t.currency_code)}</p>
                </div>
              ))}
            </div>
          )}
          {report.rows.length === 0 ? (
            <Empty text="No rows for the selected filters." />
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <GenericTable
                headers={report.columns.map((c) => (NUMERIC.includes(c.type) ? <span className="block w-full text-right">{c.label}</span> : c.label))}
                columns={report.columns.map((c) => c.key)}
                rows={report.rows.slice(0, PREVIEW_ROWS).map((row) =>
                  Object.fromEntries(report.columns.map((c) => [c.key, cellValue(c, row)])),
                )}
              />
              {report.rows.length > PREVIEW_ROWS && (
                <p className="mt-2 text-xs text-slate-500">
                  Showing the first {PREVIEW_ROWS} of {report.rows.length} rows — export for the full report.
                </p>
              )}
            </div>
          )}
          {report.notes?.map((note) => (
            <p key={note} className="mt-2 text-xs italic text-slate-500">
              {note}
            </p>
          ))}
        </>
      ) : null}
    </ChartCard>
  );
}

/**
 * AP Reports — an organization-wide view of payables for a period (KPI tiles, invoiced vs paid by
 * month, spend by vendor / department / category, outstanding by stage) followed by the detailed
 * reports, each previewed and exportable to Excel/PDF with exactly the same rows. Layout and tokens
 * follow the Expense Management Reports page. Every figure is computed by the backend.
 */
export default function APReportsPage() {
  const [searchParams] = useSearchParams();
  const [preset, setPreset] = useState("3m");
  const [range, setRange] = useState(() => presetRange("3m"));
  const [vendorId, setVendorId] = useState("");
  const [months, setMonths] = useState("3");
  const [reportKey, setReportKey] = useState(searchParams.get("report") || "");

  const invalid = Boolean(range.fromDate && range.toDate && range.fromDate > range.toDate);
  const filters = { fromDate: range.fromDate, toDate: range.toDate, vendorId: vendorId || undefined, invalid };

  const { data: reports = [], isLoading: loadingList, isError: listError, error: listErr } = useQuery({
    queryKey: ["accountsPayable", "reports"],
    queryFn: () => reportService.listReports(),
    retry: false,
  });
  const selectedKey = reports.some((r) => r.key === reportKey) ? reportKey : reports[0]?.key;
  const selected = reports.find((r) => r.key === selectedKey);

  const summaryQuery = useQuery({
    queryKey: ["accountsPayable", "reportSummary", filters.fromDate, filters.toDate, filters.vendorId],
    queryFn: () => reportService.getSummary(filters),
    enabled: !invalid && reports.length > 0,
    retry: false,
  });
  const summary = summaryQuery.data;

  const { data: vendors = [] } = useQuery({
    queryKey: ["accountsPayable", "reportVendors"],
    queryFn: () => vendorService.getVendors({ skip: 0, limit: 200 }),
    staleTime: 5 * 60_000,
  });

  const monthly = useMemo(
    () => (summary?.monthly || []).map((m) => ({ ...m, invoiced: Number(m.invoiced), paid: Number(m.paid) })),
    [summary],
  );
  const toSlices = (list) => (list || []).map((s) => ({ ...s, amount: Number(s.amount) }));

  const choosePreset = (value) => {
    setPreset(value);
    setRange(presetRange(value));
  };
  const setDate = (key) => (value) => {
    setPreset("custom");
    setRange((r) => ({ ...r, [key]: value }));
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Reports" }]} />
      <PageHeader
        title="Reports"
        subtitle={`Accounts payable · ${formatDate(range.fromDate)} – ${formatDate(range.toDate)} · Amounts in ${CURRENCY}`}
        actions={
          <Button variant="outline" size="small" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching}>
            <RefreshCw size={14} className={summaryQuery.isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {loadingList ? (
        <LoadingSpinner text="Loading reports..." />
      ) : listError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {getApiErrorMessage(listErr, "Could not load the report list.")}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          No reports are available for your access.
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <DateField label="From" value={range.fromDate} max={range.toDate} onChange={setDate("fromDate")} invalid={invalid} />
              <DateField label="To" value={range.toDate} min={range.fromDate} onChange={setDate("toDate")} invalid={invalid} />
              <label className="text-xs font-medium text-slate-600">
                Vendor
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="mt-1 block w-56 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                >
                  <option value="">All vendors</option>
                  {vendors.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name}
                    </option>
                  ))}
                </select>
              </label>
              {invalid && <p className="pb-2 text-xs font-medium text-rose-600">From must be on or before To.</p>}
            </div>
            <PresetPills presets={PRESETS} value={preset} onChange={choosePreset} />
          </section>

          {/* KPI tiles */}
          {summaryQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {getApiErrorMessage(summaryQuery.error, "Could not load the summary.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(summary?.kpis || Array.from({ length: 8 }, (_, i) => ({ key: `s${i}`, label: "…", value: null }))).map((kpi) => (
                <KpiTile key={kpi.key} kpi={{ ...kpi, currency_code: summary?.currency }} icon={KPI_ICONS[kpi.key]} currency={CURRENCY} />
              ))}
            </div>
          )}

          {/* Monthly trend */}
          <ChartCard title="Invoiced vs paid by month" subtitle={`Invoices by invoice date, payments by payment date · ${CURRENCY}`}>
            {summaryQuery.isLoading ? (
              <LoadingSpinner text="Loading..." />
            ) : (
              <MoneyAreaChart
                points={monthly}
                currency={CURRENCY}
                height={260}
                series={[
                  { key: "invoiced", label: "Invoiced", color: SERIES[0] },
                  { key: "paid", label: "Paid", color: SERIES[1] },
                ]}
                countKeys={{ invoices: "Invoices", payments: "Payments" }}
              />
            )}
          </ChartCard>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="By vendor" subtitle="Invoiced in the period · top vendors">
              <Ranking slices={toSlices(summary?.by_vendor)} currency={CURRENCY} />
            </ChartCard>
            <ChartCard title="Outstanding by stage" subtitle="Open balances as of today">
              <Ranking slices={toSlices(summary?.outstanding_by_stage)} currency={CURRENCY} />
            </ChartCard>
            <ChartCard title="By department" subtitle="Invoiced in the period">
              <Ranking slices={toSlices(summary?.by_department)} currency={CURRENCY} />
            </ChartCard>
            <ChartCard title="By purchase category" subtitle="Invoiced in the period">
              <Ranking slices={toSlices(summary?.by_category)} currency={CURRENCY} />
            </ChartCard>
          </div>
          {summary?.notes?.map((n) => (
            <p key={n} className="flex items-center gap-1.5 text-xs text-slate-400">
              <Building2 size={12} /> {n}
            </p>
          ))}

          {/* Detailed reports */}
          <DetailedReports
            reports={reports}
            reportKey={selectedKey}
            onSelect={setReportKey}
            filters={filters}
            isRange={selected?.period === "range"}
            months={months}
            setMonths={setMonths}
          />
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Receipt size={12} /> Exports contain exactly the rows and totals shown above, for the selected period and vendor.
          </p>
        </>
      )}
    </div>
  );
}
