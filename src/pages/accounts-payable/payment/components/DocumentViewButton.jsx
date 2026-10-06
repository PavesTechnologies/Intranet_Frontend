import { useState } from "react";
import { toast } from "react-toastify";
import { FileText } from "lucide-react";
import { openBlobInNewTab } from "../../utils/documentUpload";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Opens a stored AP document (payment receipt / TDS document) in a new tab. The backend streams
 * the file through the authenticated API (same blob pattern as InvoiceAttachmentList), so this
 * never needs a public URL.
 * @param {{fetchBlob: () => Promise<Blob>, fileName: string}} props
 */
export default function DocumentViewButton({ fetchBlob, fileName }) {
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    setLoading(true);
    try {
      openBlobInNewTab(await fetchBlob());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not open the document."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleView}
      disabled={loading}
      className="inline-flex items-center gap-1 text-sm font-medium text-[#0A0082] hover:underline disabled:opacity-60"
      title={`View ${fileName}`}
    >
      <FileText size={14} />
      <span className="max-w-[16rem] truncate">{loading ? "Opening…" : fileName}</span>
    </button>
  );
}
