import { Link } from "react-router-dom";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatCurrency, formatDate, calculateBalance, isOverdue } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { INVOICE_TYPE_LABELS } from "../../constants/invoiceTypes";
import InvoiceRowActions from "./InvoiceRowActions";

const HEADERS = ["Invoice #", "Vendor", "Invoice Date", "Due Date", "Type", "Net Amount", "Paid", "Balance", "Status", "Actions"];
const COLUMNS = ["invoiceNumber", "vendor", "invoiceDate", "dueDate", "type", "netAmount", "paid", "balance", "status", "actions"];

/**
 * Reusable across Invoice Management, OCR Review, and Validation views — never fed raw
 * database IDs (vendor is shown by name, currency by its own display fields, etc.).
 */
export default function InvoiceTable({ invoices, loading }) {
  const rows = invoices.map((invoice) => {
    const balance = calculateBalance(invoice.netAmount, invoice.amountPaid);
    const overdue = isOverdue(invoice.dueDate, invoice.netAmount, invoice.amountPaid);
    const symbol = invoice.currency?.symbol || "₹";

    return {
      invoiceNumber: (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="font-semibold text-[#0A0082] hover:underline">
          {invoice.invoiceNumber}
        </Link>
      ),
      vendor: invoice.vendor?.name || "—",
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: (
        <span className={overdue ? "font-semibold text-red-600" : ""}>
          {formatDate(invoice.dueDate)}
          {overdue ? <span className="ml-1 text-xs">(Overdue)</span> : null}
        </span>
      ),
      type: INVOICE_TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType,
      netAmount: formatCurrency(invoice.netAmount, symbol),
      paid: formatCurrency(invoice.amountPaid, symbol),
      balance: (
        <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
          {formatCurrency(balance, symbol)}
        </span>
      ),
      status: <StatusBadge label={invoice.status} size="sm" />,
      actions: <InvoiceRowActions invoice={invoice} />,
    };
  });

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />;
}
