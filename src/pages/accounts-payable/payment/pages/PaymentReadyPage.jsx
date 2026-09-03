import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import { useInvoices } from "../../invoice/hooks/useInvoices";
import { PAYMENT_QUEUE_STATUSES } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate, calculateBalance } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_SIZE = 20;

const HEADERS = ["Invoice #", "Vendor", "Due Date", "Net Amount", "Balance", "Actions"];
const COLUMNS = ["invoiceNumber", "vendor", "dueDate", "netAmount", "balance", "actions"];

/**
 * Every Approved invoice with an outstanding balance — there's no distinct "ready for payment"
 * status on the backend (see constants/invoiceStatus.js), so this reuses the existing invoice
 * list endpoint filtered client-side, same as the Invoice Management "Ready for Payment" tab.
 * The difference here is the Pay action, which this queue is specifically for.
 */
export default function PaymentReadyPage() {
  const navigate = useNavigate();
  const { invoices, isLoading, isError, error } = useInvoices({
    statuses: PAYMENT_QUEUE_STATUSES,
    pageSize: PAGE_SIZE,
  });

  const payable = invoices.filter((invoice) => calculateBalance(invoice.netAmount, invoice.amountPaid) > 0);

  const rows = payable.map((invoice) => {
    const symbol = invoice.currency?.symbol || "₹";
    const balance = calculateBalance(invoice.netAmount, invoice.amountPaid);
    return {
      invoiceNumber: invoice.invoiceNumber,
      vendor: invoice.vendor?.name || "—",
      dueDate: formatDate(invoice.dueDate),
      netAmount: formatCurrency(invoice.netAmount, symbol),
      balance: formatCurrency(balance, symbol),
      actions: (
        <Button variant="primary" size="small" onClick={() => navigate(AP_ROUTES.PAYMENT_MARK_PAID(invoice.id))}>
          Pay
        </Button>
      ),
    };
  });

  return (
    <div className="p-6">
      <PageHeader title="Ready for Payment" subtitle="Approved invoices with an outstanding balance" />
      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load invoices right now.")}
        </div>
      ) : (
        <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />
      )}
    </div>
  );
}
