import { Link } from "react-router-dom";
import { CheckCheck, Clock, Hourglass, Inbox, Timer, Wallet } from "lucide-react";
import clsx from "clsx";
import GenericTable from "../../../../components/Table/table";
import { Aging } from "../../../expense-management/components/dashboard/DashboardWidgets";
import { ChartCard, Empty, KpiTile, Ranking, SERIES, StackedMoneyBars, formatMoney } from "./insights";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";

const KPI_ICONS = { awaiting: Inbox, queue_value: Wallet, oldest: Hourglass, high_value: CheckCheck, decided: CheckCheck, turnaround: Timer };

function waitLabel(days) {
  if (days == null) return "—";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} h`;
  return `${Math.round(days)} d`;
}

/**
 * Approver view: the invoices waiting for MY decision (oldest first), how long they have waited,
 * where they come from, and how fast I decide. Only this approver's own queue and decisions.
 */
export default function ApprovalsDashboard({ data }) {
  const currency = data.base_currency || "INR";
  const rows = data.queue.map((q) => ({
    invoice: (
      <Link to={AP_ROUTES.INVOICE_DETAIL(q.invoice_id)} className="font-medium text-[#0A0082] hover:underline">
        {q.invoice_number}
      </Link>
    ),
    vendor: q.vendor_name,
    department: q.department,
    level: `Level ${q.level}`,
    waiting: (
      <span className={clsx("inline-flex items-center gap-1 tabular-nums", (q.waiting_days || 0) > 3 ? "font-semibold text-rose-700" : "text-slate-700")}>
        <Clock size={12} /> {waitLabel(q.waiting_days)}
      </span>
    ),
    due: q.due_date ? formatDate(q.due_date) : "—",
    amount: (
      <span className="block w-full text-right">
        <span className="font-mono text-xs font-semibold text-slate-900">{formatMoney(q.amount, q.currency_code)}</span>
        {q.high_value && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">High value</span>}
      </span>
    ),
    action: (
      <Link to={AP_ROUTES.INVOICE_DETAIL(q.invoice_id)} className="rounded-md border border-[#0A0082] px-2.5 py-1 text-xs font-medium text-[#0A0082] hover:bg-[#0A0082]/5">
        Review
      </Link>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key]} currency={currency} />
        ))}
      </div>

      <ChartCard
        title="My approval queue"
        subtitle={data.queue_count ? `${data.queue_count} invoice${data.queue_count === 1 ? "" : "s"} waiting for my decision · oldest first` : "Nothing is waiting for your decision"}
      >
        {rows.length === 0 ? (
          <Empty text="You're all caught up." />
        ) : (
          <div className="overflow-x-auto">
            <GenericTable
              headers={["Invoice", "Vendor", "Department", "Level", "Waiting", "Due", <span key="a" className="block w-full text-right">Amount</span>, ""]}
              columns={["invoice", "vendor", "department", "level", "waiting", "due", "amount", "action"]}
              rows={rows}
            />
            {data.queue_count > data.queue.length && (
              <p className="mt-2 text-xs text-slate-500">Showing the oldest {data.queue.length} of {data.queue_count}.</p>
            )}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="My decisions per month" subtitle="Last 6 months" className="lg:col-span-1">
          <StackedMoneyBars
            points={data.decisions_trend}
            format="count"
            height={220}
            series={[
              // Validated trio (dataviz validate_palette): no green for "rejected", legend + tooltip relieve contrast.
              { key: "approved", label: "Approved", color: SERIES[0] },
              { key: "sent_back", label: "Sent back", color: SERIES[3] },
              { key: "rejected", label: "Rejected", color: SERIES[4] },
            ]}
          />
        </ChartCard>
        <ChartCard title="How long my queue has waited" subtitle="Since each invoice reached my level">
          <Aging buckets={data.waiting_aging} noun="invoices" />
        </ChartCard>
        <ChartCard title="Waiting by department" subtitle={`Value awaiting my decision · ${currency}`}>
          <Ranking slices={(data.pending_by_department || []).map((d) => ({ ...d, amount: Number(d.amount) }))} currency={currency} />
        </ChartCard>
      </div>
    </div>
  );
}
