import { useState } from "react";
import { FileText, Eye } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { formatDate } from "../../utils/formatters";
import { invoiceService } from "../services/invoiceService";
import { getApiErrorMessage } from "../../utils/apiError";

export default function InvoiceAttachmentList({
  attachments = [],
  inboundDocumentId = null,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleView = async () => {
    if (!inboundDocumentId) {
      toast.info("Invoice document is not available.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await invoiceService.viewInvoice(inboundDocumentId);

      /*
       * invoiceService.viewInvoice() now returns:
       *
       * {
       *   blob: Blob,
       *   contentType: "application/pdf"
       * }
       */

      const blob = result?.blob;

      if (!(blob instanceof Blob)) {
        toast.error("Invalid document response from the server.");
        return;
      }

      const contentType =
        result?.contentType || blob.type || "application/pdf";

      const file = new Blob([blob], {
        type: contentType,
      });

      const url = URL.createObjectURL(file);

      window.open(url, "_blank", "noopener,noreferrer");

      /*
       * Do not revoke immediately because the new browser tab
       * still needs the object URL.
       */
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (error) {
      console.error("Error viewing invoice document:", error);

      toast.error(
        getApiErrorMessage(
          error,
          "Could not load the invoice document."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (attachments.length === 0) {
    if (!inboundDocumentId) {
      return (
        <p className="text-sm italic text-gray-500">
          No attachments available.
        </p>
      );
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-500" />

          <div>
            <p className="text-sm font-medium text-gray-900">
              Invoice Document
            </p>
            <p className="text-xs text-gray-500">
              Original invoice document
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleView}
          disabled={isLoading}
        >
          <Eye className="mr-1 h-4 w-4" />

          {isLoading ? "Loading..." : "View"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((file) => (
        <div
          key={file.id || file.fileName}
          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-500" />

            <div>
              <p className="text-sm font-medium text-gray-900">
                {file.fileName}
              </p>

              <p className="text-xs text-gray-500">
                {file.fileType} · Uploaded{" "}
                {formatDate(file.uploadedAt)}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleView}
            disabled={isLoading}
          >
            <Eye className="mr-1 h-4 w-4" />

            {isLoading ? "Loading..." : "View"}
          </Button>
        </div>
      ))}
    </div>
  );
}
