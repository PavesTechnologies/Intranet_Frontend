import GenericTable from "../../../../components/Table/table";
import { formatCurrency } from "../../utils/formatters";

const HEADERS = ["#", "Description", "Quantity", "Unit Price", "Tax", "Line Amount"];
const COLUMNS = ["lineNumber", "description", "quantity", "unitPrice", "tax", "lineAmount"];

function formatQuantity(quantity) {
  const safe = typeof quantity === "number" && Number.isFinite(quantity) ? quantity : 0;
  return safe.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Handles empty/single/many lines, long descriptions (truncated with a tooltip), and decimal quantities. */
export default function InvoiceLineTable({ lines = [], currencySymbol = "₹" }) {
  if (lines.length === 0) {
    return <p className="text-sm italic text-gray-500">No invoice lines available.</p>;
  }

  const rows = lines.map((line) => ({
    lineNumber: line.lineNumber,
    description: (
      <span className="block max-w-xs truncate" title={line.description}>
        {line.description}
      </span>
    ),
    quantity: formatQuantity(line.quantity),
    unitPrice: formatCurrency(line.unitPrice, currencySymbol),
    tax: formatCurrency(line.taxAmount, currencySymbol),
    lineAmount: formatCurrency(line.lineAmount, currencySymbol),
  }));

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />;
}
