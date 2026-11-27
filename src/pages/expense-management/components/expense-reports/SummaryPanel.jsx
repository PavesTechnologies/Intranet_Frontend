import React from "react";
import { CheckCircle2, Layers, Receipt, Landmark, Wallet } from "lucide-react";
import StatusBadge from "@/components/status/statusbadge";
import AnimatedNumber from "./AnimatedNumber";
import InvoiceHandoffBadge from "./InvoiceHandoffBadge";
import PaymentStatusBadge, { paymentStateOf } from "./PaymentStatusBadge";

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPayDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const MetricRow = ({ icon, label, value, valueClassName = "text-gray-900", suffix }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
    <div className="flex min-w-0 items-center gap-2 text-slate-500">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
    <span className={`text-sm font-bold tabular-nums ${valueClassName}`}>
      {value}
      {suffix ? <span className="ml-1 text-xs font-semibold text-gray-400">{suffix}</span> : null}
    </span>
  </div>
);

/**
 * Sticky, always-visible, live-updating totals — recomputed client-side from
 * the fetched line-items array every time it changes (add/edit/delete/refetch).
 */
export default function SummaryPanel({ report, lineItems = [] }) {
  const totalLineItems = lineItems.length;
  const baseCurrencyCode =
    lineItems.find((li) => li.baseCurrencyCode)?.baseCurrencyCode || report?.baseCurrencyCode || report?.currencyCode || "—";
  // Line amounts are in each line's own currency, so they are only summed as-is when every line
  // shares one currency. GST and net are converted with the line's rate (as baseAmount is) so
  // they always add up in the base currency.
  const lineCurrencies = [...new Set(lineItems.map((li) => li.currencyCode).filter(Boolean))];
  const singleLineCurrency = lineCurrencies.length <= 1 ? lineCurrencies[0] || report?.currencyCode : null;
  const toBase = (li, value) => (Number(value) || 0) * (Number(li.exchangeRate) || 1);
  const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const totalGst = lineItems.reduce((sum, li) => sum + toBase(li, li.taxAmount), 0);
  const totalNet = lineItems.reduce((sum, li) => sum + toBase(li, li.netAmount), 0);
  const totalBase = lineItems.reduce((sum, li) => sum + (Number(li.baseAmount) || 0), 0);
  // Payment track: Awaiting payment / Paid (only after AP confirms) / Settled - no payment due.
  const hasPaymentTrack = !!paymentStateOf(report);
  const payment = report?.paymentConfirmation;
  const hasInvoiceTrack = report?.invoiceHandoffStatus === "PENDING" || report?.invoiceHandoffStatus === "COMPLETED";

  const netShare = totalGst + totalNet > 0 ? (totalNet / (totalGst + totalNet)) * 100 : 100;

  return (
    <div className="lg:sticky lg:top-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]" data-summary-panel>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] p-5 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Money summary</p>
          {report?.status && <StatusBadge label={report.status} size="sm" />}
        </div>
        <p className="relative mt-3 text-[11px] font-medium text-white/60">Total in {baseCurrencyCode}</p>
        <p className="relative text-3xl font-bold tabular-nums tracking-tight">
          <AnimatedNumber value={totalBase} format={formatAmount} />
          <span className="ml-1.5 text-sm font-semibold text-white/60">{baseCurrencyCode}</span>
        </p>
        <p className="relative mt-0.5 text-xs text-white/60">
          across {totalLineItems} expense{totalLineItems === 1 ? "" : "s"}
        </p>
        {/* Two independent downstream tracks once approved: employee reimbursement (AP) and,
            for client-billable reports, the invoice team handoff. */}
        {(hasPaymentTrack || hasInvoiceTrack) && (
          <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
            {hasPaymentTrack && <PaymentStatusBadge report={report} />}
            {hasInvoiceTrack && <InvoiceHandoffBadge status={report.invoiceHandoffStatus} />}
          </div>
        )}
      </div>

      <div className="p-4">
        {/* What the total is made of: net spend and GST, in the base currency */}
        <div className="mb-3" data-summary-split>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Net ${formatAmount(totalNet)}, GST ${formatAmount(totalGst)} ${baseCurrencyCode}`}>
            <span className="h-full rounded-l-full bg-emerald-500 last:rounded-r-full" style={{ width: `${netShare}%` }} />
            {totalGst > 0 && <span className="h-full rounded-r-full bg-amber-400" style={{ width: `${100 - netShare}%` }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> Net spend</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> GST</span>
          </div>
        </div>

        <MetricRow icon={<Layers size={15} />} label="Expenses on this report" value={totalLineItems} />
        <MetricRow
          icon={<Wallet size={15} />}
          label="Amount as entered"
          value={
            singleLineCurrency !== null
              ? <AnimatedNumber value={totalAmount} format={formatAmount} />
              : `${lineCurrencies.length} currencies`
          }
          suffix={singleLineCurrency !== null ? singleLineCurrency : undefined}
        />
        <MetricRow
          icon={<Receipt size={15} />}
          label="Net spend (before GST)"
          value={<AnimatedNumber value={totalNet} format={formatAmount} />}
          valueClassName="text-emerald-700"
          suffix={baseCurrencyCode}
        />
        <MetricRow
          icon={<Receipt size={15} />}
          label="GST"
          value={<AnimatedNumber value={totalGst} format={formatAmount} />}
          valueClassName="text-amber-600"
          suffix={baseCurrencyCode}
        />
        <MetricRow
          icon={<Landmark size={15} />}
          label={`Total in ${baseCurrencyCode} (base currency)`}
          value={<AnimatedNumber value={totalBase} format={formatAmount} />}
          valueClassName="text-[#0A0082] text-base"
          suffix={baseCurrencyCode}
        />
        {payment && (
          <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70" data-payment-receipt>
            <div className="flex items-center gap-2.5 border-b border-dashed border-emerald-200 px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">Paid to you</p>
                <p className="text-xs text-emerald-700">
                  {formatAmount(payment.amountPaid)} {baseCurrencyCode}
                </p>
              </div>
            </div>
            <dl className="space-y-1.5 px-3.5 py-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-emerald-700/80">Paid on</dt>
                <dd className="font-medium text-emerald-900">{formatPayDate(payment.paymentDate)}</dd>
              </div>
              {payment.paymentMethod && (
                <div className="flex justify-between gap-3">
                  <dt className="text-emerald-700/80">Method</dt>
                  <dd className="font-medium capitalize text-emerald-900">{payment.paymentMethod.replace(/_/g, " ").toLowerCase()}</dd>
                </div>
              )}
              {payment.paymentReference && (
                <div className="flex justify-between gap-3">
                  <dt className="text-emerald-700/80">Reference</dt>
                  <dd className="truncate font-mono font-medium text-emerald-900">{payment.paymentReference}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        {report?.noPaymentDue && (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Approved and fully covered by your cash advance, so no payment is due.
          </p>
        )}
      </div>
    </div>
  );
}
