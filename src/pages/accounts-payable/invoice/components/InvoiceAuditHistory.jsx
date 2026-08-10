import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { formatDate } from "../../utils/formatters";

/**
 * Simple status-history timeline for the invoice detail page — mock data for now (see
 * invoiceMockData.js / invoiceService.updateInvoice's automatic history append). Oldest first,
 * matching how the lifecycle actually happened.
 */
export default function InvoiceAuditHistory({ history = [] }) {
  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Status History</h3>
        {history.length === 0 ? (
          <p className="text-sm italic text-gray-500">No history recorded yet.</p>
        ) : (
          <ol className="space-y-3 border-l border-gray-200 pl-4">
            {history.map((entry, index) => (
              <li key={`${entry.status}-${entry.at}-${index}`} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
                <p className="text-sm font-medium text-gray-900">{entry.status}</p>
                <p className="text-xs text-gray-500">{formatDate(entry.at)} {new Date(entry.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                {entry.note && <p className="mt-0.5 text-xs text-gray-600">{entry.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </PageCardContent>
    </PageCard>
  );
}
