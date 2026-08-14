import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import GenericTable from "../../../../components/Table/table";
import { useInvoiceMatching } from "../hooks/useInvoiceMatching";
import { formatCurrency } from "../../utils/formatters";

const OVERALL_STATUS_STYLES = {
  NO_PO: "bg-gray-100 text-gray-700",
  MATCHED: "bg-green-100 text-green-700",
  VARIANCE_DETECTED: "bg-amber-100 text-amber-700",
  GRN_REQUIRED_BUT_MISSING: "bg-red-100 text-red-700",
  INCOMPLETE: "bg-red-100 text-red-700",
};

const LINE_STATUS_STYLES = {
  MATCHED: "bg-green-100 text-green-700",
  QUANTITY_VARIANCE: "bg-amber-100 text-amber-700",
  PRICE_VARIANCE: "bg-amber-100 text-amber-700",
  QUANTITY_AND_PRICE_VARIANCE: "bg-amber-100 text-amber-700",
  NO_PO_LINE_LINKED: "bg-gray-100 text-gray-700",
  NO_GRN_RECEIPT_FOUND: "bg-red-100 text-red-700",
};

function Pill({ label, styleMap }) {
  const className = styleMap[label] || "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{label?.replace(/_/g, " ") || "—"}</span>;
}

const LINE_HEADERS = ["#", "Description", "Ordered Qty", "Received Qty", "Invoiced Qty", "PO Price", "Invoice Price", "Status"];
const LINE_COLUMNS = ["lineNumber", "description", "orderedQty", "receivedQty", "invoicedQty", "poPrice", "invoicePrice", "status"];

/**
 * Renders GET /apm/invoice/{id}/matching verbatim — match_type, overall_status and every
 * per-line variance are computed server-side; this never recomputes them.
 */
export default function InvoiceMatchingCard({ invoiceId, currencySymbol = "₹" }) {
  const { data: match, isLoading, isError } = useInvoiceMatching(invoiceId);

  if (isLoading) {
    return (
      <PageCard>
        <PageCardContent>
          <p className="text-sm text-gray-400">Loading match status…</p>
        </PageCardContent>
      </PageCard>
    );
  }

  if (isError || !match) {
    return (
      <PageCard>
        <PageCardContent>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">PO / GRN Matching</h3>
          <p className="text-sm italic text-gray-500">Matching information isn't available for this invoice.</p>
        </PageCardContent>
      </PageCard>
    );
  }

  const rows = (match.lines || []).map((line) => ({
    lineNumber: line.line_number ?? "—",
    description: (
      <span className="block max-w-xs truncate" title={line.description}>
        {line.description || "—"}
      </span>
    ),
    orderedQty: line.ordered_quantity ?? "—",
    receivedQty: line.received_quantity ?? "—",
    invoicedQty: line.invoiced_quantity ?? "—",
    poPrice: line.po_unit_price ? formatCurrency(Number(line.po_unit_price), currencySymbol) : "—",
    invoicePrice: line.invoice_unit_price ? formatCurrency(Number(line.invoice_unit_price), currencySymbol) : "—",
    status: <Pill label={line.status} styleMap={LINE_STATUS_STYLES} />,
  }));

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">PO / GRN Matching</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{match.match_type?.replace(/_/g, "-") || "NONE"}</span>
            <Pill label={match.overall_status} styleMap={OVERALL_STATUS_STYLES} />
          </div>
        </div>

        <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">PO Number</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{match.po_number || "Not applicable"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">GRN(s)</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {match.grn_ids?.length ? match.grn_ids.join(", ") : "Not applicable"}
            </dd>
          </div>
        </dl>

        {rows.length > 0 && <GenericTable headers={LINE_HEADERS} columns={LINE_COLUMNS} rows={rows} />}

        {match.messages?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {match.messages.map((message, index) => (
              <li key={index} className="text-xs text-gray-500">
                • {message}
              </li>
            ))}
          </ul>
        )}
      </PageCardContent>
    </PageCard>
  );
}
