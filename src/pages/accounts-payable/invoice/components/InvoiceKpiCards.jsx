import { FileText, Clock, Wallet, IndianRupee } from "lucide-react";
import StatCard from "../../../../components/Cards/StatCard";
import { useInvoiceSummary } from "../hooks/useInvoiceSummary";
import { formatCurrency } from "../../utils/formatters";

/**
 * Invoice Management's KPI row — real counts/amounts derived from invoiceService.getInvoiceSummary,
 * never fabricated growth percentages. Shown only on InvoiceListPage (see InvoiceQueueView's
 * showKpis prop), not on the OCR Review / Validation queue pages.
 */
export default function InvoiceKpiCards() {
  const { data, isLoading } = useInvoiceSummary();

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Invoices"
        value={isLoading ? "—" : data.totalInvoicesThisMonth}
        subtitle="This Month"
        icon={FileText}
      />
      <StatCard
        title="Pending Approval"
        value={isLoading ? "—" : data.pendingApprovalCount}
        subtitle="Requires Review"
        icon={Clock}
        textColor="text-amber-700"
      />
      <StatCard
        title="Ready for Payment"
        value={isLoading ? "—" : data.readyForPaymentCount}
        subtitle={isLoading ? "" : formatCurrency(data.readyForPaymentBalance)}
        icon={Wallet}
        textColor="text-indigo-700"
      />
      <StatCard
        title="Paid This Month"
        value={isLoading ? "—" : data.paidThisMonthCount}
        subtitle={isLoading ? "" : formatCurrency(data.paidThisMonthAmount)}
        icon={IndianRupee}
        textColor="text-emerald-700"
      />
    </div>
  );
}
