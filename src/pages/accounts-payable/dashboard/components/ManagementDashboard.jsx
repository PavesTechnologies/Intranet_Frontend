import { Link } from "react-router-dom";
import { AlertTriangle, CalendarRange, ChevronRight, Clock, Landmark, Percent, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import clsx from "clsx";
import GenericTable from "../../../../components/Table/table";
import {
  ChartCard,
  Empty,
  KpiTile,
  MoneyAreaChart,
  Ranking,
  SERIES,
  StackedMoneyBars,
  formatMoney,
} from "./insights";
import { AP_ROUTES } from "../../constants/routes";

const KPI_ICONS = {
  liability: Wallet,
  due_30: CalendarRange,
  overdue: AlertTriangle,
  on_time: Percent,
  days_to_pay: Clock,
  spend_fy: TrendingUp,
};

const days = (v) => (v == null ? "—" : `${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })} d`);
const toSlices = (list) => (list || []).map((s) => ({ ...s, amount: Number(s.amount) }));

function EfficiencyCard({ efficiency }) {
  const stages = [
    { label: "Received → approved", value: efficiency.median_days_to_approve },
    { label: "Approved → paid", value: efficiency.median_days_approval_to_payment },
    { label: "Received → paid", value: efficiency.median_days_end_to_end, strong: true },
  ];
  return (
    <ChartCard title="Process efficiency" subtitle={`Median days, invoices received in the last 180 days · ${efficiency.sample} paid`}>
      <div className="grid grid-cols-3 gap-2">
        {stages.map((s) => (
          <div key={s.label} className={clsx("rounded-lg border px-3 py-2.5", s.strong ? "border-[#0A0082]/30 bg-[#0A0082]/5" : "border-slate-200")}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={clsx("mt-1 text-xl font-bold tabular-nums", s.strong ? "text-[#0A0082]" : "text-slate-800")}>{days(s.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
          Approval bottlenecks
          <span className="font-normal text-slate-500">{efficiency.pending_approvals} pending approvals</span>
        </p>
        {efficiency.bottlenecks.length === 0 ? (
          <p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-400">No approvals waiting.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
            {efficiency.bottlenecks.map((b) => (
              <li key={`${b.department}-${b.level}`} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-slate-800">
                  {b.department} <span className="text-slate-400">· level {b.level}</span>
                </span>
                <span className="tabular-nums text-slate-600">{b.count} waiting</span>
                <span className={clsx("w-24 text-right tabular-nums", (b.max_wait_days || 0) > 5 ? "font-semibold text-rose-700" : "text-slate-700")}>
                  oldest {days(b.max_wait_days)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ChartCard>
  );
}

function ComplianceCard({ items, currency }) {
  return (
    <ChartCard title="Compliance exceptions" subtitle="Open items that carry financial or statutory risk">
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3 text-sm">
            <span
              className={clsx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                i.count ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400",
              )}
            >
              {i.key === "tds_overdue" ? <Landmark size={14} /> : <ShieldAlert size={14} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{i.label}</span>
            {i.amount != null && Number(i.amount) > 0 && <span className="text-xs tabular-nums text-slate-500">{formatMoney(i.amount, currency)}</span>}
            <span className={clsx("w-8 text-right font-semibold tabular-nums", i.count ? "text-slate-900" : "text-slate-300")}>{i.count}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function HighValueExceptions({ rows, threshold, currency }) {
  return (
    <ChartCard
      title="High-value exceptions"
      subtitle={`Open invoices at or above ${formatMoney(threshold, currency)} that are overdue or have a payment-term exception`}
    >
      {rows.length === 0 ? (
        <Empty text="No high-value exceptions." />
      ) : (
        <div className="overflow-x-auto">
          <GenericTable
            headers={["Invoice", "Vendor", "Stage", "Issue", <span key="h" className="block w-full text-right">Outstanding</span>]}
            columns={["invoice", "vendor", "stage", "issue", "amount"]}
            rows={rows.map((r) => ({
              invoice: (
                <Link to={AP_ROUTES.INVOICE_DETAIL(r.invoice_id)} className="text-[#0A0082] hover:underline">
                  {r.invoice_number}
                </Link>
              ),
              vendor: r.vendor_name,
              stage: r.stage,
              issue: (
                <span className={clsx("inline-flex items-center gap-1 text-xs font-medium", r.days_overdue ? "text-rose-700" : "text-amber-700")}>
                  <AlertTriangle size={12} />
                  {r.days_overdue ? `Overdue ${r.days_overdue} days` : r.issue}
                </span>
              ),
              amount: <span className="block w-full text-right font-mono text-xs font-semibold">{formatMoney(r.outstanding, r.currency_code)}</span>,
            }))}
          />
        </div>
      )}
    </ChartCard>
  );
}

/**
 * CEO / Chief Product Officer view (read-only): where AP stands, what is coming, whether the
 * process is efficient and where the risks are. No operational actions are offered here.
 */
export default function ManagementDashboard({ data }) {
  const currency = data.base_currency || "INR";
  const outflow = data.outflow.map((o) => ({ ...o, approved: Number(o.approved), pipeline: Number(o.pipeline) }));
  const trend = (data.spend_trend || []).map((m) => ({ ...m, invoiced: Number(m.invoiced), paid: Number(m.paid) }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key]} currency={currency} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard title="Expected outflow — 30 / 60 / 90 days" subtitle="Outstanding by due date · approved vs still in review / approval" className="lg:col-span-3">
          <StackedMoneyBars
            points={outflow}
            currency={currency}
            series={[
              { key: "approved", label: "Approved / ready", color: SERIES[0] },
              { key: "pipeline", label: "Still in review / approval", color: SERIES[1] },
            ]}
          />
          <p className="mt-2 text-[11px] text-slate-400">{data.note}</p>
        </ChartCard>
        <ChartCard
          title="Vendor exposure"
          subtitle={data.top5_share != null ? `Top 5 vendors hold ${data.top5_share}% of what we owe` : "What we owe, by vendor"}
          className="lg:col-span-2"
        >
          <Ranking slices={toSlices(data.vendor_exposure)} currency={currency} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard title="Spend vs payments — last 12 months" subtitle={`Invoiced by invoice date, paid by payment date · ${currency}`} className="lg:col-span-3">
          <MoneyAreaChart
            points={trend}
            currency={currency}
            height={260}
            series={[
              { key: "invoiced", label: "Invoiced", color: SERIES[0] },
              { key: "paid", label: "Paid", color: SERIES[1] },
            ]}
            countKeys={{ invoices: "Invoices", payments: "Payments" }}
          />
        </ChartCard>
        <ChartCard title="Spend by department" subtitle="Last 12 months" className="lg:col-span-2">
          <Ranking slices={toSlices(data.by_department)} currency={currency} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <EfficiencyCard efficiency={data.efficiency} />
        <ComplianceCard items={data.compliance} currency={currency} />
        <ChartCard title="Reports" subtitle="Drill into the detail behind these figures">
          <ul className="space-y-1.5 text-sm">
            {[
              ["outstanding_payables", "AP liabilities"],
              ["expected_payments", "Expected payments by month"],
              ["ageing", "Ageing by vendor"],
              ["payments_made", "Payment performance"],
              ["payment_term_exceptions", "Payment-term exceptions"],
            ].map(([key, label]) => (
              <li key={key}>
                <Link to={`${AP_ROUTES.REPORTS}?report=${key}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50">
                  {label} <ChevronRight size={14} className="text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <HighValueExceptions rows={data.high_value_exceptions} threshold={data.high_value_threshold} currency={currency} />
    </div>
  );
}
