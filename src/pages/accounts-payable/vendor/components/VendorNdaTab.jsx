import { useState } from "react";
import { toast } from "react-toastify";
import { FileSignature, Eye } from "lucide-react";

import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import ndaService from "../../procurement/services/ndaService";
import {
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
} from "../../procurement/constants/vendorOnboarding";
import { useVendorNdas } from "../hooks/useVendorCollections";
import VendorCollectionPanel from "./VendorCollectionPanel";

const HEADERS = [
  "NDA",
  "Status",
  "Related PR / RFQ",
  "Valid From",
  "Valid Until",
  "Sent On",
  "Signed On",
  "Document",
];
const COLUMNS = [
  "nda",
  "status",
  "relatedPr",
  "validFrom",
  "validUntil",
  "sentAt",
  "signedAt",
  "document",
];

/**
 * NDA documents on file for a vendor — Vendor Detail > NDA tab.
 *
 * Reads GET /apm/vendor/{vendor_id}/ndas, whose items are the NDA module's own VendorNdaDTO,
 * and renders only fields that DTO actually carries (`status_code`, `pr_id`, `valid_from`,
 * `valid_until`, `sent_at`, `signed_at`, `document_key`, `signed_document_key`). The list
 * deliberately omits the NDA wording (`content`), which is fetched per NDA by the editor.
 *
 * Opening a document goes through the existing GET /apm/nda/{nda_id}/document short-lived URL —
 * object keys are never links themselves, so the presence of a key only decides whether the
 * action is offered.
 *
 * @param {{ vendorId: string|number }} props
 */
export default function VendorNdaTab({ vendorId }) {
  const { items: ndas, count, isLoading, isError, error, refetch } = useVendorNdas(vendorId);

  // nda_id currently being opened, plus whether the signed copy was asked for.
  const [openingDocument, setOpeningDocument] = useState(null);

  const handleOpenDocument = async (nda, signed) => {
    setOpeningDocument(`${nda.nda_id}:${signed}`);
    try {
      const result = await ndaService.getNdaDocumentUrl(nda.nda_id, { signed });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not open the NDA document."));
    } finally {
      setOpeningDocument(null);
    }
  };

  const rows = ndas.map((nda) => ({
    nda: `NDA #${nda.nda_id}`,
    status: nda.status_code ? (
      <StatusPill
        label={NDA_STATUS_LABEL[nda.status_code] || nda.status_code}
        tone={NDA_STATUS_TONE[nda.status_code] || "neutral"}
      />
    ) : (
      "—"
    ),
    // The NDA is scoped to a purchase requisition, which is what an RFQ is raised against.
    relatedPr: nda.pr_id ? `PR #${nda.pr_id}` : "—",
    validFrom: formatDate(nda.valid_from),
    validUntil: formatDate(nda.valid_until),
    sentAt: formatDate(nda.sent_at),
    signedAt: formatDate(nda.signed_at),
    document: (
      <div className="flex flex-wrap justify-center gap-2">
        {nda.document_key ? (
          <Button
            size="small"
            variant="outline"
            onClick={() => handleOpenDocument(nda, false)}
            loading={openingDocument === `${nda.nda_id}:false`}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
        ) : null}

        {nda.signed_document_key ? (
          <Button
            size="small"
            variant="outline"
            onClick={() => handleOpenDocument(nda, true)}
            loading={openingDocument === `${nda.nda_id}:true`}
          >
            <FileSignature className="h-3.5 w-3.5" /> Signed
          </Button>
        ) : null}

        {/* No key on either side means there is nothing to open — say so rather than offering
            an action that would fail. */}
        {!nda.document_key && !nda.signed_document_key ? (
          <span className="text-xs text-gray-400">No document</span>
        ) : null}
      </div>
    ),
  }));

  return (
    <VendorCollectionPanel
      title="NDA Documents"
      count={count}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      isEmpty={ndas.length === 0}
      emptyMessage="No NDAs found for this vendor."
      errorMessage="Unable to load NDAs right now."
    >
      <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />
    </VendorCollectionPanel>
  );
}
