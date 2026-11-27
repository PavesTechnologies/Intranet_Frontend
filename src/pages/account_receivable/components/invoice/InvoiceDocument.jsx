import React from "react";
import InvoicePreviewDocument from "./InvoicePreviewDocument";

/**
 * InvoiceDocument
 *
 * Reuses the authoritative corporate tax invoice document renderer (InvoicePreviewDocument).
 * Prevents duplicated invoice rendering logic between the generation modal, draft preview,
 * and direct invoice viewing workflows.
 */
export default function InvoiceDocument(props) {
  return <InvoicePreviewDocument {...props} isGenerating={false} />;
}
