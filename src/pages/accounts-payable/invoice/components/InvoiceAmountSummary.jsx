import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { formatCurrency, calculateBalance } from "../../utils/formatters";

/** Reusable amount breakdown — used on InvoiceDetailPage, kept separate so a future dashboard
 *  KPI card or payment-confirmation view can reuse the same rendering. */
export default function InvoiceAmountSummary({ invoice }) {
  const symbol = invoice.currency?.symbol || "₹";
  const balance = calculateBalance(invoice.netAmount, invoice.amountPaid);

  const rows = [
    { label: "Gross Amount", value: invoice.grossAmount },
    { label: "Discount", value: -Math.abs(invoice.discountAmount || 0) },
    { label: "Tax", value: invoice.taxAmount },
    { label: "Net Amount", value: invoice.netAmount, emphasize: true },
    { label: "Amount Paid", value: invoice.amountPaid },
    { label: "Outstanding Balance", value: balance, emphasize: true, isBalance: true },
  ];

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Amount Summary</h3>
        <dl className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between text-sm ${
                row.emphasize ? "border-t border-gray-100 pt-2 font-semibold" : ""
              }`}
            >
              <dt className="text-gray-600">{row.label}</dt>
              <dd
                className={
                  row.isBalance ? (row.value > 0 ? "text-red-600" : "text-green-600") : "text-gray-900"
                }
              >
                {formatCurrency(row.value, symbol)}
              </dd>
            </div>
          ))}
        </dl>
      </PageCardContent>
    </PageCard>
  );
}
