import { Link } from "react-router-dom";
import { CornerUpLeft, FileScan, Landmark, Send, Upload } from "lucide-react";
import clsx from "clsx";
import { Breakdown } from "../../../expense-management/components/dashboard/DashboardWidgets";
import PaymentTermStatusBadge from "../../invoice/components/PaymentTermStatusBadge";
import { ChartCard, Empty, KpiTile, MoneyAreaChart, SERIES } from "./insights";
import { AP_ROUTES } from "../../constants/routes";

const KPI_ICONS = { to_review: FileScan, returned: CornerUpLeft, tds: Landmark, ready_to_send: Send, uploaded: Upload };

const NEXT_STEP = {
  OCR_REVIEW_PENDING: "Review OCR",
  OCR_FAILED: "Fix extraction",
  RETURNED_FOR_REVIEW: "Correct & resubmit",
  OCR_REVIEWED: "Determine TDS / send",
};

function ageLabel(days) {
  if (days < 1) return "today";
  return `${Math.round(days)} d`;
}

/**
 * AP Executive view: the invoice intake work in front of me — what to review, what came back,
 * what needs TDS before it can be sent, and what is ready to send for approval. No payment or
 * management figures; only the intake stage this role owns.
 */
export default function MyWorkDashboard({ data }) {
  const intake = data.intake_trend.map((m) => ({ ...m }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key]} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Next up — oldest first"
          subtitle="Intake invoices waiting on AP, with the step each one needs"
          className="lg:col-span-2"
        >
          {data.oldest.length === 0 ? (
            <Empty text="Your intake queue is empty." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.oldest.map((item) => (
                <li key={item.invoice_id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={clsx(
                      "w-12 shrink-0 rounded-md py-1 text-center text-xs font-semibold tabular-nums",
                      item.age_days > 3 ? "bg-rose-50 text-rose-700" : item.age_days >= 1 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600",
                    )}
                    title="Days since the invoice was received"
                  >
                    {ageLabel(item.age_days)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={AP_ROUTES.INVOICE_DETAIL(item.invoice_id)} className="font-medium text-[#0A0082] hover:underline">
                      {item.invoice_number}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {item.vendor_name}
                      {item.mine && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] text-slate-600">uploaded by me</span>}
                    </p>
                  </div>
                  <Link
                    to={AP_ROUTES.INVOICE_DETAIL(item.invoice_id)}
                    className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#0A0082] hover:text-[#0A0082]"
                  >
                    {NEXT_STEP[item.status_code] || "Open"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Where invoices are" subtitle="Count by stage, all AP invoices">
          <Breakdown slices={data.pipeline} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Invoices received per month" subtitle="Last 6 months · all AP vs uploaded by me" className="lg:col-span-2">
          <MoneyAreaChart
            points={intake}
            format="count"
            series={[
              { key: "team", label: "All AP", color: SERIES[0] },
              { key: "mine", label: "Uploaded by me", color: SERIES[1] },
            ]}
          />
        </ChartCard>
        <ChartCard
          title="Payment-term issues to fix at review"
          subtitle={`${data.term_issue_count} invoice${data.term_issue_count === 1 ? "" : "s"} — link the PO or correct the terms before sending`}
        >
          {data.term_issues.length === 0 ? (
            <Empty text="No payment-term issues in review." />
          ) : (
            <ul className="space-y-2.5 text-sm">
              {data.term_issues.map((r) => (
                <li key={r.invoice_id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={AP_ROUTES.INVOICE_DETAIL(r.invoice_id)} className="font-medium text-[#0A0082] hover:underline">
                      {r.invoice_number}
                    </Link>
                    <p className="truncate text-xs text-slate-500" title={r.reason_text}>
                      {r.vendor_name} — {r.reason_text}
                    </p>
                  </div>
                  <PaymentTermStatusBadge status={r.term_status} />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
