import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ShieldCheck, Landmark, AlertTriangle, Download } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import StatCard from "@/components/Cards/StatCard";
import GenericTable from "@/components/Table/table";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { taxReportService, taxJournalService } from "@/pages/expense-management/api/expenseReportsApi";
import { ChartCard, TaxByMonthChart } from "./DashboardWidgets";
import { formatMoney } from "./dashboardTheme";

const GROUPINGS = [
  { value: "month", label: "By month", first: "Month" },
  { value: "taxCode", label: "By tax code", first: "Tax code" },
  { value: "component", label: "By component", first: "Component" },
  { value: "category", label: "By category", first: "Category" },
];

/**
 * Finance / admin tax section (design §18): this month's tax KPIs, tax per month, and the tax
 * analysis table (GET /xms/reports/tax, last 12 months, base currency).
 */
export default function TaxDashboardSection({ tax, currency }) {
  const [groupBy, setGroupBy] = useState("month");
  const { data: report, isLoading } = useQuery({
    queryKey: ["taxReport", groupBy],
    queryFn: () => taxReportService.get({ groupBy }).then((res) => res.data?.data),
    staleTime: 60_000,
  });

  if (!tax) return null;
  const grouping = GROUPINGS.find((g) => g.value === groupBy);
  const componentView = groupBy === "component";

  const headers = [grouping.first, "Lines", ...(componentView ? [] : ["Gross"]), "Tax", "Recoverable", "Non-recoverable"];
  const columns = ["label", "lineCount", ...(componentView ? [] : ["gross"]), "tax", "recoverable", "nonRecoverable"];
  const money = (v) => <span className="font-mono text-xs">{formatMoney(v, currency)}</span>;
  const rows = [...(report?.rows || []), ...(report?.totals ? [{ ...report.totals, isTotal: true }] : [])].map((r) => ({
    label: r.isTotal ? <span className="font-semibold">Total</span> : r.label,
    lineCount: componentView && r.isTotal ? "—" : r.lineCount,
    gross: money(r.grossAmount),
    tax: <span className="font-mono text-xs font-semibold">{formatMoney(r.taxAmount, currency)}</span>,
    recoverable: money(r.recoverableTaxAmount),
    nonRecoverable: money(r.nonRecoverableTaxAmount),
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tax this month"
          value={formatMoney(tax.taxThisMonth, currency)}
          subtitle={`${Number(tax.taxSharePercent || 0)}% of spend`}
          icon={Receipt}
          textColor="text-slate-800"
        />
        <StatCard
          title="Recoverable (ITC)"
          value={formatMoney(tax.recoverableThisMonth, currency)}
          subtitle="Claimable input tax"
          icon={ShieldCheck}
          textColor="text-emerald-700"
        />
        <StatCard
          title="Non-recoverable"
          value={formatMoney(tax.nonRecoverableThisMonth, currency)}
          subtitle="Part of expense cost"
          icon={Landmark}
          textColor="text-slate-800"
        />
        <StatCard
          title="Tax to review"
          value={String(tax.linesAwaitingTaxReview ?? 0)}
          subtitle={`Lines at Finance · ${Number(tax.mismatchRatePercent || 0)}% differ from receipt`}
          icon={AlertTriangle}
          textColor={tax.linesAwaitingTaxReview > 0 ? "text-amber-700" : "text-slate-800"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard title="Tax by month" subtitle={`Amounts in ${currency}`} className="lg:col-span-2">
          <TaxByMonthChart months={tax.byMonth} currency={currency} />
        </ChartCard>
        <ChartCard
          title="Tax analysis"
          subtitle={`Submitted expenses, last 12 months · ${currency}`}
          className="lg:col-span-3"
          action={
            <Tabs value={groupBy} onValueChange={setGroupBy}>
              <TabsList className="h-auto flex-wrap">
                {GROUPINGS.map((g) => (
                  <TabsTrigger key={g.value} value={g.value}>
                    {g.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        >
          {isLoading ? (
            <div className="py-10">
              <LoadingSpinner text="Loading tax analysis…" />
            </div>
          ) : rows.length <= 1 ? (
            <p className="py-8 text-center text-sm text-slate-500">No tax recorded in this period yet.</p>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={headers} rows={rows} columns={columns} />
            </div>
          )}
        </ChartCard>
      </div>

      <TaxJournalCard currency={currency} />
    </>
  );
}

const isoDate = (d) => d.toLocaleDateString("en-CA");
const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Tax journal export (ERP read model): per approved report, Dr expense GL (net + non-recoverable
 * tax), Dr input tax GL (recoverable), Cr employee payable (gross). Downloads as CSV.
 */
function TaxJournalCard({ currency }) {
  const today = new Date();
  const [from, setFrom] = useState(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(today));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (from > to) {
      showStatusToast("The start date cannot be after the end date.", "error");
      return null;
    }
    try {
      setLoading(true);
      const res = await taxJournalService.get({ from, to });
      const data = res.data?.data || null;
      setResult(data);
      return data;
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to load the tax journal.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    const data = result && result.from === from && result.to === to ? result : await load();
    if (!data) return;
    const header = ["Journal date", "Report", "Employee", "Account code", "Account name", "Type", "Debit", "Credit", "Memo"];
    const lines = [header.join(",")];
    data.journals.forEach((j) =>
      j.entries.forEach((e) =>
        lines.push([j.journalDate, j.reportNumber, j.employeeId, e.accountCode, e.accountName, e.entryType, e.debit, e.credit, e.memo]
          .map(csvCell)
          .join(","))
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-journal_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unbalanced = result?.journals?.filter((j) => !j.balanced).length || 0;

  return (
    <ChartCard title="Tax journal export" subtitle={`Approved reports, by approval date · ${currency}`}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
        </label>
        <label className="text-xs text-slate-600">
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
        </label>
        <Button variant="outline" size="small" onClick={load} loading={loading} disabled={loading}>Preview</Button>
        <Button variant="primary" size="small" onClick={download} disabled={loading}>
          <Download className="h-3.5 w-3.5" /> Download CSV
        </Button>
      </div>
      {result && (
        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <p>
            {result.journals.length} report{result.journals.length === 1 ? "" : "s"} · debits{" "}
            <span className="font-semibold tabular-nums">{formatMoney(result.totalDebit, currency)}</span> · credits{" "}
            <span className="font-semibold tabular-nums">{formatMoney(result.totalCredit, currency)}</span>
            {unbalanced === 0 ? " · all balanced" : ` · ${unbalanced} unbalanced`}
          </p>
          {result.warnings?.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-amber-700">
              {result.warnings.slice(0, 5).map((w) => <li key={w}>{w}</li>)}
              {result.warnings.length > 5 && <li>…and {result.warnings.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
    </ChartCard>
  );
}
