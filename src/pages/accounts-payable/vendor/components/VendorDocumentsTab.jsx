import { Eye, Download } from "lucide-react";

import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { formatDate } from "../../utils/formatters";
import { useVendorDocuments } from "../hooks/useVendorCollections";
import VendorCollectionPanel from "./VendorCollectionPanel";

/** Display wording for VendorDocumentDTO.document_type — the backend's own values, spelled out. */
export const DOCUMENT_TYPE_LABEL = {
  PURCHASE_ORDER: "Purchase Order",
  GOODS_RECEIPT: "Goods Receipt",
  NDA: "NDA",
  NDA_SIGNED: "NDA (Signed)",
  INVOICE_ATTACHMENT: "Invoice Attachment",
};

const HEADERS = ["Document", "Type", "Related Record", "Date", "Status", "Actions"];
const COLUMNS = ["name", "type", "related", "date", "status", "actions"];

/**
 * All documents attached to a vendor's records — Vendor Detail > Documents tab.
 *
 * Reads GET /apm/vendor/{vendor_id}/documents. There is no vendor_document table: the response
 * gathers the file references the PO, GRN, NDA and invoice-attachment records already carry,
 * each with a short-lived presigned `url`.
 *
 * `url` is nullable (the backend lists a document even when a link could not be minted), so the
 * View/Download actions are disabled — with the reason shown — rather than rendering a dead
 * link. VendorDocumentDTO carries no status column, so the Status cell reports the one piece of
 * state the response does express: whether the document is currently retrievable.
 *
 * @param {{ vendorId: string|number }} props
 */
export default function VendorDocumentsTab({ vendorId }) {
  const { items: documents, count, countsByType, isLoading, isError, error, refetch } =
    useVendorDocuments(vendorId);

  const rows = documents.map((document) => {
    const hasUrl = Boolean(document.url);

    return {
      name: document.file_name || "—",
      type: DOCUMENT_TYPE_LABEL[document.document_type] || document.document_type || "—",
      // `reference` is the human reference on the owning record (po_number, grn_number,
      // invoice_number); NDAs have none, so fall back to the record's id.
      related:
        document.reference ||
        (document.source_id
          ? `${DOCUMENT_TYPE_LABEL[document.document_type] || "Record"} #${document.source_id}`
          : "—"),
      date: formatDate(document.document_date),
      status: (
        <StatusPill
          label={hasUrl ? "Available" : "Link Unavailable"}
          tone={hasUrl ? "success" : "neutral"}
        />
      ),
      actions: (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="small"
            variant="outline"
            disabled={!hasUrl}
            title={hasUrl ? undefined : "No download link is available for this document."}
            onClick={() => window.open(document.url, "_blank", "noopener,noreferrer")}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>

          <Button
            size="small"
            variant="outline"
            disabled={!hasUrl}
            title={hasUrl ? undefined : "No download link is available for this document."}
            onClick={() => {
              // The presigned URL points at the private object directly; let the browser
              // fetch it rather than proxying the bytes through this app.
              const link = window.document.createElement("a");
              link.href = document.url;
              link.download = document.file_name || "document";
              link.rel = "noopener noreferrer";
              window.document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      ),
    };
  });

  // counts_by_type omits types with no documents, so this renders exactly the sources the
  // vendor actually has — no zero chips for types that were never involved.
  const typeCounts = Object.entries(countsByType);

  return (
    <VendorCollectionPanel
      title="Documents"
      count={count}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      isEmpty={documents.length === 0}
      emptyMessage="No documents found for this vendor."
      errorMessage="Unable to load documents right now."
      actions={
        typeCounts.length > 0
          ? typeCounts.map(([type, typeCount]) => (
              <StatusPill
                key={type}
                label={`${DOCUMENT_TYPE_LABEL[type] || type}: ${typeCount}`}
                tone="info"
              />
            ))
          : null
      }
    >
      <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />
    </VendorCollectionPanel>
  );
}
