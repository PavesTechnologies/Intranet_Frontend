import React from "react";
import { Layers, Receipt, Landmark, Wallet } from "lucide-react";
import StatusBadge from "@/components/status/statusbadge";
import AnimatedNumber from "./AnimatedNumber";
import InvoiceHandoffBadge from "./InvoiceHandoffBadge";

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MetricRow = ({ icon, label, value, valueClassName = "text-gray-900", suffix }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center gap-2 text-gray-500">
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
  const hasPaymentTrack = !!report?.paymentRoutingStatus && report.paymentRoutingStatus !== "NONE";
  const hasInvoiceTrack = report?.invoiceHandoffStatus === "PENDING" || report?.invoiceHandoffStatus === "COMPLETED";

  return (
    <div className="lg:sticky lg:top-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4">
        <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Report Summary</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white truncate pr-2">{report?.title || "—"}</span>
          {report?.status && <StatusBadge label={report.status} size="sm" />}
        </div>
        {/* Two independent downstream tracks once approved: employee reimbursement (AP) and,
            for client-billable reports, the invoice team handoff. */}
        {(hasPaymentTrack || hasInvoiceTrack) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {hasPaymentTrack && <StatusBadge label={report.paymentRoutingStatus} size="sm" />}
            {hasInvoiceTrack && <InvoiceHandoffBadge status={report.invoiceHandoffStatus} />}
          </div>
        )}
      </div>

      <div className="p-4">
        <MetricRow
          icon={<Layers size={15} />}
          label="Total Line Items"
          value={totalLineItems}
        />
        <MetricRow
          icon={<Wallet size={15} />}
          label="Total Original Amount"
          value={
            singleLineCurrency !== null
              ? <AnimatedNumber value={totalAmount} format={formatAmount} />
              : `${lineCurrencies.length} currencies`
          }
          suffix={singleLineCurrency !== null ? singleLineCurrency : undefined}
        />
        <MetricRow
          icon={<Receipt size={15} />}
          label="Total GST"
          value={<AnimatedNumber value={totalGst} format={formatAmount} />}
          valueClassName="text-amber-600"
          suffix={baseCurrencyCode}
        />
        <MetricRow
          icon={<Receipt size={15} />}
          label="Total Net Amount"
          value={<AnimatedNumber value={totalNet} format={formatAmount} />}
          valueClassName="text-emerald-700"
          suffix={baseCurrencyCode}
        />
        <MetricRow
          icon={<Landmark size={15} />}
          label="Organization Base Currency"
          value={baseCurrencyCode}
        />
        <MetricRow
          icon={<Landmark size={15} />}
          label="Total Base Amount"
          value={<AnimatedNumber value={totalBase} format={formatAmount} />}
          valueClassName="text-[#0A0082] text-base"
          suffix={baseCurrencyCode}
        />
      </div>
    </div>
  );
}
