import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Landmark,
  Receipt,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import GenericTable from "../../../../components/Table/table";
import PaymentTermStatusBadge from "../../invoice/components/PaymentTermStatusBadge";
import {
  AgeingColumns,
  ChartCard,
  Empty,
  KpiTile,
  MoneyAreaChart,
  SERIES,
  StackedMoneyBars,
  formatMoney,
} from "./insights";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";

const KPI_ICONS = {
  ready_to_pay: Wallet,
  due_this_week: CalendarClock,
  overdue: AlertTriangle,
  paid_this_month: CheckCircle2,
  needs_action: ClipboardList,
};

const amountIn = (list, code) => Number(list?.find((a) => a.currency_code === code)?.amount ?? 0);
const countIn = (list, code) => Number(list?.find((a) => a.currency_code === code)?.count ?? 0);

const AGE_SHORT = {
  "Not yet due": "Not due",
  "1-15 days overdue": "1–15 d",
  "16-30 days overdue": "16–30 d",
  "31-60 days overdue": "31–60 d",
  "61-90 days overdue": "61–90 d",
  "90+ days overdue": "90+ d",
  "Due date unverified": "Unverified",
};

function UpcomingCard({ upcoming, currency }) {
  const [openKey, setOpenKey] = useState(null);
  const points = upcoming.buckets.map((b) => ({
    key: b.key,
    label: b.label,
    approved: amountIn(b.approved, currency),
    pipeline: amountIn(b.pipeline, currency),
    count: b.count,
  }));
  const open = upcoming.buckets.find((b) => b.key === openKey);
  return (
    <ChartCard
      title="Upcoming payments"
      subtitle="Expected outflow by due date · click a column for its invoices"
      className="lg:col-span-2"
    >
      <StackedMoneyBars
        points={points}
        currency={currency}
        series={[
          { key: "approved", label: "Approved / ready", color: SERIES[0] },
          { key: "pipeline", label: "Still in review / approval", color: SERIES[1] },
        ]}
        onBarClick={(p) => setOpenKey(p.key === openKey ? null : p.key)}
      />
      {open && (
        <div className="mt-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold text-slate-700">
              {open.label} · largest {open.top_invoices.length} of {open.count}
            </p>
            <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setOpenKey(null)}>
              Close
            </button>
          </div>
          <ul className="divide-y divide-slate-100 text-xs">
            {open.top_invoices.map((inv) => (
              <li key={inv.invoice_id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <Link to={AP_ROUTES.INVOICE_DETAIL(inv.invoice_id)} className="min-w-0 truncate font-medium text-[#0A0082] hover:underline">
                  {inv.invoice_number} <span className="font-normal text-slate-500">· {inv.vendor_name}</span>
                </Link>
                <span className="shrink-0 tabular-nums text-slate-600">
                  {inv.due_date ? formatDate(inv.due_date) : "Due date unverified"} ·{" "}
                  <span className="font-semibold text-slate-900">{formatMoney(inv.outstanding, inv.currency_code)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">{upcoming.note}</p>
    </ChartCard>
  );
}

function AgeingCard({ ageing, currency }) {
  const buckets = ageing.buckets.map((b) => ({
    label: b.label,
    short: AGE_SHORT[b.label] || b.label,
    amount: amountIn(b.amounts, currency),
    count: countIn(b.amounts, currency),
    kind: b.label.startsWith("Not yet") ? "not_due" : b.label.includes("unverified") ? "unverified" : "overdue",
  }));
  return (
    <ChartCard title="Ageing — approved, unpaid" subtitle="Outstanding by days past the effective due date">
      <AgeingColumns buckets={buckets} currency={currency} height={300} />
    </ChartCard>
  );
}

function AttentionItem({ icon: Icon, label, count, amount, currency, to, severity = "info" }) {
  const body = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          severity === "critical" ? "bg-rose-50 text-rose-600" : severity === "warning" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500",
        )}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-800">{label}</p>
        {amount != null && Number(amount) > 0 && <p className="text-xs tabular-nums text-slate-500">{formatMoney(amount, currency)}</p>}
      </div>
      <span className={clsx("text-sm font-semibold tabular-nums", count ? "text-slate-900" : "text-slate-300")}>{count}</span>
      {to && <ChevronRight size={14} className="text-slate-300" />}
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:bg-slate-50">
      {body}
    </Link>
  ) : (
    body
  );
}

function NeedsAttention({ data, currency }) {
  const card = (key) => data.action_cards.find((c) => c.key === key);
  const approved = card("approved_not_ready");
  const msme = card("msme_due");
  const exceptions = card("term_exceptions");
  const tdsOverdue = data.tds?.items.filter((i) => i.key.includes("overdue")).reduce((s, i) => s + i.count, 0) ?? null;
  const tdsAmount = data.tds?.items.filter((i) => i.key.includes("overdue")).reduce((s, i) => s + amountIn(i.amounts, currency), 0);
  return (
    <ChartCard title="Needs attention" subtitle="Follow-ups that block or delay payments">
      <div className="-mx-4 -mb-4 divide-y divide-slate-100 border-t border-slate-100">
        <AttentionItem
          icon={ClipboardList}
          label="Approved, not yet marked ready"
          count={approved?.count ?? 0}
          amount={amountIn(approved?.amounts, currency)}
          currency={currency}
          to={approved?.link}
        />
        <AttentionItem
          icon={ShieldAlert}
          label="Payment-term exceptions"
          count={data.term_exception_count}
          amount={amountIn(exceptions?.amounts, currency)}
          currency={currency}
          to={`${AP_ROUTES.REPORTS}?report=payment_term_exceptions`}
          severity={data.term_exception_count ? "warning" : "info"}
        />
        <AttentionItem
          icon={AlertTriangle}
          label="MSME statutory deadline ≤ 7 days"
          count={msme?.count ?? 0}
          amount={amountIn(msme?.amounts, currency)}
          currency={currency}
          severity={msme?.count ? "critical" : "info"}
        />
        {tdsOverdue != null && (
          <AttentionItem
            icon={Landmark}
            label="TDS deposit / statement overdue"
            count={tdsOverdue}
            amount={tdsAmount}
            currency={currency}
            to={data.tds.link}
            severity={tdsOverdue ? "critical" : "info"}
          />
        )}
        <AttentionItem
          icon={Receipt}
          label={`Payments without a receipt (${data.receipts_missing?.days ?? 90} days)`}
          count={data.receipts_missing?.count ?? 0}
          to={AP_ROUTES.PAYMENT_HISTORY}
          severity={data.receipts_missing?.count ? "warning" : "info"}
        />
        <AttentionItem
          icon={FileSignature}
          label="Vendor agreements expiring ≤ 30 days"
          count={data.agreements_expiring?.length ?? 0}
          severity={data.agreements_expiring?.length ? "warning" : "info"}
        />
      </div>
    </ChartCard>
  );
}

function RecentPayments({ payments }) {
  const rows = payments.map((p) => ({
    paidOn: <span className="whitespace-nowrap">{formatDate(p.paid_on)}</span>,
    vendor: <span className="text-slate-900">{p.vendor_name}</span>,
    invoices: (
      <span className="flex flex-wrap gap-x-2">
        {p.invoices.map((inv) => (
          <Link key={inv.invoice_id} to={AP_ROUTES.PAYMENT_DETAIL(inv.invoice_id)} className="text-[#0A0082] hover:underline">
            {inv.invoice_number}
          </Link>
        ))}
      </span>
    ),
    reference: (
      <span className="text-xs text-slate-600">
        {p.payment_mode} · <span className="font-mono">{p.reference_number || "—"}</span>
      </span>
    ),
    amount: <span className="font-mono text-xs font-semibold text-slate-900">{formatMoney(p.amount, p.currency_code || "INR")}</span>,
    receipt: p.receipt_count ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <CheckCircle2 size={12} /> Attached
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <AlertTriangle size={12} /> Missing
      </span>
    ),
  }));
  return (
    <ChartCard
      title="Recently paid"
      subtitle="Cleared payments, newest first"
      className="lg:col-span-2"
      action={
        <Link to={AP_ROUTES.PAYMENT_HISTORY} className="text-xs font-medium text-[#0A0082] hover:underline">
          Payment history →
        </Link>
      }
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <GenericTable
            headers={["Paid on", "Vendor", "Invoice(s)", "Mode · UTR", "Amount", "Receipt"]}
            columns={["paidOn", "vendor", "invoices", "reference", "amount", "receipt"]}
            rows={rows}
          />
        </div>
      ) : (
        <Empty text="No payments recorded yet." />
      )}
    </ChartCard>
  );
}

function TermExceptions({ rows, total }) {
  return (
    <ChartCard
      title="Payment-term exceptions"
      subtitle="Verify before marking ready for payment"
      action={
        total > 0 ? (
          <Link to={`${AP_ROUTES.REPORTS}?report=payment_term_exceptions`} className="text-xs font-medium text-[#0A0082] hover:underline">
            All {total} →
          </Link>
        ) : null
      }
    >
      {rows.length === 0 ? (
        <Empty text="No open payment-term exceptions." />
      ) : (
        <ul className="space-y-2.5 text-sm">
          {rows.map((r) => (
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
  );
}

function TdsFollowUps({ tds, currency }) {
  return (
    <ChartCard
      title="TDS follow-ups"
      subtitle="Deposit by the 7th · quarterly statement deadlines"
      action={
        <Link to={tds.link} className="text-xs font-medium text-[#0A0082] hover:underline">
          TDS tracking →
        </Link>
      }
    >
      <ul className="space-y-2 text-sm">
        {tds.items.map((item) => {
          const overdue = item.key.includes("overdue") && item.count > 0;
          return (
            <li key={item.key} className="flex items-center justify-between gap-2">
              <span className={clsx("flex items-center gap-1.5", overdue ? "font-medium text-rose-700" : "text-slate-700")}>
                {overdue && <AlertTriangle size={13} />}
                {item.label}
              </span>
              <span className="text-right tabular-nums">
                <span className={clsx("font-semibold", item.count ? "text-slate-900" : "text-slate-300")}>{item.count}</span>
                {item.count > 0 && <span className="ml-1.5 text-xs text-slate-500">{formatMoney(amountIn(item.amounts, currency), currency)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

/**
 * Finance Executive operational dashboard — what to pay today, what is overdue, what is coming up
 * and what blocks payment. Rendered entirely from GET /dashboard/finance; every figure is computed
 * by the backend (ap_reporting_service.py). KPI tiles and charts show the base currency; invoices in
 * other currencies are noted on the tiles, never converted or summed.
 */
export default function FinanceDashboard({ data }) {
  const currency = data.base_currency || "INR";
  const trend = useMemo(
    () => (data.paid_trend || []).map((p) => ({ ...p, paid: Number(p.amount) })),
    [data.paid_trend],
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(data.kpis || []).map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key]} currency={currency} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingCard upcoming={data.upcoming} currency={currency} />
        <AgeingCard ageing={data.ageing} currency={currency} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Paid per month" subtitle={`Cleared payments, last ${trend.length} months · ${currency}`} className="lg:col-span-2">
          <MoneyAreaChart
            points={trend}
            currency={currency}
            series={[{ key: "paid", label: "Paid", color: SERIES[0] }]}
            countKeys={{ count: "Payments" }}
          />
        </ChartCard>
        <NeedsAttention data={data} currency={currency} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentPayments payments={data.recent_payments || []} />
        <div className="space-y-4">
          <TermExceptions rows={data.term_exceptions || []} total={data.term_exception_count || 0} />
          {data.tds && <TdsFollowUps tds={data.tds} currency={currency} />}
        </div>
      </div>
    </div>
  );
}
